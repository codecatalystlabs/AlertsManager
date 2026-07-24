/**
 * Tests for the verification outcome/action split. No test runner is configured
 * in this repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/verification-options.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY: this is a TWIN of alertsMIS/backend/internal/services/verification_outcome.go.
 * The server re-derives the split from whatever this form submits, so if the two
 * drift, a verification means one thing in the UI and another in the database.
 * The cases below are every distinct case_verification_desk value in the live
 * table, with the same expectations the Go test asserts.
 */
import {
	splitDeskVerification,
	legacyDeskValue,
	VERIFICATION_CONFIRMED,
	VERIFICATION_DISCARDED,
	VERIFICATION_ESCALATED_FIELD,
	EMS_EVACUATION_ACTION,
} from "./verification-options.ts";

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a !== e) {
		console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
		process.exit(1);
	}
	passed += 1;
}

const SAMPLE = "Sample Collected";
const SDB = "Mortality Surveillance/Supervised Burial";

// Every distinct live value, matching the Go test exactly.
const cases: [string, string, string[]][] = [
	["Sample Collected", VERIFICATION_CONFIRMED, [SAMPLE]],
	["Discarded", VERIFICATION_DISCARDED, []],
	["Validated for EMS Evacuation", VERIFICATION_CONFIRMED, [EMS_EVACUATION_ACTION]],
	["Field Case Verification", VERIFICATION_ESCALATED_FIELD, []],
	["Mortality Surveillance/Supervised Burial", VERIFICATION_CONFIRMED, [SDB]],
	["Mortality Surveillance/Supervised Burial, Sample Collected", VERIFICATION_CONFIRMED, [SDB, SAMPLE]],
	["Sample Collected, Mortality Surveillance/Supervised Burial", VERIFICATION_CONFIRMED, [SAMPLE, SDB]],
	["Field Case Verification, Sample Collected", VERIFICATION_ESCALATED_FIELD, [SAMPLE]],
	// A sample taken and the signal then discarded — an ordinary sequence, not a conflict.
	["Sample Collected, Discarded", VERIFICATION_DISCARDED, [SAMPLE]],
	["Discarded, Sample Collected", VERIFICATION_DISCARDED, [SAMPLE]],
	// The rows whose evacuation the old collapsed derivation hid.
	["Sample Collected, Validated for EMS Evacuation", VERIFICATION_CONFIRMED, [SAMPLE, EMS_EVACUATION_ACTION]],
	["Validated for EMS Evacuation, Sample Collected", VERIFICATION_CONFIRMED, [EMS_EVACUATION_ACTION, SAMPLE]],
	["Validated for EMS Evacuation, Discarded", VERIFICATION_DISCARDED, [EMS_EVACUATION_ACTION]],
	["Field Case Verification, Sample Collected, Discarded", VERIFICATION_DISCARDED, [SAMPLE]],
	["Field Case Verification, Discarded", VERIFICATION_DISCARDED, []],
	["Discarded, Field Case Verification", VERIFICATION_DISCARDED, []],
	["Discarded, Mortality Surveillance/Supervised Burial", VERIFICATION_DISCARDED, [SDB]],
];

for (const [value, wantOutcome, wantActions] of cases) {
	const got = splitDeskVerification(value);
	check(`split ${value}`, got, { outcome: wantOutcome, actions: wantActions });
}

// "Not verified" is a state of its own — never coerced into an outcome.
check("empty", splitDeskVerification(""), { outcome: "", actions: [] });
check("null", splitDeskVerification(null), { outcome: "", actions: [] });
check("unknown phrase", splitDeskVerification("Escalated to the DHO"), {
	outcome: "",
	actions: [],
});

// Casing and the known misspelling.
check("lowercase synonym", splitDeskVerification("sample collection"), {
	outcome: VERIFICATION_CONFIRMED,
	actions: [SAMPLE],
});
check("misspelled SDB", splitDeskVerification("Mortality Survaillance/Supervised Burial").actions, [SDB]);

// The legacy mirror must round-trip, or the UI and the stored column diverge.
const roundTrips: [string, string[]][] = [
	[VERIFICATION_CONFIRMED, [SAMPLE]],
	[VERIFICATION_CONFIRMED, [SAMPLE, EMS_EVACUATION_ACTION]],
	[VERIFICATION_DISCARDED, []],
	[VERIFICATION_DISCARDED, [SAMPLE]],
	[VERIFICATION_ESCALATED_FIELD, []],
	[VERIFICATION_ESCALATED_FIELD, [SAMPLE]],
];
for (const [outcome, actions] of roundTrips) {
	const legacy = legacyDeskValue(outcome as never, actions);
	check(`round-trip ${outcome} + [${actions}] via "${legacy}"`, splitDeskVerification(legacy), {
		outcome,
		actions,
	});
}

console.log(`ok — ${passed} assertions passed`);
