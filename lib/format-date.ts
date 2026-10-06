/**
 * Shared, null-safe locale date/time formatters.
 *
 * The same "parse, guard against NaN, then toLocale*" boilerplate was
 * re-declared as `fmt` / `fmtDate` / `shortDate` / `formatWhen` /
 * `formatExport*` across timelines, tables and export helpers. These three
 * functions are the single source of truth; the old helpers now delegate here.
 *
 * Contract for every formatter:
 *   - empty / null / undefined  -> `fallback` (default "")
 *   - unparseable but non-empty  -> the original string (never silently blanked)
 *   - valid                      -> the localised rendering
 */

function toValidDate(value?: string | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | null, fallback = ""): string {
	if (!value) return fallback;
	const d = toValidDate(value);
	return d ? d.toLocaleDateString() : String(value);
}

export function formatTime(value?: string | null, fallback = ""): string {
	if (!value) return fallback;
	const d = toValidDate(value);
	return d ? d.toLocaleTimeString() : String(value);
}

export function formatDateTime(
	value?: string | null,
	fallback = "",
	options?: Intl.DateTimeFormatOptions,
): string {
	if (!value) return fallback;
	const d = toValidDate(value);
	return d ? d.toLocaleString(undefined, options) : String(value);
}

/**
 * The one date format every table column uses: "30 Sep 2026". Day before month
 * with the month spelled out, so it reads the same in every browser locale —
 * "9/30/2026" (the browser default here) and "30/09/2026" are both in use in
 * Uganda and a list cannot leave readers guessing which one they are seeing.
 */
// Spelled out by hand: Intl's en-GB short month is "Sep" or "Sept" depending on
// the browser's ICU version, and one table must not read both ways.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");

function toTableDate(value?: string | Date | null): Date | null {
	const d = value instanceof Date ? value : toValidDate(value);
	return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function formatTableDate(value?: string | Date | null, fallback = ""): string {
	if (!value) return fallback;
	const d = toTableDate(value);
	return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : String(value);
}

/** "30 Sep 2026, 22:14" — the table format with a 24-hour clock. */
export function formatTableDateTime(value?: string | Date | null, fallback = ""): string {
	if (!value) return fallback;
	const d = toTableDate(value);
	return d
		? `${formatTableDate(d)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
		: String(value);
}

/**
 * "just now" / "12 min ago" / "3 h ago" / "2 d ago", then the plain date once it
 * is more than a week old — for "when did this arrive", where recency is the
 * point and a full timestamp belongs in the tooltip. Same null/unparseable
 * contract as the formatters above.
 */
export function formatTimeAgo(
	value?: string | null,
	fallback = "",
	now: number = Date.now(),
): string {
	if (!value) return fallback;
	const d = toValidDate(value);
	if (!d) return String(value);
	const minutes = Math.floor((now - d.getTime()) / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.floor(hours / 24);
	if (days <= 7) return `${days} d ago`;
	return d.toLocaleDateString();
}
