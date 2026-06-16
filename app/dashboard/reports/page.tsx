"use client";

import dynamic from "next/dynamic";
import { ErrorAlert } from "@/components/dashboard";
import {
	ReportsMatrixTable,
	ReportsChartFilters,
	ReportsDateFilter,
} from "@/components/reports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartSkeleton } from "@/components/ui/skeletons";

const ReportsTimeseriesChart = dynamic(
	() =>
		import("@/components/reports/reports-timeseries-chart").then((m) => ({
			default: m.ReportsTimeseriesChart,
		})),
	{
		ssr: false,
		loading: () => <ChartSkeleton height={260} bars={10} withLegend />,
	}
);
import { LAYOUT } from "@/constants/layout";
import { useReportsData } from "@/hooks/use-reports-data";

export default function ReportsPage() {
	const {
		options,
		chartRange,
		chartScope,
		timeseries,
		timeseriesLoading,
		timeseriesError,
		setChartRange,
		setChartScope,
		refetchTimeseries,
		cumulativeDate,
		cumulativeMatrix,
		cumulativeLoading,
		cumulativeError,
		setCumulativeDate,
		refetchCumulative,
		dailyDate,
		dailyMatrix,
		dailyLoading,
		dailyError,
		setDailyDate,
		refetchDaily,
	} = useReportsData();

	return (
		<div className={LAYOUT.pageGap}>
			<div className="min-w-0">
				<h1 className={LAYOUT.pageTitle}>Summaries / Reports</h1>
				<p className={LAYOUT.pageSubtitle}>
					Each tab has its own filter — the chart uses a date range; the
					cumulative and daily tables each use a single date.
				</p>
			</div>

			<Tabs defaultValue="chart" className="w-full">
				<TabsList>
					<TabsTrigger value="chart">Chart</TabsTrigger>
					<TabsTrigger value="cumulative">Cumulative</TabsTrigger>
					<TabsTrigger value="daily">Daily</TabsTrigger>
				</TabsList>

				{/* Chart — date range + scope */}
				<TabsContent value="chart" className="space-y-3">
					<ReportsChartFilters
						options={options}
						dateRange={chartRange}
						chartScope={chartScope}
						onDateRangeChange={setChartRange}
						onScopeChange={setChartScope}
						onRefresh={refetchTimeseries}
						isRefreshing={timeseriesLoading}
					/>
					{timeseriesError && (
						<ErrorAlert
							error={timeseriesError}
							onRetry={refetchTimeseries}
							retrying={timeseriesLoading}
						/>
					)}
					<ReportsTimeseriesChart
						timeseries={timeseries}
						isLoading={timeseriesLoading && !timeseries}
					/>
				</TabsContent>

				{/* Cumulative — single "as of" date */}
				<TabsContent value="cumulative" className="space-y-3">
					<ReportsDateFilter
						label="As of"
						inputId="cumulative-date"
						date={cumulativeDate}
						onDateChange={setCumulativeDate}
						onRefresh={refetchCumulative}
						isRefreshing={cumulativeLoading}
					/>
					{cumulativeError && (
						<ErrorAlert
							error={cumulativeError}
							onRetry={refetchCumulative}
							retrying={cumulativeLoading}
						/>
					)}
					<ReportsMatrixTable
						matrix={cumulativeMatrix}
						fallbackTitle={`Cumulative EVD Signals & alerts as on ${cumulativeDate}`}
						periodLabel="Cumulative"
						exportKey="reports_cumulative"
						isLoading={cumulativeLoading && !cumulativeMatrix}
					/>
				</TabsContent>

				{/* Daily — single date */}
				<TabsContent value="daily" className="space-y-3">
					<ReportsDateFilter
						label="Date"
						inputId="daily-date"
						date={dailyDate}
						onDateChange={setDailyDate}
						onRefresh={refetchDaily}
						isRefreshing={dailyLoading}
					/>
					{dailyError && (
						<ErrorAlert
							error={dailyError}
							onRetry={refetchDaily}
							retrying={dailyLoading}
						/>
					)}
					<ReportsMatrixTable
						matrix={dailyMatrix}
						fallbackTitle={`Daily EVD Signals & alerts — ${dailyDate}`}
						periodLabel={`Daily (as of ${dailyDate})`}
						exportKey="reports_daily"
						isLoading={dailyLoading && !dailyMatrix}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
