export const DESK_VERIFICATION_OPTIONS = [
	"Field Case Verification",
	"Discarded",
	"Validated for EMS Evacuation",
	"Mortality Surveillance/Supervised Burial",
	"Sample Collected",
	"Admitted"
] as const;

export const FIELD_VERIFICATION_OPTIONS = [
	"SDB",
	"Discard",
	"Sample collection",
	"Sample Collected",
	"Mortality Surveillance/Supervised Burial",
	"Recommend for Evacuation",
	"Admitted"
] as const;

/** The desk action that escalates an alert to the field (shows the VHF form). */
export const FIELD_CASE_VERIFICATION = "Field Case Verification";

/**
 * The desk action that hands the case to the Emergency Medical Services team.
 * Selecting it is the single trigger of the whole EMS integration: on submit
 * the backend pushes the full verified alert to the EMS system and adds it to
 * the partner pull feed (see `alertsMIS/backend/docs/EMS_INTEGRATION.md`).
 * Referenced by name rather than repeated as a literal so the trigger and the
 * UI that explains it can never drift apart.
 */
export const EMS_EVACUATION_ACTION = "Validated for EMS Evacuation";

/* -------------------------------------------------------------------------
 * Verification outcome vs response action — the split the EBS pipeline needs.
 *
 * TS twin of alertsMIS/backend/internal/services/verification_outcome.go. The
 * vocabulary AND the precedence must stay identical in both, because the server
 * re-derives the split from whatever this form submits.
 *
 * VERIFICATION (step 3) answers only "is this signal a genuine event?" — a
 * confirmed signal becomes an "event", which is what the signal-to-event
 * conversion KPI counts. RESPONSE (step 6) is what was then DONE, and one event
 * can carry several actions at once.
 * ---------------------------------------------------------------------- */

export const VERIFICATION_CONFIRMED = "Confirmed";
export const VERIFICATION_DISCARDED = "Discarded";
export const VERIFICATION_ESCALATED_FIELD = "Escalated to Field";

export type VerificationOutcome =
	| typeof VERIFICATION_CONFIRMED
	| typeof VERIFICATION_DISCARDED
	| typeof VERIFICATION_ESCALATED_FIELD;

export const VERIFICATION_OUTCOMES: VerificationOutcome[] = [
	VERIFICATION_CONFIRMED,
	VERIFICATION_DISCARDED,
	VERIFICATION_ESCALATED_FIELD,
];

/** What each outcome means, shown beside the choice so verifiers stay consistent. */
export const OUTCOME_GUIDANCE: Record<VerificationOutcome, string> = {
	[VERIFICATION_CONFIRMED]:
		"The signal is a genuine public-health event. It is now counted as an event and moves on to response.",
	[VERIFICATION_DISCARDED]:
		"Checked and found not to be a public-health event — no further response needed.",
	[VERIFICATION_ESCALATED_FIELD]:
		"The desk cannot conclude from here. Send for field verification; the outcome stays open until the field team reports.",
};

/** The actions a responder may record. Independent of the outcome, and multi-select. */
export const RESPONSE_ACTION_OPTIONS = [
	"Sample Collected",
	EMS_EVACUATION_ACTION,
	"Mortality Surveillance/Supervised Burial",
	"Admitted",
] as const;

/**
 * Classify ONE part of a comma-joined verification value as either an outcome
 * signal or a response action. Mirrors classifyVerificationPart in Go, including
 * the substring matching that tolerates the phrasings and misspellings real
 * records carry.
 */
function classifyPart(part: string): {
	outcome?: VerificationOutcome;
	action?: string;
} {
	const lower = part.trim().toLowerCase();
	if (!lower) return {};

	if (
		lower.includes("discard") ||
		(lower.includes("case def") &&
			(lower.includes("not meet") || lower.includes("doesnot")))
	) {
		return { outcome: VERIFICATION_DISCARDED };
	}
	if (lower.includes("case verification")) {
		return { outcome: VERIFICATION_ESCALATED_FIELD };
	}
	// Evacuation is tested BEFORE sample: a record carrying both must not lose
	// its evacuation (see the Go twin's ordering note).
	if (lower.includes("evacuat")) return { action: EMS_EVACUATION_ACTION };
	if (lower.includes("sample")) return { action: "Sample Collected" };
	if (
		lower.includes("supervised burial") ||
		lower.includes("mortality surv") ||
		lower.includes("survaillance") ||
		lower.includes("sdb")
	) {
		return { action: "Mortality Surveillance/Supervised Burial" };
	}
	if (lower.includes("admitted")) return { action: "Admitted" };
	// Written by legacyDeskValue when a confirmation carries no response action
	// at all — the ordinary case since the verify form became two questions.
	// Tested LAST so "confirmed, sample collected" still yields the action.
	if (lower.includes("confirm")) return { outcome: VERIFICATION_CONFIRMED };
	return {};
}

