/**
 * When a signal was received, read from the register's two columns.
 *
 * `alerts.date` holds the right DAY but a junk time-of-day, and `alerts.time`
 * holds the real CLOCK but an unreliable day — so the true moment is the day of
 * one with the clock of the other. Same composite the backend uses for its hour
 * windows (`TIMESTAMP(DATE(date), TIME(time))`, recentSignalTimestampSQL).
 *
 * Some rows have no clock at all: signals moved in from 6767 by hand carry a
 * date-only value, stored as midnight UTC, which a Ugandan browser renders as
 * "3:00 AM". Showing that as a time invents a fact nobody recorded, so an exact
 * midnight (UTC or local, to the millisecond) is read as "no time recorded" and
 * the row shows its date alone. A real report landing on 00:00:00.000 exactly
 * is not a case worth inventing 2,400 fake times for.
 */

export interface SignalReceived {
	/** The moment, or the start of the day when only the day is known. */
	at: Date | null;
	/** False when only the day was recorded. */
	hasTime: boolean;
}

const DAY_MS = 86_400_000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
// "T" (ISO) or a space ("2026-09-30 22:14", the 6767 adapter's form).
const CLOCK_RE = /[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/;

function parse(value?: string | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Exactly midnight, UTC or in the value's own wall clock: a date stored without a time. */
function isMidnight(value: string, d: Date): boolean {
	if (d.getTime() % DAY_MS === 0) return true;
	const clock = CLOCK_RE.exec(value)?.[1] ?? "";
	return /^00:00(:00(\.0+)?)?$/.test(clock);
}

export function signalReceivedAt(
	date?: string | null,
	time?: string | null
): SignalReceived {
	const day = parse(date);
	if (!day || !date) return { at: null, hasTime: false };

	// The day as it was stored, not as this browser's timezone would shift it.
	const ymd = DAY_RE.exec(date);
	const dayStart = ymd
		? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
		: new Date(day.getFullYear(), day.getMonth(), day.getDate());

	const clock = parse(time);
	const clockMatch = time ? CLOCK_RE.exec(time) : null;
	if (!clock || !time || !clockMatch || isMidnight(time, clock)) {
		return { at: dayStart, hasTime: false };
	}

	// Day from `date`, wall clock (and its offset) from `time`.
	const isoDay = ymd
		? `${ymd[1]}-${ymd[2]}-${ymd[3]}`
		: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`;
	const at = parse(`${isoDay}T${clockMatch[1]}${clockMatch[2] ?? ""}`);
	return at ? { at, hasTime: true } : { at: dayStart, hasTime: false };
}

/**
 * The same rule for a single timestamp that may hold only a day ("2026-09-30",
 * or a midnight placeholder) — e.g. a 6767 message's reported time, which the
 * event adapter hands over as "2026-09-30 22:14" or as a bare event date.
 */
export function reportedAt(value?: string | null): SignalReceived {
	return signalReceivedAt(value, value);
}
