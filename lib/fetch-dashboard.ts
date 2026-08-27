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
	/**
	 * Verified inside the deadline its TRIAGE PRIORITY sets — High 12h,
	 * Medium 24h, Low 48h (EBS Guidelines Table 3), not a flat hour. This is
	 * KPI 4, target >80%.
	 */
	verifiedWithinDeadline: number;
	/** Verified, but past that deadline. */
	verifiedLate: number;
	/** Still pending and inside its deadline. */
	pendingWithinDeadline: number;
	/** Still pending past its deadline. */
	pendingBreached: number;
	/** Pending past TWICE its deadline (subset of pendingBreached). */
	pendingCritical: number;

	/** Never been through the triage gate. KPI 3's shortfall. */
	untriaged: number;
	/** Triaged inside the 24-hour triage deadline. KPI 3, target >90%. */
	triagedWithin24h: number;
	/** Triaged, but more than 24 hours after the signal came in. */
	triagedLate: number;
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
	/** Signals past the EBS step-2 triage gate, whichever exit they took. */
	triaged: number;
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
	/** Which exit each signal took at the triage gate, plus the untriaged remainder. */
	triageOutcomes?: DashboardCountItem[];
	/** Risk levels across confirmed events, including "Not Assessed". */
	riskLevels?: DashboardCountItem[];
	/** Share of confirmed events carrying a risk level, 0–100. KPI 6, target >90%. */
	riskAssessmentRate?: number;
	/** Assessed within 24h of verification. */
	riskAssessedWithin24h?: number;
	/** Assessed, but more than 24h after verification. */
	riskAssessedLate?: number;
	/** Share of concluded signals whose reporter has been told, 0–100. KPI 10. */
	feedbackRate?: number;
	/** Concluded signals still owing feedback. */
	feedbackPending?: number;
	/** Confirmed events as a share of adjudicated signals, 0–100. KPI 5. */
	signalToEventRate?: number;
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
	triaged: 0,
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
	triageOutcomes: [],
	riskLevels: [],
	riskAssessmentRate: 0,
	riskAssessedWithin24h: 0,
	riskAssessedLate: 0,
	feedbackRate: 0,
	feedbackPending: 0,
	signalToEventRate: 0,
	verificationSla: {
		verifiedWithinDeadline: 0,
		verifiedLate: 0,
		pendingWithinDeadline: 0,
		pendingBreached: 0,
		pendingCritical: 0,
		untriaged: 0,
		triagedWithin24h: 0,
		triagedLate: 0,
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
