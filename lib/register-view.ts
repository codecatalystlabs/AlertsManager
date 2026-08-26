import {
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
 * pending action — Triage on the first, Verify on the second — instead of
 * mixing rows whose next step differs.
 *
 * Two of the views ARE pipeline queues, so they reuse the ?stage= URLs the
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
		hint: "Not yet through the gate. Triage is due within 24 hours of receipt.",
	},
	{
		value: VIEW_TRIAGED,
		label: "Triaged",
		hint: "Forwarded by triage and waiting on verification — verify from here.",
	},
	{
		value: VIEW_VERIFIED,
		label: "Verified",
		hint: "Verification recorded, whatever its outcome.",
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
 * risk, feedback and off-pipeline lists are their own destinations, and showing
 * these tabs there would offer to silently navigate out of the queue the user
 * asked for.
 */
export function registerViewFromParams(
	view: string | null | undefined,
	stage: string | null | undefined
): RegisterView | null {
	if (stage === STAGE_TRIAGE) return VIEW_UNTRIAGED;
	if (stage === STAGE_VERIFICATION) return VIEW_TRIAGED;
	if (isQueueStage(stage)) return null;
	if (isRegisterView(view)) return view;
	return DEFAULT_REGISTER_VIEW;
}

/** The list filters a view applies. Both keys are always set, so switching views cannot leave the previous one's filter behind. */
export function registerViewFilters(view: RegisterView | null): {
	stage: string;
	verification: string;
} {
	switch (view) {
		case VIEW_UNTRIAGED:
			return { stage: STAGE_TRIAGE, verification: "all" };
		case VIEW_TRIAGED:
			return { stage: STAGE_VERIFICATION, verification: "all" };
		case VIEW_VERIFIED:
			// Verified rows are spread across every stage past verification, so
			// this one is a verification filter rather than a queue.
			return { stage: "", verification: "verified" };
		default:
			return { stage: "", verification: "all" };
	}
}

/** Where a view lives, so a tab is a shareable destination and the back button works. */
export function registerViewHref(view: RegisterView): string {
	switch (view) {
		case VIEW_UNTRIAGED:
			return `/dashboard/signal-logs?stage=${STAGE_TRIAGE}`;
		case VIEW_TRIAGED:
			return `/dashboard/signal-logs?stage=${STAGE_VERIFICATION}`;
		default:
			return `/dashboard/signal-logs?view=${view}`;
	}
}

/**
 * The pipeline stage a view is standing at, for the page heading and the strip's
 * highlight. All and Verified stand at no single gate.
 */
export function registerViewStage(view: RegisterView | null): StageKey | null {
	if (view === VIEW_UNTRIAGED) return STAGE_TRIAGE;
	if (view === VIEW_TRIAGED) return STAGE_VERIFICATION;
	return null;
}
