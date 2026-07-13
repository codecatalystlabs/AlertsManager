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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardSummary } from "@/lib/fetch-dashboard";
import {
	BarChart3,
	ListChecks,
	MapPin,
	Megaphone,
	PieChart as PieChartIcon,
	Stethoscope,
	TrendingUp,
	Users,
	UserCircle,
} from "lucide-react";

interface ChartCountItem {
	key: string;
	label: string;
	count: number;
	color?: string;
}

interface DashboardChartsProps {
	summary: DashboardSummary;
}

/** Bar colours for the verification-outcome breakdown (presentation only — the
 * API returns raw counts, the dashboard owns the palette). */
const OUTCOME_COLORS: Record<string, string> = {
	"Field Case Verification": "#0066CC",
	Discarded: "#D90000",
	"Validated for EMS Evacuation": "#7c3aed",
	"Mortality Surveillance/Supervised Burial": "#111827",
	"Sample Collected": "#16a34a",
	Others: "#6b7280",
};

const verificationColors: Record<string, string> = {
	verified: "#16a34a",
	notVerified: "#D90000",
};

const verificationConfig: ChartConfig = {
	verified: { label: "Verified Signals", color: verificationColors.verified },
	notVerified: {
		label: "Unverified Signals",
		color: verificationColors.notVerified,
	},
};

const statusConfig: ChartConfig = {
	alive: { label: "Alive", color: "#16a34a" },
	dead: { label: "Dead", color: "#D90000" },
	unknown: { label: "Unknown / Pending", color: "#FCDC04" },
	other: { label: "Other", color: "#0066CC" },
};

const timelineConfig: ChartConfig = {
	count: { label: "Signals", color: "#D90000" },
};

const districtConfig: ChartConfig = {
	count: { label: "Signals", color: "#0066CC" },
};

const diseaseConfig: ChartConfig = {
	count: { label: "Alerts", color: "#D90000" },
};

const sourceConfig: ChartConfig = {
	count: { label: "Alerts", color: "#0066CC" },
};

const ageConfig: ChartConfig = {
	count: { label: "Cases", color: "#7c3aed" },
};

const sexConfig: ChartConfig = {
	male: { label: "Male", color: "#0066CC" },
	female: { label: "Female", color: "#D90000" },
	unknown: { label: "Unknown", color: "#9ca3af" },
};

/** Keep long category labels (e.g. disease names) readable on a bar axis. */
function truncateLabel(value: string, max = 22): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Height for a horizontal (layout="vertical") bar chart, grown to fit its rows.
 *
 * These charts are fixed-category lists (top districts / diseases / sources), and a
 * fixed height silently broke them: with ~9 rows in 220px, Recharts' default category
 * tick `interval` ("preserveEnd") decided the labels wouldn't fit and dropped every
 * other one, leaving bars with no name against them. The axes now render every tick
 * (interval={0}), so the container has to actually give each row the space its label
 * needs — hence a height that scales with the row count instead of a constant.
 */
const BAR_ROW_HEIGHT = 30; // per category row: bar + breathing room for its label
const BAR_CHART_CHROME = 44; // x-axis + margins
const BAR_CHART_MIN_HEIGHT = 220;

function barChartHeight(rowCount: number): number {
	return Math.max(BAR_CHART_MIN_HEIGHT, rowCount * BAR_ROW_HEIGHT + BAR_CHART_CHROME);
}

function ChartEmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
			{message}
		</div>
	);
}

