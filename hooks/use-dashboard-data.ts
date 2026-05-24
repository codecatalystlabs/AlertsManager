import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCounts, CallLogAlert } from "@/app/dashboard/types";
import { fetchAlertTotals, fetchAllAlerts } from "@/lib/fetch-alerts";
import { getCachedAlerts, subscribeAlertsCache } from "@/lib/alerts-cache";

export interface DashboardFilters {
	fromDate: string;
	toDate: string;
	response: string; // disease code, "all" for any
	verification: "all" | "verified" | "pending";
	district: string; // "all" for any
}

interface DashboardData {
	alerts: CallLogAlert[]; // already filtered
	allAlerts: CallLogAlert[]; // unfiltered (for filter options)
	alertCounts: AlertCounts;
	todayAlerts: CallLogAlert[];
	todayVerified: number;
}

interface UseDashboardDataReturn {
	data: DashboardData;
	loading: boolean;
	chartsLoading: boolean;
	isValidating: boolean;
	error: string | null;
	filters: DashboardFilters;
	setFilters: (patch: Partial<DashboardFilters>) => void;
	resetFilters: () => void;
	hasActiveFilters: boolean;
	uniqueResponses: { code: string; count: number }[];
	uniqueDistricts: string[];
	refetch: () => Promise<void>;
}

export const INITIAL_DASHBOARD_FILTERS: DashboardFilters = {
	fromDate: "",
	toDate: "",
	response: "all",
	verification: "all",
	district: "all",
};

function computeTodayMetrics(alertsData: CallLogAlert[]) {
	const today = new Date().toISOString().split("T")[0];

	const todayAlerts = alertsData.filter((alert) => {
		const alertDate = new Date(alert.date).toISOString().split("T")[0];
		return alertDate === today;
	});

	const todayVerified = todayAlerts.filter((alert) => alert.isVerified).length;

	return { todayAlerts, todayVerified };
}

function isWithinRange(value: string, fromDate: string, toDate: string) {
	if (!value) return false;
	const t = new Date(value).getTime();
	if (Number.isNaN(t)) return false;
	if (fromDate) {
		const from = new Date(fromDate).setHours(0, 0, 0, 0);
		if (t < from) return false;
	}
	if (toDate) {
		const to = new Date(toDate).setHours(23, 59, 59, 999);
		if (t > to) return false;
	}
	return true;
}

function applyFilters(
	alerts: CallLogAlert[],
	filters: DashboardFilters
): CallLogAlert[] {
	const { fromDate, toDate, response, verification, district } = filters;
	const dateActive = Boolean(fromDate || toDate);

	if (
		!dateActive &&
		response === "all" &&
		verification === "all" &&
		district === "all"
	) {
		return alerts;
	}

	return alerts.filter((a) => {
		if (dateActive && !isWithinRange(a.date, fromDate, toDate)) return false;
		if (response !== "all" && a.response !== response) return false;
		if (verification === "verified" && !a.isVerified) return false;
		if (verification === "pending" && a.isVerified) return false;
		if (district !== "all" && a.alertCaseDistrict !== district) return false;
		return true;
	});
}

export const useDashboardData = (): UseDashboardDataReturn => {
	const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
	const [unfilteredCounts, setUnfilteredCounts] = useState<AlertCounts>({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const [loading, setLoading] = useState(true);
	const [chartsLoading, setChartsLoading] = useState(true);
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFiltersState] = useState<DashboardFilters>(
		INITIAL_DASHBOARD_FILTERS
	);

	const applyAlerts = useCallback((alertsData: CallLogAlert[]) => {
		setAlerts(alertsData);
		setChartsLoading(false);
	}, []);

	const loadAlerts = useCallback(
		async (options?: { force?: boolean }) => {
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

			try {
				const [totalsResult, alertsResult] = await Promise.all([
					fetchAlertTotals(),
					fetchAllAlerts<CallLogAlert[]>({ force }),
				]);

				setUnfilteredCounts({
					verified: totalsResult.verified,
					notVerified: totalsResult.notVerified,
					total: totalsResult.total,
				});
				applyAlerts(alertsResult.data);
				setLoading(false);

				if (alertsResult.revalidate) {
					setIsValidating(true);
					alertsResult
						.revalidate()
						.then((fresh) => {
							if (fresh) applyAlerts(fresh);
						})
						.finally(() => setIsValidating(false));
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to fetch alert data";
				setError(errorMessage);
				if (!cached) {
					setAlerts([]);
					setUnfilteredCounts({ verified: 0, notVerified: 0, total: 0 });
					setChartsLoading(false);
				}
			} finally {
				setLoading(false);
			}
		},
		[applyAlerts]
	);

	const refetch = useCallback(() => loadAlerts({ force: true }), [loadAlerts]);

	useEffect(() => {
		loadAlerts();
	}, [loadAlerts]);

	useEffect(() => {
		const unsubscribe = subscribeAlertsCache<CallLogAlert[]>((data) => {
			applyAlerts(data);
		});
		return unsubscribe;
	}, [applyAlerts]);

	const setFilters = useCallback((patch: Partial<DashboardFilters>) => {
		setFiltersState((prev) => ({ ...prev, ...patch }));
	}, []);

	const resetFilters = useCallback(() => {
		setFiltersState(INITIAL_DASHBOARD_FILTERS);
	}, []);

	const filteredAlerts = useMemo(
		() => applyFilters(alerts, filters),
		[alerts, filters]
	);

	const filteredCounts = useMemo((): AlertCounts => {
		const verified = filteredAlerts.filter((a) => a.isVerified).length;
		const notVerified = filteredAlerts.length - verified;
		return {
			verified,
			notVerified,
			total: filteredAlerts.length,
		};
	}, [filteredAlerts]);

	const todayMetrics = useMemo(
		() => computeTodayMetrics(filteredAlerts),
		[filteredAlerts]
	);

	const hasActiveFilters = useMemo(() => {
		return (
			Boolean(filters.fromDate) ||
			Boolean(filters.toDate) ||
			filters.response !== "all" ||
			filters.verification !== "all" ||
			filters.district !== "all"
		);
	}, [filters]);

	const uniqueResponses = useMemo(() => {
		const counts = new Map<string, number>();
		for (const a of alerts) {
			const code = (a.response ?? "").trim();
			if (!code) continue;
			counts.set(code, (counts.get(code) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([code, count]) => ({ code, count }))
			.sort((a, b) => b.count - a.count);
	}, [alerts]);

	const uniqueDistricts = useMemo(() => {
		const set = new Set<string>();
		for (const a of alerts) {
			const d = (a.alertCaseDistrict ?? "").trim();
			if (d) set.add(d);
		}
		return Array.from(set).sort();
	}, [alerts]);

	// When no filters are active, prefer the backend totals (more accurate
	// than counts derived from the in-memory list, which may be capped).
	const alertCountsForDisplay = hasActiveFilters
		? filteredCounts
		: {
				verified: unfilteredCounts.verified || filteredCounts.verified,
				notVerified:
					unfilteredCounts.notVerified || filteredCounts.notVerified,
				total: unfilteredCounts.total || filteredCounts.total,
			};

	return {
		data: {
			alerts: filteredAlerts,
			allAlerts: alerts,
			alertCounts: alertCountsForDisplay,
			todayAlerts: todayMetrics.todayAlerts,
			todayVerified: todayMetrics.todayVerified,
		},
		loading,
		chartsLoading,
		isValidating,
		error,
		filters,
		setFilters,
		resetFilters,
		hasActiveFilters,
		uniqueResponses,
		uniqueDistricts,
		refetch,
	};
};
