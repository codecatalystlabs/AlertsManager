"use client";

import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	Line,
	LineChart,
	Pie,
	PieChart,
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
import type {
	ManagementCount,
	ManagementReport,
	ManagementScope,
} from "@/lib/fetch-reports";
import type { GeoFeatureCollection } from "@/lib/fetch-geo";
import {
	formatReportRange,
	renderDistrictChoropleth,
	scopeColumns,
} from "@/lib/management-report-pptx";

/**
 * The Alerts Management report rendered inside the app — the same sections, in
 * the same order, as the generated .pptx deck (which shares this data), so what
 * you view on screen is exactly what the PowerPoint will contain.
 */

// Status series — the dashboard's Alive/Dead hues; Unknown takes a violet that
// stays separable from both (validated). The red↔green deutan pair is carried
// by the direct value labels on every bar, not by hue alone.
const STATUS_COLORS: Record<string, string> = {
	Alive: "#16a34a",
	Dead: "#D90000",
	Unknown: "#4a3aa7",
};

// Fixed-order categorical hues for the sources pie (validated 8-slot theme).
const CATEGORICAL = [
	"#2a78d6",
	"#eb6834",
	"#1baf7a",
	"#eda100",
	"#e87ba4",
	"#008300",
	"#4a3aa7",
	"#e34948",
];
const OTHER_GREY = "#9ca3af";

// Entity colours shared with the rest of the app.
const SIGNALS_COLOR = "#2563eb"; // matches the reports timeseries chart
const ALERTS_COLOR = "#ca8a04";
const SOURCES_BAR_COLOR = "#0066CC"; // dashboard "sources" hue
const DISEASE_BAR_COLOR = "#D90000"; // dashboard "alerts by disease" hue
const VHF_STACK_COLOR = "#2a78d6";
const OTHER_STACK_COLOR = "#eb6834";

const CASCADE_STAGES: { key: keyof ManagementScope["cascade"][string]; label: string }[] = [
	{ key: "signals", label: "Signals" },
	{ key: "signalsVerified", label: "Signals verified" },
	{ key: "alerts", label: "Alerts" },
	{ key: "sampleCollected", label: "Sample Collected" },
	{ key: "fieldCaseVerification", label: "Field Case Verification" },
	{ key: "sdb", label: "SDB" },
	{ key: "rrtDeployment", label: "RRT deployment" },
	{ key: "ems", label: "EMS" },
];

interface ManagementReportViewProps {
	report: ManagementReport;
	districtGeo: GeoFeatureCollection | null;
}

