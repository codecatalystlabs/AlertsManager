"use client";

import { memo } from "react";
import { CircleHelp, Gauge } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/fetch-dashboard";

/**
 * The ten national KPIs (EBS Guidelines §11), all of them, on one card.
 *
 * The point of listing all ten rather than only the ones we can compute: three
 * of them are NOT measurable from the data this system captures, and a KPI that
 * is simply absent from a dashboard reads as a KPI that is fine. Each one that
 * cannot be computed says so, and says what is missing — so the gap is a piece
 * of information the districts can act on rather than a silence.
 *
 * Every figure here is scoped by the page's date/district/region/response
 * filters, exactly like the cards and charts below it. §11 sets a monthly or
 * quarterly reporting frequency, so the range picker is how you produce the
 * period being reported on.
 */

type KpiStatus = "met" | "missed" | "trend" | "unmeasurable";

interface KpiRow {
	/** §11 table position. */
	n: number;
	name: string;
	/** As published, verbatim. */
	target: string;
	frequency: "Monthly" | "Quarterly";
	/** Rendered value, already formatted. */
	value: string;
	/** Supporting counts under the value. */
	detail: string;
	status: KpiStatus;
	/** Only for unmeasurable rows: what is missing and why. */
	blocker?: string;
}

function pctLabel(v: number | undefined): string {
	return v === undefined || v < 0 ? "n/a" : `${v}%`;
}

function rate(part: number, whole: number): number {
	return whole > 0 ? Math.round((part / whole) * 100) : -1;
}

function statusFor(value: number, target: number): KpiStatus {
	if (value < 0) return "unmeasurable";
	return value >= target ? "met" : "missed";
}

const STATUS_STYLES: Record<KpiStatus, { chip: string; label: string }> = {
	met: {
		chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
		label: "On target",
	},
	missed: {
		chip: "bg-rose-50 text-rose-700 ring-rose-600/20",
		label: "Below target",
	},
	trend: {
		chip: "bg-sky-50 text-sky-700 ring-sky-600/20",
		label: "Trend",
	},
	unmeasurable: {
		chip: "bg-amber-50 text-amber-800 ring-amber-600/20",
		label: "Not measurable",
	},
};

function buildRows(summary: DashboardSummary | undefined): KpiRow[] {
	const sla = summary?.verificationSla;

	// KPI 1 — detection rate by source and level. `signalLevels` is optional so
	// an older API response can't crash the card; when it is genuinely absent,
	// say so rather than reporting a 0% that reads as "nothing is classified".
	const levels = summary?.signalLevels;
	const hasLevels = Array.isArray(levels) && levels.length > 0;
	const classified = (levels ?? [])
		.filter(
			(l) =>
				l.label !== "Transport recorded, level not" && l.label !== "Not recorded"
		)
		.reduce((sum, l) => sum + l.count, 0);
	const total = summary?.total ?? 0;

	// KPI 3 — triage completion.
	const triagedOnTime = sla?.triagedWithin24h ?? 0;
	const triagedLate = sla?.triagedLate ?? 0;
	const triaged = triagedOnTime + triagedLate;
	const triageScope = triaged + (sla?.untriaged ?? 0);

	// KPI 4 — verification timeliness.
	const verifiedOnTime = sla?.verifiedWithinDeadline ?? 0;
	const verifiedLate = sla?.verifiedLate ?? 0;
	const verified = verifiedOnTime + verifiedLate;

	// KPI 6 — risk assessment completion.
	const riskRate = summary?.riskAssessmentRate ?? -1;
	const riskLevels = summary?.riskLevels ?? [];
	const notAssessed =
		riskLevels.find((l) => l.label === "Not Assessed")?.count ?? 0;
	const assessed = riskLevels
		.filter((l) => l.label !== "Not Assessed")
		.reduce((sum, l) => sum + l.count, 0);

	// KPI 10 — feedback.
	const feedbackRate = summary?.feedbackRate ?? -1;
	const feedbackDue = summary?.feedbackDue ?? 0;
	const feedbackGiven = summary?.feedbackGiven ?? 0;

	const triageCompletion = rate(triaged, triageScope);
	const verificationTimeliness = rate(verifiedOnTime, verified);
	const communityRate = summary?.communityReportingRate ?? -1;

	return [
		{
			n: 1,
			name: "Signal detection rate, by source and level",
			target: "Trend",
			frequency: "Monthly",
			value: total.toLocaleString(),
			detail:
				total === 0
					? "no signals in scope"
					: hasLevels
						? `${classified.toLocaleString()} classified to a level (${rate(classified, total)}%) · see the Source and Level charts`
						: "level breakdown unavailable from this API version",
			status: "trend",
		},
		{
			n: 2,
			name: "Timeliness of reporting, within 24h of detection",
			target: ">80%",
			frequency: "Monthly",
			value: "n/a",
			detail: "no detection timestamp is captured",
			status: "unmeasurable",
			blocker:
				"The signal record stores when it was REPORTED, not when it was detected, so the 24-hour clock this KPI measures has no start. Needs a detection date/time on the intake form (§3 minimum dataset item 1).",
		},
		{
			n: 3,
			name: "Triage completion, within 24h",
			target: ">90%",
			frequency: "Monthly",
			value: pctLabel(triageCompletion),
			detail:
				triageScope > 0
					? `${triaged.toLocaleString()} of ${triageScope.toLocaleString()} triaged · ${triagedOnTime.toLocaleString()} within 24h`
					: "no signals in scope",
			status: statusFor(triageCompletion, 90),
		},
		{
			n: 4,
			name: "Verification timeliness, 12h High / 24h Medium / 48h Low",
			target: ">80%",
			frequency: "Monthly",
			value: pctLabel(verificationTimeliness),
			detail:
				verified > 0
					? `${verifiedOnTime.toLocaleString()} of ${verified.toLocaleString()} inside deadline · ${verifiedLate.toLocaleString()} late`
					: "nothing verified in scope",
			status: statusFor(verificationTimeliness, 80),
		},
		{
			n: 5,
			name: "Signal-to-event conversion rate",
			target: "Baseline",
			frequency: "Quarterly",
			value: pctLabel(summary?.signalToEventRate),
			detail: "confirmed events ÷ signals adjudicated",
			status: "trend",
		},
		{
			n: 6,
			name: "Risk assessment completion",
			target: ">90%",
			frequency: "Monthly",
			value: pctLabel(riskRate),
			detail:
				assessed + notAssessed > 0
					? `${assessed.toLocaleString()} of ${(assessed + notAssessed).toLocaleString()} confirmed events assessed`
					: "no confirmed events in scope",
			status: statusFor(riskRate, 90),
		},
		{
			n: 7,
			name: "Alert timeliness, risk assessment → alert issued",
			target: "<6 hours",
			frequency: "Monthly",
			value: "n/a",
			detail: "no alert-issued timestamp is captured",
			status: "unmeasurable",
			blocker:
				"Step 5 (SpotRep, bulletin, IHR notification) is not recorded as an event with a time, so the interval this KPI measures has no end. Note the guideline itself states the <6h deadline only in the §11 table and nowhere in the process chapter.",
		},
		{
			n: 8,
			name: "EBS focal person coverage",
			target: ">90%",
			frequency: "Quarterly",
			value: "n/a",
			detail: "no focal-person roster",
			status: "unmeasurable",
			blocker:
				"The system has user accounts, not an EBS focal-person register: no DSFP/SFP/VHT/CHEW role and no expected-per-district denominator, so there is nothing to compute coverage against.",
		},
		{
			n: 9,
			name: "Community reporting rate",
			target: "Trend / increase",
			frequency: "Monthly",
			value: pctLabel(communityRate),
			detail:
				communityRate >= 0
					? `${(summary?.communitySignals ?? 0).toLocaleString()} of ${total.toLocaleString()} signals detected at community level`
					: "no signals in scope",
			status: "trend",
		},
		{
			n: 10,
			name: "Feedback provision rate",
			target: ">80%",
			frequency: "Monthly",
			value: pctLabel(feedbackRate),
			detail:
				feedbackDue > 0
					? `${feedbackGiven.toLocaleString()} of ${feedbackDue.toLocaleString()} concluded signals fed back`
					: "nothing concluded in scope",
			status: statusFor(feedbackRate, 80),
		},
	];
}

