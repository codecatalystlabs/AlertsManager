/**
 * Rows created by POST …/forward from 6767 / eCHIS / POE. These belong in Signal
 * Register until a verification outcome is recorded — not Alerts Management.
 */

type ForwardedSignalLike = {
	alertFrom?: string | null;
	verificationOutcome?: string | null;
};

const FORWARD_SOURCE_MARKERS = [
	"6767 forward",
	"echis forward",
	"e-chis forward",
	"poe forward",
] as const;

/** True when alertFrom indicates a forward-from-feed row (not manual entry). */
export function isForwardedFromFeed(alert: ForwardedSignalLike): boolean {
	const from = (alert.alertFrom ?? "").trim().toLowerCase();
	if (!from) return false;
	if (FORWARD_SOURCE_MARKERS.some((m) => from.includes(m))) return true;
	return (
		from.includes("forward") &&
		(from.includes("6767") ||
			from.includes("echis") ||
			from.includes("e-chis") ||
			from.includes("poe"))
	);
}

/**
 * Forwarded signals awaiting triage/verification belong in Signal Register only.
 * Once a verification outcome exists, the row may also appear under Alerts.
 */
export function isForwardedSignalRegisterOnly(
	alert: ForwardedSignalLike
): boolean {
	if (!isForwardedFromFeed(alert)) return false;
	return !(alert.verificationOutcome ?? "").trim();
}

/** Alerts Management list should not include pending forwarded signals. */
export function shouldShowInAlertsManagement(
	alert: ForwardedSignalLike
): boolean {
	return !isForwardedSignalRegisterOnly(alert);
}
