"use client";

import React, { memo, useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { CallLogAlert } from "@/app/dashboard/types";
import {
	getAlertsOverTime,
	getStatusDistribution,
	getTimelineGranularity,
	getTopDistricts,
	getVerificationBreakdown,
} from "@/lib/dashboard-chart-data";
import { BarChart3, Info, MapPin, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

interface DashboardChartsProps {
	alerts: CallLogAlert[];
}

const verificationColors: Record<string, string> = {
	verified: "#16a34a",
	notVerified: "#D90000",
};

const verificationConfig: ChartConfig = {
	verified: { label: "Verified", color: verificationColors.verified },
	notVerified: { label: "Not Verified", color: verificationColors.notVerified },
};

const statusConfig: ChartConfig = {
	alive: { label: "Alive", color: "#16a34a" },
	dead: { label: "Dead", color: "#D90000" },
	unknown: { label: "Unknown / Pending", color: "#FCDC04" },
	other: { label: "Other", color: "#0066CC" },
};

const timelineConfig: ChartConfig = {
	count: { label: "Alerts", color: "#D90000" },
};

const districtConfig: ChartConfig = {
	count: { label: "Alerts", color: "#0066CC" },
};

function ChartEmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
			{message}
		</div>
	);
}

function DashboardInsights() {
	return (
		<Card className="border-uganda-yellow/40 bg-gradient-to-r from-uganda-yellow/10 to-transparent">
			<CardContent className="flex gap-3 p-4">
				<Info className="mt-0.5 h-5 w-5 shrink-0 text-uganda-red" />
				<div className="space-y-1 text-sm text-muted-foreground">
					<p className="font-medium text-foreground">Reading these metrics</p>
					<p>
						Verification rate reflects all-time backlog ({`isVerified`}), not
						today&apos;s throughput. &quot;Total Calls Today&quot; counts alerts
						filed today by <code className="text-xs">date</code>, not call-log
						records. Pending verification equals not-verified alerts — the same
						155-case backlog shown twice.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export const DashboardCharts = memo<DashboardChartsProps>(({ alerts }) => {
	const verificationData = useMemo(
		() => getVerificationBreakdown(alerts),
		[alerts]
	);
	const statusData = useMemo(() => getStatusDistribution(alerts), [alerts]);
	const timelineData = useMemo(() => getAlertsOverTime(alerts), [alerts]);
	const districtData = useMemo(() => getTopDistricts(alerts, 8), [alerts]);
	const timelineGranularity = useMemo(
		() => getTimelineGranularity(alerts),
		[alerts]
	);

	const verificationTotal = verificationData.reduce((sum, d) => sum + d.count, 0);
	const hasAlerts = alerts.length > 0;

	return (
		<div className="space-y-6">
			<DashboardInsights />

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Verification breakdown */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<PieChartIcon className="h-5 w-5 text-uganda-red" />
							<CardTitle className="text-lg">Verification Status</CardTitle>
						</div>
						<CardDescription>
							All-time verified vs pending backlog
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!hasAlerts || verificationTotal === 0 ? (
							<ChartEmptyState message="No alert data available for verification breakdown." />
						) : (
							<ChartContainer
								config={verificationConfig}
								className="mx-auto aspect-square max-h-[280px]"
							>
								<PieChart>
									<ChartTooltip
										content={
											<ChartTooltipContent
												nameKey="key"
												hideLabel
											/>
										}
									/>
									<Pie
										data={verificationData}
										dataKey="count"
										nameKey="key"
										innerRadius={60}
										outerRadius={95}
										paddingAngle={2}
										strokeWidth={2}
									>
										{verificationData.map((entry) => (
											<Cell
												key={entry.key}
												fill={`var(--color-${entry.key})`}
											/>
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
						)}
						{hasAlerts && verificationTotal > 0 && (
							<div className="mt-2 flex justify-center gap-6 text-sm">
								{verificationData.map((item) => (
									<div key={item.key} className="flex items-center gap-2">
										<span
											className="h-3 w-3 rounded-full"
											style={{
												backgroundColor: verificationColors[item.key],
											}}
										/>
										<span className="text-muted-foreground">
											{item.label}:{" "}
											<span className="font-semibold text-foreground">
												{item.count.toLocaleString()}
											</span>
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Case status distribution */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5 text-uganda-red" />
							<CardTitle className="text-lg">Case Status</CardTitle>
						</div>
						<CardDescription>
							Alive, dead, and unknown outcomes
						</CardDescription>
					</CardHeader>
					<CardContent>
						{statusData.length === 0 ? (
							<ChartEmptyState message="No status data available in alerts." />
						) : (
							<ChartContainer
								config={statusConfig}
								className="h-[280px] w-full"
							>
								<BarChart
									data={statusData}
									layout="vertical"
									margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
								>
									<CartesianGrid horizontal={false} strokeDasharray="3 3" />
									<XAxis type="number" tickLine={false} axisLine={false} />
									<YAxis
										type="category"
										dataKey="label"
										width={110}
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 12 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												nameKey="key"
												hideLabel
											/>
										}
									/>
									<Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
										{statusData.map((entry) => (
											<Cell
												key={entry.key}
												fill={`var(--color-${entry.key})`}
											/>
										))}
									</Bar>
								</BarChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				{/* Alerts over time */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-uganda-red" />
							<CardTitle className="text-lg">Alerts Over Time</CardTitle>
						</div>
						<CardDescription>
							{timelineGranularity === "monthly"
								? "Monthly volume (last 12 months with data)"
								: "Daily volume (last 30 days)"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{timelineData.length === 0 ? (
							<ChartEmptyState message="No valid dates found in alert records." />
						) : (
							<ChartContainer
								config={timelineConfig}
								className="h-[280px] w-full"
							>
								<LineChart
									data={timelineData}
									margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
								>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 11 }}
										interval={
											timelineGranularity === "monthly"
												? 0
												: "preserveStartEnd"
										}
										angle={timelineGranularity === "monthly" ? -35 : 0}
										textAnchor={
											timelineGranularity === "monthly"
												? "end"
												: "middle"
										}
										height={timelineGranularity === "monthly" ? 50 : 30}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										width={40}
										tick={{ fontSize: 11 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												labelKey="label"
												nameKey="count"
											/>
										}
									/>
									<Line
										type="monotone"
										dataKey="count"
										stroke="var(--color-count)"
										strokeWidth={2}
										dot={{ fill: "var(--color-count)", r: 3 }}
										activeDot={{ r: 5, fill: "#FCDC04" }}
									/>
								</LineChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				{/* Top districts */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-uganda-red" />
							<CardTitle className="text-lg">Top Districts</CardTitle>
						</div>
						<CardDescription>
							Highest alert volume by case district
						</CardDescription>
					</CardHeader>
					<CardContent>
						{districtData.length === 0 ? (
							<ChartEmptyState message="No district data available in alerts." />
						) : (
							<ChartContainer
								config={districtConfig}
								className="h-[280px] w-full"
							>
								<BarChart
									data={districtData}
									layout="vertical"
									margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
								>
									<CartesianGrid horizontal={false} strokeDasharray="3 3" />
									<XAxis type="number" tickLine={false} axisLine={false} />
									<YAxis
										type="category"
										dataKey="district"
										width={100}
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 11 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent hideLabel />
										}
									/>
									<Bar
										dataKey="count"
										fill="var(--color-count)"
										radius={[0, 4, 4, 0]}
										barSize={24}
									/>
								</BarChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
});

DashboardCharts.displayName = "DashboardCharts";
