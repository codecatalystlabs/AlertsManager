import type { DashboardCountItem } from "@/lib/fetch-dashboard";

/**
 * Where every signal in scope is NOW — the dashboard's answer to "where are
 * signals stuck?". The backend (services/signal_facts.go → buildSignalFlow)
 * puts each signal in exactly one state, furthest stage first, so the states
 * sum to Signals reported and a legacy signal verified before triage existed
 * reads as verified, never as awaiting triage.
 *
 * It replaces the "signal cascade", which was not a funnel: it drew Verified
 * (14,131) above Triaged (9,750) and Alerts (7,831) above Risk assessed (983),
 * because each bar was counted by a different rule.
 */

export type SignalFlowGroup = "queue" | "exit" | "done" | "issue";

export interface SignalFlowState {
	key: string;
	label: string;
	group: SignalFlowGroup;
	/** What the state means, for the hover hint. */
	hint: string;
	/** The register queue holding exactly these signals, when there is one. */
	href?: string;
	/** Chart colour — queues warm, exits neutral, the finished state green. */
	color: string;
}

/** In pipeline order; keys match services.Flow* in signal_facts.go. */
export const SIGNAL_FLOW_STATES: readonly SignalFlowState[] = [
	{
		key: "awaiting-triage",
		label: "Awaiting triage",
		group: "queue",
		hint: "Reported, not yet triaged, and nothing downstream has happened to it. Triage is due within 24 hours.",
		href: "/dashboard/signal-logs?stage=triage",
		color: "#d97706",
	},
	{
		key: "closed-at-triage",
		label: "Closed at triage",
		group: "exit",
		hint: "Triage logged it (no plausible public-health threat) or discarded it as a duplicate. Includes legacy records closed in bulk.",
		color: "#cbd5e1",
	},
	{
		key: "awaiting-verification",
		label: "Awaiting verification",
		group: "queue",
		hint: "Forwarded by triage, or escalated to field verification, with no conclusion yet.",
		href: "/dashboard/signal-logs?stage=verification",
		color: "#f59e0b",
	},
	{
		key: "flagged-no-outcome",
		label: "Marked verified, no outcome",
		group: "issue",
		hint: "Flagged verified but nobody recorded an outcome. They sit in no queue — open them from All and record what was found.",
		color: "#a855f7",
	},
	{
		key: "discarded",
		label: "Discarded at verification",
		group: "exit",
		hint: "Verification concluded it was not a public-health event.",
		color: "#94a3b8",
	},
	{
		key: "verified-unclassified",
		label: "Verified, outcome not classified",
		group: "exit",
		hint: "Legacy records verified with an action (e.g. sample collected) but no Confirmed/Discarded conclusion.",
		color: "#e2e8f0",
	},
	{
		key: "awaiting-risk",
		label: "Awaiting risk assessment",
		group: "queue",
		hint: "Confirmed events with no risk level yet. Risk assessment is due within 24 hours of verification.",
		href: "/dashboard/signal-logs?stage=risk",
		color: "#dc2626",
	},
	{
		key: "awaiting-feedback",
		label: "Awaiting reporter feedback",
		group: "queue",
		hint: "Risk-assessed events whose reporter has not yet been told the outcome.",
		color: "#fb7185",
	},
	{
		key: "alert",
		label: "Alert issued",
		group: "done",
		hint: "Confirmed, risk-assessed and fed back — the signals on the Alerts page.",
		href: "/dashboard/alerts",
		color: "#16a34a",
	},
];

export interface SignalFlowItem extends SignalFlowState {
	count: number;
	/** Share of all signals in scope, 0–100 (one decimal below 1%). */
	share: number;
}

/**
 * The API's flow counts joined to their metadata, in pipeline order. States
 * the API did not send read as zero, so an older API renders an empty bar
 * rather than crashing.
 */
export function buildSignalFlow(items: DashboardCountItem[] | undefined): SignalFlowItem[] {
	const counts = new Map((items ?? []).map((i) => [i.key, i.count]));
	const total = (items ?? []).reduce((s, i) => s + i.count, 0);
	return SIGNAL_FLOW_STATES.map((state) => {
		const count = counts.get(state.key) ?? 0;
		const raw = total > 0 ? (count / total) * 100 : 0;
		return { ...state, count, share: raw > 0 && raw < 1 ? Math.round(raw * 10) / 10 : Math.round(raw) };
	});
}

/** Signals still standing at a gate — the sum of the working queues. */
export function openWorkTotal(flow: SignalFlowItem[]): number {
	return flow.filter((f) => f.group === "queue").reduce((s, f) => s + f.count, 0);
}
