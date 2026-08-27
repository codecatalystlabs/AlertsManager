import {
	TRIAGE_DISCARDED,
	TRIAGE_LOGGED,
	normalizeTriageDecision,
} from "@/lib/alert-triage";

/**
 * WHERE a signal was thrown out — and, on the same row, why.
 *
 * "Discarded" is one word for decisions taken at two different gates, by two
 * different people, on two different grounds:
 *
 *   TRIAGE (step 2) discards a signal WITHOUT investigating it. Either it is a
 *   duplicate of something already under investigation, or it carries no
 *   plausible public-health threat. Nobody looked; the gate decided it was not
 *   worth the cost of looking.
 *
 *   VERIFICATION (step 3) discards a signal AFTER investigating it. Someone
 *   contacted the source, applied the case definition, and established that the
 *   signal does not represent a real event.
 *
 * Collapsing the two loses the fact that matters most about a discard pile. A
 * unit discarding 400 signals at triage has a reporting-quality or duplicate
 * problem; a unit discarding 400 at verification is spending its whole RRT
 * capacity chasing signals that turn out to be nothing. Same count, opposite
 * remedy — so the level is shown on every row of the Discarded list rather than
 * being something you have to open the record to find.
 *
 * Order matters and mirrors lib/signal-state.ts: triage's own exit wins. A
 * signal triage discarded as a duplicate never reached verification on its own
 * merits, so whatever outcome is recorded against it belongs to the original
 * signal's investigation, not to this row's.
 */

export const DISCARD_AT_TRIAGE = "triage";
export const DISCARD_AT_VERIFICATION = "verification";

export type DiscardLevel =
	| typeof DISCARD_AT_TRIAGE
	| typeof DISCARD_AT_VERIFICATION;

/** The verification outcome meaning "looked at it; not an event". */
const VERIFICATION_DISCARDED = "Discarded";

export interface DiscardableSignal {
	triageDecision?: string | null;
	verificationOutcome?: string | null;
}

export interface Discard {
	/** Which gate closed it. */
	level: DiscardLevel;
	/** The gate's name, for the badge. */
	label: string;
	/** The ground it was closed on, for the line under the badge. */
	reason: string;
	/** The whole decision in one sentence, for the tooltip. */
	hint: string;
	badgeClass: string;
}

const TRIAGE_DUPLICATE: Discard = {
	level: DISCARD_AT_TRIAGE,
	label: "Triage",
	reason: "Already reported",
	hint: "Discarded at triage (step 2): already reported and under investigation, so verifying it again would spend response capacity on an event that already has it. Recorded, never deleted — the duplicate stays visible as part of its reporting cluster.",
	badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
};

const TRIAGE_NO_THREAT: Discard = {
	level: DISCARD_AT_TRIAGE,
	label: "Triage",
	reason: "No public-health threat",
	hint: "Closed at triage (step 2): no plausible threat to public health. Logged and monitored, referred for appropriate management — off the EBS pipeline, still on the register.",
	badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
};

const VERIFICATION_NOT_AN_EVENT: Discard = {
	level: DISCARD_AT_VERIFICATION,
	label: "Verification",
	reason: "Not an event",
	hint: "Discarded at verification (step 3): the signal was investigated and found not to represent a real public-health event. It never became an event, so it is not risk-assessed.",
	badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-300",
};

/**
 * Where this signal was discarded, or null when it was not discarded at all.
 *
 * Null is the answer for a signal still moving through the pipeline AND for one
 * verification confirmed — both are "not thrown out", and neither belongs on the
 * Discarded list.
 */
export function discardLevel(signal: DiscardableSignal): Discard | null {
	const decision = normalizeTriageDecision(signal.triageDecision);
	if (decision === TRIAGE_DISCARDED) return TRIAGE_DUPLICATE;
	if (decision === TRIAGE_LOGGED) return TRIAGE_NO_THREAT;

	if ((signal.verificationOutcome ?? "").trim() === VERIFICATION_DISCARDED) {
		return VERIFICATION_NOT_AN_EVENT;
	}
	return null;
}

/** Whether this signal belongs on the Discarded list at all. */
export function isDiscarded(signal: DiscardableSignal): boolean {
	return discardLevel(signal) !== null;
}
