/**
 * Tests for the Signals Map analytics. No test runner is configured in this
 * repo, so this is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/geo-map-analytics.test.ts
 */
import {
	addDays,
	classifyTrend,
	comparisonWindows,
	cumulative,
	daysBetween,
	describeFrame,
	formatTrend,
	frameCounts,
	regionSeriesFrom,
	trendsFor,
} from "./geo-map-analytics.ts";

let passed = 0;
function eq(actual: unknown, expected: unknown, msg: string): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a !== e) throw new Error(`${msg}\n  expected ${e}\n  received ${a}`);
	passed++;
}

// ── Dates ────────────────────────────────────────────────────────────────
eq(addDays("2026-03-01", -1), "2026-02-28", "addDays crosses a month");
eq(addDays("2024-02-28", 1), "2024-02-29", "addDays honours leap years");
eq(daysBetween("2026-09-01", "2026-09-30"), 29, "daysBetween");

// ── Comparison windows ───────────────────────────────────────────────────
{
	const w = comparisonWindows("2026-09-01", "2026-09-30");
	eq(w.mode, "range", "bounded range compares range vs range");
	eq(w.previous, { from: "2026-08-02", to: "2026-08-31" }, "previous window is the equal-length window right before");
	eq(w.label, "vs previous 30 days", "range label");
	eq(w.text, { current: null, vs: "vs previous 30 days" }, "range tooltip text has no separate current window");
}
{
	const w = comparisonWindows("2026-09-30", "2026-09-30");
	eq(w.previous, { from: "2026-09-29", to: "2026-09-29" }, "single-day range compares the day before");
	eq(w.label, "vs previous 1 day", "singular label");
}
{
	const today = new Date(2026, 9, 1); // 1 Oct 2026
	const w = comparisonWindows("", "", today);
	eq(w.mode, "rolling", "all-time falls back to a rolling window");
	eq(w.current, { from: "2026-09-02", to: "2026-10-01" }, "rolling current = last 30 days incl. today");
	eq(w.previous, { from: "2026-08-03", to: "2026-09-01" }, "rolling previous = the 30 days before");
	eq(w.text, { current: "Last 30 days", vs: "vs prior 30 days" }, "rolling tooltip text names both windows");
	eq(comparisonWindows("2026-09-01", "", today).mode, "rolling", "half-open range is rolling too");
	eq(comparisonWindows("2026-09-30", "2026-09-01", today).mode, "rolling", "inverted range is not trusted");
}

// ── Trend classes ────────────────────────────────────────────────────────
eq(classifyTrend(0, 0).cls, "none", "nothing either side");
eq(classifyTrend(4, 0).cls, "new", "something from nothing");
eq(classifyTrend(10, 5).cls, "surge", "doubled");
eq(classifyTrend(7, 5).cls, "rising", "+40%");
eq(classifyTrend(5, 5).cls, "steady", "flat");
eq(classifyTrend(6, 5).cls, "steady", "+20% is steady");
eq(classifyTrend(3, 5).cls, "falling", "−40%");
eq(classifyTrend(1, 5).cls, "plunge", "−80%");
eq(classifyTrend(0, 5).cls, "plunge", "to zero");

// Hotspots ignore tiny numbers.
eq(classifyTrend(2, 1).hotspot, false, "1 → 2 is not a hotspot");
eq(classifyTrend(3, 0).hotspot, true, "0 → 3 is a hotspot");
eq(classifyTrend(3, 2).hotspot, false, "+1 is not enough");
eq(classifyTrend(6, 4).hotspot, true, "4 → 6: +2 and 1.5×");
eq(classifyTrend(30, 25).hotspot, false, "big but slow growth is not a hotspot");
eq(classifyTrend(5, 10).hotspot, false, "falling is never a hotspot");

eq(formatTrend(classifyTrend(7, 5)), "▲ 2 (+40%)", "rising label");
eq(formatTrend(classifyTrend(3, 5)), "▼ 2 (−40%)", "falling label");
eq(formatTrend(classifyTrend(5, 5)), "no change", "flat label");
eq(formatTrend(classifyTrend(4, 0)), "new · 4", "new label");
eq(formatTrend(classifyTrend(0, 0)), "", "empty label");

{
	const t = trendsFor(new Map([["a", 4], ["b", 0]]), new Map([["a", 2]]));
	eq([t.get("a")?.cls, t.get("b")?.cls], ["surge", "none"], "trendsFor treats a missing previous as 0");
}

// ── Timeline frames ──────────────────────────────────────────────────────
eq(cumulative([1, 0, 2, 3]), [1, 1, 3, 6], "cumulative");

{
	const series = new Map([
		["a", [1, 4, 0]],
		["b", [0, 2, 5]],
	]);
	const f = frameCounts(series, ["a", "b", "c"], 1, false);
	eq([...f.current], [["a", 4], ["b", 2], ["c", 0]], "frame counts at index 1");
	eq([...f.previous], [["a", 1], ["b", 0], ["c", 0]], "previous frame");
	eq(f.scaleMax, 5, "scale spans every frame, not just the current one");
	const c = frameCounts(series, ["a", "b"], 2, true);
	eq([...c.current], [["a", 5], ["b", 7]], "cumulative frame");
	eq(c.scaleMax, 7, "cumulative scale = the final totals");
	eq(frameCounts(series, ["a"], 0, false).previous.get("a"), 0, "frame 0 has no previous");
}

{
	const feature = (uid: string, regionUid: string) =>
		({ type: "Feature", geometry: null, properties: { uid, regionUid } }) as never;
	const tl = {
		level: "district",
		parentUid: "",
		granularity: "week",
		from: "",
		to: "",
		buckets: [{ start: "", end: "", label: "" }, { start: "", end: "", label: "" }],
		series: { d1: [1, 2], d2: [3, 0], d3: [5, 5], orphan: [9, 9] },
		totals: [9, 7],
	} as never;
	const regions = regionSeriesFrom(tl, [feature("d1", "R1"), feature("d2", "R1"), feature("d3", "R2")]);
	eq(regions.get("R1"), [4, 2], "region series sums its districts");
	eq(regions.get("R2"), [5, 5], "single-district region");
	eq(regions.size, 2, "a series with no known district is not attributed");
}

// ── Frame labels ─────────────────────────────────────────────────────────
eq(
	describeFrame({ start: "2026-09-14", end: "2026-09-20", label: "W38 2026" }, "week"),
	"W38 · 14 Sept – 20 Sept 2026".replace(/Sept/g, new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, 8, 1))),
	"week label"
);
eq(
	describeFrame({ start: "2026-09-01", end: "2026-09-30", label: "Sep 2026" }, "month"),
	"September 2026",
	"full month label"
);

console.log(`geo-map-analytics: ${passed} assertions passed`);
