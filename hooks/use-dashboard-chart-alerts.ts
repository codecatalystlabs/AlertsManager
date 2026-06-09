import { useCallback } from "react";
import useSWR from "swr";
import { CallLogAlert } from "@/app/dashboard/types";
import { fetchAlertsForRange, type DashboardRange } from "@/lib/fetch-alerts";

/** Selected chart window; "" on a bound means unbounded (all time). */
export interface ChartRange {
	from: string;
	to: string;
}

interface UseDashboardChartAlertsReturn {
	alerts: CallLogAlert[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

/**
 * Fetches the alerts that feed the dashboard charts for a selected date range
 * and (optionally) a single district. Kept separate from useDashboardData so the
 * range/district pickers only drive the charts, not the all-time stat cards.
 *
 * `keepPreviousData` keeps the current chart on screen while the next range loads,
 * so changing the picker never flashes an empty chart.
 *
 * @param district Selected district name, or "all"/undefined for no district filter.
 */
export function useDashboardChartAlerts(
	range: ChartRange,
	district?: string
): UseDashboardChartAlertsReturn {
	const { data, error: swrError, isLoading, mutate } = useSWR(
		["dashboard-chart-alerts", range.from, range.to, district ?? "all"] as const,
		([, from, to, dist]) => {
			const params: DashboardRange = {};
			if (from) params.from_date = from;
			if (to) params.to_date = to;
			return fetchAlertsForRange(params, dist);
		},
		{ keepPreviousData: true }
	);

	const alerts = (data ?? []) as CallLogAlert[];
	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load chart data"
		: null;

	const refetch = useCallback(async () => {
		await mutate();
	}, [mutate]);

	return { alerts, loading: isLoading, error, refetch };
}
