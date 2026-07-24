import { AuthService, type Alert } from "@/lib/auth";
import { normalizeAlertsList } from "@/lib/alert-normalize";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

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
	region?: string;
	district?: string;
	/** Division/subcounty name; matched against alert_case_sub_county or sub_county. */
	division?: string;
	is_verified?: boolean;
	from_date?: string;
	to_date?: string;
	status?: string;
	/** Exclude rows with this status (NULL/blank count as excluded too). Powers the call-logs "Other" = not-Alive filter server-side. */
	status_not?: string;
	/** Sent as `source_of_alert` — comma-separated list for an IN match. */
	source?: string;
	/** Free-text search across reporter, case name, contact, CIF, district, id. */
	search?: string;
	/** Partial match on the alert id (per-column "Alert ID" filter). */
	alert_id?: string;
	/** Partial match on the case name (per-column filter). */
	alert_case_name?: string;
	/** Partial match on the person reporting (per-column filter). */
	person_reporting?: string;
	/** Partial match on the case district (per-column filter). */
	alert_case_district?: string;
	/** Partial match on the contact number (per-column filter). */
	contact_number?: string;
	/** Partial match on the case age (per-column filter). */
	age?: string;
	/** Partial match on the response/disease (per-column filter). */
	response?: string;
	/** Partial match on the alert time (per-column filter). */
	time?: string;
	/** Case sex (e.g. "Male", "Female"). */
	sex?: string;
	/** Inclusive minimum case age. */
	age_min?: number;
	/** Inclusive maximum case age. */
	age_max?: number;
	/** Partial match on the call taker. */
	call_taker?: string;
	/** Partial match on the assigned user. */
	assigned_to?: string;
	/** Partial match on the verifying user. */
	verified_by?: string;
	/**
	 * SLA colour — how long the alert has been in the system, clock stopping at
<<<<<<< HEAD
	 * verification: "green" (<=2h), "yellow" (2-6h), "red" (>6h). Comma-separated
=======
	 * verification: "green" (<=1h), "orange" (1-6h), "red" (>6h). Comma-separated
>>>>>>> f385891d2edc4915bf5d8c125e9d52da73882542
	 * for several. Filtered server-side so it scopes the whole dataset, matching
	 * the row tint computed by lib/alert-sla.ts.
	 */
	sla?: string;
	/**
	 * Only signals with a recorded verification outcome (true), or only pending
	 * ones (false). This is what locks View Alerts to verified signals — it is a
	 * recorded desk/field decision, NOT the is_verified flag (which is set on
	 * 99.5% of rows). Call Logs omits it and keeps showing everything.
	 */
	outcome_recorded?: boolean;
	/** Sort column: date | created_at | id | name | district | status | reporter. */
	sort_by?: string;
	/** Sort direction. */
	order?: "asc" | "desc";
}

