"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetchAlertsPage } from "@/lib/fetch-alerts";
import type { Alert } from "@/lib/auth";
import { useIsAuthenticated } from "@/hooks/use-auth-status";
import { toast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/lib/notification-sound";

const SOUND_PREF_KEY = "alert_notif_sound";

export interface AlertNotification {
	id: number;
	caseName: string;
	district: string;
	createdAt?: string;
}

/** How often we check the server for newly-arrived alerts. */
const POLL_MS = 30_000;
/** How many recent alerts to scan per poll, and to keep in the bell list. */
const SCAN_LIMIT = 25;
const MAX_LIST = 30;

/**
 * Watches for new alerts arriving in the system and surfaces them as toasts +
 * a header notification bell. Detection is by ascending alert id (auto-increment,
 * so the highest id is the newest row). The feed is the same scoped /alerts
 * endpoint the lists use, so a district/region-scoped user is only notified about
 * alerts in their own area.
 *
 * The baseline is seeded on the first poll of the session (so the existing
 * backlog never toasts); only alerts that arrive WHILE the app is open notify.
 */
export function useAlertNotifications() {
	const isAuthenticated = useIsAuthenticated();
	const [notifications, setNotifications] = useState<AlertNotification[]>([]);
	const [unseenCount, setUnseenCount] = useState(0);
	// Highest alert id already accounted for; null until the first successful poll.
	const baselineRef = useRef<number | null>(null);

	// Sound preference (default on), persisted in localStorage. Read after mount
	// to avoid a hydration mismatch. A ref mirrors it so the detection effect can
	// read the latest value without re-subscribing.
	const [soundEnabled, setSoundEnabledState] = useState(true);
	const soundEnabledRef = useRef(true);
	useEffect(() => {
		const stored =
			typeof window !== "undefined"
				? window.localStorage.getItem(SOUND_PREF_KEY)
				: null;
		const enabled = stored !== "off";
		setSoundEnabledState(enabled);
		soundEnabledRef.current = enabled;
	}, []);
	const setSoundEnabled = useCallback((enabled: boolean) => {
		setSoundEnabledState(enabled);
		soundEnabledRef.current = enabled;
		try {
			window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off");
		} catch {
			/* storage disabled — keep the in-memory preference */
		}
	}, []);

	const { data } = useSWR(
		isAuthenticated ? ["alert-notifications"] : null,
		() =>
			fetchAlertsPage({
				page: 1,
				limit: SCAN_LIMIT,
				sort_by: "id",
				order: "desc",
			}),
		{
			refreshInterval: POLL_MS,
			revalidateOnFocus: true,
			// Keep polling even when the dashboard is a background tab, so new
			// alerts still notify when the user is working elsewhere.
			refreshWhenHidden: true,
		}
	);

	useEffect(() => {
		const rows = (data?.data ?? []) as Alert[];
		const ids = rows
			.map((r) => Number(r.id))
			.filter((n) => Number.isFinite(n));
		if (ids.length === 0) return;
		const maxId = Math.max(...ids);

		// First poll: seed the baseline silently so we don't toast the backlog.
		if (baselineRef.current === null) {
			baselineRef.current = maxId;
			return;
		}
		if (maxId <= baselineRef.current) return;

		const baseline = baselineRef.current;
		const fresh: AlertNotification[] = rows
			.filter((r) => Number(r.id) > baseline)
			.map((r) => ({
				id: Number(r.id),
				caseName: r.alertCaseName?.trim() || "Unknown case",
				district: r.alertCaseDistrict?.trim() || "—",
				createdAt: r.createdAt,
			}));
		if (fresh.length === 0) return;

		baselineRef.current = maxId;
		setNotifications((prev) => [...fresh, ...prev].slice(0, MAX_LIST));
		setUnseenCount((c) => c + fresh.length);

		if (soundEnabledRef.current) {
			playNotificationSound();
		}

		// One concise toast — a summary when several land at once, so a burst of
		// new alerts doesn't flood the screen.
		if (fresh.length === 1) {
			const a = fresh[0];
			toast({
				title: "New alert received",
				description:
					a.district !== "—"
						? `${a.caseName} — ${a.district}`
						: a.caseName,
			});
		} else {
			toast({
				title: `${fresh.length} new alerts received`,
				description: "Open the notification bell to review them.",
			});
		}
	}, [data]);

	const markAllRead = useCallback(() => setUnseenCount(0), []);
	const clearAll = useCallback(() => {
		setNotifications([]);
		setUnseenCount(0);
	}, []);

	return {
		notifications,
		unseenCount,
		markAllRead,
		clearAll,
		soundEnabled,
		setSoundEnabled,
	};
}
