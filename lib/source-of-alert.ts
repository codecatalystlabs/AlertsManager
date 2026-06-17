/**
 * Canonical "Source of Alert" values and merge mapping.
 *
 * The system had several near-duplicate source labels (e.g. "Community",
 * "Community Member", "Mass gathering" all meaning Community). These are the
 * merged canonical options used in every source dropdown, and the alias map
 * collapses legacy stored values onto them so old records display the merged
 * name everywhere (tables, exports, filters).
 */
export const SOURCE_OF_ALERT_OPTIONS = [
	"Community",
	"Health facility",
	"Refugee Camp",
	"Point Of Entry",
	"Schools",
	"Other",
] as const;

export type SourceOfAlert = (typeof SOURCE_OF_ALERT_OPTIONS)[number];

/** Lowercased raw value -> canonical label. Keys must be lowercase + trimmed. */
const SOURCE_ALIASES: Record<string, SourceOfAlert> = {
	community: "Community",
	"community member": "Community",
	"mass gathering": "Community",
	facility: "Health facility",
	"health facility": "Health facility",
	"refugee camp": "Refugee Camp",
	"point of entry": "Point Of Entry",
	school: "Schools",
	other: "Other",
};

/**
 * Map a raw source value to its canonical merged label. Unknown values are
 * returned trimmed but otherwise unchanged, so no data is lost.
 */
export function normalizeSourceOfAlert(raw: string | null | undefined): string {
	if (!raw) return "";
	const key = raw.trim().toLowerCase();
	return SOURCE_ALIASES[key] ?? raw.trim();
}

/**
 * Every raw stored value that normalizes to the given canonical source label.
 * Used to build a server-side `source_of_alert` IN-filter so selecting e.g.
 * "Community" also matches legacy rows stored as "Community Member" /
 * "Mass gathering". MySQL compares case-insensitively, so the lowercased alias
 * keys still match the mixed-case values in the database.
 */
export function sourceFilterValues(canonical: string): string[] {
	const values = new Set<string>([canonical]);
	for (const [raw, mapped] of Object.entries(SOURCE_ALIASES)) {
		if (mapped === canonical) {
			values.add(raw);
		}
	}
	return Array.from(values);
}
