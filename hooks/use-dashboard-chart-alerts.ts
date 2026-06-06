import { useState, useEffect, useCallback } from "react";
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
 * Fetches the alerts that feed the dashboard charts for a selected date range.
 * Kept separate from useDashboardData so the range picker only drives the
 * charts, not the all-time stat cards.
 */
export function useDashboardChartAlerts(
	range: ChartRange
): UseDashboardChartAlertsReturn {
	const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params: DashboardRange = {};
			if (range.from) params.from_date = range.from;
			if (range.to) params.to_date = range.to;
			const data = await fetchAlertsForRange(params);
			setAlerts(data as CallLogAlert[]);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load chart data"
			);
			setAlerts([]);
		} finally {
			setLoading(false);
		}
	}, [range.from, range.to]);

	useEffect(() => {
		load();
	}, [load]);

	return { alerts, loading, error, refetch: load };
}