export interface PaginatedAlertsResult<T> {
	data: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/**
 * Set every dataset filter (region/district/division, dates, status,
 * verification, source, search, demographics, staff) on `searchParams`.
 * Pagination (page/limit) and sort are intentionally excluded so this can be
 * shared by both the list and the /alerts/stats endpoints.
 */
function appendAlertFilterParams(
	searchParams: URLSearchParams,
	params: AlertsListParams
): void {
	if (params.region) {
		searchParams.set("region", params.region);
	}
	if (params.district) {
		searchParams.set("district", params.district);
	}
	if (params.division) {
		searchParams.set("division", params.division);
	}
	if (params.is_verified !== undefined) {
		searchParams.set("is_verified", String(params.is_verified));
	}
	if (params.from_date) {
		searchParams.set("from_date", params.from_date);
	}
	if (params.to_date) {
		searchParams.set("to_date", params.to_date);
	}
	if (params.status) {
		searchParams.set("status", params.status);
	}
	if (params.source) {
		searchParams.set("source_of_alert", params.source);
	}
	if (params.search) {
		searchParams.set("search", params.search);
	}
	if (params.alert_id) {
		searchParams.set("alert_id", params.alert_id);
	}
	if (params.alert_case_name) {
		searchParams.set("alert_case_name", params.alert_case_name);
	}
	if (params.person_reporting) {
		searchParams.set("person_reporting", params.person_reporting);
	}
	if (params.alert_case_district) {
		searchParams.set("alert_case_district", params.alert_case_district);
	}
	if (params.contact_number) {
		searchParams.set("contact_number", params.contact_number);
	}
	if (params.age) {
		searchParams.set("age", params.age);
	}
	if (params.response) {
		searchParams.set("response", params.response);
	}
	if (params.time) {
		searchParams.set("time", params.time);
	}
	if (params.sex) {
		searchParams.set("sex", params.sex);
	}
	if (params.age_min !== undefined) {
		searchParams.set("age_min", String(params.age_min));
	}
	if (params.age_max !== undefined) {
		searchParams.set("age_max", String(params.age_max));
	}
	if (params.call_taker) {
		searchParams.set("call_taker", params.call_taker);
	}
	if (params.assigned_to) {
		searchParams.set("assigned_to", params.assigned_to);
	}
	if (params.verified_by) {
		searchParams.set("verified_by", params.verified_by);
	}
	if (params.sla) {
		searchParams.set("sla", params.sla);
	}
	if (params.outcome_recorded !== undefined) {
		searchParams.set("outcome_recorded", String(params.outcome_recorded));
	}
}

function buildAlertsUrl(apiBase: string, params?: AlertsListParams): string {
	const searchParams = new URLSearchParams();

	if (params?.page !== undefined) {
		searchParams.set("page", String(params.page));
	}
	if (params?.limit !== undefined) {
		searchParams.set("limit", String(params.limit));
	}
	if (params) {
		appendAlertFilterParams(searchParams, params);
	}
	if (params?.sort_by) {
		searchParams.set("sort_by", params.sort_by);
	}
	if (params?.order) {
		searchParams.set("order", params.order);
	}

	const query = searchParams.toString();
	return query ? `${apiBase}/alerts?${query}` : `${apiBase}/alerts`;
}

function buildAlertsStatsUrl(apiBase: string, params?: AlertsListParams): string {
	const searchParams = new URLSearchParams();
	if (params) {
		appendAlertFilterParams(searchParams, params);
	}
	const query = searchParams.toString();
	return query ? `${apiBase}/alerts/stats?${query}` : `${apiBase}/alerts/stats`;
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

/** Paginated alerts list: GET /api/v1/alerts?page=1&limit=10&district=... */
export async function fetchAlertsPage(
	params: AlertsListParams = {}
): Promise<PaginatedAlertsResult<Alert>> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestAlerts<unknown>(buildAlertsUrl(apiBase, params));
	return parsePaginatedAlertsResponse(json);
}

/** Dataset-wide summary counts for the alerts / call-logs cards. */
export interface AlertsStats {
	total: number;
	alive: number;
	/** status = 'Dead' (Alerts Management card). */
	dead: number;
	/** status IN ('Unknown','Pending') (Alerts Management card). */
	unknown: number;
	other: number;
	verified: number;
	pending: number;
}

/**
 * GET /api/v1/alerts/stats — alive / dead / unknown / other / verified / pending
 * counts across every alert matching the given filters (the same filters the
 * list honours), so the summary cards reflect the whole dataset rather than the
 * current page. Pagination/sort fields on `params` are ignored.
 */
export async function fetchAlertsStats(
	params: AlertsListParams = {}
): Promise<AlertsStats> {
	const apiBase = getClientApiBaseUrl();
	const json = await requestAlerts<Record<string, unknown>>(
		buildAlertsStatsUrl(apiBase, params)
	);
	const num = (v: unknown): number => {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	};
	return {
		total: num(json.total),
		alive: num(json.alive),
		dead: num(json.dead),
		unknown: num(json.unknown),
		other: num(json.other),
		verified: num(json.verified),
		pending: num(json.pending),
	};
}
