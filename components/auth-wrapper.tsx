"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth-loading";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { isProtectedRoute, isPublicRoute } from "@/lib/auth-routes";

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
