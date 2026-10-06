import type {
	DashboardIndicators,
	DashboardSummary,
	DashboardWeekPoint,
} from "@/lib/fetch-dashboard";

/**
 * The EBS indicator table — the twelve rows the dashboard reports, each with
 * the definition, numerator and denominator as published, and the value
 * derived from the counts the API returns.
 *
 * A proportion row is shown as a RATE only when its denominator really
 * contains its numerator in the register — `rateBase` below decides that row
 * by row. Rows 10 and 11 do not qualify (an evacuation is recorded whatever
 * the reporting channel was, so "evacuated ÷ reported via 912" read as
 * 7014%); they stay counts. Every other proportion is a subset by
 * construction (services.buildIndicators), so its rate is safe to show.
 *
 * Timeliness rows divide by the signals a clock can actually judge — triaged
 * with a triage time, verified with a verification time — and report the
 * rest as a gap. Dividing by every triaged signal scored the 3,549 legacy
 * records closed in bulk (no triage time, by design) as missed deadlines.
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
	/** The §11 KPI target this row is held to, when the guideline sets one. */
	target?: { percent: number; kpi: string };
}

export interface EbsIndicatorRow extends EbsIndicatorDefinition {
	numerator: number;
	/** The published denominator's count, kept for reference; null for a count row. */
	denominator: number | null;
	/**
	 * What the rate divides by — a real superset of the numerator — or null
	 * when the row is a count (no honest rate exists).
	 */
	rateBase: number | null;
	/** numerator ÷ rateBase, 0–100 (rounded); null when there is no rate. */
	rate: number | null;
	/** Signals the rate cannot see (e.g. triaged without a triage time). */
	gap: { count: number; label: string } | null;
	/** Where the rate sits against `target`; null without a target or a rate. */
	status: "met" | "below" | null;
	/** The headline: the rate for a rate row, the count otherwise. */
	value: number;
	/** Rendered headline: "29%" or "1,234". */
	display: string;
	/** One line under the headline: "453 of 1,589 timed triages", or the definition. */
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
		note: "Only triages with a recorded triage time are timed; legacy records closed in bulk carry none and are listed as untimed, not as late.",
		target: { percent: 90, kpi: "KPI 3" },
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
		note: "Timed from TRIAGE to the recorded verification time (guideline Ch.4 Step 3, Note 3) — the same clock as the Regional/District performance tables' \"Verify <24h\" — over triaged signals verified with both times on record. Reports → Overview's \"verified within priority deadline\" (12/24/48h) is a different measure.",
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
		denominatorLabel: "Total number of events",
		kind: "proportion",
		stage: "risk",
		unit: "events",
		note: "Divided by confirmed events, not all verified signals: only a confirmed event can be risk-assessed (the server refuses the rest), so a discarded signal is not a missed assessment.",
		target: { percent: 90, kpi: "KPI 6" },
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
		note: "Shown as a count: evacuations are recorded whatever the reporting channel, so the published denominator does not contain them.",
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
		note: "Shown as a count: SDBs are recorded on events never assessed High, so the published denominator does not contain them.",
	},
	{
		n: 12,
		id: "alerts",
		label: "Alerts",
		name: "Alerts",
		definition: "Proportion of alerts reported.",
		numeratorLabel: "Total number of alerts reported",
		denominatorLabel: "Total number of events risk assessed",
		kind: "proportion",
		stage: "alert",
		unit: "alerts",
		note: "An alert is a confirmed, risk-assessed event whose reporter has been told — the same signals the Alerts page and the regional report count.",
	},
];

interface RowCounts {
	numerator: number;
	/** The published denominator's count, for reference. */
	denominator: number | null;
	/** A true superset of the numerator to divide by, or null. */
	rateBase: number | null;
	gap?: { count: number; label: string };
}

/**
 * Numerator, published denominator and honest rate base, per row. An older
 * API without the timed counts falls back to the published denominator.
 */
