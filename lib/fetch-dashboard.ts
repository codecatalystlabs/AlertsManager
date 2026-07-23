import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

/** One labelled bar/slice in a dashboard breakdown. */
export interface DashboardCountItem {
	key: string;
	label: string;
	count: number;
}

/** One bucket (day or month) of the signals-over-time line. */
export interface DashboardTimePoint {
	period: string;
	label: string;
	count: number;
}

/**
 * Verification-SLA counts (1-hour window), computed server-side with the same
 * clock as the alerts-list SLA row tints: start = the signal's own timestamp,
 * stop = verification time (verified) or now (pending).
 */
export interface DashboardVerificationSla {
	/** Verified with a turnaround of at most an hour. */
	verifiedWithinHour: number;
	/** Still pending but younger than an hour (inside the SLA window). */
	pendingUnderHour: number;
	/** Still pending and older than an hour (SLA breached). */
	pendingOverHour: number;
	/** Still pending and older than 24 hours (subset of pendingOverHour). */
	pendingOver24h: number;
	/**
	 * Team turnaround — a different clock: system arrival (created_at) →
	 * verification, live-entered rows only (created_at within an hour of the
	 * reported timestamp; imports/syncs are excluded because their created_at
	 * is the import moment).
	 */
	teamVerified: number;
	/** Of teamVerified, verified within an hour of arriving in the system. */
	teamVerifiedWithinHour: number;
	/** Median arrival→verification minutes; -1 when no eligible rows. */
	teamMedianMinutes: number;
}

/** Full dashboard payload from GET /dashboard/summary. */
export interface DashboardSummary {
	total: number;
	verified: number;
	notVerified: number;
	discarded: number;
	alerts: number;
	fieldVerification: DashboardCountItem[];
	deskVerification: DashboardCountItem[];
	verification: DashboardCountItem[];
	status: DashboardCountItem[];
	topDistricts: DashboardCountItem[];
	diseases: DashboardCountItem[];
	sources: DashboardCountItem[];
	age: DashboardCountItem[];
	sex: DashboardCountItem[];
	timeline: DashboardTimePoint[];
	granularity: "daily" | "monthly";
	/** Optional so older API responses without the field don't crash the grid. */
	verificationSla?: DashboardVerificationSla;
	/** Distinct response (disease/condition) values available in scope — populates the Response type filter. */
	responseTypes: string[];
}

export interface DashboardSummaryParams {
	/** Inclusive range start (YYYY-MM-DD); omit for all-time. */
	from_date?: string;
	/** Inclusive range end (YYYY-MM-DD); omit for all-time. */
	to_date?: string;
	/** Case district name; omit or "all" for every district. */
	district?: string;
	/** Region name; omit or "all" for every region. */
	region?: string;
	/** Alert response (disease/condition) value; omit or "all" for every type. */
	response?: string;
}

class DashboardFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "DashboardFetchError";
	}
}

const EMPTY_SUMMARY: DashboardSummary = {
	total: 0,
	verified: 0,
	notVerified: 0,
	discarded: 0,
	alerts: 0,
	fieldVerification: [],
	deskVerification: [],
	verification: [],
	status: [],
	topDistricts: [],
	diseases: [],
	sources: [],
	age: [],
	sex: [],
	timeline: [],
	granularity: "daily",
	verificationSla: {
		verifiedWithinHour: 0,
		pendingUnderHour: 0,
		pendingOverHour: 0,
		pendingOver24h: 0,
		teamVerified: 0,
		teamVerifiedWithinHour: 0,
		teamMedianMinutes: -1,
	},
	responseTypes: [],
};

function buildSummaryUrl(apiBase: string, params: DashboardSummaryParams): string {
	const searchParams = new URLSearchParams();
	if (params.from_date) searchParams.set("from_date", params.from_date);
	if (params.to_date) searchParams.set("to_date", params.to_date);
	if (params.district && params.district !== "all") {
		searchParams.set("district", params.district);
	}
	if (params.region && params.region !== "all") {
		searchParams.set("region", params.region);
	}
	if (params.response && params.response !== "all") {
		searchParams.set("response", params.response);
	}
	const query = searchParams.toString();
	const path = `${apiBase}/dashboard/summary`;
	return query ? `${path}?${query}` : path;
}

/**
 * GET /api/v1/dashboard/summary — the whole dashboard (KPI counts + every chart
 * breakdown) aggregated server-side, scoped by date range and district. Replaces
 * the old approach of pulling every alert row to the browser to aggregate.
 */
export async function fetchDashboardSummary(
	params: DashboardSummaryParams = {}
): Promise<DashboardSummary> {
	const apiBase = getClientApiBaseUrl();

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(
			buildSummaryUrl(apiBase, params)
		);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new DashboardFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new DashboardFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const json = (await response.json()) as Partial<DashboardSummary> | null;
	// Defensive merge so a partial/empty response never crashes the charts.
	return { ...EMPTY_SUMMARY, ...(json ?? {}) };
}
