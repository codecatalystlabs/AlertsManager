import { useCallback, useEffect } from "react";
import { useSWRConfig } from "swr";
import { ALERTS_CHANGED_EVENT } from "@/lib/alerts-events";

/**
 * Root keys of every SWR cache entry derived from the alerts dataset. Mutating an
 * alert (create/delete/update/verify) must revalidate all of them so the list,
 * the dashboard cards, and the charts stay consistent.
 */
const ALERTS_KEY_ROOTS = new Set([
	"alerts",
	"dashboard-alerts",
	"alert-totals",
	"today-activity",
	"dashboard-chart-alerts",
]);

function isAlertsKey(key: unknown): boolean {
	const root = Array.isArray(key) ? key[0] : key;
	return typeof root === "string" && ALERTS_KEY_ROOTS.has(root);
}

/**
 * Returns `invalidateAlerts()`, which revalidates every alerts-derived SWR key,
 * and (as a side effect) revalidates them whenever `AuthService` reports an alert
 * change via the {@link ALERTS_CHANGED_EVENT} bus. Any hook that reads alerts data
 * should call this so external mutations refresh the current view too.
 */
export function useInvalidateAlerts(): () => Promise<unknown> {
	const { mutate } = useSWRConfig();

	const invalidateAlerts = useCallback(
		() => mutate(isAlertsKey),
		[mutate]
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handler = () => {
			void invalidateAlerts();
		};
		window.addEventListener(ALERTS_CHANGED_EVENT, handler);
		return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
	}, [invalidateAlerts]);

	return invalidateAlerts;
}
