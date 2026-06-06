"use client";

import { memo, useCallback, useMemo } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/constants/layout";
import type { ReportTimeseries } from "@/lib/fetch-reports";
import {
	exportTimeseriesToCsv,
	exportTimeseriesToExcel,
	notifyExportEmpty,
} from "@/lib/report-export";

const SIGNALS_COLOR = "#2563eb";
const ALERTS_COLOR = "#ca8a04";
const DISCARDED_COLOR = "#dc2626";

const chartConfig: ChartConfig = {
	signals: { label: "Signals", color: SIGNALS_COLOR },
	alerts: { label: "Alerts", color: ALERTS_COLOR },
	discarded: { label: "Discarded", color: DISCARDED_COLOR },
};

interface ReportsTimeseriesChartProps {
	timeseries: ReportTimeseries | null;
	isLoading?: boolean;
}

export const ReportsTimeseriesChart = memo<ReportsTimeseriesChartProps>(
	({ timeseries, isLoading }) => {
		const data = useMemo(
			() =>
				(timeseries?.points ?? []).map((p) => ({
					date: p.date,
					signals: p.signals,
					alerts: p.alerts,
					discarded: p.discarded ?? 0,
				})),
			[timeseries]
		);

		const hasData = data.length > 0;
		const hasValues = data.some(
			(d) => d.signals > 0 || d.alerts > 0 || d.discarded > 0
		);

		const handleExportCsv = useCallback(() => {
			if (!exportTimeseriesToCsv(timeseries, "reports_timeseries")) {
				notifyExportEmpty();
			}
		}, [timeseries]);

		const handleExportExcel = useCallback(async () => {
			try {
				const ok = await exportTimeseriesToExcel(
					timeseries,
					"reports_timeseries",
					"Timeseries"
				);
				if (!ok) notifyExportEmpty();
			} catch (err) {
				console.error("Excel export failed:", err);
				window.alert("Failed to export Excel file. Please try again.");
			}
		}, [timeseries]);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={cn(LAYOUT.cardHeader, "flex-row items-start justify-between gap-2 space-y-0")}>
					<CardTitle className={LAYOUT.cardTitle}>
						{timeseries?.title || "Signals & Alerts"}
					</CardTitle>
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 px-2 gap-1"
							disabled={!hasData || isLoading}
							onClick={handleExportCsv}
							title="Export CSV"
						>
							<Download className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">CSV</span>
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-7 px-2 gap-1 bg-uganda-red hover:bg-uganda-red/90"
							disabled={!hasData || isLoading}
							onClick={handleExportExcel}
							title="Export Excel"
						>
							<FileSpreadsheet className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">Excel</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className={cn(LAYOUT.cardContent, "pt-0")}>
					{isLoading ? (
						<div className="h-[260px] animate-pulse rounded-md border bg-muted/40" />
					) : !hasData ? (
						<div className="flex h-[260px] items-center justify-center rounded-md border border-dashed bg-muted/20 text-sm text-muted-foreground">
							No timeseries data for this selection.
						</div>
					) : (
						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-[260px] w-full min-h-[240px]"
						>
							<LineChart
								data={data}
								margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									className="stroke-slate-200"
								/>
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10, fill: "#64748b" }}
									interval="preserveStartEnd"
									angle={-25}
									textAnchor="end"
									height={56}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={36}
									tick={{ fontSize: 10, fill: "#64748b" }}
									allowDecimals={false}
									domain={[0, "auto"]}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelKey="date"
											indicator="line"
										/>
									}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								<Line
									type="monotone"
									dataKey="signals"
									name="Signals"
									stroke={SIGNALS_COLOR}
									strokeWidth={2}
									dot={{ r: 4, fill: SIGNALS_COLOR, strokeWidth: 0 }}
									activeDot={{ r: 6, fill: SIGNALS_COLOR }}
									connectNulls
									isAnimationActive={false}
								/>
								<Line
									type="monotone"
									dataKey="alerts"
									name="Alerts"
									stroke={ALERTS_COLOR}
									strokeWidth={2}
									dot={{ r: 4, fill: ALERTS_COLOR, strokeWidth: 0 }}
									activeDot={{ r: 6, fill: ALERTS_COLOR }}
									connectNulls
									isAnimationActive={false}
								/>
								<Line
									type="monotone"
									dataKey="discarded"
									name="Discarded"
									stroke={DISCARDED_COLOR}
									strokeWidth={2}
									dot={{ r: 4, fill: DISCARDED_COLOR, strokeWidth: 0 }}
									activeDot={{ r: 6, fill: DISCARDED_COLOR }}
									connectNulls
									isAnimationActive={false}
								/>
							</LineChart>
						</ChartContainer>
					)}
					{hasData && !hasValues && (
						<p className="mt-2 text-center text-xs text-muted-foreground">
							All values are zero for this date range.
						</p>
					)}
				</CardContent>
			</Card>
		);
	}
);

ReportsTimeseriesChart.displayName = "ReportsTimeseriesChart";
