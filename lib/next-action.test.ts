/**
 * Tests for nextAction. No test runner is configured in this repo, so this file
 * is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/next-action.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: nextAction states the EBS steps's order for the UI,
 * and getting the order wrong is not a cosmetic bug — it sends a person to the
 * wrong gate. The case that actually bit: ~1,400 signals were verified and
 * confirmed BEFORE triage existed, so they carry an outcome but no triage
 * decision. Checking triage first sent every one of them back to "Triage",
 * walking the pipeline backwards over work already done. The ordering below is
 * pinned so that cannot regress.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// next-action.ts imports a sibling through the "@/..." tsconfig path alias,
// which bare node cannot resolve. Map it to the project root so this file stays
// runnable with plain node, matching the repo's runner-less test convention.
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

const { nextAction } = await import("./next-action.ts");

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

// --- The pipeline in order --------------------------------------------------

check("a brand-new signal needs triage", nextAction({}).key, "triage");

check(
	"a forwarded signal needs verification",
	nextAction({ triageDecision: "Forwarded to Verification", priority: "High" }).key,
	"verify"
);

check(
	"a confirmed event with no level needs a risk assessment",
	nextAction({
		triageDecision: "Forwarded to Verification",
		verificationOutcome: "Confirmed",
	}).key,
	"assess-risk"
);

check(
	"a scored event whose reporter has not been told needs feedback",
	nextAction({
		triageDecision: "Forwarded to Verification",
		verificationOutcome: "Confirmed",
		riskLevel: "Moderate",
	}).key,
	"feedback"
);

check(
	"a fully handled signal needs nothing",
	nextAction({
		triageDecision: "Forwarded to Verification",
		verificationOutcome: "Confirmed",
		riskLevel: "Moderate",
		feedbackGivenAt: "2026-08-26T05:00:00Z",
	}).key,
	"none"
);

// --- Off the pipeline -------------------------------------------------------

check(
	"a discarded signal offers only re-triage",
	nextAction({ triageDecision: "Discarded" }).key,
	"retriage"
);
check(
	"re-triage is not presented as work waiting",
	nextAction({ triageDecision: "Discarded" }).actionable,
	false
);
check(
	"a logged signal offers only re-triage",
	nextAction({ triageDecision: "Logged" }).key,
	"retriage"
);

// --- The regression this file exists for ------------------------------------

check(
	"a legacy CONFIRMED signal with no triage goes forward, not back to triage",
	nextAction({ verificationOutcome: "Confirmed", isVerified: true }).key,
	"assess-risk"
);

check(
	"a legacy DISCARDED-at-verification signal with no triage goes to feedback",
	nextAction({ verificationOutcome: "Discarded", isVerified: true }).key,
	"feedback"
);

check(
	"a legacy row triaged before the decision column existed is not re-triaged",
	nextAction({ priority: "Low" }).key,
	"verify"
);

// A discarded signal that also happens to carry an outcome must still read as
// off-pipeline: triage's decision is the outer gate, not one step among many.
check(
	"triage's exit outranks a stale verification outcome",
	nextAction({ triageDecision: "Discarded", verificationOutcome: "Confirmed" }).key,
	"retriage"
);

console.log(`next-action: ${passed} assertions passed`);
