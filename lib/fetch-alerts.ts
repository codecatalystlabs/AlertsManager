import { AuthService, type Alert } from "@/lib/auth";
import { normalizeAlertsList } from "@/lib/alert-normalize";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";
import { getLocalDateString } from "@/lib/utils";
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

/** Range-driven chart fetch: larger pages + higher cap so wider windows aren't truncated. */
const CHART_PAGE_LIMIT = 500;
const CHART_MAX_PAGES = 40; // up to 20k rows across the selected range

/** A chart date window; omit a bound for "all time". */
export interface DashboardRange {
	from_date?: string;
	to_date?: string;
}

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

function extractAlertsArrayFromResponse(json: unknown): unknown[] {
	if (Array.isArray(json)) return json;

	const body = json as Record<string, unknown> | null;
	if (!body || typeof body !== "object") return [];

	const candidates = [
		body.data,
		body.alerts,
		body.items,
		body.rows,
		body.results,
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) return candidate;
		if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
			const nested = candidate as Record<string, unknown>;
			const inner =
				nested.data ??
				nested.alerts ??
				nested.items ??
				nested.rows ??
				nested.results;
			if (Array.isArray(inner)) return inner;
		}
	}

	return [];
}

function parsePaginatedAlertsResponse(json: unknown): PaginatedAlertsResult<Alert> {
	let rawItems: unknown[] = [];
	let page = 1;
	let limit = 0;
	let total = 0;
	let totalPages = 1;

	if (Array.isArray(json)) {
		rawItems = json;
		limit = rawItems.length;
		total = rawItems.length;
	} else {
		const body = json as Record<string, unknown>;
		const nested = body.pagination as Record<string, unknown> | undefined;
		rawItems = extractAlertsArrayFromResponse(json);

		page = Number(body.page ?? nested?.page ?? 1) || 1;
		limit =
			Number(
				body.limit ??
					body.page_size ??
					nested?.limit ??
					nested?.page_size ??
					rawItems.length
			) || rawItems.length;
		total = Number(body.total ?? nested?.total ?? rawItems.length) || rawItems.length;
		totalPages =
			Number(body.total_pages ?? nested?.total_pages) ||
			(limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
	}

	const normalized = normalizeAlertsList(rawItems);

	return {
		data: normalized,
		page,
		limit: limit || normalized.length,
		total: total || normalized.length,
		totalPages,
	};
}

async function requestAlerts<T>(url: string): Promise<T> {
	let response: Response;

	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AlertsFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
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
async function fetchDashboardAlertsFromApi(): Promise<Alert[]> {
	const range = dashboardDateRange();
	const baseParams: AlertsListParams = {
		page: 1,
		limit: DASHBOARD_PAGE_LIMIT,
		...range,
	};

	const first = await fetchAlertsPage(baseParams);
	const maxPages = Math.min(first.totalPages, DASHBOARD_MAX_PAGES);

	if (maxPages <= 1) {
		return first.data;
	}

	const rest = await Promise.all(
		Array.from({ length: maxPages - 1 }, (_, index) =>
			fetchAlertsPage({ ...baseParams, page: index + 2 })
		)
	);

	return [...first.data, ...rest.flatMap((page) => page.data)];
}

/**
 * Fetch all alerts within a date range for the dashboard charts. Pages through
 * the result (parallel) up to a safety cap. Omitting both bounds = all time.
 * Pass `district` to scope the charts to a single district ("all"/empty = no filter).
 */
export async function fetchAlertsForRange(
	range: DashboardRange = {},
	district?: string
): Promise<Alert[]> {
	const baseParams: AlertsListParams = {
		page: 1,
		limit: CHART_PAGE_LIMIT,
	};
	if (range.from_date) baseParams.from_date = range.from_date;
	if (range.to_date) baseParams.to_date = range.to_date;
	if (district && district !== "all") baseParams.district = district;

	const first = await fetchAlertsPage(baseParams);
	const maxPages = Math.min(Math.max(first.totalPages, 1), CHART_MAX_PAGES);

	if (maxPages <= 1) {
		return first.data;
	}

	const rest = await Promise.all(
		Array.from({ length: maxPages - 1 }, (_, index) =>
			fetchAlertsPage({ ...baseParams, page: index + 2 })
		)
	);

	return [...first.data, ...rest.flatMap((page) => page.data)];
}

/** Alerts for today's alert date, counted from pagination metadata. */
export interface TodayActivity {
	/** Alerts whose alert date is today's local date. */
	calls: number;
	/** Of those, how many are already verified. */
	verified: number;
}

/**
 * Count today's activity with two tiny metadata requests instead of downloading
 * and scanning recent alert rows in the browser.
 */
export async function fetchTodayActivity(): Promise<TodayActivity> {
	const todayLocal = getLocalDateString();
	const todayRange = {
		from_date: todayLocal,
		to_date: todayLocal,
	};

	const [allToday, verifiedToday] = await Promise.all([
		fetchAlertsPage({ ...todayRange, page: 1, limit: 1 }),
		fetchAlertsPage({
			...todayRange,
			page: 1,
			limit: 1,
			is_verified: true,
		}),
	]);

	return { calls: allToday.total, verified: verifiedToday.total };
}

/** Paginated alerts list: GET /api/v1/alerts?page=1&limit=10&district=... */
export async function fetchAlertsPage(
	params: AlertsListParams = {}
): Promise<PaginatedAlertsResult<Alert>> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestAlerts<unknown>(buildAlertsUrl(apiBase, params));
	return parsePaginatedAlertsResponse(json);
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
export async function fetchAllAlerts(
	options: { force?: boolean } = {}
): Promise<FetchAlertsResult<Alert[]>> {
	const { force = false } = options;
	const cached = getCachedAlerts<Alert[]>();

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
						const fresh = await fetchDashboardAlertsFromApi();
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

	const data = await fetchDashboardAlertsFromApi();
	setCachedAlerts(data);
	return { data, fromCache: false };
}
