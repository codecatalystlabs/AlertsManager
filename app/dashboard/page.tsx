"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
	WelcomeSection,
	ErrorAlert,
	StatsGrid,
	DashboardRangePicker,
	DashboardDistrictPicker,
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDashboardChartAlerts } from "@/hooks/use-dashboard-chart-alerts";
import type { AlertCounts } from "@/app/dashboard/types";
import { LAYOUT } from "@/constants/layout";
import { deriveAlertOutcome } from "@/lib/alert-outcome";

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
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [district, setDistrict] = useState<string>("all");
	const {
		alerts: rangeAlerts,
		loading: rangeLoading,
		error: rangeError,
		refetch: refetchRange,
	} = useDashboardChartAlerts(range, district);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refetch(), refetchRange()]);
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch, refetchRange]);

	const handleRetry = useCallback(async () => {
		await handleRefresh();
	}, [handleRefresh]);

	// KPI cards: total/verified/unverified use exact all-time metadata when no
	// range/district is applied. Discarded/actionable alerts are derived from
	// the loaded signal rows because the lightweight totals API has no discarded
	// outcome count.
	const isUnbounded = !range.from && !range.to && district === "all";
	const rangeCounts = useMemo<AlertCounts>(() => {
		const total = rangeAlerts.length;
		const verified = rangeAlerts.filter((a) => a.isVerified).length;
		const discarded = rangeAlerts.filter(
			(a) => a.isVerified && deriveAlertOutcome(a) === "Discarded"
		).length;
		return {
			total,
			verified,
			notVerified: total - verified,
			discarded,
			alerts: Math.max(0, verified - discarded),
		};
	}, [rangeAlerts]);
	const statCounts = isUnbounded
		? {
				...data.alertCounts,
				discarded: rangeCounts.discarded,
				alerts: Math.max(0, data.alertCounts.verified - rangeCounts.discarded),
			}
		: rangeCounts;
	// KPI cards follow their data source: all-time totals load with the
	// dashboard, range-scoped totals load with the chart fetch.
	const statCountsLoading = isUnbounded ? loading : rangeLoading;

	return (
		<div className={LAYOUT.pageGap}>
			<WelcomeSection
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing || loading}
			/>

			{/* Page-level filters — scope both the KPI cards and the charts. */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-base font-semibold text-gray-900">
						Overview
					</h2>
					<p className="text-xs text-muted-foreground">
						{isUnbounded
							? "Showing all-time data"
							: "Showing data for the selected range"}
					</p>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<DashboardDistrictPicker
						value={district}
						onChange={setDistrict}
						disabled={rangeLoading}
					/>
					<DashboardRangePicker
						onChange={setRange}
						disabled={rangeLoading}
					/>
				</div>
			</div>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<StatsGrid
				alertCounts={statCounts}
				kpiLoading={statCountsLoading || (isUnbounded && rangeLoading)}
			/>

			<h2 className="text-base font-semibold text-gray-900">
				Trends &amp; breakdowns
			</h2>

			{rangeError && (
				<ErrorAlert
					error={rangeError}
					onRetry={refetchRange}
					retrying={rangeLoading}
				/>
			)}

			{rangeLoading ? (
				<div className="space-y-6">
					<div className="h-16 animate-pulse rounded-lg border bg-muted/40" />
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{[0, 1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-[340px] animate-pulse rounded-lg border bg-muted/40"
							/>
						))}
					</div>
				</div>
			) : (
				<DashboardCharts alerts={rangeAlerts} />
			)}
		</div>
	);
}
