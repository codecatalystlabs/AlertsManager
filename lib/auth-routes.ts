const PUBLIC_ROUTE_PREFIXES = ["/add-alert", "/login", "/evd-definition"] as const;
const PROTECTED_ROUTE_PREFIX = "/dashboard";

export function isPublicRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	if (pathname === "/") return true;
	return PUBLIC_ROUTE_PREFIXES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
}

export function isProtectedRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	return (
		pathname === PROTECTED_ROUTE_PREFIX ||
		pathname.startsWith(`${PROTECTED_ROUTE_PREFIX}/`)
	);
}
