/**
 * Tests for deriveAlertOutcome. No test runner is configured in this repo, so
 * this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/alert-outcome.test.ts
 *
 * It exits non-zero on the first failed assertion.
 */
import { deriveAlertOutcome, OUTCOME_NOT_RECORDED } from "./alert-outcome.ts";

let passed = 0;
function check(name: string, actual: string, expected: string): void {
	if (actual !== expected) {
		console.error(`FAIL: ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
		process.exit(1);
	}
	passed += 1;
}

// --- Real sample records (from the call-logs API response) -------------------

// Verified record carrying the outcome in `actions`, desk/field null.
check(
	"actions-only verified (id 4674)",
	deriveAlertOutcome({
		caseVerificationDesk: null,
		fieldVerificationDecision: null,
		actions: "Sample Collected",
		narrative:
			"Case Name: Biira Esther. ... Actions: Sample Collected. Verified by: ...",
	}),
	"Sample Collected"
);

check(
	"EMS evacuation via actions (id 4673)",
	deriveAlertOutcome({
		actions: "Validated for EMS Evacuation",
		narrative: "... Actions: Validated for EMS Evacuation. Verified by: ...",
	}),
	"Validated for EMS Evacuation"
);

// Desk field populated; outcome should come from the desk decision.
check(
	"desk decision (id 4669)",
	deriveAlertOutcome({
		caseVerificationDesk: "Sample Collected",
		actions: "Sample Collected",
		narrative: "Alert A 56 year female suspected of the Ebola died ...",
	}),
	"Sample Collected"
);

// Unverified record: actions is the create-time placeholder, freeform narrative.
check(
	"unverified placeholder action (id 4756)",
	deriveAlertOutcome({
		actions: "Alert reported",
		narrative:
			"Anxious looking, head of house hold does business kill in Nguthe DRC daily",
	}),
	OUTCOME_NOT_RECORDED
);

// --- Precedence ---------------------------------------------------------------

check(
	"field decision wins over desk",
	deriveAlertOutcome({
		caseVerificationDesk: "Field Case Verification",
		fieldVerificationDecision: "Sample Collected",
		actions: "Alert reported",
	}),
	"Sample Collected"
);

check(
	"desk wins over actions",
	deriveAlertOutcome({
		caseVerificationDesk: "Discarded",
		actions: "Sample Collected",
	}),
	"Discarded"
);

check(
	"escalated to field, no field decision yet",
	deriveAlertOutcome({ caseVerificationDesk: "Field Case Verification" }),
	"Field Case Verification"
);

// --- Synonym canonicalisation (field labels → canonical desk labels) ---------

check(
	"synonym: Discard -> Discarded",
	deriveAlertOutcome({ fieldVerificationDecision: "Discard" }),
	"Discarded"
);
check(
	"synonym: Sample collection -> Sample Collected",
	deriveAlertOutcome({ fieldVerificationDecision: "Sample collection" }),
	"Sample Collected"
);
check(
	"synonym: SDB -> Supervised Burial",
	deriveAlertOutcome({ fieldVerificationDecision: "SDB" }),
	"Mortality Surveillance/Supervised Burial"
);
check(
	"synonym: Recommend for Evacuation -> EMS Evacuation",
	deriveAlertOutcome({ fieldVerificationDecision: "Recommend for Evacuation" }),
	"Validated for EMS Evacuation"
);

// --- Narrative fallback -------------------------------------------------------

check(
	"narrative fallback when structured fields empty",
	deriveAlertOutcome({
		actions: "",
		narrative: "Case Name: X. Actions: Discarded. Verified by: Y.",
	}),
	"Discarded"
);
check(
	"narrative 'Actions: Alert reported.' is not an outcome",
	deriveAlertOutcome({ narrative: "Foo. Actions: Alert reported. Bar." }),
	OUTCOME_NOT_RECORDED
);

// --- Empty / whitespace -------------------------------------------------------

check("all empty -> Not Recorded", deriveAlertOutcome({}), OUTCOME_NOT_RECORDED);
check(
	"whitespace-only fields -> Not Recorded",
	deriveAlertOutcome({ caseVerificationDesk: "   ", actions: "  " }),
	OUTCOME_NOT_RECORDED
);

console.log(`\nAll ${passed} assertions passed.`);
