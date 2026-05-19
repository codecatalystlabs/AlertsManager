"use client";

import { useState, useEffect } from "react";
import { AuthService } from "@/lib/auth";

/**
 * Client-only auth state. Defaults to false so SSR and first paint match,
 * then updates after mount when localStorage is available.
 */
export function useIsAuthenticated(): boolean {
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		setIsAuthenticated(AuthService.isAuthenticated());
	}, []);

	return isAuthenticated;
}