/**
 * Unpick a legacy comma-joined verification value into its single outcome and
 * its response actions — used to pre-fill the form when re-opening an alert
 * verified before the split existed.
 *
 * Outcome precedence is Discarded > Escalated to Field > Confirmed: a recorded
 * discard is the FINAL conclusion, an escalation means the desk declined to
 * conclude, and Confirmed is implied by any action taken.
 */
export function splitDeskVerification(value?: string | null): {
	outcome: VerificationOutcome | "";
	actions: string[];
} {
	const actions: string[] = [];
	let discarded = false;
	let escalated = false;
	let confirmed = false;

	for (const part of (value ?? "").split(",")) {
		const { outcome, action } = classifyPart(part);
		if (outcome === VERIFICATION_DISCARDED) discarded = true;
		if (outcome === VERIFICATION_ESCALATED_FIELD) escalated = true;
		if (outcome === VERIFICATION_CONFIRMED) confirmed = true;
		if (action && !actions.includes(action)) actions.push(action);
	}

	let outcome: VerificationOutcome | "" = "";
	if (discarded) outcome = VERIFICATION_DISCARDED;
	else if (escalated) outcome = VERIFICATION_ESCALATED_FIELD;
	else if (confirmed || actions.length > 0) outcome = VERIFICATION_CONFIRMED;

	return { outcome, actions };
}

/**
 * Rebuild the comma-joined legacy value from an outcome + actions pair.
 *
 * Still needed because `case_verification_desk` remains the mirror the backend
 * writes, and because the 6767/eCHIS/POE verify endpoints take only that single
 * string — they derive the split from it server-side.
 *
 * Actions first, outcome last, matching the Go twin so a round-trip returns
 * exactly what was written.
 */
export function legacyDeskValue(
	outcome: VerificationOutcome | "",
	actions: string[]
): string {
	const parts = [...actions];
	if (outcome === VERIFICATION_DISCARDED) parts.push(VERIFICATION_DISCARDED);
	if (outcome === VERIFICATION_ESCALATED_FIELD) parts.push(FIELD_CASE_VERIFICATION);
	// THE MIRROR MUST NEVER BE EMPTY FOR A RECORDED OUTCOME. Confirmed used to
	// be implied by the actions beside it and wrote nothing of its own; a
	// two-question verification routinely has no action, and an empty mirror
	// reads as "not verified" to every legacy reader (the SLA clock, the
	// verification queue, the dashboard). Only when nothing else was written,
	// so rows carrying actions keep their exact existing string.
	if (outcome === VERIFICATION_CONFIRMED && parts.length === 0) {
		parts.push(VERIFICATION_CONFIRMED);
	}
	return parts.join(", ");
}

/**
 * Desk verification now allows MULTIPLE actions. To stay backward compatible
 * with the single TEXT column (`case_verification_desk` / `actions`) and all the
 * code that reads it as a plain string, multiple selections are stored as a
 * comma-separated string (e.g. "Discarded, Sample Collected"). None of the
 * option labels contain commas, so this round-trips cleanly. A legacy single
 * value simply parses to a one-element list.
 */
export function parseDeskActions(value?: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

/** Join selected desk actions back into the stored comma-separated string. */
export function joinDeskActions(values: string[]): string {
	return values.join(", ");
}

/** Whether `option` is among the selected desk actions in `value`. */
export function hasDeskAction(
	value: string | null | undefined,
	option: string
): boolean {
	return parseDeskActions(value).includes(option);
}

/** Add or remove `option` from the comma-separated desk-action string. */
export function toggleDeskAction(
	value: string | null | undefined,
	option: string,
	checked: boolean
): string {
	const selected = parseDeskActions(value).filter((o) => o !== option);
	if (checked) selected.push(option);
	return joinDeskActions(selected);
}
