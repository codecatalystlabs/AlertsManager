"use client";

import React, { useState, useCallback } from "react";
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
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import type { AlertCounts } from "@/app/dashboard/types";
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

const EMPTY_COUNTS: AlertCounts = {
	verified: 0,
	notVerified: 0,
	discarded: 0,
	alerts: 0,
	total: 0,
};

export default function DashboardPage(): React.JSX.Element {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [district, setDistrict] = useState<string>("all");
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district
	);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const isUnbounded = !range.from && !range.to && district === "all";

	// Every KPI card now comes from one server-side aggregate, scoped to the
	// selected range + district.
	const statCounts: AlertCounts = summary
		? {
				verified: summary.verified,
				notVerified: summary.notVerified,
				discarded: summary.discarded,
				alerts: summary.alerts,
				total: summary.total,
			}
		: EMPTY_COUNTS;

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
						disabled={loading}
					/>
					<DashboardRangePicker onChange={setRange} disabled={loading} />
				</div>
			</div>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<StatsGrid
				alertCounts={statCounts}
				kpiLoading={loading && !summary}
			/>

			<h2 className="text-base font-semibold text-gray-900">
				Trends &amp; breakdowns
			</h2>

			{loading && !summary ? (
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
			) : summary ? (
				<DashboardCharts summary={summary} />
			) : null}
		</div>
	);
}
