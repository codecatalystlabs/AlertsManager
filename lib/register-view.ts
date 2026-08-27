import {
	STAGE_DISCARDED,
	STAGE_RISK,
	STAGE_TRIAGE,
	STAGE_VERIFICATION,
	isQueueStage,
	type StageKey,
} from "@/lib/pipeline";

/**
 * The four views of the signal register, in the order work moves through them.
 *
 * The register is a worklist before it is an archive, so its tabs follow the
 * pipeline rather than describing verification alone: a signal is untriaged
 * until it passes the gate, triaged while it waits to be verified, and verified
 * once someone has adjudicated it. Each tab therefore carries exactly one
 * pending action — Triage, Verify, Assess risk — instead of mixing rows whose
 * next step differs.
 *
 * The Triaged tab is the one that splits, because the gate it names has two
 * endings: the signal went forward, or it was thrown out. See TRIAGED_SPLITS.
 *
 * Each tab is named for the state a signal has REACHED and holds the work that
 * is due NEXT, which is why the Verified tab is the risk queue.
 *
 * The step after that — the feedback queue, reached from the sidebar's "Risk
 * Assessed" entry (?stage=feedback) — is deliberately NOT a tab: it is its own
 * destination, and the strip's step-6 card links to the same place.
 *
 * Three of the views ARE pipeline queues, so they reuse the ?stage= URLs the
 * sidebar and the pipeline strip already link to. That is deliberate: the
 * backend counts a stage and filters its queue with the same predicate
 * (services.StagePredicate), so a strip reading "6,020 awaiting triage" and the
 * Untriaged tab hold the same rows by construction.
 */

export const VIEW_ALL = "all";
export const VIEW_UNTRIAGED = "untriaged";
export const VIEW_TRIAGED = "triaged";
export const VIEW_VERIFIED = "verified";

export type RegisterView =
	| typeof VIEW_ALL
	| typeof VIEW_UNTRIAGED
	| typeof VIEW_TRIAGED
	| typeof VIEW_VERIFIED;

/**
 * The register opens on the work that has not started. Everything else is a
 * click away, but an untouched signal is the only one with a clock running that
 * nobody has acknowledged.
 */
export const DEFAULT_REGISTER_VIEW: RegisterView = VIEW_UNTRIAGED;

export const REGISTER_VIEWS: {
	value: RegisterView;
	label: string;
	hint: string;
}[] = [
	{
		value: VIEW_ALL,
		label: "All",
		hint: "Every signal on the register, at whatever stage.",
	},
	{
		value: VIEW_UNTRIAGED,
		label: "Untriaged",
		hint: "New signals only — not triaged, not verified, not risk-assessed. Triage is due within 24 hours of receipt.",
	},
	{
		value: VIEW_TRIAGED,
		label: "Triaged",
		hint: "Through the triage gate. Split by what happened next — still going forward, or discarded.",
	},
	{
		value: VIEW_VERIFIED,
		label: "Verified",
		hint: "Confirmed by verification and not yet risk-assessed — assess risk from here. Due within 24 hours of verification.",
	},
];

/* -------------------------------------------------------------------------
 * The Triaged tab's two halves.
 *
 * A triaged signal has had a decision taken on it, and the decision has two
 * possible endings: it went forward, or it was thrown out. Those are opposite
 * kinds of list — one is a queue with work due on every row, the other is an
 * archive with nothing due on any row — and merging them makes the tab
 * unreadable as either. So the tab splits, and the split is a second row of
 * tabs rather than a filter, for the same reason the views are tabs: it decides
 * what the rows MEAN, and a filter nobody notices is not an explanation.
 *
 * KEPT is the tab's original list, unchanged: forwarded by triage and awaiting
 * verification.
 *
 * DISCARDED is wider than the triage gate on purpose. A signal can be thrown
 * out at either of two gates — triage discards it unread, verification discards
 * it after investigating — and someone asking "what did we throw out?" means
 * both. Which gate did the throwing is not lost by merging them: it is shown on
 * every row, from lib/discard-level.ts.
 * ---------------------------------------------------------------------- */

export const SPLIT_KEPT = "kept";
export const SPLIT_DISCARDED = "discarded";

export type TriagedSplit = typeof SPLIT_KEPT | typeof SPLIT_DISCARDED;

/** The Triaged tab opens on the half that has work due. */
export const DEFAULT_TRIAGED_SPLIT: TriagedSplit = SPLIT_KEPT;

export const TRIAGED_SPLITS: {
	value: TriagedSplit;
	label: string;
	hint: string;
}[] = [
	{
		value: SPLIT_KEPT,
		label: "Not discarded",
		hint: "Forwarded by triage and waiting on verification — verify from here.",
	},
	{
		value: SPLIT_DISCARDED,
		label: "Discarded",
		hint: "Closed without becoming an event, at triage or at verification. Each row shows which gate discarded it, and why. Recorded, never deleted.",
	},
];

