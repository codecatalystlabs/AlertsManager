/**
 * Tests for the quick-range presets. No test runner is configured in this
 * repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/date-range-presets.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: presets coincide on some days — in the first days of
 * a quarter "This month" and "This quarter" are the same dates — and the
 * highlight used to go to whichever came first, so clicking "This quarter" lit
 * "This month" and the button read as broken. Whatever today is, the preset
 * just clicked must be the one highlighted.
 */
import assert from "node:assert/strict";
import {
	DATE_RANGE_PRESETS,
	describeDateRange,
	describeDateRangePreset,
	epiWeekOf,
	matchActiveDateRangePreset,
	presetStep,
	rangeStepFor,
	resolveDateRangePreset,
	stepDateRange,
} from "./date-range-presets.ts";

for (const { key } of DATE_RANGE_PRESETS) {
	const { fromDate, toDate } = resolveDateRangePreset(key);
	assert.equal(matchActiveDateRangePreset(fromDate, toDate, key), key, `${key} clicked → ${key} lit`);
	assert.ok(describeDateRangePreset(key).length > 0);
}

// The overlap itself, built explicitly rather than waiting for 1–31 Oct.
const month = resolveDateRangePreset("month");
const quarter = resolveDateRangePreset("quarter");
if (month.fromDate === quarter.fromDate) {
	assert.equal(matchActiveDateRangePreset(month.fromDate, month.toDate, "quarter"), "quarter");
	assert.equal(matchActiveDateRangePreset(month.fromDate, month.toDate, "month"), "month");
}

// A stale preference never lights a preset the dates no longer match.
const week = resolveDateRangePreset("7d");
assert.equal(matchActiveDateRangePreset(week.fromDate, week.toDate, "year"), "7d");
// No preference keeps the old first-match behaviour; a custom range is none.
assert.equal(matchActiveDateRangePreset(week.fromDate, week.toDate), "7d");
assert.equal(matchActiveDateRangePreset("2020-01-01", "2020-01-02", "year"), null);

// Today is one date, not a range.
assert.match(describeDateRangePreset("today"), /^\d{1,2} \w{3} \d{4}$/);

// ---- Fixed "today": Tuesday 6 Oct 2026 --------------------------------------
const NOW = new Date(2026, 9, 6, 14, 30);
const at = (key: Parameters<typeof resolveDateRangePreset>[0]) => resolveDateRangePreset(key, NOW);
const r = (fromDate: string, toDate: string) => ({ fromDate, toDate });

assert.deepEqual(at("today"), r("2026-10-06", "2026-10-06"));
assert.deepEqual(at("7d"), r("2026-09-30", "2026-10-06"));
assert.deepEqual(at("30d"), r("2026-09-07", "2026-10-06"));
assert.deepEqual(at("90d"), r("2026-07-09", "2026-10-06"));
assert.deepEqual(at("6m"), r("2026-04-07", "2026-10-06"), "six whole months, today included");
assert.deepEqual(at("12m"), r("2025-10-07", "2026-10-06"));
assert.deepEqual(at("thisWeek"), r("2026-10-05", "2026-10-06"), "epi weeks start on Monday");
assert.deepEqual(at("lastWeek"), r("2026-09-28", "2026-10-04"));
assert.deepEqual(at("month"), r("2026-10-01", "2026-10-06"));
assert.deepEqual(at("lastMonth"), r("2026-09-01", "2026-09-30"));
assert.deepEqual(at("quarter"), r("2026-10-01", "2026-10-06"));
assert.deepEqual(at("year"), r("2026-01-01", "2026-10-06"));
// Clamped month arithmetic: six months before 31 Aug is 28 Feb, not 3 Mar.
assert.deepEqual(resolveDateRangePreset("6m", new Date(2026, 7, 31)), r("2026-03-01", "2026-08-31"));

// ISO epi weeks, including across a year boundary.
assert.deepEqual(epiWeekOf(new Date(2026, 8, 28)), { year: 2026, week: 40 });
assert.deepEqual(epiWeekOf(new Date(2026, 8, 21)), { year: 2026, week: 39 });
assert.deepEqual(epiWeekOf(new Date(2025, 11, 29)), { year: 2026, week: 1 });
assert.deepEqual(epiWeekOf(new Date(2026, 11, 31)), { year: 2026, week: 53 });
assert.deepEqual(epiWeekOf(new Date(2027, 0, 3)), { year: 2026, week: 53 });

