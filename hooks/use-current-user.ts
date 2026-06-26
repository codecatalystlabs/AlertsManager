import { useEffect, useState } from "react";
import { AuthService, type User } from "@/lib/auth";

/**
 * The currently authenticated user from local storage, read after mount so the
 * server-rendered markup (which has no access to storage) and the first client
 * render match — avoiding a hydration mismatch. Returns null until mounted.
 *
 * Use for UI-level permission gating (hiding buttons a role can't use). The
 * backend still enforces every restriction, so this is UX-only.
 */
export function useCurrentUser(): User | null {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);

	return user;
}
