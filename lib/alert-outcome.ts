/**
 * Derive the verification outcome of an alert.
 *
 * The outcome is the conclusion of the verification workflow (e.g. "Sample
 * Collected", "Discarded"). It is NOT the same as the `verified` / `isVerified`
 * flag, which only records *whether* verification happened, not *what* was
 * decided. The outcome lives across several structured fields (and, for older /
 * backend-generated records, inside the free-text narrative), so this helper
 * centralises the precedence in one reusable place instead of re-parsing
 * narratives ad hoc.
 *
 * Precedence (most-final first):
 *   1. `fieldVerificationDecision` — the field team's decision, the most final
 *      outcome when a desk verification escalated to the field.
 *   2. `caseVerificationDesk` — the desk verification decision.
 *   3. `actions` — legacy/create-time action, ignoring the default
 *      "Alert reported" placeholder applied at alert creation.
 *   4. `narrative` — backend auto-generated narratives embed the outcome as
 *      "Actions: <outcome>."; parsed only as a last resort.
 *
 * Returns {@link OUTCOME_NOT_RECORDED} when none of the above yields a value.
 */

/** Action stamped on every alert at creation time; not a verification outcome. */
export const DEFAULT_CREATE_ACTION = "Alert reported";

/** Label used when no verification outcome can be derived. */
export const OUTCOME_NOT_RECORDED = "Not Recorded";

/**
 * Field-verification labels (see `FIELD_VERIFICATION_OPTIONS`) use abbreviations
 * and phrasing that differ from the canonical desk labels (see
 * `DESK_VERIFICATION_OPTIONS`). Map the synonyms onto the canonical labels so a
 * single value appears per real-world outcome — otherwise "Discard" and
 * "Discarded" would split aggregations/filters. Keyed by lower-cased value.
 */
const OUTCOME_SYNONYMS: Record<string, string> = {
	discard: "Discarded",
	"sample collection": "Sample Collected",
	sdb: "Mortality Surveillance/Supervised Burial",
	"recommend for evacuation": "Validated for EMS Evacuation",
};

/** Matches the "Actions: <outcome>." segment of a generated narrative. */
const NARRATIVE_OUTCOME_PATTERN = /Actions:\s*([^.]+?)\s*\./i;

/**
 * Fold a free-text verification value onto one canonical outcome label. Real
 * records use many phrasings/spellings/cases ("sample collected", "samples were
 * collected and results were negative", the misspelled "Mortality
 * Survaillance/Supervised Burial", "does not meet case definition", …), so
 * exact-match alone dumped most of them into "Others" and hid the biggest
 * categories. The substring rules below (most-decisive first) route the common
 * variants to their real bucket; anything unrecognised is returned as-is and
 * rolls into "Others" upstream. Kept in sync with the Go twin
 * (`alertsMIS/backend/internal/services/alert_outcome.go`).
 */
function canonicalizeOutcome(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	const lower = trimmed.toLowerCase();

	if (
		lower.includes("discard") ||
		(lower.includes("case def") &&
			(lower.includes("not meet") || lower.includes("doesnot")))
	) {
		return "Discarded";
	}
	if (lower.includes("sample")) return "Sample Collected";
	if (lower.includes("evacuat")) return "Validated for EMS Evacuation";
	if (
		lower.includes("supervised burial") ||
		lower.includes("mortality surv") ||
		lower.includes("survaillance") ||
		lower.includes("sdb")
	) {
		return "Mortality Surveillance/Supervised Burial";
	}
	if (lower.includes("case verification")) return "Field Case Verification";

	return OUTCOME_SYNONYMS[lower] ?? trimmed;
}

/** The subset of alert fields the outcome can be derived from. */
export interface OutcomeSource {
	caseVerificationDesk?: string | null;
	fieldVerificationDecision?: string | null;
	actions?: string | null;
	narrative?: string | null;
}

/**
 * The desk-verification decision on its own (canonicalized), independent of any
 * field-team decision. Unlike {@link deriveAlertOutcome} — which lets a field
 * decision override the desk one — this reports specifically what the desk
 * concluded. Returns {@link OUTCOME_NOT_RECORDED} when no desk decision exists.
 */
export function deriveDeskVerificationOutcome(
	alert: Pick<OutcomeSource, "caseVerificationDesk">
): string {
	return canonicalizeOutcome(alert.caseVerificationDesk ?? "") || OUTCOME_NOT_RECORDED;
}

export function deriveAlertOutcome(alert: OutcomeSource): string {
	const field = canonicalizeOutcome(alert.fieldVerificationDecision ?? "");
	if (field) return field;

	const desk = canonicalizeOutcome(alert.caseVerificationDesk ?? "");
	if (desk) return desk;

	const action = canonicalizeOutcome(alert.actions ?? "");
	if (action && action !== DEFAULT_CREATE_ACTION) return action;

	const match = (alert.narrative ?? "").match(NARRATIVE_OUTCOME_PATTERN);
	if (match) {
		const fromNarrative = canonicalizeOutcome(match[1]);
		if (fromNarrative && fromNarrative !== DEFAULT_CREATE_ACTION) {
			return fromNarrative;
		}
	}

	return OUTCOME_NOT_RECORDED;
}
