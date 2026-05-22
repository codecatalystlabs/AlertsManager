"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorAlert } from "@/components/dashboard";
import { ReportsMatrixTable, ReportsToolbar } from "@/components/reports";

const ReportsTimeseriesChart = dynamic(
	() =>
		import("@/components/reports/reports-timeseries-chart").then((m) => ({
			default: m.ReportsTimeseriesChart,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-[300px] animate-pulse rounded-lg border bg-muted/40" />
		),
	}
);
import { LAYOUT } from "@/constants/layout";
import { useReportsData } from "@/hooks/use-reports-data";

export default function ReportsPage() {
	const {
		options,
		dateRange,
		chartScope,
		dailyMatrix,
		cumulativeMatrix,
		timeseries,
		reportsLoading,
		error,
		setDateRange,
		setChartScope,
		refetch,
	} = useReportsData();

	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const rangeLabel = useMemo(() => {
		if (!dateRange.fromDate && !dateRange.toDate) return "";
		if (dateRange.fromDate === dateRange.toDate) {
			return ` as on ${dateRange.toDate}`;
		}
		return ` (${dateRange.fromDate} – ${dateRange.toDate})`;
	}, [dateRange]);

	return (
		<div className={LAYOUT.pageGap}>
			<ReportsToolbar
				options={options}
				dateRange={dateRange}
				chartScope={chartScope}
				onDateRangeChange={setDateRange}
				onScopeChange={setChartScope}
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing || reportsLoading}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<ReportsTimeseriesChart
				timeseries={timeseries}
				isLoading={reportsLoading && !timeseries}
			/>

			<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
				<ReportsMatrixTable
					matrix={cumulativeMatrix}
					fallbackTitle={`Cumulative EVD Signals & alerts${rangeLabel}`}
					periodLabel="Cumulative"
					exportKey="reports_cumulative"
					isLoading={reportsLoading && !cumulativeMatrix}
				/>
				<ReportsMatrixTable
					matrix={dailyMatrix}
					fallbackTitle={`Daily EVD Signals & alerts${rangeLabel}`}
					periodLabel={`Daily (as of ${dateRange.toDate || "end date"})`}
					exportKey="reports_daily"
					isLoading={reportsLoading && !dailyMatrix}
				/>
			</div>
		</div>
	);
}
