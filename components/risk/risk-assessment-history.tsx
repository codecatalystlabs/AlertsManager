"use client";

import useSWR from "swr";

import { RiskBadge } from "./risk-badge";
import { formatDateTime } from "@/lib/format-date";
import {
	fetchAlertHistory,
	parseHistoryDetail,
	type AlertHistoryEvent,
} from "@/lib/fetch-alert-history";
import { rrtMembersDisplay, rrtPersonDisplay } from "@/lib/rrt-team";
import { cn } from "@/lib/utils";

/**
 * The SERIES of risk assessments on one signal, newest first.
 *
 * An event is re-assessed as it develops — a Moderate on Tuesday is a High by
 * Friday — and the alert's own columns only ever hold the latest. Everything a
 * re-assessment overwrote (its matrix cell, its three tiers of analysis, the
 * team standing behind it) survives only in the audit trail, which is what this
 * reads. Without it, "was Moderate" is the entire record of a decision someone
 * may later have to defend.
 *
 * Shares the SWR key with SignalTimeline, so the details dialog fetches the
 * history once however many components on it read the history.
 */
export function RiskAssessmentHistory({
	alertId,
	enabled = true,
	className,
	/** Drop the newest entry — for a view that already shows it as "current". */
	skipLatest = false,
	title,
}: {
	alertId?: number;
	enabled?: boolean;
	className?: string;
	skipLatest?: boolean;
	/** Heading, rendered INSIDE the component so it disappears with the list
	 *  rather than standing over nothing. */
	title?: string;
}) {
	const { data, error, isLoading } = useSWR(
		enabled && alertId ? ["alert-history", alertId] : null,
		() => fetchAlertHistory(alertId as number),
		{ revalidateOnFocus: false }
	);

	// The API returns oldest-first; an assessment history reads newest-first.
	const assessments = (data ?? [])
		.filter((e) => e.action === "risk_assessed")
		.reverse()
		.slice(skipLatest ? 1 : 0);

	if (isLoading) {
		return (
			<div className={cn("space-y-2", className)}>
				{[0, 1].map((i) => (
					<div key={i} className="h-10 animate-pulse rounded bg-muted" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<p className={cn("text-xs text-destructive", className)}>
				Couldn&apos;t load the assessment history: {error.message}
			</p>
		);
	}

	if (assessments.length === 0) return null;

	return (
		<div className={cn("space-y-1.5", className)}>
			{title && (
				<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</p>
			)}
			<ol className="space-y-2">
				{assessments.map((event) => (
					<AssessmentEntry key={event.id} event={event} />
				))}
			</ol>
		</div>
	);
}

function AssessmentEntry({ event }: { event: AlertHistoryEvent }) {
	const d = parseHistoryDetail(event.detail);
	const who = (event.actor || d.by || "").trim() || "system";
	const matrix =
		d.likelihood && d.impact ? `${d.likelihood} × ${d.impact}` : "";
	const team = [
		d.teamLead ? `led by ${rrtPersonDisplay(d.teamLead)}` : "",
		d.teamMembers ? rrtMembersDisplay(d.teamMembers) : "",
	]
		.filter(Boolean)
		.join(" · ");

	// The three tiers, shown only where they were filled in: an assessment
	// recorded without them is a real assessment, not a broken one.
	const tiers: [string, string | undefined][] = [
		["Hazard", d.hazardNote],
		["Exposure", d.exposureNote],
		["Context", d.contextNote],
	];

	return (
		<li className="rounded-md border bg-muted/30 p-2.5 text-xs">
			<div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<RiskBadge level={d.level} />
					{matrix && (
						<span className="text-muted-foreground">{matrix}</span>
					)}
					{d.previousLevel && (
						<span className="text-muted-foreground">
							was {d.previousLevel}
						</span>
					)}
					{d.worksheet === "incomplete" && (
						<span className="text-amber-600">analysis incomplete</span>
					)}
				</div>
				<time className="tabular-nums text-[11px] text-muted-foreground">
					{formatDateTime(event.timestamp, event.timestamp, {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</time>
			</div>

			<p className="mt-1 text-[11px] text-muted-foreground">
				by <span className="font-medium">{who}</span>
				{team ? ` · RRT ${team}` : ""}
			</p>

			{tiers.some(([, value]) => value) && (
				<dl className="mt-1.5 space-y-0.5">
					{tiers.map(([label, value]) =>
						value ? (
							<div key={label} className="flex gap-1.5">
								<dt className="shrink-0 text-muted-foreground">{label}:</dt>
								<dd className="min-w-0 break-words">{value}</dd>
							</div>
						) : null
					)}
				</dl>
			)}

			{d.note && (
				<p className="mt-1 break-words italic text-muted-foreground">
					&ldquo;{d.note}&rdquo;
				</p>
			)}
		</li>
	);
}
