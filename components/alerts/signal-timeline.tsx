"use client";

import { formatDateTime } from "@/lib/format-date";
import { altCode } from "@/lib/alt-code";
import useSWR from "swr";
import {
	Siren,
	Send,
	MessageSquareText,
	PlaneLanding,
	Stethoscope,
	ShieldCheck,
	ShieldQuestion,
	ShieldAlert,
	MessageCircleReply,
	Ambulance,
	Pencil,
	XCircle,
	Trash2,
	CircleDot,
	type LucideIcon,
} from "lucide-react";

import {
	fetchAlertHistory,
	parseHistoryDetail,
	type AlertHistoryDetail,
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
function styleFor(action: string, detail?: AlertHistoryDetail): ActionStyle {
	switch (action) {
		case "created":
			return { label: "Signal created", icon: Siren, tone: "text-sky-600 border-sky-500 bg-sky-50" };
		case "triaged":
			return { label: "Triaged", icon: ShieldQuestion, tone: "text-violet-600 border-violet-500 bg-violet-50" };
		case "risk_assessed":
			return { label: "Risk assessed", icon: ShieldAlert, tone: "text-orange-600 border-orange-500 bg-orange-50" };
		case "feedback_given":
			return { label: "Reporter told", icon: MessageCircleReply, tone: "text-teal-600 border-teal-500 bg-teal-50" };
		case "ems_notified":
			return { label: "Sent to EMS", icon: Ambulance, tone: "text-violet-700 border-violet-600 bg-violet-50" };
		case "forwarded":
			// Each feed's sync logs its new signals by itself; say so, and from
			// which feed, rather than crediting a person with a forward nobody made.
			if (detail?.auto) {
				switch (syncFeed(detail)) {
					case "eCHIS":
						return { label: "Logged automatically from eCHIS", icon: Stethoscope, tone: "text-emerald-700 border-emerald-500 bg-emerald-50" };
					case "PoE":
						return { label: "Logged automatically from PoE", icon: PlaneLanding, tone: "text-violet-700 border-violet-500 bg-violet-50" };
					default:
						return { label: "Logged automatically from 6767", icon: MessageSquareText, tone: "text-sky-700 border-sky-500 bg-sky-50" };
				}
			}
			if (detail?.repeatOf) {
				return { label: "Forwarded again", icon: Send, tone: "text-amber-600 border-amber-500 bg-amber-50" };
			}
			return { label: "Forwarded to district", icon: Send, tone: "text-blue-600 border-blue-500 bg-blue-50" };
		case "verification_pending":
			// An attempt that did not conclude. Amber, not green: nothing was
			// decided, and the signal is still owed a verification.
			return { label: "Could not verify", icon: ShieldQuestion, tone: "text-amber-600 border-amber-500 bg-amber-50" };
		case "desk_verified":
			return { label: "Desk verified", icon: ShieldCheck, tone: "text-emerald-600 border-emerald-500 bg-emerald-50" };
		case "escalated_to_field":
			// A handover, not a conclusion. Amber like "could not verify",
			// because the question is still open — and the gap between this
			// entry and the next one is what the trail exists to show.
			return { label: "Sent for field verification", icon: Send, tone: "text-amber-600 border-amber-500 bg-amber-50" };
		case "field_verified":
			return { label: "Field verified", icon: ShieldCheck, tone: "text-emerald-700 border-emerald-600 bg-emerald-50" };
		case "verified":
			return { label: "Verified", icon: ShieldCheck, tone: "text-emerald-600 border-emerald-500 bg-emerald-50" };
		case "updated":
			return { label: "Updated", icon: Pencil, tone: "text-slate-600 border-slate-400 bg-slate-50" };
		case "discarded":
			return { label: "Discarded", icon: XCircle, tone: "text-amber-600 border-amber-500 bg-amber-50" };
		case "deleted":
			return { label: "Deleted", icon: Trash2, tone: "text-red-600 border-red-500 bg-red-50" };
		case "data_cleanup":
			// A correction made by a data migration, not by a person. Old and
			// new values are in the entry, so it can be read back or undone.
			return { label: "Data corrected", icon: Pencil, tone: "text-slate-600 border-slate-400 bg-slate-50" };
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
			if (d.auto) {
				// Where the district came from is the thing to check at triage:
				// the reporter's org unit is right about 86% of the time.
				if (!d.district) parts.push("no district — set one before triage");
				else if (d.districtSource === "org unit") {
					parts.push(`district ${d.district} (from the reporter's org unit)`);
				} else if (d.districtSource === "traveller address") {
					parts.push(`district ${d.district} (from the traveller's address)`);
				} else parts.push(`to ${d.district}`);
			} else if (d.district) parts.push(`to ${d.district}`);
			if (d.repeatOf) parts.push(`already in the register as ${altCode(d.repeatOf)}`);
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "triaged":
			// Which exit the signal took is the headline — the priority is
			// optional and usually absent, so leading with it would leave most
			// triage entries reading as a bare timestamp.
			if (d.decision) parts.push(String(d.decision));
			if (d.signalCode) parts.push(String(d.signalCode));
			// When a priority IS carried, it is the verification deadline.
			if (d.priority) {
				parts.push(
					d.deadline
						? `${d.priority} — verify within ${Number(d.deadline) / 60}h`
						: String(d.priority)
				);
			}
			if (d.previousPriority) parts.push(`was ${d.previousPriority}`);
			// For a signal triage took OFF the pipeline the reason is the whole
			// point of the entry.
			if (d.reason) parts.push(`“${d.reason}”`);
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "risk_assessed":
			if (d.level) parts.push(String(d.level));
			if (d.previousLevel) parts.push(`was ${d.previousLevel}`);
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "feedback_given":
			if (d.channel) parts.push(`via ${d.channel}`);
			if (d.reporter) parts.push(`to ${d.reporter}`);
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "ems_notified":
			if (d.event) parts.push(String(d.event));
			break;
		case "verification_pending":
			// The reason IS the entry — there is no outcome to lead with.
			if (d.reason) parts.push(`“${d.reason}”`);
			break;
		case "escalated_to_field":
			// What the field team is being asked to do IS the entry — there is
			// no outcome to lead with.
			if (d.request) parts.push(`“${String(d.request)}”`);
			if (d.note) parts.push(`desk tried: “${d.note}”`);
			break;
		case "desk_verified":
		case "field_verified":
		case "verified":
			if (d.outcome) parts.push(d.outcome);
			// Which level answered. Worth stating even though the entry's own
			// label says it: a discard from a field visit and one from a phone
			// call are not the same evidence.
			if (d.verificationLevel) parts.push(`${d.verificationLevel} level`);
			// Why a discard was a discard: countable, and the first thing
			// anyone re-reading a closed signal asks.
			if (d.reason) parts.push(String(d.reason));
			// The split: actions are separate from the outcome now.
			if (d.actions) parts.push(String(d.actions));
			if (d.field) parts.push(d.field);
			if (d.status) parts.push(d.status);
			// What the verifier actually checked, in their own words.
			if (d.note) parts.push(`“${d.note}”`);
			break;
		case "deleted":
			if (d.caseName) parts.push(d.caseName);
			if (d.district) parts.push(d.district);
			if (d.reason) parts.push(String(d.reason));
			break;
		case "data_cleanup": {
			// "region: West Nile → Arua" for each field the cleanup changed.
			if (d.changes) {
				for (const [field, c] of Object.entries(d.changes)) {
					const from = c?.from == null || c.from === "" ? "blank" : String(c.from);
					const to = c?.to == null || c.to === "" ? "blank" : String(c.to);
					parts.push(`${field.replace(/_/g, " ")}: ${from} → ${to}`);
				}
			}
			break;
		}
		default:
			break;
	}
	return parts.filter(Boolean).join(" · ");
}

/** Actor label: the JWT username, else the human name captured in the detail. */
function actorLabel(event: AlertHistoryEvent): string {
	const d = parseHistoryDetail(event.detail);
	const who = (event.actor || d.by || "").trim();
	// Logged by the sync, not by the person whose sync it was: say both, or
	// "by qa_admin" alone reads as if they had moved it by hand. The retired
	// in-sync eCHIS forward recorded its own name, "auto-forward", as the actor.
	if (d.auto) {
		const sync = `the ${syncFeed(d)} sync`;
		return who && who !== "auto-forward" ? `${sync} (run by ${who})` : sync;
	}
	return who || "system";
}

/** Which feed's sync made an automatic entry, from its audit detail's source. */
function syncFeed(d: AlertHistoryDetail): "6767" | "eCHIS" | "PoE" {
	const source = String(d.source ?? "").toLowerCase();
	if (source.includes("echis")) return "eCHIS";
	if (source.includes("point of entry") || source.startsWith("poe")) return "PoE";
	return "6767";
}

function formatWhen(ts: string): string {
	return formatDateTime(ts, ts, {
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
				const style = styleFor(event.action, parseHistoryDetail(event.detail));
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
