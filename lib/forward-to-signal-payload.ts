/**
 * Body for POST …/forward on 6767 / eCHIS / POE feeds.
 * `outcome_recorded: false` keeps the created row in Signal Register only
 * (Alerts Management filters on outcome_recorded=true).
 */
export function buildForwardToSignalPayload(
	district: string,
	note?: string
): {
	district: string;
	note?: string;
	outcome_recorded: false;
	outcomeRecorded: false;
	target: "signal_register";
} {
	const payload = {
		district: district.trim(),
		outcome_recorded: false as const,
		outcomeRecorded: false as const,
		target: "signal_register" as const,
	};
	if (note?.trim()) return { ...payload, note: note.trim() };
	return payload;
}
