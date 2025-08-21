"use client";

import React, { useState, useCallback } from "react";
import {
	WelcomeSection,
	ErrorAlert,
	LoadingSpinner,
	StatsGrid,
} from "@/components/dashboard";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { LOADING_MESSAGES } from "@/constants/dashboard";

export default function DashboardPage(): JSX.Element {
	const { data, loading, error, refetch } = useDashboardData();
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

	if (loading) {
		return <LoadingSpinner message={LOADING_MESSAGES.DASHBOARD} />;
	}

	return (
		<div className="space-y-8">
			<WelcomeSection
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing}
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
		</div>
	);
}
