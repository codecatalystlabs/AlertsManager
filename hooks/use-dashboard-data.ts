import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { AlertCounts, CallLogAlert } from "@/app/dashboard/types";
import { fetchAlertTotals, fetchDashboardAlerts } from "@/lib/fetch-alerts";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";

interface DashboardData {
	alerts: CallLogAlert[];
	alertCounts: AlertCounts;
}

interface UseDashboardDataReturn {
	data: DashboardData;
	loading: boolean;
	chartsLoading: boolean;
	isValidating: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

const EMPTY_COUNTS: AlertCounts = {
	verified: 0,
	notVerified: 0,
	discarded: 0,
	alerts: 0,
	total: 0,
};

export const useDashboardData = (): UseDashboardDataReturn => {
	// Revalidate the cards/charts whenever an alert is created/deleted/verified.
	useInvalidateAlerts();

	const totals = useSWR("alert-totals", fetchAlertTotals);
	const dashboardAlerts = useSWR("dashboard-alerts", fetchDashboardAlerts);

	const alertCounts = useMemo<AlertCounts>(
		() =>
			totals.data
				? {
						verified: totals.data.verified,
						notVerified: totals.data.notVerified,
						discarded: totals.data.discarded,
						alerts: totals.data.alerts,
						total: totals.data.total,
					}
				: EMPTY_COUNTS,
		[totals.data]
	);

	const alerts = useMemo(
		() => (dashboardAlerts.data ?? []) as CallLogAlert[],
		[dashboardAlerts.data]
	);

	const failure = totals.error ?? dashboardAlerts.error;
	const error = failure
		? failure instanceof Error
			? failure.message
			: "Failed to fetch alert data"
		: null;

	const refetch = useCallback(async () => {
		await Promise.all([totals.mutate(), dashboardAlerts.mutate()]);
	}, [totals, dashboardAlerts]);

	return {
		data: { alerts, alertCounts },
		loading: totals.isLoading,
		chartsLoading: dashboardAlerts.isLoading,
		isValidating: totals.isValidating || dashboardAlerts.isValidating,
		error,
		refetch,
	};
};
