import {
	normalizeTriageDecision,
	TRIAGE_DISCARDED,
	TRIAGE_LOGGED,
} from "@/lib/alert-triage";

/**
 * What to CALL this record, from the EBS guideline's state machine (§2).
 *
 * The guideline is unusually blunt about this: "The object under surveillance is
 * renamed at each gate… Using these terms loosely is the most common source of
 * confusion in training and in data models."
 *
 *   Signal — unverified information about a possible health event, once reported.
 *   Event  — a signal CONFIRMED by verification to represent a real occurrence.
 *   Alert  — the formal output communicated to authorities. Produced by step 5.
 *
 * This system called everything an "alert" from the moment it was created,
 * which collapses all three into one word and makes the pipeline's own
 * vocabulary unusable in conversation: "how many alerts?" has three different
 * right answers. Naming the record by its state is what makes the distinction
 * visible in the place people actually read.
 *
 * Note what is deliberately NOT here: nothing ever returns "Alert". Step 5 is
 * not implemented, so no record in this system has been through the gate that
 * produces one. Adding the label before the stage exists would be exactly the
 * looseness the guideline warns about.
 */

export type SignalState = "signal" | "event" | "discarded";

export interface StatefulSignal {
	triageDecision?: string | null;
	verificationOutcome?: string | null;
}

/** Which term the guideline's state machine gives this record right now. */
export function signalState(record: StatefulSignal): SignalState {
	const decision = normalizeTriageDecision(record.triageDecision);
	// Triage's own discard is the outer gate: a duplicate never became an event,
	// whatever a later verification says about it.
	if (decision === TRIAGE_DISCARDED || decision === TRIAGE_LOGGED) {
		return "discarded";
	}

	const outcome = (record.verificationOutcome ?? "").trim();
	if (outcome === "Confirmed") return "event";
	if (outcome === "Discarded") return "discarded";

	// Unverified, or escalated to the field and still being established. Both
	// are still signals — verification has not concluded.
	return "signal";
}

/** The noun, for a heading or a badge. */
export const SIGNAL_STATE_LABEL: Record<SignalState, string> = {
	signal: "Signal",
	event: "Event",
	discarded: "Discarded",
};

/** One line on what the term means, for the badge tooltip. */
export const SIGNAL_STATE_HINT: Record<SignalState, string> = {
	signal:
		"Unverified information about a possible health event. Becomes an event only once verification confirms it.",
	event:
		"A signal verification confirmed as a real or probable occurrence. Risk-assessed, and the basis for any alert issued.",
	discarded:
		"Closed without becoming an event — a duplicate already under investigation, no public-health threat, or not confirmed on verification.",
};

export const SIGNAL_STATE_BADGE_CLASS: Record<SignalState, string> = {
	signal: "bg-sky-100 text-sky-800 border-sky-200",
	event: "bg-emerald-100 text-emerald-800 border-emerald-200",
	discarded: "bg-zinc-100 text-zinc-600 border-zinc-300",
};

/** "Signal ALT6304" / "Event ALT6294" — the record named by what it currently is. */
export function signalTitle(record: StatefulSignal, code: string): string {
	const state = signalState(record);
	return `${state === "discarded" ? "Signal" : SIGNAL_STATE_LABEL[state]} ${code}`;
}