export function isRegisterView(value?: string | null): value is RegisterView {
	return (
		value === VIEW_ALL ||
		value === VIEW_UNTRIAGED ||
		value === VIEW_TRIAGED ||
		value === VIEW_VERIFIED
	);
}

/**
 * Which view the URL is asking for.
 *
 * Returns null when the URL names a queue that is NOT one of the four — the
 * feedback (sidebar "Risk Assessed") and off-pipeline lists are their own
 * destinations, and showing these tabs there would offer to silently navigate
 * out of the queue the user asked for.
 */
export function registerViewFromParams(
	view: string | null | undefined,
	stage: string | null | undefined
): RegisterView | null {
	if (stage === STAGE_TRIAGE) return VIEW_UNTRIAGED;
	if (stage === STAGE_VERIFICATION) return VIEW_TRIAGED;
	if (stage === STAGE_RISK) return VIEW_VERIFIED;
	// The discard archive is the Triaged tab's second half, not a page of its
	// own: everything on it has been triaged, so hiding the tabs there would
	// strand the user in a list with no way back to the queue beside it.
	if (stage === STAGE_DISCARDED) return VIEW_TRIAGED;
	if (isQueueStage(stage)) return null;
	if (isRegisterView(view)) return view;
	return DEFAULT_REGISTER_VIEW;
}

/**
 * Which half of the Triaged tab the URL is asking for. Defaults to the queue,
 * so an old ?stage=verification bookmark lands exactly where it used to.
 */
export function triagedSplitFromParams(
	stage: string | null | undefined
): TriagedSplit {
	return stage === STAGE_DISCARDED ? SPLIT_DISCARDED : DEFAULT_TRIAGED_SPLIT;
}

/** The list filters a view applies. Both keys are always set, so switching views cannot leave the previous one's filter behind. */
export function registerViewFilters(
	view: RegisterView | null,
	split: TriagedSplit = DEFAULT_TRIAGED_SPLIT
): {
	stage: string;
	verification: string;
} {
	switch (view) {
		case VIEW_UNTRIAGED:
			return { stage: STAGE_TRIAGE, verification: "all" };
		case VIEW_TRIAGED:
			// Both halves filter server-side on a stage the backend defines
			// (services.StagePredicate), so the discard archive is the WHOLE
			// dataset's discards rather than the discards on the current page.
			return {
				stage:
					split === SPLIT_DISCARDED ? STAGE_DISCARDED : STAGE_VERIFICATION,
				verification: "all",
			};
		case VIEW_VERIFIED:
			// The risk-assessment queue: CONFIRMED by verification and carrying no
			// risk level yet. Risk can only be assessed on a signal verification
			// confirmed — the server rejects anything else — so this tab holds
			// exactly the rows whose next move is Assess risk, the way Untriaged
			// holds the rows waiting on Triage. Verified rows already scored, and
			// the ones verification discarded, are on All (filter Verification =
			// Verified) rather than sitting here with nothing due.
			return { stage: STAGE_RISK, verification: "all" };
		default:
			return { stage: "", verification: "all" };
	}
}

/** Where a view lives, so a tab is a shareable destination and the back button works. */
export function registerViewHref(
	view: RegisterView,
	split: TriagedSplit = DEFAULT_TRIAGED_SPLIT
): string {
	switch (view) {
		case VIEW_UNTRIAGED:
			return `/dashboard/signal-logs?stage=${STAGE_TRIAGE}`;
		case VIEW_TRIAGED:
			return `/dashboard/signal-logs?stage=${
				split === SPLIT_DISCARDED ? STAGE_DISCARDED : STAGE_VERIFICATION
			}`;
		case VIEW_VERIFIED:
			return `/dashboard/signal-logs?stage=${STAGE_RISK}`;
		default:
			return `/dashboard/signal-logs?view=${view}`;
	}
}

/**
 * The pipeline stage a view is standing at, for the page heading and the strip's
 * highlight. Only All stands at no single gate.
 */
export function registerViewStage(
	view: RegisterView | null,
	split: TriagedSplit = DEFAULT_TRIAGED_SPLIT
): StageKey | null {
	if (view === VIEW_UNTRIAGED) return STAGE_TRIAGE;
	if (view === VIEW_TRIAGED) {
		// The discard archive stands at no gate — nothing is due on it, so the
		// strip must not highlight verification as though something were.
		return split === SPLIT_DISCARDED ? STAGE_DISCARDED : STAGE_VERIFICATION;
	}
	if (view === VIEW_VERIFIED) return STAGE_RISK;
	return null;
}
