import type {
	DashboardIndicators,
	DashboardSummary,
	DashboardWeekPoint,
} from "@/lib/fetch-dashboard";

/**
 * The EBS indicator table — the twelve rows the dashboard reports, each with
 * the definition, numerator and denominator exactly as published, and the
 * value derived from the counts the API returns.
 *
 * The API ships COUNTS (lib/fetch-dashboard.ts → DashboardIndicators). The
 * board shows each row as its COUNT — never as a percentage. The published
 * denominators of rows 10–12 (events reported via 912, dead high-risk events,
 * events risk-assessed) are not supersets of their numerators in the register
 * (an evacuation is recorded whatever the reporting channel was), so a ratio
 * of the two counts is meaningless and used to read as "7014%". The numerator
 * and denominator definitions stay on the row for the hover hint.
 */

/** Every row is sourced from the same register. */
export const EBS_DATA_SOURCE = "Signal register / alerts.health.go.ug";

export type EbsIndicatorKind = "count" | "proportion";

/** Pipeline stage the indicator belongs to — groups the tiles and colours them. */
export type EbsStage =
	| "detection"
	| "triage"
	| "verification"
	| "risk"
	| "response"
	| "alert";

export interface EbsIndicatorDefinition {
	/** Row number in the published table. */
	n: number;
	id: string;
	/** Row name as published. */
	name: string;
	/** Short title for the dashboard tile. */
	label: string;
	definition: string;
	numeratorLabel: string;
	/** "N/A" for a plain count. */
	denominatorLabel: string;
	kind: EbsIndicatorKind;
	stage: EbsStage;
	/** What one unit of the count is, for "12 events": "signals", "events" or "alerts". */
	unit: "signals" | "events" | "alerts";
	/** Where the counts come from, when the row's data has a caveat worth stating. */
	note?: string;
}

export interface EbsIndicatorRow extends EbsIndicatorDefinition {
	numerator: number;
	/** The published denominator's count, kept for reference; null for a count row. */
	denominator: number | null;
	/** The headline figure: the numerator count. */
	value: number;
	/** Rendered value: "1,234". */
	display: string;
	/** What the headline counts, e.g. "Total number of events evacuated". */
	caption: string;
}

export const EBS_INDICATORS: readonly EbsIndicatorDefinition[] = [
	{
		n: 1,
		id: "signals-reported",
		label: "Signals reported",
		name: "Signals reported",
		definition:
			"Number of signals reported by each EBS unit (health facility, district, region).",
		numeratorLabel: "Number of signals reported",
		denominatorLabel: "N/A",
		kind: "count",
		stage: "detection",
		unit: "signals",
	},
	{
		n: 2,
		id: "signals-triaged",
		label: "Triaged within 24h",
		name: "Signals triaged",
		definition: "Proportion of reported signals triaged within 24 hours.",
		numeratorLabel: "Total number of signals triaged within 24 hours",
		denominatorLabel: "Total number of signals triaged",
		kind: "proportion",
		stage: "triage",
		unit: "signals",
	},
	{
		n: 3,
		id: "duplicated-signals",
		label: "Duplicate signals",
		name: "Duplicated signals",
		definition: "Proportion of duplicate alerts.",
		numeratorLabel: "Total number of duplicate signals",
		denominatorLabel: "Total number of reported signals",
		kind: "proportion",
		stage: "triage",
		unit: "signals",
		note: "A duplicate is a signal triage discarded as already reported and under investigation.",
	},
	{
		n: 4,
		id: "signals-verified",
		label: "Verified within 24h",
		name: "Signals verified",
		definition: "Proportion of triaged signals verified within 24 hours.",
		numeratorLabel: "Total number of triaged signals verified within 24 hours",
		denominatorLabel: "Total number of signals verified",
		kind: "proportion",
		stage: "verification",
		unit: "signals",
	},
	{
		n: 5,
		id: "signal-to-event",
		label: "Events confirmed",
		name: "Signal-to-event conversion rate",
		definition:
			"Proportion of verified signals classified as events requiring risk assessment.",
		numeratorLabel: "Total number of events",
		denominatorLabel: "Total number of verified signals",
		kind: "proportion",
		stage: "verification",
		unit: "events",
		note: "An event is a verified signal whose outcome is Confirmed.",
	},
	{
		n: 6,
		id: "events-risk-assessed",
		label: "Events risk-assessed",
		name: "Events assessed for risk",
		definition: "Proportion of events assessed for risk.",
		numeratorLabel: "Total number of signals risk assessed",
		denominatorLabel: "Total number of signals verified",
		kind: "proportion",
		stage: "risk",
		unit: "events",
	},
	{
		n: 7,
		id: "response-initiated",
		label: "Response initiated",
		name: "Response initiated",
		definition: "Proportion of events where response was initiated.",
		numeratorLabel: "Number of events where response was initiated",
		denominatorLabel: "Total number of events risk assessed",
		kind: "proportion",
		stage: "response",
		unit: "events",
		note: "Response initiated = the risk-assessment action was Respond, or a sample, EMS evacuation, SDB or admission is on record.",
	},
	{
		n: 8,
		id: "under-monitoring",
		label: "Under monitoring",
		name: "Events under monitoring",
		definition: "Proportion of events under monitoring.",
		numeratorLabel: "Number of events under monitoring",
		denominatorLabel: "Total number of events risk assessed",
		kind: "proportion",
		stage: "response",
		unit: "events",
	},
	{
		n: 9,
		id: "events-responded",
		label: "Samples collected",
		name: "Events responded to",
		definition: "Proportion of events whose sample was collected.",
		numeratorLabel: "Total number of events whose sample was collected",
		denominatorLabel: "Total number of events where response was initiated",
		kind: "proportion",
		stage: "response",
		unit: "events",
	},
	{
		n: 10,
		id: "events-evacuated",
		label: "Evacuated by EMS",
		name: "Events evacuated",
		definition: "Proportion of events evacuated.",
		numeratorLabel: "Total number of events evacuated",
		denominatorLabel: "Total number of events where reporting channel is 912 (EMS)",
		kind: "proportion",
		stage: "response",
		unit: "events",
	},
	{
		n: 11,
		id: "sdb",
		label: "Safe & dignified burials",
		name: "Safe and dignified burial (SDB)",
		definition: "Proportion of events who had a safe and dignified burial (SDB).",
		numeratorLabel: "Total number of events who had a safe and dignified burial",
		denominatorLabel:
			"Total number of events whose status is Dead and has ≥ High risk at assessment",
		kind: "proportion",
		stage: "response",
		unit: "events",
	},
	{
		n: 12,
		id: "alerts",
		label: "Alerts issued",
		name: "Alerts",
		definition: "Proportion of alerts reported.",
		numeratorLabel: "Total number of alerts reported",
		denominatorLabel: "Total number of events risk assessed",
		kind: "proportion",
		stage: "alert",
		unit: "alerts",
		note: "An alert is a verified signal that was not discarded.",
	},
];

