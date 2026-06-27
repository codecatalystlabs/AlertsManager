import { useEffect, useState } from "react";
import { AuthService, type User } from "@/lib/auth";
import { AUTH_STATUS_CHANGE_EVENT } from "@/lib/auth-events";

/**
 * The currently authenticated user from local storage, read after mount so the
 * server-rendered markup (which has no access to storage) and the first client
 * render match — avoiding a hydration mismatch. Returns null until mounted.
 *
 * Subscribes to auth-change + storage events so the value updates within the
 * session when the profile is refreshed or the user logs out — otherwise every
 * gate derived from this (canDeleteAlerts, canManageUsers, district/region
 * scoping) kept showing the stale role until a full reload.
 *
 * Use for UI-level permission gating (hiding buttons a role can't use). The
 * backend still enforces every restriction, so this is UX-only.
 */
export function useCurrentUser(): User | null {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const update = () => setUser(AuthService.getUser());
		update();
		window.addEventListener(AUTH_STATUS_CHANGE_EVENT, update);
		window.addEventListener("storage", update);
		return () => {
			window.removeEventListener(AUTH_STATUS_CHANGE_EVENT, update);
			window.removeEventListener("storage", update);
		};
	}, []);

	return user;
}