export function ManagementReportView({
	report,
	districtGeo,
}: ManagementReportViewProps) {
	const range = formatReportRange(report.fromDate, report.toDate);
	const map = useMemo(
		() => (districtGeo ? renderDistrictChoropleth(districtGeo) : null),
		[districtGeo]
	);
	const totalSignals = report.sources.reduce((s, c) => s + c.count, 0);

	return (
		<div className="space-y-4">
			<ScopeTableCard
				title={`Alerts Management report (${range}) — All PHEs`}
				scope={report.allPhes}
				withAlerts={false}
			/>
			<ScopeTableCard
				title={`Alerts Management report (${range}) — VHFs`}
				scope={report.vhf}
				withAlerts
			/>

			<SourcesPieCard title={`Signals sources (${range})`} sources={report.sources} />

			<DetailsCard report={report} range={range} />

			<CascadeCard
				title={`Response cascade — All PHEs (${range})`}
				scope={report.allPhes}
			/>
			<CascadeCard
				title={`Response cascade — VHFs (${range})`}
				scope={report.vhf}
			/>

			<CountBarCard
				title={`Signal Sources (n=${totalSignals.toLocaleString()})`}
				counts={report.sources}
				color={SOURCES_BAR_COLOR}
				seriesLabel="Signals"
			/>
			<CountBarCard
				title="Other PHEs reported: Alerts"
				counts={report.otherPhes}
				color={DISEASE_BAR_COLOR}
				seriesLabel="Alerts"
			/>

			<MapCard report={report} range={range} map={map} />

			<TrendCard report={report} />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* District tables (slides 1–2)                                        */
/* ------------------------------------------------------------------ */

function ScopeTableCard({
	title,
	scope,
	withAlerts,
}: {
	title: string;
	scope: ManagementScope;
	withAlerts: boolean;
}) {
	const cols = scopeColumns(scope, withAlerts);
	// Guard against a backend that serialised an empty scope's sections as null.
	const sections = scope.sections ?? [];
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent className="overflow-x-auto pt-0">
				<table className="w-full min-w-[640px] border-collapse text-xs">
					<thead>
						<tr className="bg-uganda-red text-white">
							<th className="border border-uganda-red/40 px-2 py-1.5 text-left font-semibold">
								District
							</th>
							{cols.map((c) => (
								<th
									key={c.header}
									className="border border-uganda-red/40 px-2 py-1.5 text-center font-semibold"
								>
									{c.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{sections.map((section) => (
							<SectionRows
								key={section.status}
								section={section}
								cols={cols}
							/>
						))}
						<tr className="bg-muted font-semibold">
							<td className="border px-2 py-1.5">Total</td>
							{cols.map((c) => (
								<td key={c.header} className="border px-2 py-1.5 text-center tabular-nums">
									{c.value(scope.totals).toLocaleString()}
								</td>
							))}
						</tr>
					</tbody>
				</table>
				{sections.length === 0 && (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No signals in this range.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function SectionRows({
	section,
	cols,
}: {
	section: ManagementScope["sections"][number];
	cols: ReturnType<typeof scopeColumns>;
}) {
	return (
		<>
			<tr className="bg-red-50 font-semibold dark:bg-red-950/30">
				<td className="border px-2 py-1.5">{section.status}</td>
				{cols.map((c) => (
					<td key={c.header} className="border px-2 py-1.5 text-center tabular-nums">
						{c.value(section.totals).toLocaleString()}
					</td>
				))}
			</tr>
			{section.districts.map((d) => (
				<tr key={d.district} className="hover:bg-muted/40">
					<td className="border px-2 py-1.5 pl-4">{d.district}</td>
					{cols.map((c) => (
						<td key={c.header} className="border px-2 py-1.5 text-center tabular-nums">
							{c.value(d).toLocaleString()}
						</td>
					))}
				</tr>
			))}
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Signal sources pie (slide 3)                                        */
/* ------------------------------------------------------------------ */

/** Fold everything beyond the 8 fixed hues into one grey "Other" slice. */
function foldCounts(counts: ManagementCount[], max = 8): ManagementCount[] {
	if (counts.length <= max) return counts;
	const kept = counts.slice(0, max - 1);
	const other = counts
		.slice(max - 1)
		.reduce((s, c) => s + c.count, 0);
	return [...kept, { label: "Other", count: other }];
}

/** Slice label in neutral ink (recharts defaults to the slice colour). */
function pieSliceLabel(props: {
	cx?: number;
	cy?: number;
	midAngle?: number;
	outerRadius?: number;
	name?: string;
	value?: number;
	percent?: number;
}) {
	const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name, value, percent } = props;
	const rad = (-midAngle * Math.PI) / 180;
	const r = outerRadius + 18;
	const x = cx + r * Math.cos(rad);
	const y = cy + r * Math.sin(rad);
	return (
		<text
			x={x}
			y={y}
			textAnchor={x > cx ? "start" : "end"}
			dominantBaseline="central"
			className="fill-foreground"
			fontSize={11}
		>
			{`${name}: ${value} (${Math.round((percent ?? 0) * 100)}%)`}
		</text>
	);
}

function SourcesPieCard({
	title,
	sources,
}: {
	title: string;
	sources: ManagementCount[];
}) {
	const slices = foldCounts(sources);
	const data = slices.map((s, i) => ({
		name: s.label,
		value: s.count,
		fill: s.label === "Other" ? OTHER_GREY : CATEGORICAL[i % CATEGORICAL.length],
	}));
	const config: ChartConfig = Object.fromEntries(
		data.map((d) => [d.name, { label: d.name, color: d.fill }])
	);
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				{data.length === 0 ? (
					<EmptyChart label="No signals in this range." />
				) : (
					<ChartContainer config={config} className="mx-auto aspect-auto h-[280px] w-full">
						<PieChart>
							<ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
							<Pie
								data={data}
								dataKey="value"
								nameKey="name"
								stroke="var(--background)"
								strokeWidth={2}
								label={pieSliceLabel}
								labelLine
								isAnimationActive={false}
							/>
							<ChartLegend content={<ChartLegendContent nameKey="name" />} />
						</PieChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

/* ------------------------------------------------------------------ */
/* Alert details (slide 4)                                             */
/* ------------------------------------------------------------------ */

function DetailsCard({
	report,
	range,
}: {
	report: ManagementReport;
	range: string;
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">
					Alert details ({range})
					{report.detailsTotal > 0 && (
						<span className="ml-2 font-normal text-muted-foreground">
							{report.detailsTotal.toLocaleString()} VHF alert
							{report.detailsTotal === 1 ? "" : "s"}
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				{report.details.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No VHF alerts in this range.
					</p>
				) : (
					<div className="max-h-[420px] overflow-y-auto rounded-md border">
						<table className="w-full border-collapse text-xs">
							<thead className="sticky top-0">
								<tr className="bg-uganda-red text-white">
									<th className="px-2 py-1.5 text-left font-semibold">Source</th>
									<th className="px-2 py-1.5 text-left font-semibold">District</th>
									<th className="px-2 py-1.5 text-left font-semibold">Narrative</th>
								</tr>
							</thead>
							<tbody>
								{report.details.map((d, i) => (
									<tr key={i} className="border-t align-top hover:bg-muted/40">
										<td className="whitespace-nowrap px-2 py-1.5">{d.source}</td>
										<td className="whitespace-nowrap px-2 py-1.5">{d.district}</td>
										<td className="px-2 py-1.5">{d.narrative}</td>
									</tr>
								))}
							</tbody>
						</table>
						{report.detailsTotal > report.details.length && (
							<p className="border-t px-2 py-1.5 text-xs italic text-muted-foreground">
								… {(report.detailsTotal - report.details.length).toLocaleString()}{" "}
								more alert(s) in this range not shown
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/* ------------------------------------------------------------------ */
/* Response cascades (slides 5–6)                                      */
/* ------------------------------------------------------------------ */

function CascadeCard({ title, scope }: { title: string; scope: ManagementScope }) {
	const statuses = ["Alive", "Dead", "Unknown"].filter(
		(s) => scope.cascade?.[s] && scope.cascade[s].signals > 0
	);
	const data = CASCADE_STAGES.map((stage) => ({
		stage: stage.label,
		...Object.fromEntries(
			statuses.map((s) => [s, scope.cascade[s][stage.key]])
		),
	}));
	const config: ChartConfig = Object.fromEntries(
		statuses.map((s) => [s, { label: s, color: STATUS_COLORS[s] }])
	);
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				{statuses.length === 0 ? (
					<EmptyChart label="No signals in this range." />
				) : (
					<ChartContainer config={config} className="aspect-auto h-[300px] w-full">
						<BarChart data={data} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
							<XAxis
								dataKey="stage"
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 10, fill: "#64748b" }}
								interval={0}
								angle={-20}
								textAnchor="end"
								height={52}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={36}
								tick={{ fontSize: 10, fill: "#64748b" }}
								allowDecimals={false}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<ChartLegend content={<ChartLegendContent />} />
							{statuses.map((s) => (
								<Bar
									key={s}
									dataKey={s}
									fill={STATUS_COLORS[s]}
									radius={[4, 4, 0, 0]}
									maxBarSize={34}
									isAnimationActive={false}
								>
									<LabelList
										dataKey={s}
										position="top"
										className="fill-foreground"
										fontSize={9}
									/>
								</Bar>
							))}
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

/* ------------------------------------------------------------------ */
/* Count bars (slides 7–8)                                             */
/* ------------------------------------------------------------------ */

function CountBarCard({
	title,
	counts,
	color,
	seriesLabel,
}: {
	title: string;
	counts: ManagementCount[];
	color: string;
	seriesLabel: string;
}) {
	const data = counts.map((c) => ({ label: c.label, count: c.count }));
	const config: ChartConfig = { count: { label: seriesLabel, color } };
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				{data.length === 0 ? (
					<EmptyChart label="Nothing recorded in this range." />
				) : (
					<ChartContainer config={config} className="aspect-auto h-[300px] w-full">
						<BarChart data={data} margin={{ top: 20, right: 8, left: 4, bottom: 4 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 10, fill: "#64748b" }}
								interval={0}
								angle={-30}
								textAnchor="end"
								height={70}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={36}
								tick={{ fontSize: 10, fill: "#64748b" }}
								allowDecimals={false}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar
								dataKey="count"
								fill={color}
								radius={[4, 4, 0, 0]}
								maxBarSize={40}
								isAnimationActive={false}
							>
								<LabelList
									dataKey="count"
									position="top"
									className="fill-foreground"
									fontSize={9}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

/* ------------------------------------------------------------------ */
/* Map + top-10 districts (slide 9)                                    */
/* ------------------------------------------------------------------ */

function MapCard({
	report,
	range,
	map,
}: {
	report: ManagementReport;
	range: string;
	map: { dataUrl: string; aspect: number } | null;
}) {
	const top = report.topDistricts;
	const data = top.map((t) => ({
		district: t.district.toUpperCase(),
		vhf: t.vhf,
		other: t.other,
	}));
	const config: ChartConfig = {
		vhf: { label: "VHFs", color: VHF_STACK_COLOR },
		other: { label: "Other PHEs", color: OTHER_STACK_COLOR },
	};
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">
					Map showing distribution of alerts, N=
					{report.allPhes.totals.alerts.toLocaleString()}: All PHEs ({range})
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="grid gap-4 lg:grid-cols-2">
					{map ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={map.dataUrl}
							alt="District choropleth of alert counts"
							className="w-full rounded-md border"
						/>
					) : (
						<EmptyChart label="Map unavailable (no boundary data)." />
					)}
					{data.length === 0 ? (
						<EmptyChart label="No alerts in this range." />
					) : (
						<div>
							<p className="mb-1 text-center text-xs font-medium text-muted-foreground">
								Top 10 districts registering alerts
							</p>
							<ChartContainer config={config} className="aspect-auto h-[320px] w-full">
								<BarChart
									data={data}
									layout="vertical"
									margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
								>
									<CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200" />
									<XAxis
										type="number"
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 10, fill: "#64748b" }}
										allowDecimals={false}
									/>
									<YAxis
										type="category"
										dataKey="district"
										tickLine={false}
										axisLine={false}
										width={92}
										tick={{ fontSize: 9, fill: "#64748b" }}
										interval={0}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Bar
										dataKey="vhf"
										stackId="a"
										fill={VHF_STACK_COLOR}
										stroke="var(--background)"
										strokeWidth={1}
										isAnimationActive={false}
									/>
									<Bar
										dataKey="other"
										stackId="a"
										fill={OTHER_STACK_COLOR}
										stroke="var(--background)"
										strokeWidth={1}
										radius={[0, 4, 4, 0]}
										isAnimationActive={false}
									/>
								</BarChart>
							</ChartContainer>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

/* ------------------------------------------------------------------ */
/* Trend (slide 10)                                                    */
/* ------------------------------------------------------------------ */

const trendConfig: ChartConfig = {
	signals: { label: "Signals", color: SIGNALS_COLOR },
	alerts: { label: "Alerts", color: ALERTS_COLOR },
};

function TrendCard({ report }: { report: ManagementReport }) {
	const data = report.trend.map((p) => ({
		date: p.date,
		signals: p.signals,
		alerts: p.alerts,
	}));
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">
					Trend of signals vs alerts reported (
					{formatReportRange(report.trendFrom, report.toDate)})
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				{data.length === 0 ? (
					<EmptyChart label="No trend data for this range." />
				) : (
					<ChartContainer config={trendConfig} className="aspect-auto h-[280px] w-full">
						<LineChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
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
							/>
							<ChartTooltip content={<ChartTooltipContent labelKey="date" indicator="line" />} />
							<ChartLegend content={<ChartLegendContent />} />
							<Line
								type="monotone"
								dataKey="signals"
								stroke={SIGNALS_COLOR}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 5, fill: SIGNALS_COLOR }}
								isAnimationActive={false}
							/>
							<Line
								type="monotone"
								dataKey="alerts"
								stroke={ALERTS_COLOR}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 5, fill: ALERTS_COLOR }}
								isAnimationActive={false}
							/>
						</LineChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

function EmptyChart({ label }: { label: string }) {
	return (
		<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed bg-muted/20 text-sm text-muted-foreground">
			{label}
		</div>
	);
}
