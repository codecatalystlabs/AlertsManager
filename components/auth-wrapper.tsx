"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth-loading";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { isProtectedRoute, isPublicRoute } from "@/lib/auth-routes";
import { AuthService } from "@/lib/auth";
import { firstOpenPath } from "@/lib/access";

interface AuthWrapperProps {
	children: React.ReactNode;
}

const REDIRECT_FALLBACK_MS = 1500;
const SESSION_REFRESH_MS = 60_000;

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
			router.replace(firstOpenPath(AuthService.getUser()));
		}
	}, [isReady, isAuthenticated, isProtected, pathname, router]);

	useEffect(() => {
		return () => {
			if (redirectFallbackRef.current) {
				clearTimeout(redirectFallbackRef.current);
			}
		};
	}, []);

	// Keep the stored account current. What an account may do is decided on
	// the server and can change at any time (an administrator edits a role,
	// moves the account to another district, deactivates it), so the copy
	// /login stored is refreshed from /users/profile on every page load and
	// whenever the tab regains focus — at most once a minute. The same refresh
	// heals sessions stored before the login response carried the name fields,
	// which otherwise recorded the USERNAME as the verifier of a signal.
	//
	// A failure is ignored: a request that did not come back is no reason to
	// interrupt someone's work, and a revoked account is signed out by the
	// request wrapper when the API refuses it.
	const lastRefreshRef = useRef(0);
	useEffect(() => {
		if (!isReady || !isAuthenticated) return;
		const refresh = () => {
			if (Date.now() - lastRefreshRef.current < SESSION_REFRESH_MS) return;
			lastRefreshRef.current = Date.now();
			void AuthService.fetchUserProfile().catch(() => {});
		};
		refresh();
		const onVisible = () => {
			if (document.visibilityState === "visible") refresh();
		};
		window.addEventListener("focus", refresh);
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			window.removeEventListener("focus", refresh);
			document.removeEventListener("visibilitychange", onVisible);
		};
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
