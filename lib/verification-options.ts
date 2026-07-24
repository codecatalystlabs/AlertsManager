export const DESK_VERIFICATION_OPTIONS = [
	"Field Case Verification",
	"Discarded",
	"Validated for EMS Evacuation",
	"Mortality Surveillance/Supervised Burial",
	"Sample Collected",
	"Admitted"
] as const;

export const FIELD_VERIFICATION_OPTIONS = [
	"SDB",
	"Discard",
	"Sample collection",
	"Sample Collected",
	"Mortality Surveillance/Supervised Burial",
	"Recommend for Evacuation",
	"Admitted"
] as const;

/** The desk action that escalates an alert to the field (shows the VHF form). */
export const FIELD_CASE_VERIFICATION = "Field Case Verification";

/**
 * Desk verification now allows MULTIPLE actions. To stay backward compatible
 * with the single TEXT column (`case_verification_desk` / `actions`) and all the
 * code that reads it as a plain string, multiple selections are stored as a
 * comma-separated string (e.g. "Discarded, Sample Collected"). None of the
 * option labels contain commas, so this round-trips cleanly. A legacy single
 * value simply parses to a one-element list.
 */
export function parseDeskActions(value?: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

/** Join selected desk actions back into the stored comma-separated string. */
export function joinDeskActions(values: string[]): string {
	return values.join(", ");
}

/** Whether `option` is among the selected desk actions in `value`. */
export function hasDeskAction(
	value: string | null | undefined,
	option: string
): boolean {
	return parseDeskActions(value).includes(option);
}

/** Add or remove `option` from the comma-separated desk-action string. */
export function toggleDeskAction(
	value: string | null | undefined,
	option: string,
	checked: boolean
): string {
	const selected = parseDeskActions(value).filter((o) => o !== option);
	if (checked) selected.push(option);
	return joinDeskActions(selected);
}
