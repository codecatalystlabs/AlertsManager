"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
	WelcomeSection,
	ErrorAlert,
	StatsGrid,
	DashboardFilters,
} from "@/components/dashboard";
import { LoadingSpinner } from "@/components/dashboard/loading-spinner";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { LAYOUT } from "@/constants/layout";

const DashboardCharts = dynamic(
	() =>
		import("@/components/dashboard/dashboard-charts").then((m) => ({
			default: m.DashboardCharts,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="min-h-[400px] flex items-center justify-center editorial-card">
				<LoadingSpinner message="Loading charts…" />
			</div>
		),
	}
);

export default function DashboardPage(): JSX.Element {
	const {
		data,
		loading,
		chartsLoading,
		error,
		filters,
		setFilters,
		resetFilters,
		hasActiveFilters,
		uniqueResponses,
		uniqueDistricts,
		refetch,
	} = useDashboardData();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleRetry = useCallback(async () => {
		await handleRefresh();
	}, [handleRefresh]);

	return (
		<div className={LAYOUT.pageGap}>
			<WelcomeSection
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing || loading}
				exportAlerts={data.alerts}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<DashboardFilters
				filters={filters}
				onChange={setFilters}
				onReset={resetFilters}
				hasActiveFilters={hasActiveFilters}
				uniqueResponses={uniqueResponses}
				uniqueDistricts={uniqueDistricts}
				filteredCount={data.alerts.length}
				totalCount={data.allAlerts.length}
			/>

			<div className="animate-reveal [animation-delay:100ms]">
				<StatsGrid
					alertCounts={data.alertCounts}
					todayAlerts={data.todayAlerts.length}
					todayVerified={data.todayVerified}
				/>
			</div>

			<div className="animate-reveal [animation-delay:200ms]">
				{chartsLoading ? (
					<div className="min-h-[400px] flex items-center justify-center editorial-card">
						<LoadingSpinner message="Loading charts…" />
					</div>
				) : (
					<DashboardCharts alerts={data.alerts} />
				)}
			</div>
		</div>
	);
}
