import useSWR from "swr";
import {
	fetchRecentActivity,
	type RecentActivity,
	type RecentActivityWindow,
} from "@/lib/fetch-recent-activity";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";

interface UseRecentActivityArgs {
	window: RecentActivityWindow;
	/** YYYY-MM-DD; only used for the custom window. */
	fromDate?: string;
	toDate?: string;
	district?: string;
}

interface UseRecentActivityReturn {
	activity: RecentActivity | undefined;
	loading: boolean;
	error: string | null;
}

/**
 * Powers the dashboard "Recent activity" card. Scoped by a rolling/custom window
 * and the district filter, independent of the dashboard date range. The
 * "recent-activity" key root is registered with useInvalidateAlerts, so
 * creating/verifying/deleting an alert refreshes it automatically.
 */
export function useRecentActivity({
	window,
	fromDate = "",
	toDate = "",
	district = "all",
}: UseRecentActivityArgs): UseRecentActivityReturn {
	useInvalidateAlerts();

	// The custom window can't be queried until both dates are set; stay idle
	// (null SWR key) until then so we don't fire an invalid request.
	const ready = window !== "custom" || (!!fromDate && !!toDate);

	const { data, error: swrError, isLoading } = useSWR(
		ready
			? (["recent-activity", window, fromDate, toDate, district] as const)
			: null,
		([, win, from, to, dist]) =>
			fetchRecentActivity({
				window: win,
				from_date: from || undefined,
				to_date: to || undefined,
				district: dist,
			}),
		{ keepPreviousData: true }
	);

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load recent activity"
		: null;

	return { activity: data, loading: isLoading, error };
}
