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
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import type { ReportTimeseries } from "@/lib/fetch-reports";
import {
	exportTimeseriesToCsv,
	exportTimeseriesToExcel,
	notifyExportEmpty,
} from "@/lib/report-export";

const SIGNALS_COLOR = "oklch(0.22 0.02 250)"; // ink
const ALERTS_COLOR = "oklch(0.55 0.2 25)"; // accent-red

const chartConfig: ChartConfig = {
	signals: { label: "Signals", color: SIGNALS_COLOR },
	alerts: { label: "Alerts", color: ALERTS_COLOR },
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
				})),
			[timeseries]
		);

		const hasData = data.length > 0;
		const hasValues = data.some((d) => d.signals > 0 || d.alerts > 0);

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
			<section className="animate-reveal [animation-delay:100ms] editorial-card">
				<header className="px-6 py-5 flex items-start justify-between gap-3 border-b border-foreground/[0.08]">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
							A · Timeline
						</p>
						<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
							{timeseries?.title || "Signals & Alerts"}
						</h2>
					</div>
					<div className="flex shrink-0 gap-2">
						<Button
							type="button"
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
							disabled={!hasData || isLoading}
							onClick={handleExportCsv}
							title="Export CSV"
						>
							<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
							<span className="mono uppercase tracking-widest font-bold">
								CSV
							</span>
						</Button>
						<Button
							type="button"
							className="px-4 py-2 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
							disabled={!hasData || isLoading}
							onClick={handleExportExcel}
							title="Export Excel"
						>
							<FileSpreadsheet
								className="h-3.5 w-3.5"
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								Excel
							</span>
						</Button>
					</div>
				</header>
				<div className="px-6 py-6">
					{isLoading ? (
						<div className="h-[260px] animate-pulse bg-foreground/[0.04] rounded-sm" />
					) : !hasData ? (
						<div className="flex h-[260px] items-center justify-center text-center">
							<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
								No timeseries data for this selection.
							</p>
						</div>
					) : (
						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-[280px] w-full min-h-[260px]"
						>
							<LineChart
								data={data}
								margin={{
									top: 12,
									right: 16,
									left: 4,
									bottom: 8,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="oklch(0.22 0.02 250 / 0.06)"
								/>
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval="preserveStartEnd"
									angle={-25}
									textAnchor="end"
									height={56}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={36}
									tick={{ fontSize: 10 }}
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
									strokeWidth={1.5}
									dot={false}
									activeDot={{
										r: 4,
										fill: "oklch(0.82 0.17 85)",
										stroke: SIGNALS_COLOR,
										strokeWidth: 1,
									}}
									connectNulls
									isAnimationActive={false}
								/>
								<Line
									type="monotone"
									dataKey="alerts"
									name="Alerts"
									stroke={ALERTS_COLOR}
									strokeWidth={1.5}
									dot={false}
									activeDot={{
										r: 4,
										fill: "oklch(0.82 0.17 85)",
										stroke: ALERTS_COLOR,
										strokeWidth: 1,
									}}
									connectNulls
									isAnimationActive={false}
								/>
							</LineChart>
						</ChartContainer>
					)}
					{hasData && !hasValues && (
						<p className="mt-3 text-center mono text-[10px] uppercase tracking-widest text-muted-foreground">
							All values are zero for this date range.
						</p>
					)}
				</div>
			</section>
		);
	}
);

ReportsTimeseriesChart.displayName = "ReportsTimeseriesChart";
