/**
 * Tests for the register's view wiring. No test runner is configured in this
 * repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/register-view.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: each tab is supposed to hold rows whose next move is
 * the SAME move — Triage on Untriaged, Verify on Triaged, Assess risk on
 * Verified. That only holds while the URL, the filters and the highlighted
 * stage agree on which queue a tab is. They are set in three separate functions
 * here, so the round trip (tab -> href -> params -> filters) is pinned.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// register-view.ts imports the stage keys through the "@/..." tsconfig path
// alias, which bare node cannot resolve. Map it to the project root so this file
// stays runnable with plain node, matching the repo's runner-less convention.
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

const {
	REGISTER_VIEWS,
	VIEW_ALL,
	VIEW_UNTRIAGED,
	VIEW_TRIAGED,
	VIEW_VERIFIED,
	registerViewFilters,
	registerViewFromParams,
	registerViewHref,
	registerViewStage,
} = await import("./register-view.ts");
const { STAGE_RISK, STAGE_TRIAGE, STAGE_VERIFICATION, STAGE_FEEDBACK } =
	await import("./pipeline.ts");

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

// --- Verified IS the risk-assessment queue ----------------------------------

check(
	"the Verified tab filters to the risk queue",
	registerViewFilters(VIEW_VERIFIED).stage,
	STAGE_RISK
);

check(
	"and applies no second verification filter over it",
	registerViewFilters(VIEW_VERIFIED).verification,
	"all"
);

check(
	"the risk queue's URL lands on the Verified tab",
	registerViewFromParams(null, STAGE_RISK),
	VIEW_VERIFIED
);

check(
	"the Verified tab links to the risk queue",
	registerViewHref(VIEW_VERIFIED),
	`/dashboard/signal-logs?stage=${STAGE_RISK}`
);

check(
	"and stands at the risk gate, so the heading and strip agree",
	registerViewStage(VIEW_VERIFIED),
	STAGE_RISK
);

// A stale ?view=verified bookmark predates the move and must not fall back to
// a different list than the tab now shows.
check(
	"?view=verified still resolves to the same view",
	registerViewFromParams("verified", null),
	VIEW_VERIFIED
);

// --- The other three views stay where they were -----------------------------

check("untriaged -> triage queue", registerViewFilters(VIEW_UNTRIAGED).stage, STAGE_TRIAGE);
check(
	"triaged -> verification queue",
	registerViewFilters(VIEW_TRIAGED).stage,
	STAGE_VERIFICATION
);
check("all -> no stage", registerViewFilters(VIEW_ALL).stage, "");
check("all stands at no gate", registerViewStage(VIEW_ALL), null);

// Queues that are NOT one of the tabs keep their own tabless page, or the strip
// would offer to navigate out of the queue that was asked for.
check(
	"the feedback queue is not a tab",
	registerViewFromParams(null, STAGE_FEEDBACK),
	null
);

// --- Every tab's filters round-trip through its own href --------------------

for (const tab of REGISTER_VIEWS) {
	const href = registerViewHref(tab.value);
	const query = new URLSearchParams(href.split("?")[1] ?? "");
	check(
		`${tab.label}: its href resolves back to itself`,
		registerViewFromParams(query.get("view"), query.get("stage")),
		tab.value
	);
}

console.log(`register-view: ${passed} assertions passed`);
