import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatEidsrFetchError } from "@/lib/api-errors";
import { EIDSR_API_PATHS } from "@/constants/eidsr-alerts";

class EidsrFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "EidsrFetchError";
	}
}

export interface EidsrEvent {
	id: number;
	eventId: string;
	program: string;
	programStage: string;
	orgUnit: string;
	status: string;
	trackedEntityInstance: string;
	enrollment: string;
	eventDate: string;
	lastUpdatedRemote: string;
	deletedRemote: boolean;
	createdAt: string;
	updatedAt: string;
	dataValues: Record<string, string>;
}

export interface EidsrEventsListParams {
	page?: number;
	limit?: number;
	status?: string;
	from_date?: string;
	to_date?: string;
	updated_after?: string;
}

export interface PaginatedEidsrEventsResult {
	data: EidsrEvent[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

function buildEventsUrl(apiBase: string, params?: EidsrEventsListParams): string {
	const searchParams = new URLSearchParams();
	if (params?.page !== undefined) {
		searchParams.set("page", String(params.page));
	}
	if (params?.limit !== undefined) {
		searchParams.set("limit", String(params.limit));
	}
	if (params?.status) searchParams.set("status", params.status);
	if (params?.from_date) searchParams.set("from_date", params.from_date);
	if (params?.to_date) searchParams.set("to_date", params.to_date);
	if (params?.updated_after) searchParams.set("updated_after", params.updated_after);
	const query = searchParams.toString();
	const eventsPath = `${apiBase}${EIDSR_API_PATHS.events}`;
	return query ? `${eventsPath}?${query}` : eventsPath;
}

function parsePaginatedEventsResponse(json: unknown): PaginatedEidsrEventsResult {
	if (Array.isArray(json)) {
		const data = json as EidsrEvent[];
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
	const data = (body.data ?? body.events ?? body.items ?? []) as EidsrEvent[];

	const page = Number(body.page ?? nested?.page ?? 1) || 1;
	const limit =
		Number(
			body.limit ??
				body.page_size ??
				nested?.limit ??
				nested?.page_size ??
				data.length
		) || data.length;
	const total = Number(body.total ?? nested?.total ?? data.length) || data.length;
	const totalPages =
		Number(body.total_pages ?? nested?.total_pages) ||
		(limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

	return { data, page, limit, total, totalPages };
}

async function requestEidsr<T>(url: string, init?: RequestInit): Promise<T> {
	let response: Response;

	try {
		response = await AuthService.makeAuthenticatedRequest(url, init);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new EidsrFetchError(
				"Cannot reach the API. If developing locally, ensure the backend is running on port 8089."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new EidsrFetchError(
			formatEidsrFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

/** GET /eidsr/local/events (paginated) */
export async function fetchEidsrEventsPage(
	params: EidsrEventsListParams = {}
): Promise<PaginatedEidsrEventsResult> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestEidsr<unknown>(buildEventsUrl(apiBase, params));
	return parsePaginatedEventsResponse(json);
}

/** GET /eidsr/local/events/:localId */
export async function fetchEidsrEventById(localId: number): Promise<EidsrEvent> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestEidsr<unknown>(
		`${apiBase}${EIDSR_API_PATHS.eventById(localId)}`
	);
	if (json && typeof json === "object" && !Array.isArray(json)) {
		const body = json as Record<string, unknown>;
		if (body.data && typeof body.data === "object") {
			return body.data as EidsrEvent;
		}
		return json as EidsrEvent;
	}
	throw new EidsrFetchError("Invalid event response");
}

/** POST /eidsr/local/refresh — sync 6767 messages from EIDSR (not /alerts). */
export async function refreshEidsrEvents(fullSync = true): Promise<void> {
	await AuthService.syncEidsr6767Messages({ fullSync });
}
