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

/** Filter options for the reporter-feedback state. */
export const FEEDBACK_FILTER_OPTIONS: { value: string; label: string }[] = [
	{ value: "pending", label: "Feedback pending" },
	{ value: "given", label: "Feedback given" },
];
