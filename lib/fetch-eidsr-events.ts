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
	forwardedToDistrict?: string;
	forwardedAt?: string;
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
	/** true = linked to an alert, false = not linked. Omit for no link filter. */
	linked?: boolean;
	/**
	 * Forward-verification traceability filter:
	 * "forwarded" (forwarded at all) | "forwarded_verified" | "forwarded_pending".
	 * Omit for no filter.
	 */
	forward_verification?: string;
	/** Free-text search across tracked entity and any data value. */
	search?: string;
	/** Substring match on the suspected disease/syndrome data value. */
	disease?: string;
	/** Substring match on the location/district data value. */
	district?: string;
	/** Exact (case-insensitive) match on the sex data value. */
	sex?: string;
	/** Comma-separated source-of-alert values; matches any (exact, case-insensitive). */
	source?: string;
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
	if (params?.linked !== undefined) searchParams.set("linked", String(params.linked));
	if (params?.forward_verification)
		searchParams.set("forward_verification", params.forward_verification);
	if (params?.search) searchParams.set("search", params.search);
	if (params?.disease) searchParams.set("disease", params.disease);
	if (params?.district) searchParams.set("district", params.district);
	if (params?.sex) searchParams.set("sex", params.sex);
	if (params?.source) searchParams.set("source", params.source);
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
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
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

/** Live progress of an EIDSR sync (mirrors the Go services.SyncProgress). */
export interface EidsrSyncProgress {
	running: boolean;
	/** idle | starting | fetching | done | error */
	phase: string;
	incremental: boolean;
	page: number;
	pageCount: number;
	remoteTotal: number;
	/** remote events examined so far */
	scanned: number;
	/** NEW alert messages imported this run */
	imported: number;
	updated: number;
	skipped: number;
	excluded: number;
	startedAt: string | null;
	endedAt: string | null;
	error: string;
	message: string;
}

/** Response from starting a sync (POST /eidsr/local/refresh). */
export interface EidsrSyncStart {
	started: boolean;
	running: boolean;
	progress: EidsrSyncProgress;
	message: string;
}

/**
 * POST /eidsr/local/refresh — start a 6767 sync from EIDSR. Returns immediately
 * (the sync runs in the background on the API); poll getEidsrSyncStatus for
 * progress. Incremental by default (only events updated since the last sync);
 * pass fullSync=true to re-scan the entire program.
 */
export async function refreshEidsrEvents(fullSync = false): Promise<EidsrSyncStart> {
	const apiBase = getClientApiBaseUrl();
	return requestEidsr<EidsrSyncStart>(`${apiBase}${EIDSR_API_PATHS.refresh}`, {
		method: "POST",
		body: JSON.stringify({ fullSync }),
	});
}

/** GET /eidsr/local/refresh/status — live progress of the running/last sync. */
export async function getEidsrSyncStatus(): Promise<EidsrSyncProgress> {
	const apiBase = getClientApiBaseUrl();
	return requestEidsr<EidsrSyncProgress>(
		`${apiBase}${EIDSR_API_PATHS.refreshStatus}`
	);
}
