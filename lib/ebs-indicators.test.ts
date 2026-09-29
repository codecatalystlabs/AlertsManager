/**
 * Tests for the dashboard's indicator valuation, signal flow and weekly brief.
 * No test runner is configured in this repo, so this file is a self-contained,
 * assertion-based script:
 *
 *   node --experimental-strip-types lib/ebs-indicators.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the 2026-09-29 reports audit found figures that could
 * not be defended — a "cascade" whose later stages exceeded earlier ones, a
 * timeliness rate that scored 3,549 untimed legacy records as late, and a
 * published ratio that read 7014%. The rules that fixed them are pinned here:
 * a rate is shown only over a denominator that contains its numerator, a
 * timeliness rate divides by the signals a clock can judge, and the brief
 * never reads a week that has not ended.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// The libs import each other through the "@/..." tsconfig alias, which bare
// node cannot resolve. Map it to the project root.
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

const { buildEbsIndicatorRows, isPartialWeek, percent } = await import("./ebs-indicators.ts");
const { buildSignalFlow, openWorkTotal } = await import("./signal-flow.ts");
const { buildWeeklyBrief } = await import("./weekly-brief.ts");

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		console.error(`FAIL: ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
		process.exit(1);
	}
	passed += 1;
}

// Live all-time counts from 2026-09-29 (after the audit's backend changes).
const indicators = {
	signalsReported: 17667,
	signalsTriaged: 9750,
	triagedWithin24h: 530,
	triageTimed: 6142,
	duplicateSignals: 374,
	signalsVerified: 13348,
	verifiedWithin24h: 303,
	triagedVerified: 6375,
	verificationTimed: 6273,
	events: 4113,
	eventsRiskAssessed: 983,
	responseInitiated: 761,
	underMonitoring: 13,
	sampleCollected: 668,
	evacuated: 494,
	emsChannelEvents: 8,
	sdb: 586,
	sdbEligible: 11,
	alertsReported: 951,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows = buildEbsIndicatorRows({ indicators } as any);
const row = (id: string) => rows.find((r) => r.id === id)!;

// --- percent -----------------------------------------------------------------
check("percent: plain share", percent(1, 4), 25);
check("percent: empty whole has no share", percent(0, 0), null);
check("percent: a part bigger than its whole is a definition mismatch", percent(494, 8), null);

// --- timeliness divides by what a clock can judge ----------------------------
check("triage rate uses timed triages", row("signals-triaged").rateBase, 6142);
check("triage rate", row("signals-triaged").rate, 9); // 530 / 6142
check("untimed triages are a gap, not late", row("signals-triaged").gap, {
	count: 3608,
	label: "triaged with no triage time",
});
check("triage is held to KPI 3", row("signals-triaged").status, "below");
check("verification rate uses timed verifications", row("signals-verified").rateBase, 6273);
check("verification gap", row("signals-verified").gap?.count, 102);
check("row 4 carries no §11 target (KPI 4 uses priority deadlines)", row("signals-verified").status, null);

// --- a rate only over a true superset ----------------------------------------
check("risk assessment divides by events, not verified signals", row("events-risk-assessed").rateBase, 4113);
check("risk assessment rate", row("events-risk-assessed").display, "24%");
check("alerts are a share of assessed events", row("alerts").display, "97%");
check("evacuations stay a count (published denominator does not contain them)", row("events-evacuated").rate, null);
check("evacuations display the count", row("events-evacuated").display, "494");
check("SDB stays a count", row("sdb").display, "586");
check("signals reported is a count", row("signals-reported").display, "17,667");
check("caption states numerator and base", row("signals-triaged").caption, "530 of 6,142 timed triages");

// An older API without the timed counts falls back to the published base.
const legacyRows = buildEbsIndicatorRows({
	indicators: { ...indicators, triageTimed: undefined, verificationTimed: undefined, triagedVerified: undefined },
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
check("older API: triage base falls back", legacyRows.find((r) => r.id === "signals-triaged")!.rateBase, 9750);
check("older API: no phantom gap", legacyRows.find((r) => r.id === "signals-triaged")!.gap, null);

// --- partial weeks ----------------------------------------------------------
check("a week ending today is still under way", isPartialWeek("2026-09-29", "2026-09-29"), true);
check("a week ending yesterday is complete", isPartialWeek("2026-09-28", "2026-09-29"), false);

// --- signal flow ------------------------------------------------------------
const flow = buildSignalFlow([
	{ key: "awaiting-triage", label: "", count: 181 },
	{ key: "closed-at-triage", label: "", count: 287 },
	{ key: "awaiting-verification", label: "", count: 146 },
	{ key: "discarded", label: "", count: 738 },
	{ key: "verified-unclassified", label: "", count: 1 },
	{ key: "awaiting-risk", label: "", count: 269 },
	{ key: "awaiting-feedback", label: "", count: 6 },
	{ key: "alert", label: "", count: 200 },
]);
check("flow lists every state in pipeline order", flow.map((f) => f.key), [
	"awaiting-triage",
	"closed-at-triage",
	"awaiting-verification",
	"flagged-no-outcome",
	"discarded",
	"verified-unclassified",
	"awaiting-risk",
	"awaiting-feedback",
	"alert",
]);
check("a state the API did not send reads as zero", flow.find((f) => f.key === "flagged-no-outcome")!.count, 0);
check("open work is the sum of the queues", openWorkTotal(flow), 181 + 146 + 269 + 6);
check("tiny shares keep a decimal", flow.find((f) => f.key === "verified-unclassified")!.share, 0.1);
check("an older API without a flow renders empty", buildSignalFlow(undefined).every((f) => f.count === 0), true);

// --- weekly brief -----------------------------------------------------------
function week(no: number, start: string, end: string, counts: Partial<typeof indicators>) {
	return {
		week: `2026-W${no}`,
		year: 2026,
		weekNo: no,
		start,
		end,
		counts: { ...Object.fromEntries(Object.keys(indicators).map((k) => [k, 0])), ...counts },
	};
}
const series = [
	week(35, "2026-08-24", "2026-08-30", { signalsReported: 500 }),
	week(36, "2026-08-31", "2026-09-06", { signalsReported: 450 }),
	week(37, "2026-09-07", "2026-09-13", { signalsReported: 470 }),
	week(38, "2026-09-14", "2026-09-20", { signalsReported: 473 }),
	week(39, "2026-09-21", "2026-09-27", {
		signalsReported: 402,
		signalsTriaged: 262,
		triageTimed: 262,
		triagedWithin24h: 154,
		signalsVerified: 209,
		events: 106,
		eventsRiskAssessed: 32,
		alertsReported: 20,
	}),
	week(40, "2026-09-28", "2026-10-04", { signalsReported: 5 }),
];
const brief = buildWeeklyBrief(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{ indicatorSeries: series, signalFlow: [{ key: "awaiting-triage", label: "", count: 181 }] } as any,
	"2026-09-29"
)!;
check("the brief reads the last COMPLETE week", brief.title, "Epi week 39, 2026");
check("volume against the 4-week average", brief.lines[0].text, "402 signals reported, 15% below the 4-week average of 473.");
check("triage against KPI 3", brief.lines[1].text, "59% triaged within 24 hours (154 of 262; target 90%).");
check("59% is far below 90%", brief.lines[1].tone, "bad");
check("risk line", brief.lines[3].text, "30% of events risk-assessed (32 of 106; target 90%); 20 alerts issued.");
check("open queues", brief.lines[4].text, "181 in the working queues — 181 awaiting triage.");
check("the week under way is noted, not briefed", brief.partialNote, "Week 40 so far: 5 signals (not briefed until it ends).");
const clipped = buildWeeklyBrief(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	{ indicatorSeries: series } as any,
	"2026-09-29",
	"2026-08-30" // a range starting on the Sunday of W35: W35 holds one day
)!;
check("a week the range only clips is not in the baseline", clipped.lines[0].text, "402 signals reported, 13% below the 3-week average of 464.");
check("no complete week, no brief", buildWeeklyBrief({ indicatorSeries: [series[5]] } as never, "2026-09-29"), null);

console.log(`ebs-indicators: ${passed} checks passed`);
