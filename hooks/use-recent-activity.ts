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
	/**
	 * When false, stay idle instead of fetching (e.g. the "custom hours" input is
	 * empty/invalid). Defaults to true.
	 */
	enabled?: boolean;
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
	enabled = true,
}: UseRecentActivityArgs): UseRecentActivityReturn {
	useInvalidateAlerts();

	// Stay idle (null SWR key) when the caller isn't ready — the custom window
	// needs both dates set, and `enabled` gates the custom-hours input — so we
	// never fire an invalid request.
	const ready =
		enabled && (window !== "custom" || (!!fromDate && !!toDate));

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
