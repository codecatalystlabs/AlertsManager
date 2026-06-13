import { useCallback } from "react";
import useSWR from "swr";
import {
	fetchDashboardSummary,
	type DashboardSummary,
} from "@/lib/fetch-dashboard";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";

/** Selected chart window; "" on a bound means unbounded (all time). */
export interface DashboardRange {
	from: string;
	to: string;
}

interface UseDashboardSummaryReturn {
	summary: DashboardSummary | undefined;
	loading: boolean;
	isValidating: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

/**
 * Single source of truth for the dashboard: KPI cards and every chart breakdown
 * come from one server-side aggregated request, scoped by date range and
 * district. Replaces useDashboardData + useDashboardChartAlerts, which used to
 * pull every alert row to the browser and aggregate client-side.
 *
 * The "dashboard-summary" key root is registered with useInvalidateAlerts, so
 * creating/verifying/deleting an alert refreshes the dashboard automatically.
 */
export function useDashboardSummary(
	range: DashboardRange,
	district?: string
): UseDashboardSummaryReturn {
	useInvalidateAlerts();

	const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
		["dashboard-summary", range.from, range.to, district ?? "all"] as const,
		([, from, to, dist]) =>
			fetchDashboardSummary({
				from_date: from || undefined,
				to_date: to || undefined,
				district: dist,
			}),
		{ keepPreviousData: true }
	);

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load dashboard data"
		: null;

	const refetch = useCallback(async () => {
		await mutate();
	}, [mutate]);

	return {
		summary: data,
		loading: isLoading,
		isValidating,
		error,
		refetch,
	};
}
