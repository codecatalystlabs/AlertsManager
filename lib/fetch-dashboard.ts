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

/** One likelihood × impact cell of the risk matrix. */
export interface RiskMatrixCell {
	likelihood: string;
	impact: string;
	count: number;
	/** Algorithm-derived risk level -> count of events in this cell carrying it. */
	levels: Record<string, number>;
	/** Most severe algorithm level present; shades the cell. "" when none assessed. */
	highestLevel: string;
}

/**
 * The EBS §6 likelihood × impact plot of confirmed events. Cells are positioned
 * by each event's captured bands and coloured by the events' own algorithm
 * levels — never by the cell position (the guideline's grid is deliberately not
 * encoded). `unbanded` keeps the plot honest about confirmed events it can't show.
 */
export interface RiskMatrix {
	likelihoods: string[];
	impacts: string[];
	cells: RiskMatrixCell[];
	confirmed: number;
	plotted: number;
	unbanded: number;
	maxCellCount: number;
}

/**
 * Raw numerator / denominator of every row of the EBS indicator table
 * (Signals reported → Alerts), computed server-side over the scoped rows. The
 * percentages are derived in lib/ebs-indicators.ts so the UI can always show
 * the two counts a proportion is made of.
 */
export interface DashboardIndicators {
	/** 1. Every signal in scope. */
	signalsReported: number;
	/** 2. Through the triage gate; and of those, within 24h of the signal timestamp. */
	signalsTriaged: number;
	triagedWithin24h: number;
	/** 3. Triage decision "Discarded" — a duplicate of a signal already under investigation. */
	duplicateSignals: number;
	/** 4. Outcome recorded; and of the triaged ones, verified within a flat 24h. */
	signalsVerified: number;
	verifiedWithin24h: number;
	/** 5. Verified signals whose outcome is Confirmed — events requiring risk assessment. */
	events: number;
	/** 6. Confirmed events carrying a risk level. */
	eventsRiskAssessed: number;
	/** 7 / 8. Of the assessed events: a response was initiated / the decision was Monitor. */
	responseInitiated: number;
	underMonitoring: number;
	/** 9. Of the events with a response initiated, those whose sample was collected. */
	sampleCollected: number;
	/** 10. Events evacuated by EMS / events whose reporting channel is 912. */
	evacuated: number;
	emsChannelEvents: number;
	/** 11. Events with an SDB recorded / events that are Dead with High or Very High risk. */
	sdb: number;
	sdbEligible: number;
	/** 12. Verified, non-discarded signals (same figure as the Alerts KPI). */
	alertsReported: number;
}

/**
 * One epi week of the indicator trend. Epi weeks are ISO weeks (Monday–Sunday,
 * the DHIS2 weekly period), keyed "2026-W35".
 */
export interface DashboardWeekPoint {
	week: string;
	year: number;
	weekNo: number;
	/** Monday (YYYY-MM-DD). */
	start: string;
	/** Sunday (YYYY-MM-DD). */
	end: string;
	counts: DashboardIndicators;
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
	/**
	 * KPI 1's second axis — the governance level each signal was detected at.
	 * Optional so an older API response doesn't crash the chart.
	 */
	signalLevels?: DashboardCountItem[];
	/** KPI 9 — community-detected signals as a share of all signals, 0–100; -1 for n/a. */
	communityReportingRate?: number;
	/** The numerator behind that rate. */
	communitySignals?: number;
	age: DashboardCountItem[];
	sex: DashboardCountItem[];
	timeline: DashboardTimePoint[];
	granularity: "daily" | "monthly";
	/** §6 risk matrix (confirmed events by likelihood × impact). Optional so an older API response doesn't crash the card. */
	riskMatrix?: RiskMatrix;
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
	/** Assessments carrying the §6 worksheet (hazard/exposure/context), not just the level. */
	riskWorksheetComplete?: number;
	/** Share of concluded signals whose reporter has been told, 0–100. KPI 10. */
	feedbackRate?: number;
	/** Concluded signals still owing feedback. */
	feedbackPending?: number;
	/** KPI 10's raw denominator — signals that have reached a conclusion. */
	feedbackDue?: number;
	/** KPI 10's raw numerator — concluded signals whose reporter was told. */
	feedbackGiven?: number;
	/** Confirmed events as a share of adjudicated signals, 0–100. KPI 5. */
	signalToEventRate?: number;
	/** The EBS indicator table's counts. Optional so an older API response doesn't crash the board. */
	indicators?: DashboardIndicators;
	/** The indicator counts per epi week, zero-filled, most recent 52 weeks in scope. */
	indicatorSeries?: DashboardWeekPoint[];
	/** Indicator 1's region axis — signals by the official region of their case district. */
	reportedByRegion?: DashboardCountItem[];
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
	signalLevels: [],
	communityReportingRate: -1,
	communitySignals: 0,
	age: [],
	sex: [],
	timeline: [],
	granularity: "daily",
	triageOutcomes: [],
	riskLevels: [],
	riskAssessmentRate: 0,
	riskAssessedWithin24h: 0,
	riskAssessedLate: 0,
	riskWorksheetComplete: 0,
	feedbackRate: 0,
	feedbackPending: 0,
	feedbackDue: 0,
	feedbackGiven: 0,
	signalToEventRate: 0,
	indicators: {
		signalsReported: 0,
		signalsTriaged: 0,
		triagedWithin24h: 0,
		duplicateSignals: 0,
		signalsVerified: 0,
		verifiedWithin24h: 0,
		events: 0,
		eventsRiskAssessed: 0,
		responseInitiated: 0,
		underMonitoring: 0,
		sampleCollected: 0,
		evacuated: 0,
		emsChannelEvents: 0,
		sdb: 0,
		sdbEligible: 0,
		alertsReported: 0,
	},
	indicatorSeries: [],
	reportedByRegion: [],
	riskMatrix: {
		likelihoods: [],
		impacts: [],
		cells: [],
		confirmed: 0,
		plotted: 0,
		unbanded: 0,
		maxCellCount: 0,
	},
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
