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