/** Numerator / denominator picked out of the API counts, per row. */
function countsFor(
	id: string,
	i: DashboardIndicators
): { numerator: number; denominator: number | null } {
	switch (id) {
		case "signals-reported":
			return { numerator: i.signalsReported, denominator: null };
		case "signals-triaged":
			return { numerator: i.triagedWithin24h, denominator: i.signalsTriaged };
		case "duplicated-signals":
			return { numerator: i.duplicateSignals, denominator: i.signalsReported };
		case "signals-verified":
			return { numerator: i.verifiedWithin24h, denominator: i.signalsVerified };
		case "signal-to-event":
			return { numerator: i.events, denominator: i.signalsVerified };
		case "events-risk-assessed":
			return { numerator: i.eventsRiskAssessed, denominator: i.signalsVerified };
		case "response-initiated":
			return { numerator: i.responseInitiated, denominator: i.eventsRiskAssessed };
		case "under-monitoring":
			return { numerator: i.underMonitoring, denominator: i.eventsRiskAssessed };
		case "events-responded":
			return { numerator: i.sampleCollected, denominator: i.responseInitiated };
		case "events-evacuated":
			return { numerator: i.evacuated, denominator: i.emsChannelEvents };
		case "sdb":
			return { numerator: i.sdb, denominator: i.sdbEligible };
		case "alerts":
			return { numerator: i.alertsReported, denominator: i.eventsRiskAssessed };
		default:
			return { numerator: 0, denominator: null };
	}
}

/**
 * A share of a whole, or null when there is no honest share to give: the whole
 * is empty, or the part is not actually inside it (a count that exceeds its
 * "denominator" is a definition mismatch, not a 700% rate).
 */
export function percent(part: number, whole: number): number | null {
	if (whole <= 0 || part < 0 || part > whole) return null;
	return Math.round((part / whole) * 100);
}

const EMPTY_INDICATORS: DashboardIndicators = {
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
};

/**
 * Every row of the table, valued as a count. Tolerates a summary from an older
 * API that has no `indicators` block by rendering zeros — the board must never
 * crash because the backend is a version behind.
 */
export function buildEbsIndicatorRows(
	summary: DashboardSummary | undefined
): EbsIndicatorRow[] {
	const counts = summary?.indicators ?? EMPTY_INDICATORS;
	return EBS_INDICATORS.map((def) => {
		const { numerator, denominator } = countsFor(def.id, counts);
		return {
			...def,
			numerator,
			denominator: def.kind === "count" ? null : denominator,
			value: numerator,
			display: numerator.toLocaleString(),
			caption: def.kind === "count" ? def.definition : `${def.numeratorLabel}.`,
		};
	});
}

export interface CascadeStep {
	key: string;
	label: string;
	count: number;
}

/**
 * The signal funnel behind the table — each stage a signal passes through, as
 * a count, in pipeline order. Alerts are appended last: they are verified
 * non-discarded signals, so they sit beside the event count rather than under
 * the response rows.
 */
