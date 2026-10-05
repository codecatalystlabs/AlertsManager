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
	describeDateRangePreset,
	matchActiveDateRangePreset,
	resolveDateRangePreset,
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

console.log("date-range-presets: all assertions passed");