function countsFor(id: string, i: DashboardIndicators): RowCounts {
	switch (id) {
		case "signals-reported":
			return { numerator: i.signalsReported, denominator: null, rateBase: null };
		case "signals-triaged": {
			const timed = i.triageTimed ?? i.signalsTriaged;
			return {
				numerator: i.triagedWithin24h,
				denominator: i.signalsTriaged,
				rateBase: timed,
				gap: { count: i.signalsTriaged - timed, label: "triaged with no triage time" },
			};
		}
		case "duplicated-signals":
			return { numerator: i.duplicateSignals, denominator: i.signalsReported, rateBase: i.signalsReported };
		case "signals-verified": {
			const eligible = i.triagedVerified ?? i.signalsVerified;
			const timed = i.verificationTimed ?? eligible;
			return {
				numerator: i.verifiedWithin24h,
				denominator: i.signalsVerified,
				rateBase: timed,
				gap: { count: eligible - timed, label: "verified with no triage or verification time" },
			};
		}
		case "signal-to-event":
			return { numerator: i.events, denominator: i.signalsVerified, rateBase: i.signalsVerified };
		case "events-risk-assessed":
			return { numerator: i.eventsRiskAssessed, denominator: i.events, rateBase: i.events };
		case "response-initiated":
			return { numerator: i.responseInitiated, denominator: i.eventsRiskAssessed, rateBase: i.eventsRiskAssessed };
		case "under-monitoring":
			return { numerator: i.underMonitoring, denominator: i.eventsRiskAssessed, rateBase: i.eventsRiskAssessed };
		case "events-responded":
			return { numerator: i.sampleCollected, denominator: i.responseInitiated, rateBase: i.responseInitiated };
		case "events-evacuated":
			return { numerator: i.evacuated, denominator: i.emsChannelEvents, rateBase: null };
		case "sdb":
			return { numerator: i.sdb, denominator: i.sdbEligible, rateBase: null };
		case "alerts":
			return { numerator: i.alertsReported, denominator: i.eventsRiskAssessed, rateBase: i.eventsRiskAssessed };
		default:
			return { numerator: 0, denominator: null, rateBase: null };
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
	triageTimed: 0,
	triagedVerified: 0,
	verificationTimed: 0,
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
 * Every row of the table, valued: a rate where the row has an honest one, a
 * count otherwise. Tolerates a summary from an older API that has no
 * `indicators` block by rendering zeros — the board must never crash because
 * the backend is a version behind.
 */
export function buildEbsIndicatorRows(
	summary: DashboardSummary | undefined
): EbsIndicatorRow[] {
	const counts = summary?.indicators ?? EMPTY_INDICATORS;
	return EBS_INDICATORS.map((def) => {
		const { numerator, denominator, rateBase, gap } = countsFor(def.id, counts);
		const rate = rateBase === null ? null : percent(numerator, rateBase);
		const status =
			def.target && rate !== null ? (rate >= def.target.percent ? "met" : "below") : null;
		const caption =
			rate !== null && rateBase !== null
				? `${numerator.toLocaleString()} of ${rateBase.toLocaleString()} ${rateBaseNoun(def.id)}`
				: def.kind === "count"
					? def.definition
					: `${def.numeratorLabel}.`;
		return {
			...def,
			numerator,
			denominator: def.kind === "count" ? null : denominator,
			rateBase,
			rate,
			gap: gap && gap.count > 0 ? gap : null,
			status,
			value: rate ?? numerator,
			display: rate !== null ? `${rate}%` : numerator.toLocaleString(),
			caption,
		};
	});
}

/** What the rate base counts, for "453 of 1,589 timed triages". */
function rateBaseNoun(id: string): string {
	switch (id) {
		case "signals-triaged":
			return "timed triages";
		case "duplicated-signals":
			return "signals reported";
		case "signals-verified":
			return "timed verifications";
		case "signal-to-event":
			return "verified signals";
		case "events-risk-assessed":
			return "events";
		case "response-initiated":
		case "under-monitoring":
		case "alerts":
			return "risk-assessed events";
		case "events-responded":
			return "responses initiated";
		default:
			return "";
	}
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
	/** The week's rate base (see EbsIndicatorRow.rateBase); null for a count row. */
	rateBase: number | null;
	/** numerator ÷ rateBase that week; null when there is none. */
	rate: number | null;
	/** The week's count — what the graph plots. */
	value: number;
	/** The week has not ended yet: its bars are still filling. */
	partial: boolean;
}

/** Today as YYYY-MM-DD in local time (the epi-week bounds are local dates). */
export function todayIso(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whether an epi week ending on `end` (YYYY-MM-DD) is still under way. */
export function isPartialWeek(end: string, today: string = todayIso()): boolean {
	return end >= today;
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
	const today = todayIso();
	return series.map((p) => {
		const { numerator, denominator, rateBase } = countsFor(id, p.counts);
		return {
			week: p.week,
			label: weekTick(p, multiYear),
			year: p.year,
			weekNo: p.weekNo,
			start: p.start,
			end: p.end,
			numerator,
			denominator: def?.kind === "count" ? null : denominator,
			rateBase,
			rate: rateBase === null ? null : percent(numerator, rateBase),
			value: numerator,
			partial: isPartialWeek(p.end, today),
		};
	});
}

/**
 * One epi week of the signal funnel. The counts NEST — every alert is an
 * event, every event verified, every verified signal reported — which is what
 * lets the chart draw them inside one another.
 */
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
	partial: boolean;
}

export function buildWeeklyCascade(summary: DashboardSummary | undefined): WeeklyCascadePoint[] {
	const series = summary?.indicatorSeries ?? [];
	const multiYear = spansYears(series);
	const today = todayIso();
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
		partial: isPartialWeek(p.end, today),
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
