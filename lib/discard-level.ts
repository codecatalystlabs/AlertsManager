import {
	TRIAGE_DISCARDED,
	TRIAGE_LOGGED,
	normalizeTriageDecision,
} from "@/lib/alert-triage";

/**
 * WHERE a signal was thrown out — and, on the same row, why.
 *
 * "Discarded" is one word for decisions taken at three different levels, by
 * different people, on different grounds:
 *
 *   TRIAGE (step 2) discards a signal WITHOUT investigating it. Either it is a
 *   duplicate of something already under investigation, or it carries no
 *   plausible public-health threat. Nobody looked; the gate decided it was not
 *   worth the cost of looking.
 *
 *   DESK verification (step 3) discards it after checking from the desk —
 *   calling the source, applying the case definition.
 *
 *   FIELD verification (step 3) discards it after a field visit the desk asked
 *   for because it could not settle the question from where it sat.
 *
 * Collapsing them loses the fact that matters most about a discard pile. A unit
 * discarding 400 signals at triage has a reporting-quality or duplicate problem;
 * a unit discarding 400 in the field is spending its whole RRT capacity chasing
 * signals that turn out to be nothing. Same count, opposite remedy — so the
 * level is shown on every row of the Discarded list rather than being something
 * you have to open the record to find.
 *
 * Order matters: a recorded verification verdict wins over a triage close —
 * the furthest step the signal reached, which is where the dashboard's signal
 * flow puts it. New signals cannot carry both (verification is refused for a
 * signal triage did not forward), so only legacy rows do: imported signals
 * bulk-marked Logged whose old-system verdict was Discarded.
 *
 * Twin of Go services.DiscardLevelCaseSQL (internal/services/discard_level.go):
 * the chips above the list count with that, so a row's badge must agree with
 * the chip that lists it.
 */

export const DISCARD_AT_TRIAGE = "triage";
export const DISCARD_AT_DESK = "desk";
export const DISCARD_AT_FIELD = "field";

export type DiscardLevel =
	| typeof DISCARD_AT_TRIAGE
	| typeof DISCARD_AT_DESK
	| typeof DISCARD_AT_FIELD;

/** "all" is the absence of a level filter. */
export type DiscardLevelFilter = DiscardLevel | "all";

/** The levels in pipeline order, for the chips above the Discarded list. */
export const DISCARD_LEVELS: { value: DiscardLevel; label: string; hint: string }[] = [
	{
		value: DISCARD_AT_TRIAGE,
		label: "Triage",
		hint: "Thrown out at triage without investigating — already reported, or no public-health threat.",
	},
	{
		value: DISCARD_AT_DESK,
		label: "Desk verification",
		hint: "Checked from the desk and found not to be an event.",
	},
	{
		value: DISCARD_AT_FIELD,
		label: "Field verification",
		hint: "Visited by the field team and found not to be an event.",
	},
];

export function isDiscardLevel(value: unknown): value is DiscardLevel {
	return (
		value === DISCARD_AT_TRIAGE ||
		value === DISCARD_AT_DESK ||
		value === DISCARD_AT_FIELD
	);
}

/** Reads a level off a filter value; anything unrecognised is "all". */
export function parseDiscardLevelFilter(
	value: string | null | undefined
): DiscardLevelFilter {
	const v = (value ?? "").trim().toLowerCase();
	return isDiscardLevel(v) ? v : "all";
}

export function discardLevelLabel(level: DiscardLevel): string {
	return DISCARD_LEVELS.find((l) => l.value === level)?.label ?? level;
}

/** The verification outcome meaning "looked at it; not an event". */
const VERIFICATION_DISCARDED = "Discarded";

export interface DiscardableSignal {
	triageDecision?: string | null;
	verificationOutcome?: string | null;
	/** "Desk" | "Field" — which level reached the outcome; empty on legacy rows. */
	verificationLevel?: string | null;
	fieldVerifiedAt?: string | null;
	/** Legacy field-team decision ("Discard", "Sample Collected"…). */
	fieldVerificationDecision?: string | null;
	/** Legacy desk actions, comma-joined ("Field Case Verification, Discarded"…). */
	caseVerificationDesk?: string | null;
	/** Why verification discarded it, from the fixed list; empty on legacy rows. */
	discardReason?: string | null;
}

export interface Discard {
	/** Which level closed it. */
	level: DiscardLevel;
	/** The level's name, for the badge. */
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
	hint: "Closed at triage (step 2): no plausible threat to public health. Logged and monitored, referred for appropriate management — off the EBS steps, still on the register.",
	badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Whether the field level reached this verdict. Recorded in verificationLevel
 * since the two levels existed; before that the only verification form wrote to
 * the DESK column, so a legacy row counts as field only when it shows a field
 * visit. Same rule as Go discardedInFieldSQL.
 */
function discardedInField(signal: DiscardableSignal): boolean {
	const level = (signal.verificationLevel ?? "").trim().toLowerCase();
	if (level) return level === "field";
	return (
		Boolean(signal.fieldVerifiedAt) ||
		(signal.fieldVerificationDecision ?? "").trim().toLowerCase().startsWith("discard") ||
		(signal.caseVerificationDesk ?? "").toLowerCase().includes("field case verification")
	);
}

function verificationDiscard(signal: DiscardableSignal): Discard {
	const field = discardedInField(signal);
	const recorded = Boolean((signal.verificationLevel ?? "").trim());
	const reason = (signal.discardReason ?? "").trim() || "Not an event";
	const where = field ? "after a field visit" : "from the desk";
	return {
		level: field ? DISCARD_AT_FIELD : DISCARD_AT_DESK,
		label: field ? "Field verification" : "Desk verification",
		reason,
		hint:
			`Discarded at verification (step 3), ${where}: the signal was investigated and found not to represent a real public-health event. It never became an event, so it is not risk-assessed.` +
			(recorded
				? ""
				: " Recorded before verification levels existed; the level is read from the old desk and field columns."),
		badgeClass: field
			? "bg-violet-100 text-violet-900 border-violet-200"
			: "bg-zinc-100 text-zinc-600 border-zinc-300",
	};
}

/**
 * Where this signal was discarded, or null when it was not discarded at all.
 *
 * Null is the answer for a signal still moving through the pipeline AND for one
 * verification confirmed — both are "not thrown out", and neither belongs on the
 * Discarded list.
 */
export function discardLevel(signal: DiscardableSignal): Discard | null {
	if ((signal.verificationOutcome ?? "").trim() === VERIFICATION_DISCARDED) {
		return verificationDiscard(signal);
	}
	const decision = normalizeTriageDecision(signal.triageDecision);
	if (decision === TRIAGE_DISCARDED) return TRIAGE_DUPLICATE;
	if (decision === TRIAGE_LOGGED) return TRIAGE_NO_THREAT;
	return null;
}

/** Whether this signal belongs on the Discarded list at all. */
export function isDiscarded(signal: DiscardableSignal): boolean {
	return discardLevel(signal) !== null;
}
