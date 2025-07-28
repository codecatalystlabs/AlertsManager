"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthService } from "@/lib/auth";

interface AuthWrapperProps {
	children: React.ReactNode;
}

// Routes that don't require authentication
const publicRoutes = ["/", "/add-alert", "/login"];

// Routes that require authentication
const protectedRoutes = ["/dashboard"];

export function AuthWrapper({ children }: AuthWrapperProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
		null
	);
	const pathname = usePathname();

	useEffect(() => {
		const checkAuth = () => {
			const authenticated = AuthService.isAuthenticated();
			setIsAuthenticated(authenticated);

			// Check if current route requires authentication
			const isProtectedRoute = protectedRoutes.some((route) =>
				pathname.startsWith(route)
			);
			const isPublicRoute = publicRoutes.includes(pathname);

			// If it's a protected route and user is not authenticated, redirect to login
			if (isProtectedRoute && !authenticated) {
				window.location.href = "/login";
			}

			// If user is authenticated and tries to access login page, redirect to dashboard
			if (authenticated && pathname === "/login") {
				window.location.href = "/dashboard";
			}
		};

		checkAuth();
	}, [pathname]);

	// For public routes, always render children regardless of auth status
	const isPublicRoute = publicRoutes.includes(pathname);
	const isProtectedRoute = protectedRoutes.some((route) =>
		pathname.startsWith(route)
	);

	// Show loading state only for protected routes while checking authentication
	if (isProtectedRoute && isAuthenticated === null) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-uganda-red mx-auto"></div>
					<p className="mt-4 text-gray-600">
						Checking authentication...
					</p>
				</div>
			</div>
		);
	}

	// For public routes, always render
	if (isPublicRoute) {
		return <>{children}</>;
	}

	// For protected routes, only render if authenticated
	if (isProtectedRoute && isAuthenticated) {
		return <>{children}</>;
	}

	// For protected routes without authentication, the useEffect will handle redirect
	if (isProtectedRoute && !isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-uganda-red mx-auto"></div>
					<p className="mt-4 text-gray-600">
						Redirecting to login...
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
