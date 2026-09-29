import { altCode } from "@/lib/alt-code";

/** Signal Register list — forwarded 6767 / eCHIS / POE rows land here, not Alerts. */
export const SIGNAL_REGISTER_PATH = "/dashboard/signal-logs";

/** Alerts Management — only for verify-into-alerts outcomes. */
export const ALERTS_MANAGEMENT_PATH = "/dashboard/alerts";

export function signalRegisterHref(alertId?: number | null): string {
	if (alertId == null || !Number.isFinite(alertId) || alertId <= 0) {
		return SIGNAL_REGISTER_PATH;
	}
	const params = new URLSearchParams({ alert_id: String(alertId) });
	return `${SIGNAL_REGISTER_PATH}?${params.toString()}`;
}

export function alertsManagementHref(alertId?: number | null): string {
	if (alertId == null || !Number.isFinite(alertId) || alertId <= 0) {
		return ALERTS_MANAGEMENT_PATH;
	}
	const params = new URLSearchParams({ alert_id: String(alertId) });
	return `${ALERTS_MANAGEMENT_PATH}?${params.toString()}`;
}

export function forwardedToLabel(district: string): string {
	const name = district.trim();
	return name ? `Forwarded to ${name}` : "Forwarded";
}

export function forwardedFromSourceLabel(alertFrom: string | undefined): string | null {
	const from = (alertFrom ?? "").trim().toLowerCase();
	if (!from) return null;
	if (from.includes("6767")) return "6767";
	if (from.includes("echis") || from.includes("e-chis")) return "eCHIS";
	if (from.includes("poe")) return "POE";
	if (from.includes("forward")) return "Forwarded";
	return null;
}

export function signalRegisterAlertLabel(alertId: number): string {
	return altCode(alertId);
}
