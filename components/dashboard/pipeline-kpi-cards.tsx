"use client";

import { memo } from "react";
import {
	ArrowRight,
	CircleSlash,
	ClipboardList,
	ShieldAlert,
	ShieldQuestion,
	Timer,
	TrendingUp,
	type LucideIcon,
} from "lucide-react";

import {
	AMBER_INK,
	EMERALD_INK,
	ROSE_INK,
	SKY_INK,
	SLATE_INK,
	StatCard,
	VIOLET_INK,
	type StatCardInk,
} from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";

/**
 * Triage and risk assessment — steps 2 and 4 of the EBS steps — as their own
 * card rows.
 *
 * The dashboard already reported verification thoroughly and these two barely
 * at all, which quietly framed the pipeline as "report it, verify it, done".
 * Both steps carry a national KPI with a target (triage completion >90% within
 * 24h, risk assessment completion >90%), and neither was on the page.
 *
 * Each row pairs a headline number with the breakdown beneath it, because the
 * count alone misleads in opposite directions: a small "awaiting triage" is
 * good, a small "assessed" is bad, and only the denominator says which.
 */

function countOf(items: DashboardCountItem[] | undefined, label: string): number {
	return items?.find((i) => i.label === label)?.count ?? 0;
}

function pct(part: number, whole: number): number {
	return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** A KPI target line: "3 of 9 — target >90%" plus whether it is being met. */
function TargetNote({
	met,
	children,
}: {
	met: boolean;
	children: React.ReactNode;
}) {
	return (
		<span className={cn("font-semibold", met ? "text-emerald-700" : "text-destructive")}>
			{children}
		</span>
	);
}

interface RowProps {
	summary: DashboardSummary | undefined;
	isLoading?: boolean;
}

/**
 * Step 2 — triage. KPI 3: triage completed within 24 hours of receipt, >90%.
 *
 * "Awaiting triage" leads because it is the actionable number: every signal in
 * it is one nobody has decided about, and under the mandatory gate none of them
 * can be verified until someone does.
 */
export const TriageKpiCards = memo<RowProps>(({ summary, isLoading }) => {
	const sla = summary?.verificationSla;
	const untriaged = sla?.untriaged ?? 0;
	const onTime = sla?.triagedWithin24h ?? 0;
	const late = sla?.triagedLate ?? 0;
	const triaged = onTime + late;
	const total = untriaged + triaged;

	const outcomes = summary?.triageOutcomes;
	const forwarded = countOf(outcomes, "Forwarded to Verification");
	const logged = countOf(outcomes, "Logged");
	const discarded = countOf(outcomes, "Discarded");

	const completionPct = pct(triaged, total);
	const onTimePct = pct(onTime, triaged);

	const cards: {
		title: string;
		value: number;
		sub: React.ReactNode;
		hint: string;
		icon: LucideIcon;
		ink: StatCardInk;
	}[] = [
			{
				title: "Awaiting triage",
				value: untriaged,
				sub:
					total > 0
						? `${100 - completionPct}% of signals in scope`
						: "no signals in scope",
				hint: "Signals that have never been through the triage gate. Triage is mandatory, so none of these can be verified until someone decides.",
				icon: ShieldQuestion,
				ink: untriaged > 0 ? AMBER_INK : EMERALD_INK,
			},
			{
				title: "Triaged within 24h",
				value: onTime,
				sub: triaged > 0 ? `${onTimePct}% of those triaged` : "nothing triaged yet",
				hint: "KPI 3, target >90%. Triage completed within 24 hours of the signal being received.",
				icon: Timer,
				ink: EMERALD_INK,
			},
			{
				title: "Forwarded to verification",
				value: forwarded,
				sub: triaged > 0 ? `${pct(forwarded, triaged)}% of decisions` : "no decisions yet",
				hint: "Passed both triage questions and carries a priority — the only exit that continues down the pipeline.",
				icon: ArrowRight,
				ink: SKY_INK,
			},
			{
				title: "Discarded or logged",
				value: discarded + logged,
				sub:
					triaged > 0
						? `${discarded} duplicate · ${logged} no threat`
						: "no decisions yet",
				hint: "Signals triage took off the pipeline: discarded as already reported and under investigation, or logged and monitored as no public-health threat. Recorded, never deleted.",
				icon: CircleSlash,
				ink: SLATE_INK,
			},
		];

	return (
		<section className="space-y-1.5">
			<header className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold text-uganda-black">
					Triage <span className="text-xs font-normal text-gray-500">— EBS step 2</span>
				</h2>
				{!isLoading && total > 0 && (
					<p className="text-xs text-gray-600">
						<TargetNote met={onTimePct >= 90 && triaged > 0}>
							{onTime.toLocaleString()} of {triaged.toLocaleString()} triaged on time
						</TargetNote>{" "}
						· KPI 3 target &gt;90% within 24h
					</p>
				)}
			</header>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
				{cards.map((c) => (
					<StatCard
						key={c.title}
						title={c.title}
						value={c.value.toLocaleString()}
						subText={typeof c.sub === "string" ? c.sub : undefined}
						hint={c.hint}
						icon={c.icon}
						ink={c.ink}
						isLoading={isLoading}
					/>
				))}
			</div>
		</section>
	);
});
TriageKpiCards.displayName = "TriageKpiCards";

/**
 * Step 4 — rapid risk assessment. KPI 6: completion >90%, due within 24 hours
 * of verification.
 *
 * Scored over CONFIRMED events only, which is the same population the guideline
 * scores: a discarded signal is not an event, and putting a risk level on one
 * would misstate what the level is for.
 */
export const RiskKpiCards = memo<RowProps>(({ summary, isLoading }) => {
	const levels = summary?.riskLevels;
	const notAssessed = countOf(levels, "Not Assessed");
	const assessed =
		(levels ?? [])
			.filter((l) => l.label !== "Not Assessed")
			.reduce((sum, l) => sum + l.count, 0) ?? 0;
	const confirmed = assessed + notAssessed;

	const rate = summary?.riskAssessmentRate ?? 0;
	const onTime = summary?.riskAssessedWithin24h ?? 0;
	const late = summary?.riskAssessedLate ?? 0;
	const worksheets = summary?.riskWorksheetComplete ?? 0;
	const severe = countOf(levels, "High") + countOf(levels, "Very High");

	const cards = [
		{
			title: "Awaiting risk assessment",
			value: notAssessed,
			sub:
				confirmed > 0
					? `${100 - rate}% of confirmed events`
					: "no confirmed events in scope",
			hint: "Confirmed events with no risk level yet. The level selects the response the guideline mandates, so an unscored event has no assigned response.",
			icon: ShieldAlert,
			ink: notAssessed > 0 ? AMBER_INK : EMERALD_INK,
		},
		{
			title: "Assessed within 24h",
			value: onTime,
			sub:
				assessed > 0
					? `${pct(onTime, assessed)}% of assessments`
					: "nothing assessed yet",
			hint: "Risk assessed within 24 hours of verification. Late assessments are counted separately, not forgiven.",
			icon: Timer,
			ink: EMERALD_INK,
		},
		{
			title: "High or Very High",
			value: severe,
			sub: assessed > 0 ? `${pct(severe, assessed)}% of assessed events` : "nothing assessed yet",
			hint: "Events the national algorithm scored High or Very High — senior management attention, and for Very High an immediate response even outside working hours.",
			icon: TrendingUp,
			ink: ROSE_INK,
		},
		{
			title: "Worksheet completed",
			value: worksheets,
			sub:
				assessed > 0
					? `${pct(worksheets, assessed)}% of assessments`
					: "nothing assessed yet",
			hint: "Assessments that also recorded the §6 worksheet — hazard, exposure and context — rather than the three algorithm answers alone. The level says what; the worksheet says why.",
			icon: ClipboardList,
			ink: VIOLET_INK,
		},
	];

	return (
		<section className="space-y-1.5">
			<header className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold text-uganda-black">
					Risk assessment{" "}
					<span className="text-xs font-normal text-gray-500">— EBS step 4</span>
				</h2>
				{!isLoading && confirmed > 0 && (
					<p className="text-xs text-gray-600">
						<TargetNote met={rate >= 90}>
							{rate}% of confirmed events assessed
						</TargetNote>{" "}
						· KPI 6 target &gt;90%
						{late > 0 && ` · ${late.toLocaleString()} late`}
					</p>
				)}
			</header>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
				{cards.map((c) => (
					<StatCard
						key={c.title}
						title={c.title}
						value={c.value.toLocaleString()}
						subText={c.sub}
						hint={c.hint}
						icon={c.icon}
						ink={c.ink}
						isLoading={isLoading}
					/>
				))}
			</div>
		</section>
	);
});
RiskKpiCards.displayName = "RiskKpiCards";
