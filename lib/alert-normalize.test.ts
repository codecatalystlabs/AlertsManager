/**
 * Tests for normalizeAlertFromApi. No test runner is configured in this repo, so
 * this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/alert-normalize.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the normalizer is a strict WHITELIST — every field the
 * UI needs must be copied across explicitly, and anything not listed is silently
 * dropped however faithfully the API returned it. That failure mode is invisible
 * from the outside: the network response looks correct and the table simply
 * renders a blank or default cell. It cost a real debugging session when the
 * triage priority was added to the model, the endpoint and the column but not
 * here, so every field the UI depends on is pinned below.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// alert-normalize.ts imports a sibling through the "@/..." tsconfig path alias,
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

const { normalizeAlertsList } = await import("./alert-normalize.ts");

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		console.error(`FAIL: ${name}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
		process.exit(1);
	}
	passed += 1;
}

// --- Triage fields, in both casings the API may use -------------------------

const [camel] = normalizeAlertsList([
	{ id: 1, priority: "High", triagedAt: "2026-07-24T12:06:14Z", triagedBy: "DSFP Mbale" },
]);
check("camelCase priority", camel.priority, "High");
check("camelCase triagedAt", camel.triagedAt, "2026-07-24T12:06:14Z");
check("camelCase triagedBy", camel.triagedBy, "DSFP Mbale");

const [snake] = normalizeAlertsList([
	{ id: 2, priority: "Low", triaged_at: "2026-07-24T12:06:14Z", triaged_by: "DSFP Kasese" },
]);
check("snake_case priority", snake.priority, "Low");
check("snake_case triaged_at", snake.triagedAt, "2026-07-24T12:06:14Z");
check("snake_case triaged_by", snake.triagedBy, "DSFP Kasese");

// An un-triaged signal must arrive as an explicit null, not a missing key —
// "never triaged" is a state the UI reports on, not an absence of data.
const [untriaged] = normalizeAlertsList([{ id: 3 }]);
check("untriaged priority", untriaged.priority, null);
check("untriaged triagedAt", untriaged.triagedAt, null);
check("untriaged triagedBy", untriaged.triagedBy, null);

// --- Verification split -----------------------------------------------------
// Same whitelist trap: present on the model, the endpoint and the column, but
// invisible in the table until it is copied across here.

const [split] = normalizeAlertsList([
	{ id: 5, verificationOutcome: "Confirmed", responseActions: "Sample Collected, Validated for EMS Evacuation" },
]);
check("camelCase verificationOutcome", split.verificationOutcome, "Confirmed");
check("camelCase responseActions", split.responseActions, "Sample Collected, Validated for EMS Evacuation");

const [splitSnake] = normalizeAlertsList([
	{ id: 6, verification_outcome: "Discarded", response_actions: "Sample Collected" },
]);
check("snake_case verification_outcome", splitSnake.verificationOutcome, "Discarded");
check("snake_case response_actions", splitSnake.responseActions, "Sample Collected");

const [unverified] = normalizeAlertsList([{ id: 7 }]);
check("unverified outcome", unverified.verificationOutcome, null);
check("unverified actions", unverified.responseActions, null);

// --- Fields the SLA clock is computed from ----------------------------------
// Without these a row cannot be coloured against its deadline at all.

const [sla] = normalizeAlertsList([
	{
		id: 4,
		date: "2026-07-24T00:00:00Z",
		time: "2026-07-24T09:15:00Z",
		verification_time: "2026-07-24T10:00:00Z",
		case_verification_desk: "Sample Collected",
	},
]);
check("sla date present", Boolean(sla.date), true);
check("sla time present", Boolean(sla.time), true);
check("sla verificationTime", sla.verificationTime, "2026-07-24T10:00:00Z");
check("sla caseVerificationDesk", sla.caseVerificationDesk, "Sample Collected");

console.log(`ok — ${passed} assertions passed`);