function VerificationBreakdownCard({
	title,
	description,
	items,
}: {
	title: string;
	description: string;
	items: ChartCountItem[];
}) {
	const total = items.reduce((sum, item) => sum + item.count, 0);
	const max = Math.max(...items.map((item) => item.count), 1);

	return (
		<Card>
			<CardHeader className="p-4 pb-2">
				<div className="flex items-center gap-2">
					<ListChecks className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">{title}</CardTitle>
				</div>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				{total === 0 ? (
					<ChartEmptyState message="No verification decisions recorded yet." />
				) : (
					<div className="space-y-2">
						{items.map((item) => (
							<div key={item.key} className="space-y-1">
								<div className="flex items-start justify-between gap-3 text-sm">
									<span className="min-w-0 font-medium text-foreground">
										{item.label}
									</span>
									<span className="shrink-0 text-muted-foreground">
										{item.count.toLocaleString()}
									</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div
										className="h-2 rounded-full"
										style={{
											width: `${(item.count / max) * 100}%`,
											backgroundColor: item.color,
										}}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export const DashboardCharts = memo<DashboardChartsProps>(({ summary }) => {
	const fieldVerificationData = useMemo<ChartCountItem[]>(
		() =>
			summary.fieldVerification.map((item) => ({
				...item,
				color: OUTCOME_COLORS[item.label] ?? "#475569",
			})),
		[summary.fieldVerification]
	);
	const deskVerificationData = useMemo<ChartCountItem[]>(
		() =>
			summary.deskVerification.map((item) => ({
				...item,
				color: OUTCOME_COLORS[item.label] ?? "#475569",
			})),
		[summary.deskVerification]
	);
	const verificationData = summary.verification;
	const statusData = summary.status;
	const timelineData = summary.timeline;
	const districtData = useMemo(
		() =>
			summary.topDistricts.map((item) => ({
				district: item.label,
				count: item.count,
			})),
		[summary.topDistricts]
	);
	const timelineGranularity = summary.granularity;

	const verificationTotal = verificationData.reduce((sum, d) => sum + d.count, 0);
	const hasSignals = summary.total > 0;

	return (
		<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<VerificationBreakdownCard
				title="Field Verification"
				description="Field team verification decisions (field_verification_decision)"
				items={fieldVerificationData}
			/>
			<VerificationBreakdownCard
				title="Desk Verification"
				description="Desk triage actions — multiple allowed per alert"
				items={deskVerificationData}
			/>

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<PieChartIcon className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signal Verification</CardTitle>
					</div>
					<CardDescription>
						Verified and unverified signal backlog
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{!hasSignals || verificationTotal === 0 ? (
						<ChartEmptyState message="No signal data available for verification breakdown." />
					) : (
						<ChartContainer
							config={verificationConfig}
							className="mx-auto aspect-square max-h-[220px]"
						>
							<PieChart>
								<ChartTooltip
									content={
										<ChartTooltipContent nameKey="key" hideLabel />
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<BarChart3 className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Case Status</CardTitle>
					</div>
					<CardDescription>
						Alive, dead, and unknown outcomes
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{statusData.length === 0 ? (
						<ChartEmptyState message="No status data available in signals." />
					) : (
						<ChartContainer config={statusConfig} className="h-[220px] w-full">
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
										<ChartTooltipContent nameKey="key" hideLabel />
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

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signals Over Time</CardTitle>
					</div>
					<CardDescription>
						{timelineGranularity === "monthly"
							? "Monthly volume (last 12 months with data)"
							: "Daily volume (last 30 days)"}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{timelineData.length === 0 ? (
						<ChartEmptyState message="No valid dates found in signal records." />
					) : (
						<ChartContainer config={timelineConfig} className="h-[220px] w-full">
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
										timelineGranularity === "monthly" ? "end" : "middle"
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
										<ChartTooltipContent labelKey="label" nameKey="count" />
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

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<MapPin className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Top Districts</CardTitle>
					</div>
					<CardDescription>
						Highest signal volume by case district
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{districtData.length === 0 ? (
						<ChartEmptyState message="No district data available in signals." />
					) : (
						<ChartContainer
							config={districtConfig}
							className="w-full"
							style={{ height: barChartHeight(districtData.length) }}
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
									// Label every bar. Without this, Recharts thins the ticks
									// when it thinks they won't fit, leaving unnamed bars.
									interval={0}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
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

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<Stethoscope className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signals by Disease</CardTitle>
					</div>
					<CardDescription>
						Top suspected diseases / syndromes
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{summary.diseases.length === 0 ? (
						<ChartEmptyState message="No disease data available in signals." />
					) : (
						<ChartContainer
							config={diseaseConfig}
							className="w-full"
							style={{ height: barChartHeight(summary.diseases.length) }}
						>
							<BarChart
								data={summary.diseases}
								layout="vertical"
								margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
							>
								<CartesianGrid horizontal={false} strokeDasharray="3 3" />
								<XAxis type="number" tickLine={false} axisLine={false} />
								<YAxis
									type="category"
									dataKey="label"
									width={150}
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									tickFormatter={(value) => truncateLabel(String(value))}
									// Label every bar (see barChartHeight).
									interval={0}
								/>
								{/* Not hideLabel: long disease names are truncated on the
								    axis, so the tooltip is where the full name is read. */}
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={[0, 4, 4, 0]}
									barSize={18}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<Megaphone className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signals by Source</CardTitle>
					</div>
					<CardDescription>
						How alerts reach the system
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{summary.sources.length === 0 ? (
						<ChartEmptyState message="No source data available in signals." />
					) : (
						<ChartContainer
							config={sourceConfig}
							className="w-full"
							style={{ height: barChartHeight(summary.sources.length) }}
						>
							<BarChart
								data={summary.sources}
								layout="vertical"
								margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
							>
								<CartesianGrid horizontal={false} strokeDasharray="3 3" />
								<XAxis type="number" tickLine={false} axisLine={false} />
								<YAxis
									type="category"
									dataKey="label"
									width={150}
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									tickFormatter={(value) => truncateLabel(String(value))}
									// Label every bar (see barChartHeight).
									interval={0}
								/>
								{/* Not hideLabel: the axis label may be truncated, so the
								    tooltip is where the full source name is read. */}
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={[0, 4, 4, 0]}
									barSize={18}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<Users className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Age Distribution</CardTitle>
					</div>
					<CardDescription>Case age groups (years)</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{summary.age.length === 0 ? (
						<ChartEmptyState message="No age data available in signals." />
					) : (
						<ChartContainer config={ageConfig} className="h-[220px] w-full">
							<BarChart
								data={summary.age}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 11 }}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={40}
									tick={{ fontSize: 11 }}
								/>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={[4, 4, 0, 0]}
									barSize={28}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="p-4 pb-2">
					<div className="flex items-center gap-2">
						<UserCircle className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Sex Breakdown</CardTitle>
					</div>
					<CardDescription>Case sex distribution</CardDescription>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{summary.sex.length === 0 ? (
						<ChartEmptyState message="No sex data available in signals." />
					) : (
						<ChartContainer
							config={sexConfig}
							className="mx-auto aspect-square max-h-[220px]"
						>
							<PieChart>
								<ChartTooltip
									content={<ChartTooltipContent nameKey="key" hideLabel />}
								/>
								<Pie
									data={summary.sex}
									dataKey="count"
									nameKey="key"
									innerRadius={55}
									outerRadius={90}
									paddingAngle={2}
									strokeWidth={2}
								>
									{summary.sex.map((entry) => (
										<Cell
											key={entry.key}
											fill={`var(--color-${entry.key})`}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		</div>
	);
});

DashboardCharts.displayName = "DashboardCharts";