export function buildSignalCascade(summary: DashboardSummary | undefined): CascadeStep[] {
	const i = summary?.indicators ?? EMPTY_INDICATORS;
	return [
		{ key: "reported", label: "Signals reported", count: i.signalsReported },
		{ key: "triaged", label: "Signals triaged", count: i.signalsTriaged },
		{ key: "verified", label: "Signals verified", count: i.signalsVerified },
		{ key: "events", label: "Events", count: i.events },
		{ key: "assessed", label: "Risk assessed", count: i.eventsRiskAssessed },
		{ key: "responded", label: "Response initiated", count: i.responseInitiated },
		{ key: "alerts", label: "Alerts", count: i.alertsReported },
	];
}

/** How the board groups the proportion tiles, in pipeline order. */
export const EBS_TILE_GROUPS: readonly { title: string; ids: readonly string[] }[] = [
	{
		title: "Triage & verification",
		ids: ["signals-triaged", "duplicated-signals", "signals-verified", "signal-to-event"],
	},
	{
		title: "Risk assessment & response",
		ids: [
			"events-risk-assessed",
			"response-initiated",
			"under-monitoring",
			"events-responded",
			"events-evacuated",
			"sdb",
			"alerts",
		],
	},
];

export const EBS_STAGE_LABELS: Record<EbsStage, string> = {
	detection: "Detection",
	triage: "Triage",
	verification: "Verification",
	risk: "Risk assessment",
	response: "Response",
	alert: "Alerts",
};

/** One epi week of one indicator's trend. */
export interface IndicatorTrendPoint {
	week: string;
	/** Axis tick, e.g. "W35" — or "W35 '26" when the series spans years. */
	label: string;
	year: number;
	weekNo: number;
	start: string;
	end: string;
	numerator: number;
	/** The published denominator's count that week, for reference; null for a count row. */
	denominator: number | null;
	/** The week's count — what the graph plots. */
	value: number;
}

function weekTick(p: DashboardWeekPoint, multiYear: boolean): string {
	const w = `W${String(p.weekNo).padStart(2, "0")}`;
	return multiYear ? `${w} '${String(p.year).slice(2)}` : w;
}

function spansYears(series: DashboardWeekPoint[]): boolean {
	return series.length > 0 && series[0].year !== series[series.length - 1].year;
}

/** The trend of one indicator across the epi weeks in scope, as weekly counts. */
export function buildIndicatorTrend(
	summary: DashboardSummary | undefined,
	id: string
): IndicatorTrendPoint[] {
	const series = summary?.indicatorSeries ?? [];
	const def = EBS_INDICATORS.find((d) => d.id === id);
	const multiYear = spansYears(series);
	return series.map((p) => {
		const { numerator, denominator } = countsFor(id, p.counts);
		return {
			week: p.week,
			label: weekTick(p, multiYear),
			year: p.year,
			weekNo: p.weekNo,
			start: p.start,
			end: p.end,
			numerator,
			denominator: def?.kind === "count" ? null : denominator,
			value: numerator,
		};
	});
}

/** One epi week of the signal funnel: the four headline counts side by side. */
export interface WeeklyCascadePoint {
	week: string;
	label: string;
	start: string;
	end: string;
	reported: number;
	triaged: number;
	verified: number;
	events: number;
	alerts: number;
}

export function buildWeeklyCascade(summary: DashboardSummary | undefined): WeeklyCascadePoint[] {
	const series = summary?.indicatorSeries ?? [];
	const multiYear = spansYears(series);
	return series.map((p) => ({
		week: p.week,
		label: weekTick(p, multiYear),
		start: p.start,
		end: p.end,
		reported: p.counts.signalsReported,
		triaged: p.counts.signalsTriaged,
		verified: p.counts.signalsVerified,
		events: p.counts.events,
		alerts: p.counts.alertsReported,
	}));
}

/** "Epi weeks W01–W35 2026" (or across years, "W48 2025 – W35 2026"). */
export function epiWeekSpanLabel(summary: DashboardSummary | undefined): string {
	const series = summary?.indicatorSeries ?? [];
	if (series.length === 0) return "no dated signals in scope";
	const first = series[0];
	const last = series[series.length - 1];
	const w = (p: DashboardWeekPoint) => `W${String(p.weekNo).padStart(2, "0")}`;
	if (series.length === 1) return `Epi week ${w(first)} ${first.year}`;
	if (first.year === last.year) return `Epi weeks ${w(first)}–${w(last)} ${first.year}`;
	return `Epi weeks ${w(first)} ${first.year} – ${w(last)} ${last.year}`;
}

/** "Epi week 35, 2026 · 24 Aug – 30 Aug" for a tooltip. */
export function epiWeekTitle(p: { weekNo: number; year: number; start: string; end: string }): string {
	const fmt = (iso: string) => {
		const d = new Date(`${iso}T00:00:00`);
		return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
	};
	return `Epi week ${p.weekNo}, ${p.year} · ${fmt(p.start)} – ${fmt(p.end)}`;
}
