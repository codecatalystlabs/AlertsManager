"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth-loading";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { isProtectedRoute, isPublicRoute } from "@/lib/auth-routes";
import { AuthService } from "@/lib/auth";
import { userNameParts } from "@/lib/user-name";

interface AuthWrapperProps {
	children: React.ReactNode;
}

const REDIRECT_FALLBACK_MS = 1500;

export function AuthWrapper({ children }: AuthWrapperProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { isAuthenticated, isReady } = useAuthStatus();
	const redirectFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	const isPublic = isPublicRoute(pathname);
	const isProtected = isProtectedRoute(pathname);

	useEffect(() => {
		if (redirectFallbackRef.current) {
			clearTimeout(redirectFallbackRef.current);
			redirectFallbackRef.current = null;
		}

		if (!isReady) return;

		if (isProtected && !isAuthenticated) {
			router.replace("/login");
			redirectFallbackRef.current = setTimeout(() => {
				if (window.location.pathname.startsWith("/dashboard")) {
					window.location.href = "/login";
				}
			}, REDIRECT_FALLBACK_MS);
			return;
		}

		if (isAuthenticated && pathname === "/login") {
			router.replace("/dashboard");
		}
	}, [isReady, isAuthenticated, isProtected, pathname, router]);

	useEffect(() => {
		return () => {
			if (redirectFallbackRef.current) {
				clearTimeout(redirectFallbackRef.current);
			}
		};
	}, []);

	// One-time repair of a stored user that carries no NAME.
	//
	// The stored object is whatever /login returned and is otherwise refreshed
	// only when someone opens the Profile page. Logins issued before the name
	// fields were added to that response left a nameless user sitting in local
	// storage for the life of the session — and userFullName falls back to the
	// USERNAME, so those sessions went on recording "bkroland19" as the verifier
	// of a signal. Healing it here rather than telling everyone to sign out
	// again matters because the value is written into a permanent record.
	//
	// Runs at most once per mount, and only when the name is actually missing,
	// so a complete profile costs nothing. A failure is deliberately ignored:
	// the fields stay editable, and a request that did not come back is no
	// reason to interrupt someone's work.
	const healedNameRef = useRef(false);
	useEffect(() => {
		if (!isReady || !isAuthenticated || healedNameRef.current) return;
		if (userNameParts(AuthService.getUser()).length > 0) return;
		healedNameRef.current = true;
		void AuthService.fetchUserProfile().catch(() => {});
	}, [isReady, isAuthenticated]);

	if (isPublic) {
		return <>{children}</>;
	}

	if (isProtected && !isReady) {
		return <AuthLoading message="Checking authentication..." />;
	}

	if (isProtected && !isAuthenticated) {
		return <AuthLoading message="Redirecting to login..." />;
	}

	return <>{children}</>;
}
