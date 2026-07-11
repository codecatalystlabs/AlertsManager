"use client";

import useSWR from "swr";
import {
	Siren,
	Send,
	ShieldCheck,
	Pencil,
	XCircle,
	Trash2,
	CircleDot,
	type LucideIcon,
} from "lucide-react";

import {
	fetchAlertHistory,
	parseHistoryDetail,
	type AlertHistoryEvent,
} from "@/lib/fetch-alert-history";
import { cn } from "@/lib/utils";

interface SignalTimelineProps {
	/** Alert id; when undefined the timeline simply renders empty (no fetch). */
	alertId?: number;
	/** Only fetch while the containing dialog is open. */
	enabled?: boolean;
}

interface ActionStyle {
	label: string;
	icon: LucideIcon;
	/** tailwind text/border/bg accents for the node. */
	tone: string;
}

/** Map a stable action slug to its display style. Unknown actions fall back. */
function styleFor(action: string): ActionStyle {
	switch (action) {
		case "created":
			return { label: "Signal created", icon: Siren, tone: "text-sky-600 border-sky-500 bg-sky-50" };
		case "forwarded":
			return { label: "Forwarded to district", icon: Send, tone: "text-blue-600 border-blue-500 bg-blue-50" };
		case "desk_verified":
			return { label: "Desk verified", icon: ShieldCheck, tone: "text-emerald-600 border-emerald-500 bg-emerald-50" };
		case "verified":
			return { label: "Verified", icon: ShieldCheck, tone: "text-emerald-600 border-emerald-500 bg-emerald-50" };
		case "updated":
			return { label: "Updated", icon: Pencil, tone: "text-slate-600 border-slate-400 bg-slate-50" };
		case "discarded":
			return { label: "Discarded", icon: XCircle, tone: "text-amber-600 border-amber-500 bg-amber-50" };
		case "deleted":
			return { label: "Deleted", icon: Trash2, tone: "text-red-600 border-red-500 bg-red-50" };
		default:
			return { label: action, icon: CircleDot, tone: "text-slate-600 border-slate-400 bg-slate-50" };
	}
}

/** Human-readable one-liner summarising an event's parsed detail. */
function summarise(event: AlertHistoryEvent): string {
	const d = parseHistoryDetail(event.detail);
	const parts: string[] = [];
	switch (event.action) {
		case "created":
			if (d.source) parts.push(d.source);
			if (d.district) parts.push(d.district);
			break;
		case "forwarded":
			if (d.origin) parts.push(`from ${d.origin}`);
			if (d.district) parts.push(`to ${d.district}`);
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "desk_verified":
		case "verified":
			if (d.outcome) parts.push(d.outcome);
			if (d.field) parts.push(d.field);
			if (d.status) parts.push(d.status);
			break;
		case "deleted":
			if (d.caseName) parts.push(d.caseName);
			if (d.district) parts.push(d.district);
			break;
		default:
			break;
	}
	return parts.filter(Boolean).join(" · ");
}

/** Actor label: the JWT username, else the human name captured in the detail. */
function actorLabel(event: AlertHistoryEvent): string {
	const d = parseHistoryDetail(event.detail);
	const who = (event.actor || d.by || "").trim();
	return who || "system";
}

function formatWhen(ts: string): string {
	const date = new Date(ts);
	if (Number.isNaN(date.getTime())) return ts;
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * SignalTimeline renders an alert's lifecycle audit trail — every recorded
 * transition (created → forwarded → verified …) with its actor and exact time —
 * as a vertical timeline. Enforced server-side, so a signal is fully traceable.
 */
export function SignalTimeline({ alertId, enabled = true }: SignalTimelineProps) {
	const { data, error, isLoading } = useSWR(
		enabled && alertId ? ["alert-history", alertId] : null,
		() => fetchAlertHistory(alertId as number),
		{ revalidateOnFocus: false }
	);

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[0, 1].map((i) => (
					<div key={i} className="flex items-center gap-3">
						<div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
						<div className="h-4 flex-1 animate-pulse rounded bg-muted" />
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-xs text-destructive">
				Couldn&apos;t load the traceability timeline: {error.message}
			</p>
		);
	}

	if (!data || data.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				No lifecycle events recorded yet. New transitions (forward, verify,
				edit) are tracked from here on.
			</p>
		);
	}

	return (
		<ol className="relative space-y-3">
			{data.map((event, idx) => {
				const style = styleFor(event.action);
				const Icon = style.icon;
				const detail = summarise(event);
				const isLast = idx === data.length - 1;
				return (
					<li key={event.id} className="relative flex gap-3">
						{/* connector line */}
						{!isLast && (
							<span
								className="absolute left-3 top-6 h-[calc(100%+0.25rem)] w-px -translate-x-1/2 bg-border"
								aria-hidden
							/>
						)}
						<span
							className={cn(
								"relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
								style.tone
							)}
						>
							<Icon className="h-3.5 w-3.5" />
						</span>
						<div className="min-w-0 flex-1 pb-1">
							<div className="flex flex-wrap items-baseline justify-between gap-x-2">
								<p className="text-sm font-medium text-foreground">
									{style.label}
								</p>
								<time className="text-[11px] tabular-nums text-muted-foreground">
									{formatWhen(event.timestamp)}
								</time>
							</div>
							{detail && (
								<p className="truncate text-xs text-muted-foreground">
									{detail}
								</p>
							)}
							<p className="text-[11px] text-muted-foreground">
								by <span className="font-medium">{actorLabel(event)}</span>
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
