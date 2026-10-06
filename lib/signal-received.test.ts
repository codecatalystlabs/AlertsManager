/**
 * Tests for the register's "Received" column. No test runner is configured in
 * this repo, so this is a self-contained assertion script:
 *
 *   node --experimental-strip-types lib/signal-received.test.ts
 *   TZ=UTC node --experimental-strip-types lib/signal-received.test.ts
 *
 * Run it under both timezones: the placeholder it guards against is a
 * timezone artifact (midnight UTC rendered as 3:00 AM in Uganda).
 */
const { signalReceivedAt } = await import("./signal-received.ts");
const { formatTableDate, formatTableDateTime } = await import("./format-date.ts");

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		console.error(`FAIL: ${name}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
		process.exit(1);
	}
	passed++;
}

// Shapes taken from the live API (Go marshals in the server's zone, EAT).
const forwarded6767 = signalReceivedAt(
	"2026-09-24T03:00:00+03:00",
	"2026-09-24T03:00:00+03:00"
);
check("a 6767 forward's midnight-UTC placeholder is not a time", forwarded6767.hasTime, false);
check("…but its day survives", formatTableDate(forwarded6767.at), "24 Sep 2026");

const synced = signalReceivedAt(
	"2026-09-30T22:14:07.477+03:00",
	"2026-09-30T22:14:07.477+03:00"
);
check("a synced signal keeps its real time", synced.hasTime, true);
check(
	"and reads as the same instant",
	synced.at?.toISOString(),
	"2026-09-30T19:14:07.477Z"
);

// Legacy row: junk 03:00 on `date`, the real clock on `time`.
const legacy = signalReceivedAt("2026-07-14T03:00:00+03:00", "2026-07-14T13:16:00+03:00");
check("day from date, clock from time", legacy.at?.toISOString(), "2026-07-14T10:16:00.000Z");

// `time` carries an unrelated day on some rows; only its clock is used.
const strayDay = signalReceivedAt("2026-07-14T00:00:00+03:00", "2025-01-02T09:30:00+03:00");
check("time's own day is ignored", strayDay.at?.toISOString(), "2026-07-14T06:30:00.000Z");

const localMidnight = signalReceivedAt("2026-07-14T00:00:00+03:00", "2026-07-14T00:00:00.000+03:00");
check("a local-midnight time is a placeholder too", localMidnight.hasTime, false);

check("no date → nothing to show", signalReceivedAt(null, "2026-07-14T13:16:00+03:00").at, null);
check("no time → day only", signalReceivedAt("2026-07-14T03:00:00+03:00", null).hasTime, false);

const { reportedAt } = await import("./signal-received.ts");
const sms = reportedAt("2026-09-30 22:14");
check("a space-separated 6767 time keeps its clock", sms.hasTime, true);
check("…in the viewer's clock", formatTableDateTime(sms.at), "30 Sep 2026, 22:14");
check("a bare event date is day-only", reportedAt("2026-09-30").hasTime, false);
check("…on its own day in any timezone", formatTableDate(reportedAt("2026-09-30").at), "30 Sep 2026");

check("table date format", formatTableDate("2026-09-30T22:14:07+03:00").endsWith("2026"), true);
check("empty → fallback", formatTableDateTime(null, "—"), "—");

console.log(`signal-received: ${passed} assertions passed (TZ=${process.env.TZ ?? "system"})`);
