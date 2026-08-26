/**
 * Tests for isSignalTriaged — the Yes/No the register's "Is signal triaged"
 * column answers. No test runner is configured in this repo, so this file is a
 * self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/alert-triage.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the rule has a Go twin, services.UntriagedSQL, which
 * the column's server-side ?triaged= filter runs. If the two drift, a row reads
 * "Yes" on the list and then vanishes when someone filters for Yes. The case
 * that makes them easy to drift is history: a signal triaged before the
 * decision column existed carries a PRIORITY and nothing else, and it is
 * triaged.
 */
import { isSignalTriaged } from "./alert-triage.ts";

let passed = 0;
function check(name: string, actual: boolean, expected: boolean): void {
	if (actual !== expected) {
		console.error(`FAIL: ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
		process.exit(1);
	}
	passed += 1;
}

check("a brand-new signal is not triaged", isSignalTriaged({}), false);
check("empty strings are not a decision", isSignalTriaged({ triageDecision: "", priority: "" }), false);
check("whitespace is not a decision", isSignalTriaged({ triageDecision: "  " }), false);
check("nulls are not a decision", isSignalTriaged({ triageDecision: null, priority: null }), false);

check(
	"forwarded is triaged",
	isSignalTriaged({ triageDecision: "Forwarded to Verification" }),
	true
);
// Both off-pipeline exits ARE triage decisions: the gate was passed, and the
// signal left the pipeline. Reading them as "No" would put them back on the
// triage queue's worklist, re-asking a question already answered.
check("logged is triaged", isSignalTriaged({ triageDecision: "Logged" }), true);
check("discarded is triaged", isSignalTriaged({ triageDecision: "Discarded" }), true);

// The legacy rows. A priority was only ever assigned to a signal that went
// forward, so it is the record of a triage that happened.
check(
	"a priority with no decision is triaged",
	isSignalTriaged({ priority: "Medium" }),
	true
);
check(
	"and an outcome without either is still untriaged",
	isSignalTriaged({ triageDecision: null, priority: undefined }),
	false
);

console.log(`alert-triage: ${passed} assertions passed`);
