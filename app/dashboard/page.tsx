"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
	WelcomeSection,
	ErrorAlert,
	StatsGrid,
	DashboardRangePicker,
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDashboardChartAlerts } from "@/hooks/use-dashboard-chart-alerts";
import { LAYOUT } from "@/constants/layout";

const DashboardCharts = dynamic(
	() =>
		import("@/components/dashboard/dashboard-charts").then((m) => ({
			default: m.DashboardCharts,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
		),
	}
);

export default function DashboardPage(): JSX.Element {
	const { data, loading, error, refetch } = useDashboardData();
	const [chartRange, setChartRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const {
		alerts: chartAlerts,
		loading: chartsLoading,
		error: chartsError,
		refetch: refetchCharts,
	} = useDashboardChartAlerts(chartRange);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refetch(), refetchCharts()]);
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch, refetchCharts]);

	const handleRetry = useCallback(async () => {
		await handleRefresh();
	}, [handleRefresh]);

	return (
		<div className={LAYOUT.pageGap}>
			<WelcomeSection
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing || loading}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<StatsGrid
				alertCounts={data.alertCounts}
				todayAlerts={data.todayAlerts.length}
				todayVerified={data.todayVerified}
			/>

			<div className="flex flex-wrap items-end justify-between gap-3">
				<h2 className="text-base font-semibold text-gray-900">
					Trends &amp; breakdowns
				</h2>
				<DashboardRangePicker
					onChange={setChartRange}
					disabled={chartsLoading}
				/>
			</div>

			{chartsError && (
				<ErrorAlert
					error={chartsError}
					onRetry={refetchCharts}
					retrying={chartsLoading}
				/>
			)}

			{chartsLoading ? (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
					<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
				</div>
			) : (
				<DashboardCharts alerts={chartAlerts} />
			)}
		</div>
	);
}
