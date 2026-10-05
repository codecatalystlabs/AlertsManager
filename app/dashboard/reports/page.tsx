"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ErrorAlert } from "@/components/dashboard";
import { UnrecordedDiseaseNote } from "@/components/reports/unrecorded-disease-note";
import { cn } from "@/lib/utils";
import {
	ReportsMatrixTable,
	ReportsChartFilters,
	ReportsDateFilter,
	DistrictPerformancePanel,
	ManagementReportPanel,
	RegionalPerformancePanel,
	SignalOverviewPanel,
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
		includeUnrecorded,
		setIncludeUnrecorded,
	} = useReportsData();
	// One district table, two readings: everything to date, or a single day.
	const [districtMode, setDistrictMode] = useState<"cumulative" | "daily">("cumulative");
	const note = (count: number | undefined) => (
		<UnrecordedDiseaseNote
			count={count ?? -1}
			included={includeUnrecorded}
			onToggle={setIncludeUnrecorded}
		/>
	);

	return (
		<div className={LAYOUT.pageGap}>
			<div className="min-w-0">
				<h1 className={LAYOUT.pageTitle}>Summaries / Reports</h1>
				<p className={LAYOUT.pageSubtitle}>
					Overview breaks every signal down by time, place, source and outcome. The EVD tabs
					count signals recorded as EVD/VHF. Regional and District performance score each
					region&apos;s and district&apos;s EBS steps; Presentation builds the weekly management deck.
				</p>
			</div>

			<Tabs defaultValue="overview" className="w-full">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="trend">EVD trend</TabsTrigger>
					<TabsTrigger value="district">EVD by district</TabsTrigger>
					<TabsTrigger value="regional">Regional performance</TabsTrigger>
					<TabsTrigger value="district-performance">District performance</TabsTrigger>
					<TabsTrigger value="presentation">Presentation</TabsTrigger>
				</TabsList>

				{/* Overview — data completeness, then the breakdowns (when, what,
				    where, who, how each gate closed) and the risk matrix. The
				    pipeline figures themselves live on the dashboard. */}
				<TabsContent value="overview" className="space-y-3">
					<SignalOverviewPanel />
				</TabsContent>

				{/* EVD trend — date range + daily/cumulative */}
				<TabsContent value="trend" className="space-y-3">
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
						note={note(timeseries?.unrecordedDisease)}
					/>
				</TabsContent>

				{/* EVD by district — cumulative to a date, or one day */}
				<TabsContent value="district" className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex rounded-md border bg-muted/40 p-0.5" role="group" aria-label="District table period">
							{(
								[
									["cumulative", "Cumulative to date"],
									["daily", "Single day"],
								] as const
							).map(([mode, label]) => (
								<button
									key={mode}
									type="button"
									onClick={() => setDistrictMode(mode)}
									aria-pressed={districtMode === mode}
									className={cn(
										"rounded px-2.5 py-1 text-xs font-medium transition-colors",
										districtMode === mode
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									{label}
								</button>
							))}
						</div>
						{districtMode === "cumulative" ? (
							<ReportsDateFilter
								label="As of"
								inputId="cumulative-date"
								date={cumulativeDate}
								onDateChange={setCumulativeDate}
								onRefresh={refetchCumulative}
								isRefreshing={cumulativeLoading}
							/>
						) : (
							<ReportsDateFilter
								label="Date"
								inputId="daily-date"
								date={dailyDate}
								onDateChange={setDailyDate}
								onRefresh={refetchDaily}
								isRefreshing={dailyLoading}
							/>
						)}
					</div>
					{districtMode === "cumulative" ? (
						<>
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
								note={note(cumulativeMatrix?.unrecordedDisease)}
							/>
						</>
					) : (
						<>
							{dailyError && (
								<ErrorAlert error={dailyError} onRetry={refetchDaily} retrying={dailyLoading} />
							)}
							<ReportsMatrixTable
								matrix={dailyMatrix}
								fallbackTitle={`Daily EVD Signals & alerts — ${dailyDate}`}
								periodLabel={`Daily (as of ${dailyDate})`}
								exportKey="reports_daily"
								isLoading={dailyLoading && !dailyMatrix}
								note={note(dailyMatrix?.unrecordedDisease)}
							/>
						</>
					)}
				</TabsContent>

				{/* Regional performance — the EBS funnel per region for a date range */}
				<TabsContent value="regional" className="space-y-3">
					<RegionalPerformancePanel />
				</TabsContent>

				{/* District performance — the same funnel per district, filterable */}
				<TabsContent value="district-performance" className="space-y-3">
					<DistrictPerformancePanel />
				</TabsContent>

				{/* Presentation — the full Alerts Management deck for a date range */}
				<TabsContent value="presentation" className="space-y-3">
					<ManagementReportPanel />
				</TabsContent>
			</Tabs>
		</div>
	);
}
