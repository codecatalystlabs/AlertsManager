/**
 * Bridges non-React alert mutations (in `AuthService`) to the React/SWR layer.
 *
 * `AuthService` runs outside React and can't reach SWR's scoped cache, so after
 * it creates/updates/deletes/verifies an alert it dispatches this event. The
 * `useInvalidateAlerts` hook listens and revalidates every alerts-derived SWR key.
 */
export const ALERTS_CHANGED_EVENT = "alertsmanager-alerts-changed";

export function notifyAlertsChanged(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
}
