/**
 * Tests for the admin-managed EBS signal registry. No test runner is configured
 * in this repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/ebs-signals.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the signal code is the value STORED on alerts, so the
 * dangerous edit is not adding a signal — it is retiring one. A retired signal
 * must vanish from the triage picker while still resolving for the alerts
 * already classified under it; if those two behaviours ever collapse into one,
 * historical classifications silently render as bare codes (or the picker keeps
 * offering a signal IES&PHE removed). Both directions are pinned below.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// ebs-signals.ts imports its store through the "@/..." tsconfig path alias,
// which bare node cannot resolve. Map it to the project root so this file stays
// runnable with plain node, matching the repo's runner-less convention.
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
	DEFAULT_EBS_SIGNALS,
	ebsSignals,
	ebsSignalStore,
	findSignal,
	normalizeSignalCode,
	setEbsSignals,
	signalMatches,
	signalSummary,
} = await import("./ebs-signals.ts");
type EbsSignalRow = Awaited<
	ReturnType<typeof import("./ebs-signals.ts").allEbsSignals>
>[number];

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

function row(
	code: string,
	label: string,
	sortOrder: number,
	active = true,
	usageCount = 0
): EbsSignalRow {
	return {
		id: sortOrder,
		code,
		label,
		domain: "human",
		setting: "community",
		annex: "II",
		active,
		sortOrder,
		usageCount,
	};
}

// --- The built-in fallback works before the API responds --------------------

check(
	"the published list is the pre-hydration fallback",
	ebsSignals().length,
	DEFAULT_EBS_SIGNALS.length
);
check(
	"and it resolves a published code",
	normalizeSignalCode("ch1"),
	"CH1"
);

// --- Hydration replaces the list -------------------------------------------

setEbsSignals([
	row("CE7", "Sudden increase in average atmospheric temperature", 30),
	row("CH1", "Unexplained bleeding from any part of the body", 10, true, 42),
	row("CH99", "A signal IES&PHE removed at the annual review", 20, false),
]);

check(
	"the picker offers active signals in admin-defined order",
	ebsSignals().map((s) => s.code),
	["CH1", "CE7"]
);
check(
	"a signal removed by an admin stops resolving",
	normalizeSignalCode("CH2"),
	null
);

// --- Retired: hidden from the picker, still resolvable ---------------------

check(
	"a RETIRED signal is not offered",
	ebsSignals().some((s) => s.code === "CH99"),
	false
);
check(
	"but it still normalises for alerts already classified under it",
	normalizeSignalCode("ch99"),
	"CH99"
);
check(
	"and still resolves to its definition",
	signalSummary("CH99"),
	"CH99 — A signal IES&PHE removed at the annual review"
);

// --- Lookup helpers ---------------------------------------------------------

check("findSignal returns the definition", findSignal("CH1")?.label,
	"Unexplained bleeding from any part of the body");
check("findSignal on an unknown code is null", findSignal("ZZ9"), null);
check("a blank code resolves to null", normalizeSignalCode(""), null);
check("null/undefined are handled", normalizeSignalCode(null), null);
check("signalSummary on nothing is null", signalSummary(null), null);

// An admin editing a definition must change what the picker's search matches.
check(
	"search matches the edited definition text",
	signalMatches(findSignal("CH99")!, "annual review"),
	true
);
check(
	"search matches on code",
	signalMatches(findSignal("CH1")!, "ch1"),
	true
);

// --- The store notifies only on a real change -------------------------------

let notifications = 0;
const unsubscribe = ebsSignalStore.subscribe(() => {
	notifications += 1;
});

// Same signals, different objects — every SWR revalidation returns exactly this.
// Only usageCount moved, which no picker renders.
setEbsSignals([
	row("CH1", "Unexplained bleeding from any part of the body", 10, true, 43),
	row("CH99", "A signal IES&PHE removed at the annual review", 20, false),
	row("CE7", "Sudden increase in average atmospheric temperature", 30),
]);
check("an unchanged list does not notify subscribers", notifications, 0);

// Retiring one IS a change the picker must see.
setEbsSignals([
	row("CH1", "Unexplained bleeding from any part of the body", 10, true, 43),
	row("CH99", "A signal IES&PHE removed at the annual review", 20, false),
	row("CE7", "Sudden increase in average atmospheric temperature", 30, false),
]);
check("retiring a signal notifies once", notifications, 1);
check("and it leaves the picker", ebsSignals().map((s) => s.code), ["CH1"]);

// An empty read must never blank the picker — a failed/empty API response would
// otherwise leave triage with no signals at all.
setEbsSignals([]);
check("an empty list is ignored", ebsSignals().map((s) => s.code), ["CH1"]);

unsubscribe();

console.log(`ebs-signals: ${passed} assertions passed`);
