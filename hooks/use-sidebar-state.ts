"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "alerts-manager-sidebar-collapsed";

function readCollapsedPreference(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

export function useSidebarState() {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setCollapsed(readCollapsedPreference());
		setHydrated(true);
	}, []);

	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, String(collapsed));
		} catch {
			/* ignore quota / private mode */
		}
	}, [collapsed, hydrated]);

	const toggleCollapsed = useCallback(() => {
		setCollapsed((prev) => !prev);
	}, []);

	const openMobile = useCallback(() => setMobileOpen(true), []);
	const closeMobile = useCallback(() => setMobileOpen(false), []);

	return {
		mobileOpen,
		setMobileOpen,
		openMobile,
		closeMobile,
		collapsed,
		setCollapsed,
		toggleCollapsed,
		hydrated,
	};
}

/** Main content left padding matching sidebar width on lg+ */
export function getMainContentPaddingClass(collapsed: boolean): string {
	return collapsed ? "lg:pl-16" : "lg:pl-72";
}
