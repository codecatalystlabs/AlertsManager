/** Quick date-range presets for the call-logs date filter. */

export type DateRangePresetKey =
	| "today"
	| "7d"
	| "30d"
	| "month"
	| "quarter"
	| "year";

export interface DateRangePreset {
	key: DateRangePresetKey;
	label: string;
}

export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
	{ key: "today", label: "Today" },
	{ key: "7d", label: "Last 7 days" },
	{ key: "30d", label: "Last 30 days" },
	{ key: "month", label: "This month" },
	{ key: "quarter", label: "This quarter" },
	{ key: "year", label: "This year" },
] as const;

export interface ResolvedRange {
	fromDate: string;
	toDate: string;
}

/** Local-time YYYY-MM-DD (avoids the UTC shift that toISOString() introduces). */
export function toLocalISODate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Compute the {fromDate, toDate} for a preset. The end is always "today" since
 * future dates hold no data; "this month/quarter/year" run from the period
 * start up to today.
 */
export function resolveDateRangePreset(key: DateRangePresetKey): ResolvedRange {
	const now = new Date();
	const today = toLocalISODate(now);
	const start = new Date(now);

	switch (key) {
		case "today":
			return { fromDate: today, toDate: today };
		case "7d":
			start.setDate(start.getDate() - 6);
			return { fromDate: toLocalISODate(start), toDate: today };
		case "30d":
			start.setDate(start.getDate() - 29);
			return { fromDate: toLocalISODate(start), toDate: today };
		case "month":
			start.setDate(1);
			return { fromDate: toLocalISODate(start), toDate: today };
		case "quarter": {
			const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
			start.setMonth(quarterStartMonth, 1);
			return { fromDate: toLocalISODate(start), toDate: today };
		}
		case "year":
			start.setMonth(0, 1);
			return { fromDate: toLocalISODate(start), toDate: today };
		default:
			return { fromDate: "", toDate: "" };
	}
}

/**
 * Which preset (if any) the current from/to range matches exactly — used to
 * highlight the active preset button. Returns null for a custom range.
 */
export function matchActiveDateRangePreset(
	fromDate: string,
	toDate: string
): DateRangePresetKey | null {
	if (!fromDate || !toDate) return null;
	for (const preset of DATE_RANGE_PRESETS) {
		const resolved = resolveDateRangePreset(preset.key);
		if (resolved.fromDate === fromDate && resolved.toDate === toDate) {
			return preset.key;
		}
	}
	return null;
}