interface KpiScorecardProps {
	summary: DashboardSummary | undefined;
	isLoading?: boolean;
}

export const KpiScorecard = memo<KpiScorecardProps>(({ summary, isLoading }) => {
	const rows = buildRows(summary);
	const measurable = rows.filter((r) => r.status !== "unmeasurable").length;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Gauge className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">
							National EBS performance indicators
						</CardTitle>
					</div>
					<span className="text-xs text-gray-500">
						{measurable} of {rows.length} measurable from captured data
					</span>
				</div>
				<CardDescription>
					The ten KPIs of EBS Guidelines §11, scoped to the filters above. Use
					the range picker to produce the month or quarter being reported.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[640px] text-xs">
						<thead>
							<tr className="border-y border-gray-200 bg-gray-50/80 text-left text-[11px] uppercase tracking-wide text-gray-500">
								<th className="w-8 py-1.5 pl-4 font-medium">#</th>
								<th className="py-1.5 font-medium">Indicator</th>
								<th className="w-24 py-1.5 font-medium">Target</th>
								<th className="w-24 py-1.5 text-right font-medium">Current</th>
								<th className="w-32 py-1.5 pr-4 font-medium">Status</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const style = STATUS_STYLES[row.status];
								return (
									<tr
										key={row.n}
										className="border-b border-gray-100 last:border-0 align-top"
									>
										<td className="py-2 pl-4 text-gray-400 tabular-nums">
											{row.n}
										</td>
										<td className="py-2 pr-3">
											<div className="flex items-start gap-1.5">
												<span className="font-medium text-gray-900">
													{row.name}
												</span>
												{row.blocker && (
													<span
														title={row.blocker}
														className="mt-px cursor-help text-amber-600"
														aria-label={row.blocker}
													>
														<CircleHelp className="h-3.5 w-3.5" />
													</span>
												)}
											</div>
											<p
												className={cn(
													"mt-0.5 text-[11px]",
													row.status === "unmeasurable"
														? "text-amber-700"
														: "text-gray-500"
												)}
											>
												{isLoading ? "…" : row.detail}
											</p>
										</td>
										<td className="py-2 text-gray-600 tabular-nums">
											{row.target}
											<span className="block text-[11px] text-gray-400">
												{row.frequency}
											</span>
										</td>
										<td className="py-2 text-right text-sm font-semibold tabular-nums text-gray-900">
											{isLoading ? "—" : row.value}
										</td>
										<td className="py-2 pr-4">
											<span
												className={cn(
													"inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
													style.chip
												)}
											>
												{style.label}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
});
KpiScorecard.displayName = "KpiScorecard";
