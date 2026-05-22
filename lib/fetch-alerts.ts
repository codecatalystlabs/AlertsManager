import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";
import {
	getCachedAlerts,
	setCachedAlerts,
	isCacheFresh,
	isCacheUsable,
	type FetchAlertsResult,
} from "@/lib/alerts-cache";

class AlertsFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "AlertsFetchError";
	}
}

export interface AlertsListParams {
	page?: number;
	limit?: number;
	district?: string;
	is_verified?: boolean;
	from_date?: string;
	to_date?: string;
	status?: string;
}

export interface PaginatedAlertsResult<T> {
	data: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/** Dashboard chart window — avoids loading the full alerts table. */
const DASHBOARD_LOOKBACK_DAYS = 90;
const DASHBOARD_PAGE_LIMIT = 200;
const DASHBOARD_MAX_PAGES = 5;

export interface AlertTotals {
	verified: number;
	notVerified: number;
	total: number;
}

function buildAlertsUrl(apiBase: string, params?: AlertsListParams): string {
	const searchParams = new URLSearchParams();

	if (params?.page !== undefined) {
		searchParams.set("page", String(params.page));
	}
	if (params?.limit !== undefined) {
		searchParams.set("limit", String(params.limit));
	}
	if (params?.district) {
		searchParams.set("district", params.district);
	}
	if (params?.is_verified !== undefined) {
		searchParams.set("is_verified", String(params.is_verified));
	}
	if (params?.from_date) {
		searchParams.set("from_date", params.from_date);
	}
	if (params?.to_date) {
		searchParams.set("to_date", params.to_date);
	}
	if (params?.status) {
		searchParams.set("status", params.status);
	}

	const query = searchParams.toString();
	return query ? `${apiBase}/alerts?${query}` : `${apiBase}/alerts`;
}

function parsePaginatedAlertsResponse<T>(json: unknown): PaginatedAlertsResult<T> {
	if (Array.isArray(json)) {
		const data = json as T[];
		return {
			data,
			page: 1,
			limit: data.length,
			total: data.length,
			totalPages: 1,
		};
	}

	const body = json as Record<string, unknown>;
	const nested = body.pagination as Record<string, unknown> | undefined;
	const data = (body.data ?? body.alerts ?? body.items ?? []) as T[];

	const page = Number(body.page ?? nested?.page ?? 1) || 1;
	const limit = Number(
		body.limit ?? body.page_size ?? nested?.limit ?? nested?.page_size ?? data.length
	) || data.length;
	const total = Number(body.total ?? nested?.total ?? data.length) || data.length;
	const totalPages =
		Number(body.total_pages ?? nested?.total_pages) ||
		(limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

	return { data, page, limit, total, totalPages };
}

async function requestAlerts<T>(url: string): Promise<T> {
	let response: Response;

	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AlertsFetchError(
				"Cannot reach the API. If developing locally, ensure the backend is running on port 8089."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new AlertsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	return response.json() as Promise<T>;
}

export function dashboardDateRange(): { from_date: string; to_date: string } {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - (DASHBOARD_LOOKBACK_DAYS - 1));
	return {
		from_date: from.toISOString().split("T")[0],
		to_date: to.toISOString().split("T")[0],
	};
}

/** Lightweight totals via pagination metadata (3 tiny requests). */
export async function fetchAlertTotals(): Promise<AlertTotals> {
	const [all, verified, notVerified] = await Promise.all([
		fetchAlertsPage({ page: 1, limit: 1 }),
		fetchAlertsPage({ page: 1, limit: 1, is_verified: true }),
		fetchAlertsPage({ page: 1, limit: 1, is_verified: false }),
	]);

	return {
		total: all.total,
		verified: verified.total,
		notVerified: notVerified.total,
	};
}

/** Bounded alerts for dashboard charts (last 90 days, max 1000 rows, parallel pages). */
async function fetchDashboardAlertsFromApi<T>(): Promise<T[]> {
	const range = dashboardDateRange();
	const baseParams: AlertsListParams = {
		page: 1,
		limit: DASHBOARD_PAGE_LIMIT,
		...range,
	};

	const first = await fetchAlertsPage<T>(baseParams);
	const maxPages = Math.min(first.totalPages, DASHBOARD_MAX_PAGES);

	if (maxPages <= 1) {
		return first.data;
	}

	const rest = await Promise.all(
		Array.from({ length: maxPages - 1 }, (_, index) =>
			fetchAlertsPage<T>({ ...baseParams, page: index + 2 })
		)
	);

	return [...first.data, ...rest.flatMap((page) => page.data)];
}

/** Paginated alerts list: GET /api/v1/alerts?page=1&limit=10&district=... */
export async function fetchAlertsPage<T>(
	params: AlertsListParams = {}
): Promise<PaginatedAlertsResult<T>> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestAlerts<unknown>(buildAlertsUrl(apiBase, params));
	return parsePaginatedAlertsResponse<T>(json);
}

function warnBackgroundRevalidate(error: unknown): void {
	if (process.env.NODE_ENV === "development") {
		console.warn(
			"[alerts] Background refresh failed; continuing with cached data.",
			error instanceof Error ? error.message : error
		);
	}
}

/**
 * Fetch dashboard alerts with cache (90-day window, capped pages).
 * Stats totals should use fetchAlertTotals() in parallel for accuracy.
 */
export async function fetchAllAlerts<T>(
	options: { force?: boolean } = {}
): Promise<FetchAlertsResult<T>> {
	const { force = false } = options;
	const cached = getCachedAlerts<T>();

	if (!force && cached) {
		if (isCacheFresh()) {
			return { data: cached.data, fromCache: true };
		}

		if (isCacheUsable()) {
			return {
				data: cached.data,
				fromCache: true,
				revalidate: async () => {
					try {
						const fresh = await fetchDashboardAlertsFromApi<T>();
						setCachedAlerts(fresh);
						return fresh;
					} catch (error) {
						warnBackgroundRevalidate(error);
						return null;
					}
				},
			};
		}
	}

	const data = await fetchDashboardAlertsFromApi<T>();
	setCachedAlerts(data);
	return { data, fromCache: false };
}
