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
 *
 * The Triaged tab splits in two — the verification queue, and the archive of
 * what was discarded — which adds a second round trip through the SAME three
 * functions. Both halves are pinned below, including the one thing a split can
 * silently break: the old ?stage=verification bookmark must still land on the
 * queue, not on the archive.
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
	TRIAGED_SPLITS,
	SPLIT_KEPT,
	SPLIT_DISCARDED,
	VIEW_ALL,
	VIEW_UNTRIAGED,
	VIEW_TRIAGED,
	VIEW_VERIFIED,
	registerViewFilters,
	registerViewFromParams,
	registerViewHref,
	registerViewStage,
	triagedSplitFromParams,
} = await import("./register-view.ts");
const {
	STAGE_DISCARDED,
	STAGE_RISK,
	STAGE_TRIAGE,
	STAGE_VERIFICATION,
	STAGE_FEEDBACK,
	STAGE_OFF_PIPELINE,
} = await import("./pipeline.ts");
const { discardLevel, DISCARD_AT_TRIAGE, DISCARD_AT_VERIFICATION } =
	await import("./discard-level.ts");

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
// would offer to navigate out of the queue that was asked for. The feedback
// queue is one of them: it is reached from the sidebar's "Risk Assessed" entry.
check(
	"the feedback queue is not a tab",
	registerViewFromParams(null, STAGE_FEEDBACK),
	null
);

check(
	"the off-pipeline queue is not a tab",
	registerViewFromParams(null, STAGE_OFF_PIPELINE),
	null
);

// No tab may stand at the feedback gate either — a tab whose filters resolved
// there would duplicate the sidebar destination and split the same queue in two.
for (const tab of REGISTER_VIEWS) {
	check(
		`${tab.label}: does not stand at the feedback gate`,
		registerViewFilters(tab.value).stage === STAGE_FEEDBACK,
		false
	);
}

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

// --- The Triaged tab's two halves -------------------------------------------

check(
	"the queue half keeps the Triaged tab's original stage",
	registerViewFilters(VIEW_TRIAGED, SPLIT_KEPT).stage,
	STAGE_VERIFICATION
);

check(
	"the discarded half filters server-side on the discard archive",
	registerViewFilters(VIEW_TRIAGED, SPLIT_DISCARDED).stage,
	STAGE_DISCARDED
);

// The whole point of splitting rather than adding a fifth tab: an existing
// ?stage=verification link is the queue, and must not silently become the
// archive.
check(
	"an existing ?stage=verification link still opens the queue half",
	triagedSplitFromParams(STAGE_VERIFICATION),
	SPLIT_KEPT
);

check(
	"and still resolves to the Triaged tab",
	registerViewFromParams(null, STAGE_VERIFICATION),
	VIEW_TRIAGED
);

check(
	"the discard archive is the Triaged tab too, not a page of its own",
	registerViewFromParams(null, STAGE_DISCARDED),
	VIEW_TRIAGED
);

check(
	"?stage=discarded selects the discarded half",
	triagedSplitFromParams(STAGE_DISCARDED),
	SPLIT_DISCARDED
);

// Nothing is due on the archive, so it must not highlight the verification card
// on the pipeline strip as though a verification were owed on every row.
check(
	"the discarded half stands at no verification gate",
	registerViewStage(VIEW_TRIAGED, SPLIT_DISCARDED) === STAGE_VERIFICATION,
	false
);

check(
	"while the queue half still stands at the verification gate",
	registerViewStage(VIEW_TRIAGED, SPLIT_KEPT),
	STAGE_VERIFICATION
);

// Defaulting matters in three places at once — a caller that forgets the split
// must get the queue, which is what every pre-split call site expects.
check("filters default to the queue half", registerViewFilters(VIEW_TRIAGED).stage, STAGE_VERIFICATION);
check("href defaults to the queue half", registerViewHref(VIEW_TRIAGED), `/dashboard/signal-logs?stage=${STAGE_VERIFICATION}`);
check("stage defaults to the queue half", registerViewStage(VIEW_TRIAGED), STAGE_VERIFICATION);

// Each half's href round-trips back to itself, the same property the tabs have.
for (const half of TRIAGED_SPLITS) {
	const href = registerViewHref(VIEW_TRIAGED, half.value);
	const query = new URLSearchParams(href.split("?")[1] ?? "");
	check(
		`${half.label}: its href resolves back to the Triaged tab`,
		registerViewFromParams(query.get("view"), query.get("stage")),
		VIEW_TRIAGED
	);
	check(
		`${half.label}: its href resolves back to itself`,
		triagedSplitFromParams(query.get("stage")),
		half.value
	);
}

// --- Which gate discarded a row ---------------------------------------------
//
// The archive merges two gates' discards, so the level shown per row is the
// only thing keeping them apart. Precedence mirrors lib/signal-state.ts: a
// signal triage threw out never reached verification on its own merits.

check(
	"a triage duplicate reads as discarded at triage",
	discardLevel({ triageDecision: "Discarded" })?.level,
	DISCARD_AT_TRIAGE
);

check(
	"a logged signal reads as discarded at triage too",
	discardLevel({ triageDecision: "Logged" })?.level,
	DISCARD_AT_TRIAGE
);

check(
	"but with its own reason, not the duplicate's",
	discardLevel({ triageDecision: "Logged" })?.reason ===
		discardLevel({ triageDecision: "Discarded" })?.reason,
	false
);

check(
	"a verification discard reads as discarded at verification",
	discardLevel({ verificationOutcome: "Discarded" })?.level,
	DISCARD_AT_VERIFICATION
);

check(
	"triage wins when both gates recorded something",
	discardLevel({ triageDecision: "Discarded", verificationOutcome: "Discarded" })
		?.level,
	DISCARD_AT_TRIAGE
);

check(
	"a forwarded, unverified signal is not discarded",
	discardLevel({ triageDecision: "Forwarded to Verification" }),
	null
);

check(
	"a confirmed event is not discarded",
	discardLevel({
		triageDecision: "Forwarded to Verification",
		verificationOutcome: "Confirmed",
	}),
	null
);

check(
	"an escalation is not a discard — the field still owes a decision",
	discardLevel({ verificationOutcome: "Escalated to Field" }),
	null
);

check("an untouched signal is not discarded", discardLevel({}), null);

console.log(`register-view: ${passed} assertions passed`);
