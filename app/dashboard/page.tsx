"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
	WelcomeSection,
	ErrorAlert,
	StatsGrid,
} from "@/components/dashboard";
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
			<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
		),
	}
);

export default function DashboardPage(): JSX.Element {
	const { data, loading, chartsLoading, error, refetch } = useDashboardData();
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

			{chartsLoading ? (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
					<div className="h-56 animate-pulse rounded-lg border bg-muted/40" />
				</div>
			) : (
				<DashboardCharts alerts={data.alerts} />
			)}
		</div>
	);
}
