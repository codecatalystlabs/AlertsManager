import { useState, useEffect, useCallback } from "react";
import { AlertCounts, CallLogAlert } from "@/app/dashboard/types";
import {
	fetchAlertTotals,
	fetchAllAlerts,
	fetchTodayActivity,
} from "@/lib/fetch-alerts";
import {
	getCachedAlerts,
	isCacheFresh,
	subscribeAlertsCache,
} from "@/lib/alerts-cache";

interface DashboardData {
	alerts: CallLogAlert[];
	alertCounts: AlertCounts;
	/** Count of alerts logged today (by createdAt, local time). */
	todayAlerts: number;
	todayVerified: number;
}

interface UseDashboardDataReturn {
	data: DashboardData;
	loading: boolean;
	chartsLoading: boolean;
	/** True while the dedicated "today" activity query is in flight. */
	todayLoading: boolean;
	isValidating: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export const useDashboardData = (): UseDashboardDataReturn => {
	const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
	const [alertCounts, setAlertCounts] = useState<AlertCounts>({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const [todayAlerts, setTodayAlerts] = useState(0);
	const [todayVerified, setTodayVerified] = useState(0);
	const [loading, setLoading] = useState(true);
	const [chartsLoading, setChartsLoading] = useState(true);
	const [todayLoading, setTodayLoading] = useState(true);
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const applyAlerts = useCallback((alertsData: CallLogAlert[]) => {
		setAlerts(alertsData);
		setChartsLoading(false);
	}, []);

	// Today's activity comes from a dedicated createdAt-based query, kept separate
	// from the capped 90-day dataset so a large backlog can't hide today's records.
	const loadTodayActivity = useCallback(async () => {
		setTodayLoading(true);
		try {
			const today = await fetchTodayActivity();
			setTodayAlerts(today.calls);
			setTodayVerified(today.verified);
		} catch {
			// Non-fatal: a secondary metric shouldn't break the whole dashboard.
		} finally {
			setTodayLoading(false);
		}
	}, []);

	const loadAlerts = useCallback(async (options?: { force?: boolean }) => {
		const force = options?.force ?? false;
		const cached = getCachedAlerts<CallLogAlert[]>();

		if (!force && cached?.data?.length) {
			applyAlerts(cached.data);
			setLoading(false);
			setChartsLoading(false);
		} else if (!cached) {
			setLoading(true);
			setChartsLoading(true);
		}

		if (force) {
			setIsValidating(true);
		}

		setError(null);

		// Fresh cache: show charts immediately; only refresh lightweight totals (3× limit=1).
		if (!force && isCacheFresh() && cached?.data?.length) {
			try {
				const totalsResult = await fetchAlertTotals();
				setAlertCounts({
					verified: totalsResult.verified,
					notVerified: totalsResult.notVerified,
					total: totalsResult.total,
				});
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch alert data";
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
			return;
		}

		try {
			const [totalsResult, alertsResult] = await Promise.all([
				fetchAlertTotals(),
				fetchAllAlerts({ force }),
			]);

			setAlertCounts({
				verified: totalsResult.verified,
				notVerified: totalsResult.notVerified,
				total: totalsResult.total,
			});
			applyAlerts(alertsResult.data as CallLogAlert[]);
			setLoading(false);

			if (alertsResult.revalidate) {
				setIsValidating(true);
				alertsResult
					.revalidate()
					.then((fresh) => {
						if (fresh) applyAlerts(fresh as CallLogAlert[]);
					})
					.finally(() => setIsValidating(false));
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to fetch alert data";
			setError(errorMessage);
			if (!cached) {
				setAlerts([]);
				setAlertCounts({ verified: 0, notVerified: 0, total: 0 });
				setTodayAlerts(0);
				setTodayVerified(0);
				setChartsLoading(false);
			}
		} finally {
			setLoading(false);
		}
	}, [applyAlerts]);

	const refetch = useCallback(
		() => Promise.all([loadAlerts({ force: true }), loadTodayActivity()]).then(() => undefined),
		[loadAlerts, loadTodayActivity]
	);

	useEffect(() => {
		loadAlerts();
		loadTodayActivity();
	}, [loadAlerts, loadTodayActivity]);

	useEffect(() => {
		const unsubscribe = subscribeAlertsCache<CallLogAlert[]>((data) => {
			applyAlerts(data);
		});
		return unsubscribe;
	}, [applyAlerts]);

	return {
		data: {
			alerts,
			alertCounts,
			todayAlerts,
			todayVerified,
		},
		loading,
		chartsLoading,
		todayLoading,
		isValidating,
		error,
		refetch,
	};
};