// Ranges in a report's words.
const say = (f: string, t: string, step?: Parameters<typeof describeDateRange>[2]) => describeDateRange(f, t, step, NOW);
assert.equal(say("2026-09-28", "2026-10-04"), "Epi week 40 · 28 Sep – 4 Oct 2026");
assert.equal(say("2026-10-05", "2026-10-06"), "Epi week 41 · 5–6 Oct 2026");
assert.equal(say("2025-12-29", "2026-01-04"), "Epi week 1 · 29 Dec 2025 – 4 Jan 2026");
assert.equal(say("2026-12-28", "2027-01-03", undefined), "Epi week 53 2026 · 28 Dec 2026 – 3 Jan 2027");
assert.equal(say("2026-09-01", "2026-09-30"), "September 2026");
assert.equal(say("2026-10-01", "2026-10-06"), "October 2026 so far");
assert.equal(say("2026-10-01", "2026-10-06", { kind: "quarter" }), "Q4 2026 so far", "the step decides a coincidence");
assert.equal(say("2026-07-01", "2026-09-30"), "Q3 2026");
assert.equal(say("2025-01-01", "2025-12-31"), "2025");
assert.equal(say("2026-01-01", "2026-10-06"), "2026 so far");
assert.equal(say("2026-04-07", "2026-10-06"), "7 Apr – 6 Oct 2026");
assert.equal(say("2026-10-06", "2026-10-06"), "6 Oct 2026");
assert.equal(say("", "2026-10-06"), "");
assert.equal(describeDateRangePreset("lastWeek", NOW), "Epi week 40 · 28 Sep – 4 Oct 2026");

// Which unit a range steps by.
assert.deepEqual(rangeStepFor("2026-10-01", "2026-10-06", null, NOW), { kind: "month" });
assert.deepEqual(rangeStepFor("2026-10-01", "2026-10-06", { kind: "quarter" }, NOW), { kind: "quarter" });
assert.deepEqual(rangeStepFor("2026-04-07", "2026-10-06", presetStep("6m"), NOW), { kind: "months", n: 6 });
assert.deepEqual(rangeStepFor("2026-09-07", "2026-10-06", presetStep("30d"), NOW), { kind: "days", n: 30 });
assert.deepEqual(rangeStepFor("2026-09-03", "2026-09-17", null, NOW), { kind: "days", n: 15 }, "a custom span steps by its length");
assert.deepEqual(rangeStepFor("2026-09-01", "2026-09-30", { kind: "days", n: 7 }, NOW), { kind: "month" }, "a hint that no longer fits is ignored");
assert.equal(rangeStepFor("2026-10-06", "2026-10-01", null, NOW), null);

// Stepping back and forward.
const step = (f: string, t: string, dir: -1 | 1, s: Parameters<typeof stepDateRange>[3]) => stepDateRange(f, t, dir, s, NOW);
assert.deepEqual(step("2026-10-01", "2026-10-06", -1, { kind: "month" }), r("2026-09-01", "2026-09-30"), "this month → all of last month");
assert.deepEqual(step("2026-09-01", "2026-09-30", 1, { kind: "month" }), r("2026-10-01", "2026-10-06"), "forward stops at today");
assert.equal(step("2026-10-01", "2026-10-06", 1, { kind: "month" }), null, "nothing after today");
assert.deepEqual(step("2026-09-28", "2026-10-04", -1, { kind: "week" }), r("2026-09-21", "2026-09-27"));
assert.deepEqual(step("2026-09-28", "2026-10-04", 1, { kind: "week" }), r("2026-10-05", "2026-10-06"));
assert.deepEqual(step("2026-10-01", "2026-10-06", -1, { kind: "quarter" }), r("2026-07-01", "2026-09-30"));
assert.deepEqual(step("2026-01-01", "2026-10-06", -1, { kind: "year" }), r("2025-01-01", "2025-12-31"));
assert.deepEqual(step("2026-10-06", "2026-10-06", -1, { kind: "day" }), r("2026-10-05", "2026-10-05"));
assert.deepEqual(step("2026-04-07", "2026-10-06", -1, { kind: "months", n: 6 }), r("2025-10-07", "2026-04-06"));
assert.deepEqual(step("2025-10-07", "2026-04-06", 1, { kind: "months", n: 6 }), r("2026-04-07", "2026-10-06"), "and back again");
assert.deepEqual(step("2026-09-07", "2026-10-06", -1, { kind: "days", n: 30 }), r("2026-08-08", "2026-09-06"));
// Every preset steps back to a range of its own kind, and forward again to itself.
for (const { key } of DATE_RANGE_PRESETS) {
	const { fromDate, toDate } = at(key);
	const s = rangeStepFor(fromDate, toDate, presetStep(key), NOW)!;
	const back = step(fromDate, toDate, -1, s)!;
	assert.ok(back && back.toDate < fromDate, `${key} steps back before itself`);
	const again = step(back.fromDate, back.toDate, 1, rangeStepFor(back.fromDate, back.toDate, s, NOW)!);
	if (key !== "lastWeek" && key !== "lastMonth") {
		assert.deepEqual(again, { fromDate, toDate }, `${key}: back then forward returns to it`);
	}
}

console.log("date-range-presets: all assertions passed");
