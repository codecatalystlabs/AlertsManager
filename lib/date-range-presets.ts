/**
 * Quick date ranges for every date filter in the app — the register, the
 * Alerts page, the eCHIS/PoE screens, the performance tables, the deck and the
 * dashboard — so "Last 6 months" is the same dates everywhere.
 *
 * Two kinds:
 *   - ROLLING windows ending today (Last 7 days … Last 12 months), for "what
 *     has been happening lately".
 *   - REPORTING PERIODS on the calendar the programme reports by: ISO epi
 *     weeks (Monday–Sunday, as the weekly brief and deck count them), months,
 *     quarters and years. "This …" runs from the period's start to today.
 *
 * And a step: any range can be walked back or forward by its own unit — an epi
 * week to the epi week before, a month to the month before, "Last 6 months" to
 * the six before that — which is how a weekly or monthly report is compared
 * with the one before it (stepDateRange).
 */

export type DateRangePresetKey =
	| "today"
	| "7d"
	| "30d"
	| "90d"
	| "6m"
	| "12m"
	| "thisWeek"
	| "lastWeek"
	| "month"
	| "lastMonth"
	| "quarter"
	| "year";

export type DateRangePresetGroup = "rolling" | "period";

export interface DateRangePreset {
	key: DateRangePresetKey;
	label: string;
	group: DateRangePresetGroup;
}

/** In display order. With no preference, the first match lights (today before an epi week starting today). */
export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
	{ key: "today", label: "Today", group: "rolling" },
	{ key: "7d", label: "Last 7 days", group: "rolling" },
	{ key: "30d", label: "Last 30 days", group: "rolling" },
	{ key: "90d", label: "Last 90 days", group: "rolling" },
	{ key: "6m", label: "Last 6 months", group: "rolling" },
	{ key: "12m", label: "Last 12 months", group: "rolling" },
	{ key: "thisWeek", label: "This epi week", group: "period" },
	{ key: "lastWeek", label: "Last epi week", group: "period" },
	{ key: "month", label: "This month", group: "period" },
	{ key: "lastMonth", label: "Last month", group: "period" },
	{ key: "quarter", label: "This quarter", group: "period" },
	{ key: "year", label: "This year", group: "period" },
] as const;

export interface ResolvedRange {
	fromDate: string;
	toDate: string;
}

/* ------------------------------------------------------------------------ */
/* Day arithmetic, all in local time                                         */
/* ------------------------------------------------------------------------ */

