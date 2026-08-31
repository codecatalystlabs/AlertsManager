/**
 * Reporter feedback — step 7 of the Uganda EBS steps, and the one that keeps
 * the other six supplied with signals.
 *
 * Community EBS runs on VHTs, health workers and ordinary people CHOOSING to
 * report. If reporting feels like shouting into a void, reporting rates fall and
 * the detection arm degrades quietly — which is why the guidelines set a KPI on
 * it (indicator #10, >80% of reporters) rather than leaving it to goodwill.
 *
 * Go twin: alertsMIS/backend/internal/services/reporter_feedback.go.
 */

import { isRiskAssessed } from "@/lib/alert-risk";

export const FEEDBACK_SMS = "SMS";
export const FEEDBACK_CALL = "Phone call";
export const FEEDBACK_MEETING = "Community meeting";
export const FEEDBACK_RADIO = "Radio";
export const FEEDBACK_IN_PERSON = "In person";

/** The routes the guidelines name (§2 step 7). */
export const FEEDBACK_CHANNELS = [
	FEEDBACK_SMS,
	FEEDBACK_CALL,
	FEEDBACK_MEETING,
	FEEDBACK_RADIO,
	FEEDBACK_IN_PERSON,
] as const;

export type FeedbackChannel = (typeof FEEDBACK_CHANNELS)[number];

/** Verification outcomes that make feedback due. */
const CONCLUDED = new Set(["Confirmed", "Discarded"]);

/**
 * Whether a signal owes its reporter feedback.
 *
 * Due once there is a CONCLUSION. A discarded signal counts too — arguably most
 * of all, since "we checked, it was not an outbreak" is exactly what keeps
 * someone reporting next time. A signal still escalated to the field has no
 * conclusion yet, so nothing is owed.
 */
export function feedbackIsDue(verificationOutcome?: string | null): boolean {
	return CONCLUDED.has((verificationOutcome ?? "").trim());
}

/** Whether feedback has already been given. */
export function feedbackGiven(feedbackGivenAt?: string | null): boolean {
	return Boolean((feedbackGivenAt ?? "").trim());
}

/** The subset of a signal the feedback gate depends on. */
export interface FeedbackSignal {
	verificationOutcome?: string | null;
	riskLevel?: string | null;
}

/**
 * Whether the signal has actually REACHED step 7, rather than merely owing
 * feedback at the end of a pipeline it is still partway through.
 *
 * {@link feedbackIsDue} answers a narrower question — is there a conclusion? —
 * and a confirmed event answers yes to it the moment verification ends, while
 * step 4 is still outstanding. Offering feedback there puts two competing
 * actions on one row and invites closing the loop on an event nobody has scored
 * yet; the reporter is then told the outcome of an assessment that has not
 * happened.
 *
 * This is the same narrowing the backend already made to
 * `services.StagePredicate(StageFeedback)`, which excludes
 * `verification_outcome='Confirmed' AND risk_level empty` so the Verified and
 * Risk Assessed tabs cannot both claim the same row. The row menu carried the
 * un-narrowed predicate and so kept offering the action the queues had stopped
 * offering.
 *
 * Agrees with lib/next-action.ts by construction: a signal whose next step is
 * "Assess risk" is never one this returns true for. Pinned by
 * lib/next-action.test.ts.
 */
export function feedbackIsReached(signal: FeedbackSignal): boolean {
	if (!feedbackIsDue(signal.verificationOutcome)) return false;
	return !awaitingRiskAssessment(signal);
}

/**
 * Standing at the step-4 gate: confirmed as a real event, and not yet scored.
 * Discarded signals are NOT events, so they never wait here.
 */
export function awaitingRiskAssessment(signal: FeedbackSignal): boolean {
	return (
		(signal.verificationOutcome ?? "").trim() === "Confirmed" &&
		!isRiskAssessed(signal.riskLevel)
	);
}

/** Filter options for the reporter-feedback state. */
export const FEEDBACK_FILTER_OPTIONS: { value: string; label: string }[] = [
	{ value: "pending", label: "Feedback pending" },
	{ value: "given", label: "Feedback given" },
];
