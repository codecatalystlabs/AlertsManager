import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { AlertCounts } from "@/app/dashboard/types";
import { fetchAlertTotals } from "@/lib/fetch-alerts";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";

interface DashboardData {
	alertCounts: AlertCounts;
}

interface UseDashboardDataReturn {
	data: DashboardData;
	loading: boolean;
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
	// Revalidate the cards whenever an alert is created/deleted/verified.
	useInvalidateAlerts();

	// All-time KPI counts come from lightweight pagination metadata (3 tiny
	// requests). The chart rows are fetched separately by useDashboardChartAlerts,
	// so the dashboard no longer eagerly pulls ~1000 alert rows it never renders.
	const totals = useSWR("alert-totals", fetchAlertTotals);

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

	const error = totals.error
		? totals.error instanceof Error
			? totals.error.message
			: "Failed to fetch alert data"
		: null;

	const refetch = useCallback(async () => {
		await totals.mutate();
	}, [totals]);

	return {
		data: { alertCounts },
		loading: totals.isLoading,
		isValidating: totals.isValidating,
		error,
		refetch,
	};
};