/** Local-time YYYY-MM-DD (avoids the UTC shift that toISOString() introduces). */
export function toLocalISODate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** A YYYY-MM-DD as local midnight, or null. */
function parseDay(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function addDays(d: Date, n: number): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Whole months, the day clamped to the target month (31 Aug − 6 months = 28/29 Feb). */
function addMonths(d: Date, n: number): Date {
	const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
	const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

function daysBetween(a: Date, b: Date): number {
	return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
		Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}

const sameDay = (a: Date, b: Date) => daysBetween(a, b) === 0;

/** Monday of the ISO (epi) week containing d. */
function startOfEpiWeek(d: Date): Date {
	return addDays(d, -((d.getDay() + 6) % 7));
}

/** ISO week number and its year: the week belongs to the year of its Thursday. */
export function epiWeekOf(d: Date): { year: number; week: number } {
	const thursday = addDays(d, 3 - ((d.getDay() + 6) % 7));
	const jan4 = new Date(thursday.getFullYear(), 0, 4);
	// Week 1 is the week holding 4 January; count Thursdays from its Thursday.
	const week = 1 + Math.round((daysBetween(startOfEpiWeek(jan4), thursday) - 3) / 7);
	return { year: thursday.getFullYear(), week };
}

const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const quarterStart = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);

function range(from: Date, to: Date): ResolvedRange {
	return { fromDate: toLocalISODate(from), toDate: toLocalISODate(to) };
}

/* ------------------------------------------------------------------------ */
/* Presets                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * The {fromDate, toDate} of a preset, ending no later than today (`now`
 * overridable for tests). Rolling windows count today in: "Last 30 days" is
 * today and the 29 before it, "Last 6 months" starts the day after the same
 * date six months back.
 */
export function resolveDateRangePreset(key: DateRangePresetKey, now: Date = new Date()): ResolvedRange {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	switch (key) {
		case "today":
			return range(today, today);
		case "7d":
			return range(addDays(today, -6), today);
		case "30d":
			return range(addDays(today, -29), today);
		case "90d":
			return range(addDays(today, -89), today);
		case "6m":
			return range(addDays(addMonths(today, -6), 1), today);
		case "12m":
			return range(addDays(addMonths(today, -12), 1), today);
		case "thisWeek":
			return range(startOfEpiWeek(today), today);
		case "lastWeek": {
			const monday = addDays(startOfEpiWeek(today), -7);
			return range(monday, addDays(monday, 6));
		}
		case "month":
			return range(new Date(today.getFullYear(), today.getMonth(), 1), today);
		case "lastMonth": {
			const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
			return range(first, endOfMonth(first));
		}
		case "quarter":
			return range(quarterStart(today), today);
		case "year":
			return range(new Date(today.getFullYear(), 0, 1), today);
		default:
			return { fromDate: "", toDate: "" };
	}
}

/**
 * Which preset (if any) the current from/to range matches exactly — used to
 * highlight the active preset button. Returns null for a custom range.
 *
 * Presets can coincide: in the first days of a quarter, "This month" and
 * "This quarter" are the same dates (on 5 Oct both are 1–5 Oct). Without a
 * hint the first match wins, so clicking "This quarter" lit "This month" and
 * read as a button that did nothing. `prefer` — the preset last clicked —
 * wins whenever it still describes the range.
 */
export function matchActiveDateRangePreset(
	fromDate: string,
	toDate: string,
	prefer?: DateRangePresetKey | null,
	now: Date = new Date()
): DateRangePresetKey | null {
	if (!fromDate || !toDate) return null;
	if (prefer) {
		const resolved = resolveDateRangePreset(prefer, now);
		if (resolved.fromDate === fromDate && resolved.toDate === toDate) return prefer;
	}
	for (const preset of DATE_RANGE_PRESETS) {
		const resolved = resolveDateRangePreset(preset.key, now);
		if (resolved.fromDate === fromDate && resolved.toDate === toDate) {
			return preset.key;
		}
	}
	return null;
}

/* ------------------------------------------------------------------------ */
/* Describing a range                                                        */
/* ------------------------------------------------------------------------ */

// Spelled out: Intl's en-GB short month is "Sep" or "Sept" depending on the
// ICU version, so the same date read differently on different machines.
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

/** "28 Sep – 4 Oct 2026", "21–27 Sep 2026", "6 Oct 2026", "30 Dec 2025 – 5 Jan 2026". */
function spanText(from: Date, to: Date): string {
	const day = (d: Date) => String(d.getDate());
	const year = (d: Date) => String(d.getFullYear());
	if (sameDay(from, to)) return `${day(to)} ${MONTH_SHORT[to.getMonth()]} ${year(to)}`;
	if (from.getFullYear() !== to.getFullYear()) {
		return `${day(from)} ${MONTH_SHORT[from.getMonth()]} ${year(from)} – ${day(to)} ${MONTH_SHORT[to.getMonth()]} ${year(to)}`;
	}
	if (from.getMonth() === to.getMonth()) {
		return `${day(from)}–${day(to)} ${MONTH_SHORT[to.getMonth()]} ${year(to)}`;
	}
	return `${day(from)} ${MONTH_SHORT[from.getMonth()]} – ${day(to)} ${MONTH_SHORT[to.getMonth()]} ${year(to)}`;
}

/**
 * A range in the words a report would use: "Epi week 39 · 21–27 Sep 2026",
 * "September 2026", "October 2026 so far", "Q3 2026", "2025", or the dates.
 * `step` (the unit the range is being stepped by) decides between shapes that
 * coincide, e.g. 1–6 Oct is both "October so far" and "Q4 so far".
 * "" when either end is missing.
 */
export function describeDateRange(
	fromDate: string,
	toDate: string,
	step?: RangeStep | null,
	now: Date = new Date()
): string {
	const from = parseDay(fromDate);
	const to = parseDay(toDate);
	if (!from || !to) return "";
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const hinted = step && isCalendarKind(step.kind) && fitsKind(from, to, today, step.kind) ? step.kind : null;
	const kind = hinted ?? stepShape(from, to, today);
	const soFar = (end: Date) => (sameDay(to, end) ? "" : " so far");

	switch (kind) {
		case "week": {
			const { year, week } = epiWeekOf(from);
			return `Epi week ${week}${year !== to.getFullYear() ? ` ${year}` : ""} · ${spanText(from, to)}`;
		}
		case "month":
			return `${MONTH_LONG[from.getMonth()]} ${from.getFullYear()}${soFar(endOfMonth(from))}`;
		case "quarter":
			return `Q${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()}${soFar(quarterEnd(from))}`;
		case "year":
			return `${from.getFullYear()}${soFar(new Date(from.getFullYear(), 11, 31))}`;
		default:
			return spanText(from, to);
	}
}

/** The dates a preset stands for today, for its tooltip. */
export function describeDateRangePreset(key: DateRangePresetKey, now: Date = new Date()): string {
	const { fromDate, toDate } = resolveDateRangePreset(key, now);
	const from = parseDay(fromDate);
	const to = parseDay(toDate);
	if (!from || !to) return "";
	if (key === "thisWeek" || key === "lastWeek") {
		return `Epi week ${epiWeekOf(from).week} · ${spanText(from, to)}`;
	}
	return spanText(from, to);
}

/* ------------------------------------------------------------------------ */
/* Stepping a range back and forward                                         */
/* ------------------------------------------------------------------------ */

/** The unit a range steps by. */
export type RangeStep =
	| { kind: "day" | "week" | "month" | "quarter" | "year" }
	| { kind: "months"; n: number }
	| { kind: "days"; n: number };

/** The step a preset implies: an epi week steps by epi weeks, "Last 6 months" by six months. */
export function presetStep(key: DateRangePresetKey): RangeStep {
	switch (key) {
		case "today":
			return { kind: "day" };
		case "thisWeek":
		case "lastWeek":
			return { kind: "week" };
		case "month":
		case "lastMonth":
			return { kind: "month" };
		case "quarter":
			return { kind: "quarter" };
		case "year":
			return { kind: "year" };
		case "6m":
			return { kind: "months", n: 6 };
		case "12m":
			return { kind: "months", n: 12 };
		case "7d":
			return { kind: "days", n: 7 };
		case "30d":
			return { kind: "days", n: 30 };
		case "90d":
			return { kind: "days", n: 90 };
	}
}

type CalendarKind = "day" | "week" | "month" | "quarter" | "year";
const CALENDAR_KINDS: readonly CalendarKind[] = ["day", "week", "month", "quarter", "year"];
const isCalendarKind = (k: string): k is CalendarKind => (CALENDAR_KINDS as readonly string[]).includes(k);

const quarterEnd = (d: Date) => endOfMonth(new Date(quarterStart(d).getFullYear(), quarterStart(d).getMonth() + 2, 1));

/**
 * Whether from–to is one whole calendar `kind` — or its start up to today,
 * which is what the "This …" presets give.
 */
function fitsKind(from: Date, to: Date, today: Date, kind: CalendarKind): boolean {
	if (to < from) return false;
	const partial = (end: Date) => sameDay(to, end) || (sameDay(to, today) && to < end);
	switch (kind) {
		case "day":
			return sameDay(from, to);
		case "week":
			return sameDay(startOfEpiWeek(from), from) && partial(addDays(from, 6));
		case "month":
			return from.getDate() === 1 && partial(endOfMonth(from));
		case "quarter":
			return sameDay(quarterStart(from), from) && partial(quarterEnd(from));
		case "year":
			return from.getMonth() === 0 && from.getDate() === 1 && partial(new Date(from.getFullYear(), 11, 31));
	}
}

/** The smallest calendar unit the range is, or null for any other span. */
function stepShape(from: Date, to: Date, today: Date): CalendarKind | null {
	return CALENDAR_KINDS.find((k) => fitsKind(from, to, today, k)) ?? null;
}

/** Whether a range has the shape a step expects, so a preset's step is only used on ranges it fits. */
function fitsStep(from: Date, to: Date, today: Date, step: RangeStep): boolean {
	switch (step.kind) {
		case "days":
			return daysBetween(from, to) + 1 === step.n;
		case "months":
			return sameDay(addDays(addMonths(from, step.n), -1), to);
		default:
			return fitsKind(from, to, today, step.kind);
	}
}

/** The step to use for a range: the hint when it fits, else inferred from the dates. */
export function rangeStepFor(
	fromDate: string,
	toDate: string,
	hint?: RangeStep | null,
	now: Date = new Date()
): RangeStep | null {
	const from = parseDay(fromDate);
	const to = parseDay(toDate);
	if (!from || !to || to < from) return null;
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (hint && fitsStep(from, to, today, hint)) return hint;
	const shape = stepShape(from, to, today);
	if (shape) return { kind: shape };
	return { kind: "days", n: daysBetween(from, to) + 1 };
}

/**
 * The range one step back (dir −1) or forward (+1). A partial "This …" period
 * steps to the whole previous one; stepping forward stops at today, clipping
 * the last period to it, and returns null once the range already reaches
 * today.
 */
export function stepDateRange(
	fromDate: string,
	toDate: string,
	dir: -1 | 1,
	step: RangeStep,
	now: Date = new Date()
): ResolvedRange | null {
	const from = parseDay(fromDate);
	const to = parseDay(toDate);
	if (!from || !to) return null;
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (dir === 1 && to >= today) return null;

	let nf: Date;
	let nt: Date;
	switch (step.kind) {
		case "day":
			nf = addDays(from, dir);
			nt = nf;
			break;
		case "week":
			nf = addDays(startOfEpiWeek(from), 7 * dir);
			nt = addDays(nf, 6);
			break;
		case "month":
			nf = new Date(from.getFullYear(), from.getMonth() + dir, 1);
			nt = endOfMonth(nf);
			break;
		case "quarter":
			nf = new Date(quarterStart(from).getFullYear(), quarterStart(from).getMonth() + 3 * dir, 1);
			nt = quarterEnd(nf);
			break;
		case "year":
			nf = new Date(from.getFullYear() + dir, 0, 1);
			nt = new Date(nf.getFullYear(), 11, 31);
			break;
		case "months":
			if (dir === -1) {
				nt = addDays(from, -1);
				nf = addDays(addMonths(nt, -step.n), 1);
			} else {
				nf = addDays(to, 1);
				nt = addDays(addMonths(nf, step.n), -1);
			}
			break;
		case "days":
			if (dir === -1) {
				nt = addDays(from, -1);
				nf = addDays(nt, -(step.n - 1));
			} else {
				nf = addDays(to, 1);
				nt = addDays(nf, step.n - 1);
			}
			break;
	}
	if (nf > today) return null;
	if (nt > today) nt = today;
	return range(nf, nt);
}
