/** Dispatched when token/user changes in this tab (storage events are cross-tab only). */
export const AUTH_STATUS_CHANGE_EVENT = "uganda-health-auth-status-change";

export function notifyAuthStatusChange(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(AUTH_STATUS_CHANGE_EVENT));
}
