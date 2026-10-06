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
 * The discard archive is deliberately NOT one of them — it is reached from the
 * sidebar instead — so the boundary is pinned too: no tab may filter to it or
 * stand at it, or a queue would carry rows on which nothing is ever due.
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
const {
	STAGE_DISCARDED,
	STAGE_RISK,
	STAGE_TRIAGE,
	STAGE_VERIFICATION,
	STAGE_FEEDBACK,
	STAGE_OFF_PIPELINE,
} = await import("./pipeline.ts");
const { discardLevel, DISCARD_AT_TRIAGE, DISCARD_AT_DESK, DISCARD_AT_FIELD } =
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

// --- The discard archive is a destination, not part of a queue --------------
//
// It used to be the second half of the Triaged tab, which put a queue and an
// archive behind one tab and one count. It is now the sidebar's "Discarded
// Events", which leaves exactly two things that move could break: the Triaged
// tab inheriting archive rows, and the archive still resolving to a tab.

check(
	"an existing ?stage=verification link still opens the Triaged tab",
	registerViewFromParams(null, STAGE_VERIFICATION),
	VIEW_TRIAGED
);

check(
	"which still stands at the verification gate",
	registerViewStage(VIEW_TRIAGED),
	STAGE_VERIFICATION
);

check(
	"and still links to it",
	registerViewHref(VIEW_TRIAGED),
	`/dashboard/signal-logs?stage=${STAGE_VERIFICATION}`
);

check(
	"the discard archive is a page of its own, not a tab",
	registerViewFromParams(null, STAGE_DISCARDED),
	null
);

// Nothing is due on a discarded row, so a tab holding one would be a queue with
// work that can never be done — and the strip must not highlight a gate for it.
for (const tab of REGISTER_VIEWS) {
	check(
		`${tab.label}: does not filter to the discard archive`,
		registerViewFilters(tab.value).stage === STAGE_DISCARDED,
		false
	);
	check(
		`${tab.label}: does not stand at the discard archive`,
		registerViewStage(tab.value) === STAGE_DISCARDED,
		false
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
	"a desk discard reads as discarded at desk verification",
	discardLevel({ verificationOutcome: "Discarded", verificationLevel: "Desk" })?.level,
	DISCARD_AT_DESK
);

check(
	"a field discard reads as discarded at field verification",
	discardLevel({ verificationOutcome: "Discarded", verificationLevel: "Field" })?.level,
	DISCARD_AT_FIELD
);

check(
	"a recorded level wins over legacy field evidence",
	discardLevel({
		verificationOutcome: "Discarded",
		verificationLevel: "Desk",
		fieldVerificationDecision: "Discard",
	})?.level,
	DISCARD_AT_DESK
);

// Legacy rows (verified before levels were recorded) were all written by the
// desk form, so they read as desk unless they show a field visit — the same
// rule as Go discardedInFieldSQL, so each row's badge matches its chip.
check(
	"a legacy verification discard reads as desk",
	discardLevel({ verificationOutcome: "Discarded", caseVerificationDesk: "Discarded" })?.level,
	DISCARD_AT_DESK
);

check(
	"a legacy discard the field team decided reads as field",
	discardLevel({ verificationOutcome: "Discarded", fieldVerificationDecision: "Discard" })?.level,
	DISCARD_AT_FIELD
);

check(
	"a legacy discard after the desk sent a field team reads as field",
	discardLevel({
		verificationOutcome: "Discarded",
		caseVerificationDesk: "Field Case Verification, Discarded",
	})?.level,
	DISCARD_AT_FIELD
);

check(
	"a recorded discard reason is shown under the badge",
	discardLevel({
		verificationOutcome: "Discarded",
		verificationLevel: "Desk",
		discardReason: "False or hoax report",
	})?.reason,
	"False or hoax report"
);

// A recorded verification verdict wins over a triage close (2026-10-06): the
// furthest step reached, where the dashboard's signal flow places the signal.
// Only legacy rows carry both — e.g. imports bulk-marked Logged whose
// old-system verdict was Discarded.
check(
	"a verification verdict wins over a triage close",
	discardLevel({ triageDecision: "Logged", verificationOutcome: "Discarded" })
		?.level,
	DISCARD_AT_DESK
);
check(
	"…over a triage duplicate too",
	discardLevel({ triageDecision: "Discarded", verificationOutcome: "Discarded" })
		?.level,
	DISCARD_AT_DESK
);
check(
	"a triage close with no verdict stays at triage",
	discardLevel({ triageDecision: "Logged" })?.level,
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
