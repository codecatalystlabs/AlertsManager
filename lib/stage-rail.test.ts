/**
 * Tests for buildRail. No test runner is configured in this repo, so this file
 * is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/stage-rail.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the rail is the only place a person sees a signal's
 * position in the pipeline, so a wrong state here is a wrong belief about the
 * work — and the states that matter most are the awkward ones. A signal
 * verified before triage existed must read SKIPPED, not passed: claiming a
 * decision nobody made is the failure this whole audit was about. A discarded
 * signal must not show a risk-assessment clock, because it is decided, not
 * late. Those cases are pinned below.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith("@/")) {
			const target = resolvePath(projectRoot, specifier.slice(2));
			return { url: pathToFileURL(`${target}.ts`).href, shortCircuit: true };
		}
		return nextResolve(specifier, context);
	},
});

const { buildRail } = await import("./stage-rail.ts");
type Rail = ReturnType<typeof buildRail>;

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		console.error(
			`FAIL: ${name}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`
		);
		process.exit(1);
	}
	passed += 1;
}

/** State of the stage at the given EBS step number. */
function at(rail: Rail, step: number): string {
	const stage = rail.find((s) => s.step === step);
	if (!stage) {
		console.error(`FAIL: no stage for step ${step}`);
		process.exit(1);
	}
	return stage.state;
}

const YESTERDAY = new Date(Date.now() - 36 * 3_600_000).toISOString();

// --- A brand-new signal -----------------------------------------------------

const fresh = buildRail({ date: YESTERDAY });
check("detection is complete by definition", at(fresh, 1), "done");
check("a new signal is sitting at triage", at(fresh, 2), "current");
check("verification is not yet reachable", at(fresh, 3), "pending");
check("step 5 is locked, not pending", at(fresh, 5), "locked");
check(
	"an overdue triage says so",
	fresh.find((s) => s.step === 2)?.detail?.includes("overdue"),
	true
);

// --- Forwarded, awaiting verification ---------------------------------------

const forwarded = buildRail({
	date: YESTERDAY,
	triageDecision: "Forwarded to Verification",
	priority: "High",
	triagedAt: YESTERDAY,
});
check("a forwarded signal has passed triage", at(forwarded, 2), "done");
check("and is sitting at verification", at(forwarded, 3), "current");
check(
	"the verification clock uses the PRIORITY's deadline, not a flat one",
	forwarded.find((s) => s.step === 3)?.detail?.includes("of 12h"),
	true
);

// --- Confirmed event awaiting a risk assessment ------------------------------

const confirmed = buildRail({
	date: YESTERDAY,
	triageDecision: "Forwarded to Verification",
	priority: "Medium",
	verificationOutcome: "Confirmed",
	verificationTime: YESTERDAY,
});
check("a confirmed event has passed verification", at(confirmed, 3), "done");
check("and is sitting at risk assessment", at(confirmed, 4), "current");
check("feedback is not yet its turn", at(confirmed, 6), "pending");

// --- The regressions this file exists for ------------------------------------

// Verified long before triage existed: the gate was skipped, not passed.
const legacy = buildRail({
	date: YESTERDAY,
	verificationOutcome: "Confirmed",
	verificationTime: YESTERDAY,
});
check("a signal verified before triage existed shows triage SKIPPED", at(legacy, 2), "skipped");
check("it is not claimed as passed", at(legacy, 2) === "done", false);
check("and it still moves forward to risk assessment", at(legacy, 4), "current");

// Discarded at triage: decided, not late. No stage after it is "owed".
const discarded = buildRail({ date: YESTERDAY, triageDecision: "Discarded" });
check("a discarded signal has a completed triage", at(discarded, 2), "done");
check("verification is blocked, not pending", at(discarded, 3), "blocked");
check("risk assessment is blocked too", at(discarded, 4), "blocked");
check("feedback is blocked", at(discarded, 6), "blocked");
check(
	"no stage on a discarded signal shows a clock",
	discarded.some((s) => s.detail?.includes("overdue")),
	false
);

// Discarded at VERIFICATION is a different thing: it went through the pipeline,
// so it is not scored but its reporter is still owed feedback.
const notConfirmed = buildRail({
	date: YESTERDAY,
	triageDecision: "Forwarded to Verification",
	verificationOutcome: "Discarded",
});
check("a signal discarded at verification is not risk-assessed", at(notConfirmed, 4), "blocked");
check("but its reporter is still owed feedback", at(notConfirmed, 6), "current");

// Fully handled.
const done = buildRail({
	date: YESTERDAY,
	triageDecision: "Forwarded to Verification",
	verificationOutcome: "Confirmed",
	riskLevel: "High",
	feedbackGivenAt: YESTERDAY,
});
check("a fully handled signal has feedback done", at(done, 6), "done");
check("and nothing is current", done.some((s) => s.state === "current"), false);
check("step 5 stays locked even then", at(done, 5), "locked");

console.log(`stage-rail: ${passed} assertions passed`);
