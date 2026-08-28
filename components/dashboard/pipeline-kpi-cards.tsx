"use client";

import { memo } from "react";
import {
	AlarmClockOff,
	ArrowRight,
	CircleSlash,
	ClipboardList,
	Flame,
	MessageSquareReply,
	MessageSquareWarning,
	ShieldAlert,
	ShieldCheck,
	ShieldQuestion,
	Split,
	Timer,
	TrendingUp,
	type LucideIcon,
} from "lucide-react";

import {
	AMBER_INK,
	EMERALD_INK,
	INDIGO_INK,
	ROSE_INK,
	SKY_INK,
	SLATE_INK,
	StatCard,
	TEAL_INK,
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

/**
 * Step 3 — verification. KPI 4: verified inside the deadline the signal's
 * priority set (High 12h / Medium 24h / Low 48h), >80%. KPI 5 rides along:
 * signal-to-event conversion, the share of adjudicated signals that turned out
 * to be real events.
 *
 * The backend has computed all of this since the SLA was re-tiered; nothing
 * rendered it, which left the dashboard reporting the gate before verification
 * and the gate after it but not verification's own timeliness.
 */
export const VerificationKpiCards = memo<RowProps>(({ summary, isLoading }) => {
	const sla = summary?.verificationSla;
	const onTime = sla?.verifiedWithinDeadline ?? 0;
	const late = sla?.verifiedLate ?? 0;
	const verified = onTime + late;
	const breached = sla?.pendingBreached ?? 0;
	const critical = sla?.pendingCritical ?? 0;

	const onTimePct = pct(onTime, verified);
	const conversion = summary?.signalToEventRate ?? -1;

	const cards: {
		title: string;
		value: string;
		sub: string;
		hint: string;
		icon: LucideIcon;
		ink: StatCardInk;
	}[] = [
		{
			title: "Verified on time",
			value: onTime.toLocaleString(),
			sub: verified > 0 ? `${onTimePct}% of those verified` : "nothing verified yet",
			hint: "KPI 4, target >80%. Verified inside the deadline the signal's triage priority set — High 12h, Medium 24h, Low 48h. Untriaged signals are held to the Medium deadline.",
			icon: ShieldCheck,
			ink: EMERALD_INK,
		},
		{
			title: "Verified late",
			value: late.toLocaleString(),
			sub: verified > 0 ? `${100 - onTimePct}% of those verified` : "nothing verified yet",
			hint: "Verified only after the deadline had passed. Counted, not forgiven — a late verification still closes the signal, so without this number the on-time rate has no denominator.",
			icon: AlarmClockOff,
			ink: late > 0 ? AMBER_INK : SLATE_INK,
		},
		{
			title: "Past deadline, still open",
			value: breached.toLocaleString(),
			sub:
				critical > 0
					? `${critical.toLocaleString()} past twice the deadline`
					: "none critically overdue",
			hint: "The live breach list: signals still awaiting verification whose deadline has already passed. Unlike the two cards to the left, this one is actionable right now.",
			icon: Flame,
			ink: breached > 0 ? ROSE_INK : EMERALD_INK,
		},
		{
			title: "Signal-to-event rate",
			value: conversion < 0 ? "n/a" : `${conversion}%`,
			sub:
				conversion < 0
					? "nothing adjudicated yet"
					: "confirmed ÷ confirmed + discarded",
			hint: "KPI 5. The share of adjudicated signals that turned out to be real events. The guideline sets no target — it is a baseline to establish. A very low rate means noise is reaching verification; a very high one means signals are being filtered out before they get there.",
			icon: Split,
			ink: INDIGO_INK,
		},
	];

	return (
		<section className="space-y-1.5">
			<header className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold text-uganda-black">
					Verification{" "}
					<span className="text-xs font-normal text-gray-500">— EBS step 3</span>
				</h2>
				{!isLoading && verified > 0 && (
					<p className="text-xs text-gray-600">
						<TargetNote met={onTimePct >= 80}>
							{onTime.toLocaleString()} of {verified.toLocaleString()} verified on time
						</TargetNote>{" "}
						· KPI 4 target &gt;80%
					</p>
				)}
			</header>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
				{cards.map((c) => (
					<StatCard
						key={c.title}
						title={c.title}
						value={c.value}
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
VerificationKpiCards.displayName = "VerificationKpiCards";

/**
 * Step 7 — feedback to the reporter. KPI 10: >80% of concluded signals.
 *
 * Scored over signals that have a CONCLUSION — confirmed or discarded. Discards
 * are in the denominator deliberately: "we checked, it was not an outbreak" is
 * what keeps someone reporting next time, and community EBS runs on people
 * choosing to report.
 */
export const FeedbackKpiCards = memo<RowProps>(({ summary, isLoading }) => {
	const rate = summary?.feedbackRate ?? -1;
	const pending = summary?.feedbackPending ?? 0;
	const communityRate = summary?.communityReportingRate ?? -1;
	const communitySignals = summary?.communitySignals ?? 0;
	// Denominator and numerator come from the API as counts. Reconstructing them
	// from the rounded percentage is undefined at 0% and 100% — exactly where
	// this KPI currently sits.
	const due = summary?.feedbackDue ?? 0;
	const given = summary?.feedbackGiven ?? 0;

	const cards: {
		title: string;
		value: string;
		sub: string;
		hint: string;
		icon: LucideIcon;
		ink: StatCardInk;
	}[] = [
		{
			title: "Feedback still owed",
			value: pending.toLocaleString(),
			sub: rate < 0 ? "nothing concluded yet" : `${100 - rate}% of concluded signals`,
			hint: "Signals that reached a conclusion — confirmed or discarded — whose reporter has not been told what happened. This is a working queue, not just a statistic.",
			icon: MessageSquareWarning,
			ink: pending > 0 ? AMBER_INK : EMERALD_INK,
		},
		{
			title: "Feedback given",
			value: rate < 0 ? "n/a" : `${rate}%`,
			sub:
				rate < 0
					? "nothing concluded yet"
					: `${given.toLocaleString()} of ${due.toLocaleString()} concluded`,
			hint: "KPI 10, target >80%. Discarded signals count towards the denominator on purpose — telling someone their report was checked and found to be nothing is what keeps them reporting.",
			icon: MessageSquareReply,
			ink: EMERALD_INK,
		},
		{
			title: "Community reporting rate",
			value: communityRate < 0 ? "n/a" : `${communityRate}%`,
			sub:
				communityRate < 0
					? "no signals in scope"
					: `${communitySignals.toLocaleString()} community-detected`,
			hint: "KPI 9. Signals detected at community level — VHTs, CHEWs, community members, schools — as a share of all signals. Tracked as a trend, not against a target: a falling share means the detection arm is degrading quietly, whatever the totals do.",
			icon: TrendingUp,
			ink: TEAL_INK,
		},
	];

	return (
		<section className="space-y-1.5">
			<header className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold text-uganda-black">
					Feedback &amp; detection{" "}
					<span className="text-xs font-normal text-gray-500">
						— EBS step 7 and the community arm
					</span>
				</h2>
				{!isLoading && rate >= 0 && (
					<p className="text-xs text-gray-600">
						<TargetNote met={rate >= 80}>{rate}% of concluded signals fed back</TargetNote>{" "}
						· KPI 10 target &gt;80%
					</p>
				)}
			</header>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
				{cards.map((c) => (
					<StatCard
						key={c.title}
						title={c.title}
						value={c.value}
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
FeedbackKpiCards.displayName = "FeedbackKpiCards";
