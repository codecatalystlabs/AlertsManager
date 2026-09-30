/**
 * Tests for the signal-origin model. No test runner is configured in this
 * repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/signal-origin.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the register's "Came in via" chips are counted and
 * filtered by the server (Go services.OriginCaseSQL / OriginPredicate), while
 * each row's badge is decided here. If the two disagree on a label, a row sits
 * under the 6767 chip wearing an eCHIS badge. The cases below are every
 * alert_from value on the live table, and what each must read as.
 */
import assert from "node:assert/strict";
import {
	arrivedRecently,
	isAutoLogged6767,
	isLoggedBySync,
	parseSignalOriginFilter,
	signalOriginOf,
} from "./signal-origin.ts";

// Every alert_from on the 27-Sep-2026 dump (plus the new auto-log label).
const cases: [string | null, string][] = [
	["6767 Sync", "6767"],
	["6767 Forward", "6767"],
	["EIDSR SMS", "6767"], // the retired verify-into-alerts path
	["eCHIS Forward", "echis"],
	["eCHIS Sync", "echis"],
	["POE Sync", "poe"],
	["eCHIS", "echis"],
	["POE Forward", "poe"],
	["Open Alerts", "direct"],
	["Community Alerts", "direct"],
	["", "direct"],
	[null, "direct"],
];
for (const [alertFrom, want] of cases) {
	assert.equal(signalOriginOf(alertFrom), want, `alertFrom=${String(alertFrom)}`);
}

// Only the sync's own label counts as automatic — a hand move is not.
assert.equal(isAutoLogged6767("6767 Sync"), true);
assert.equal(isAutoLogged6767("6767 sync"), true);
assert.equal(isAutoLogged6767("6767 Forward"), false);
assert.equal(isAutoLogged6767(undefined), false);
assert.equal(isAutoLogged6767("eCHIS Sync"), false);
for (const label of ["6767 Sync", "eCHIS Sync", "POE Sync", " poe sync "]) {
	assert.equal(isLoggedBySync(label), true, label);
}
for (const label of ["6767 Forward", "eCHIS Forward", "POE Forward", "eCHIS", null]) {
	assert.equal(isLoggedBySync(label), false, String(label));
}

// A URL value that is not an origin must not become a filter.
assert.equal(parseSignalOriginFilter("6767"), "6767");
assert.equal(parseSignalOriginFilter("ECHIS"), "echis");
assert.equal(parseSignalOriginFilter("sms"), "all");
assert.equal(parseSignalOriginFilter(null), "all");

// "New" = the last 24 hours, with a little grace for a browser clock behind the server's.
const now = Date.parse("2026-09-29T12:00:00Z");
assert.equal(arrivedRecently("2026-09-29T11:00:00Z", now), true);
assert.equal(arrivedRecently("2026-09-28T12:00:01Z", now), true);
assert.equal(arrivedRecently("2026-09-28T11:59:59Z", now), false);
assert.equal(arrivedRecently("2026-09-29T12:02:00Z", now), true); // 2 min "in the future"
assert.equal(arrivedRecently("2026-09-29T13:00:00Z", now), false);
assert.equal(arrivedRecently("not a date", now), false);
assert.equal(arrivedRecently(null, now), false);

console.log("signal-origin: all assertions passed");
