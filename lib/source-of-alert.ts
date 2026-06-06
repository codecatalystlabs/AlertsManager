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
	"Call centre",
	"Health facility",
	"Health Worker",
	"Point Of Entry",
	"Schools",
	"SMS 6767",
	"VHT",
	"Other",
] as const;

export type SourceOfAlert = (typeof SOURCE_OF_ALERT_OPTIONS)[number];

/** Lowercased raw value -> canonical label. Keys must be lowercase + trimmed. */
const SOURCE_ALIASES: Record<string, SourceOfAlert> = {
	community: "Community",
	"community member": "Community",
	"mass gathering": "Community",
	"direct call": "Call centre",
	"call centre": "Call centre",
	"call center": "Call centre",
	facility: "Health facility",
	"health facility": "Health facility",
	"health worker": "Health Worker",
	"point of entry": "Point Of Entry",
	schools: "Schools",
	school: "Schools",
	sms: "SMS 6767",
	"sms 6767": "SMS 6767",
	vht: "VHT",
	"vht (village health team)": "VHT",
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
