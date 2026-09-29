import type { DashboardSummary, DashboardWeekPoint } from "@/lib/fetch-dashboard";
import { isPartialWeek, percent, todayIso } from "@/lib/ebs-indicators";
import { buildSignalFlow } from "@/lib/signal-flow";

/**
 * The weekly brief: what the latest COMPLETE epi week in scope says, in five
 * sentences a PHEOC meeting can read aloud. Every figure is a count the API
 * already returned — nothing is estimated — and each sentence names its
 * comparison (the previous four weeks, or the §11 target), because a number
 * without one cannot be acted on.
 *
 * The week under way is never briefed: two days of a week compared with four
 * full ones always reads as a collapse.
 */

export type BriefTone = "good" | "watch" | "bad" | "neutral";

export interface BriefLine {
	key: string;
	tone: BriefTone;
	/** Short label, e.g. "Volume". */
	label: string;
	text: string;
}

export interface WeeklyBrief {
	/** "Epi week 39, 2026" */
	title: string;
	/** "21 Sep – 27 Sep" */
	span: string;
	lines: BriefLine[];
	/** The week under way, when it has signals: "W40 so far: 5 signals". */
	partialNote: string | null;
}

/** A change within ±10% of the baseline reads as steady, not as a trend. */
const STEADY_BAND = 0.1;
const BASELINE_WEEKS = 4;

function fmtDay(iso: string): string {
	const d = new Date(`${iso}T00:00:00`);
	return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function n(v: number): string {
	return v.toLocaleString();
}

function plural(count: number, one: string, many: string): string {
	return `${n(count)} ${count === 1 ? one : many}`;
}

/** Tone for a rate held to a target: met, within 20 points, or far below. */
function targetTone(rate: number, target: number): BriefTone {
	if (rate >= target) return "good";
	return rate >= target - 20 ? "watch" : "bad";
}

/**
 * @param rangeFrom The scope's first day (YYYY-MM-DD), when bounded. A week
 * the range only partly covers is left out of both the brief and its
 * baseline: a 30-day range starting on a Sunday holds one day of that week,
 * and averaging it in understates "normal" by a quarter.
 */
export function buildWeeklyBrief(
	summary: DashboardSummary | undefined,
	today: string = todayIso(),
	rangeFrom?: string
): WeeklyBrief | null {
	const series: DashboardWeekPoint[] = summary?.indicatorSeries ?? [];
	const complete = series.filter(
		(p) => !isPartialWeek(p.end, today) && !(rangeFrom && p.start < rangeFrom)
	);
	const week = complete[complete.length - 1];
	if (!week) return null;

	const c = week.counts;
	const lines: BriefLine[] = [];

	// 1. Volume against the previous weeks' average.
	const prior = complete.slice(-1 - BASELINE_WEEKS, -1);
	if (prior.length >= 2) {
		const avg = prior.reduce((s, p) => s + p.counts.signalsReported, 0) / prior.length;
		const change = avg > 0 ? (c.signalsReported - avg) / avg : 0;
		const pct = Math.round(Math.abs(change) * 100);
		const trend =
			avg === 0
				? "with none in the weeks before"
				: Math.abs(change) <= STEADY_BAND
					? `in line with the ${prior.length}-week average of ${n(Math.round(avg))}`
					: `${pct}% ${change > 0 ? "above" : "below"} the ${prior.length}-week average of ${n(Math.round(avg))}`;
		lines.push({
			key: "volume",
			tone: "neutral",
			label: "Volume",
			text: `${plural(c.signalsReported, "signal", "signals")} reported, ${trend}.`,
		});
	} else {
		lines.push({
			key: "volume",
			tone: "neutral",
			label: "Volume",
			text: `${plural(c.signalsReported, "signal", "signals")} reported.`,
		});
	}

	// 2. Triage timeliness (KPI 3, >90%) over triages a clock can judge.
	const timed = c.triageTimed ?? c.signalsTriaged;
	const triageRate = percent(c.triagedWithin24h, timed);
	if (triageRate !== null) {
		lines.push({
			key: "triage",
			tone: targetTone(triageRate, 90),
			label: "Triage",
			text: `${triageRate}% triaged within 24 hours (${n(c.triagedWithin24h)} of ${n(timed)}; target 90%).`,
		});
	} else if (c.signalsReported > 0) {
		lines.push({
			key: "triage",
			tone: "bad",
			label: "Triage",
			text: "No triage with a recorded time this week.",
		});
	}

	// 3. Verification → events (the signal-to-event conversion).
	if (c.signalsVerified > 0) {
		const conv = percent(c.events, c.signalsVerified);
		lines.push({
			key: "verification",
			tone: "neutral",
			label: "Verification",
			text: `${plural(c.signalsVerified, "signal", "signals")} verified so far; ${plural(c.events, "confirmed as an event", "confirmed as events")}${conv !== null ? ` (${conv}%)` : ""}.`,
		});
	}

	// 4. Risk assessment (KPI 6, >90%) and issued alerts.
	if (c.events > 0) {
		const riskRate = percent(c.eventsRiskAssessed, c.events) ?? 0;
		lines.push({
			key: "risk",
			tone: targetTone(riskRate, 90),
			label: "Risk",
			text: `${riskRate}% of events risk-assessed (${n(c.eventsRiskAssessed)} of ${n(c.events)}; target 90%); ${plural(c.alertsReported, "alert", "alerts")} issued.`,
		});
	}

	// 5. The open queues right now, across the whole scope.
	const flow = buildSignalFlow(summary?.signalFlow);
	const queues = flow.filter((f) => f.group === "queue" && f.count > 0);
	if (queues.length > 0) {
		const open = queues.reduce((s, f) => s + f.count, 0);
		lines.push({
			key: "open",
			tone: "watch",
			label: "Open now",
			text: `${n(open)} in the working queues — ${queues
				.map((q) => `${n(q.count)} ${q.label.toLowerCase()}`)
				.join(", ")}.`,
		});
	}

	const current = series.find((p) => isPartialWeek(p.end, today) && p.start <= today);
	return {
		title: `Epi week ${week.weekNo}, ${week.year}`,
		span: `${fmtDay(week.start)} – ${fmtDay(week.end)}`,
		lines,
		partialNote:
			current && current.counts.signalsReported > 0
				? `Week ${current.weekNo} so far: ${plural(current.counts.signalsReported, "signal", "signals")} (not briefed until it ends).`
				: null,
	};
}
