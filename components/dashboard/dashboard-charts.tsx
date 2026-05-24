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

interface DashboardChartsProps {
	alerts: CallLogAlert[];
}

// Editorial palette — every chart series resolves to a token from styles.css.
const PALETTE = {
	red: "oklch(0.55 0.2 25)",
	yellow: "oklch(0.82 0.17 85)",
	green: "oklch(0.5 0.12 155)",
	ink: "oklch(0.22 0.02 250)",
	mute: "oklch(0.45 0.02 250)",
} as const;

const verificationColors: Record<string, string> = {
	verified: PALETTE.green,
	notVerified: PALETTE.red,
};

const verificationConfig: ChartConfig = {
	verified: { label: "Verified", color: PALETTE.green },
	notVerified: { label: "Awaiting", color: PALETTE.red },
};

const statusConfig: ChartConfig = {
	alive: { label: "Alive", color: PALETTE.green },
	dead: { label: "Dead", color: PALETTE.red },
	unknown: { label: "Unknown / Pending", color: PALETTE.yellow },
	other: { label: "Other", color: PALETTE.mute },
};

const timelineConfig: ChartConfig = {
	count: { label: "Alerts", color: PALETTE.ink },
};

const districtConfig: ChartConfig = {
	count: { label: "Alerts", color: PALETTE.red },
};

function ChartShell({
	eyebrow,
	title,
	description,
	children,
	className,
}: {
	eyebrow: string;
	title: string;
	description: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<article
			className={`editorial-card p-6 flex flex-col ${className ?? ""}`}
		>
			<header className="mb-4">
				<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
					{eyebrow}
				</p>
				<h3 className="serif text-2xl font-medium tracking-tight text-foreground">
					{title}
				</h3>
				<p className="mt-1 text-xs text-muted-foreground leading-relaxed">
					{description}
				</p>
			</header>
			<div className="flex-1 min-h-0">{children}</div>
		</article>
	);
}

function ChartEmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-[260px] items-center justify-center px-4 text-center">
			<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
				{message}
			</p>
		</div>
	);
}

function EditorialNote() {
	return (
		<aside className="editorial-card border-l-2 border-l-accent-yellow px-6 py-5 flex gap-4">
			<div className="hidden sm:block">
				<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
					Editor&rsquo;s note
				</p>
			</div>
			<div className="flex-1">
				<p className="serif text-lg italic text-foreground leading-snug">
					&ldquo;Verification rate reflects the all-time backlog, not
					today&rsquo;s throughput. The 155-case &lsquo;Pending&rsquo;
					count is the same backlog surfaced twice — once as inflow,
					once as queue.&rdquo;
				</p>
				<p className="mt-2 mono text-[10px] uppercase tracking-widest text-muted-foreground">
					Reading guide · Surveillance team
				</p>
			</div>
		</aside>
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

	const verificationTotal = verificationData.reduce(
		(sum, d) => sum + d.count,
		0
	);
	const hasAlerts = alerts.length > 0;

	return (
		<section className="space-y-8">
		

			
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Verification breakdown */}
				<ChartShell
					eyebrow="A · Status mix"
					title="Verification breakdown"
					description="All-time share of verified versus awaiting alerts."
				>
					{!hasAlerts || verificationTotal === 0 ? (
						<ChartEmptyState message="No alert data available." />
					) : (
						<>
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
										innerRadius={68}
										outerRadius={100}
										paddingAngle={3}
										strokeWidth={0}
									>
										{verificationData.map((entry) => (
											<Cell
												key={entry.key}
												fill={
													verificationColors[
														entry.key
													]
												}
											/>
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
							<div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
								{verificationData.map((item) => (
									<div
										key={item.key}
										className="flex items-center gap-2"
									>
										<span
											className="h-2 w-2 rounded-full"
											style={{
												backgroundColor:
													verificationColors[item.key],
											}}
										/>
										<span className="text-muted-foreground">
											{item.label}{" "}
											<span className="mono font-semibold text-foreground ml-1 tabular-nums">
												{item.count.toLocaleString()}
											</span>
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</ChartShell>

				{/* Case status distribution */}
				<ChartShell
					eyebrow="B · Outcomes"
					title="Case status"
					description="Counts of alive, dead, and unknown outcomes by case."
				>
					{statusData.length === 0 ? (
						<ChartEmptyState message="No status data in alerts." />
					) : (
						<ChartContainer
							config={statusConfig}
							className="h-[280px] w-full"
						>
							<BarChart
								data={statusData}
								layout="vertical"
								margin={{
									left: 8,
									right: 24,
									top: 8,
									bottom: 8,
								}}
							>
								<CartesianGrid
									horizontal={false}
									stroke="oklch(0.22 0.02 250 / 0.06)"
								/>
								<XAxis
									type="number"
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									type="category"
									dataKey="label"
									width={110}
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 11, fill: PALETTE.ink }}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											nameKey="key"
											hideLabel
										/>
									}
								/>
								<Bar
									dataKey="count"
									radius={[0, 2, 2, 0]}
									barSize={22}
								>
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
				</ChartShell>

				{/* Alerts over time */}
				<ChartShell
					eyebrow="C · Timeline"
					title="Alerts over time"
					description={
						timelineGranularity === "monthly"
							? "Monthly volume — last 12 months with reported data."
							: "Daily volume — last 30 days."
					}
				>
					{timelineData.length === 0 ? (
						<ChartEmptyState message="No valid dates in alert records." />
					) : (
						<ChartContainer
							config={timelineConfig}
							className="h-[280px] w-full"
						>
							<LineChart
								data={timelineData}
								margin={{
									left: 0,
									right: 12,
									top: 12,
									bottom: 0,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="oklch(0.22 0.02 250 / 0.06)"
								/>
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval={
										timelineGranularity === "monthly"
											? 0
											: "preserveStartEnd"
									}
									angle={
										timelineGranularity === "monthly"
											? -35
											: 0
									}
									textAnchor={
										timelineGranularity === "monthly"
											? "end"
											: "middle"
									}
									height={
										timelineGranularity === "monthly"
											? 50
											: 30
									}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={36}
									tick={{ fontSize: 10 }}
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
									stroke={PALETTE.ink}
									strokeWidth={1.5}
									dot={false}
									activeDot={{
										r: 4,
										fill: PALETTE.yellow,
										stroke: PALETTE.ink,
										strokeWidth: 1,
									}}
								/>
							</LineChart>
						</ChartContainer>
					)}
				</ChartShell>

				{/* Top districts */}
				<ChartShell
					eyebrow="D · Geography"
					title="Top reporting districts"
					description="Highest alert volume by case district — top 8 shown."
				>
					{districtData.length === 0 ? (
						<ChartEmptyState message="No district data in alerts." />
					) : (
						<ChartContainer
							config={districtConfig}
							className="h-[280px] w-full"
						>
							<BarChart
								data={districtData}
								layout="vertical"
								margin={{
									left: 8,
									right: 24,
									top: 8,
									bottom: 8,
								}}
							>
								<CartesianGrid
									horizontal={false}
									stroke="oklch(0.22 0.02 250 / 0.06)"
								/>
								<XAxis
									type="number"
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									type="category"
									dataKey="district"
									width={100}
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 11, fill: PALETTE.ink }}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent hideLabel />
									}
								/>
								<Bar
									dataKey="count"
									fill={PALETTE.red}
									radius={[0, 2, 2, 0]}
									barSize={20}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</ChartShell>
			</div>
		</section>
	);
});

DashboardCharts.displayName = "DashboardCharts";
