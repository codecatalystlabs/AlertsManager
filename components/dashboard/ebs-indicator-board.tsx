"use client";

import { memo, useMemo } from "react";
import {
	Ambulance,
	CalendarRange,
	Copy,
	Cross,
	Eye,
	Files,
	FlaskConical,
	Gauge,
	Layers,
	ListChecks,
	Play,
	ShieldCheck,
	Siren,
	Split,
	TrendingDown,
	type LucideIcon,
} from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	Line,
	LineChart,
	Tooltip,
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
import {
	EMERALD_INK,
	INDIGO_INK,
	ROSE_INK,
	SKY_INK,
	StatCard,
} from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";
import {
	buildEbsIndicatorRows,
	buildIndicatorTrend,
	buildSignalCascade,
	buildWeeklyCascade,
	epiWeekSpanLabel,
	epiWeekTitle,
	percent,
	type EbsIndicatorRow,
	type EbsStage,
	type IndicatorTrendPoint,
} from "@/lib/ebs-indicators";

/**
 * The dashboard board: headline figures, the weekly signal chart, one trend
 * card per indicator (value + numerator/denominator + epi-week graph), the
 * cascade funnel and the reporting-unit breakdown.
 *
 * Every card is one row of the published indicator table
 * (lib/ebs-indicators.ts); the definition, numerator and denominator are the
 * card's hover hint, and every graph runs on epi weeks (ISO weeks, the DHIS2
 * weekly period) so it lines up with the weekly bulletin.
 */

const STAGE_COLOR: Record<EbsStage, string> = {
	detection: "#0066CC",
	triage: "#d97706",
	verification: "#16a34a",
	risk: "#D90000",
	response: "#0066CC",
	alert: "#D90000",
};

const STAGE_TEXT: Record<EbsStage, string> = {
	detection: "text-sky-700",
	triage: "text-amber-700",
	verification: "text-emerald-700",
	risk: "text-red-700",
	response: "text-sky-700",
	alert: "text-red-700",
};

const INDICATOR_ICONS: Record<string, LucideIcon> = {
	"signals-reported": Files,
	"signals-triaged": ListChecks,
	"duplicated-signals": Copy,
	"signals-verified": ShieldCheck,
	"signal-to-event": Split,
	"events-risk-assessed": Gauge,
	"response-initiated": Play,
	"under-monitoring": Eye,
	"events-responded": FlaskConical,
	"events-evacuated": Ambulance,
	sdb: Cross,
	alerts: Siren,
};

function hintFor(row: EbsIndicatorRow): string {
	const parts = [row.definition];
	if (row.kind === "proportion") {
		parts.push(`Numerator: ${row.numeratorLabel}.`, `Denominator: ${row.denominatorLabel}.`);
	}
	if (row.note) parts.push(row.note);
	return parts.join(" ");
}

interface BoardProps {
	summary: DashboardSummary | undefined;
	isLoading?: boolean;
}

function shareText(part: number, whole: number, of: string): string {
	const p = percent(part, whole);
	return p === null ? `no ${of} in scope` : `${p}% of ${of}`;
}

/**
 * The four numbers a reader wants first: what came in, what was verified,
 * what turned out to be an event, and what became an alert.
 */
export const HeadlineStats = memo<BoardProps>(({ summary, isLoading }) => {
	const i = summary?.indicators;
	const reported = i?.signalsReported ?? 0;
	const verified = i?.signalsVerified ?? 0;
	const events = i?.events ?? 0;
	const alerts = i?.alertsReported ?? 0;

	const cards = [
		{
			title: "Signals reported",
			value: reported,
			sub: "all signals in scope",
			hint: "Number of signals reported by each EBS unit (health facility, district, region).",
			icon: Files,
			ink: SKY_INK,
		},
		{
			title: "Signals verified",
			value: verified,
			sub: shareText(verified, reported, "signals reported"),
			hint: "Signals with a recorded verification outcome.",
			icon: ShieldCheck,
			ink: EMERALD_INK,
		},
		{
			title: "Events",
			value: events,
			sub: shareText(events, verified, "verified signals"),
			hint: "Verified signals whose outcome is Confirmed — events requiring risk assessment.",
			icon: Split,
			ink: INDIGO_INK,
		},
		{
			title: "Alerts",
			value: alerts,
			sub: shareText(alerts, reported, "signals reported"),
			hint: "Verified signals that were not discarded.",
			icon: Siren,
			ink: ROSE_INK,
		},
	];

	return (
		<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
			{cards.map((c) => (
				<StatCard
					key={c.title}
					title={c.title}
					value={c.value.toLocaleString()}
					subText={c.sub}
					hint={c.hint}
					icon={c.icon}
					ink={c.ink}
					isLoading={isLoading}
				/>
			))}
		</div>
	);
});
HeadlineStats.displayName = "HeadlineStats";

/* ------------------------------------------------------------------------ */
/* Weekly signals                                                            */
/* ------------------------------------------------------------------------ */

const weeklyConfig: ChartConfig = {
	reported: { label: "Reported", color: "#0066CC" },
	verified: { label: "Verified", color: "#16a34a" },
	events: { label: "Events", color: "#7c3aed" },
	alerts: { label: "Alerts", color: "#D90000" },
};

function ChartEmpty({ message, height = 240 }: { message: string; height?: number }) {
	return (
		<div
			className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground"
			style={{ height }}
		>
			{message}
		</div>
	);
}

/**
 * Axis tick density for an epi-week axis: label every week while they fit,
 * then every k-th so that at most `maxTicks` labels are drawn (Recharts'
 * `interval` is the number of ticks SKIPPED between labels).
 */
function weekTickInterval(n: number, maxTicks: number): number {
	if (n <= maxTicks) return 0;
	return Math.ceil(n / maxTicks) - 1;
}

/**
 * Signals reported, verified, events and alerts per epi week — the volume
 * behind every proportion on the page, on the axis the weekly bulletin uses.
 */
export const WeeklySignalsCard = memo<BoardProps>(({ summary, isLoading }) => {
	const data = useMemo(() => buildWeeklyCascade(summary), [summary]);
	const span = epiWeekSpanLabel(summary);

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CalendarRange className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signals by epi week</CardTitle>
					</div>
					<span className="text-xs text-gray-500">{span}</span>
				</div>
				<CardDescription>
					Signals reported, verified, confirmed as events and issued as alerts, per
					epi week (Monday–Sunday).
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[260px] w-full" />
				) : data.length === 0 ? (
					<ChartEmpty message="No dated signals in scope." height={260} />
				) : (
					<ChartContainer config={weeklyConfig} className="w-full" style={{ height: 260 }}>
						<BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={1}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 10 }}
								interval={weekTickInterval(data.length, 13)}
							/>
							<YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(_label, payload) => {
											const p = payload?.[0]?.payload as
												| { week: string; start: string; end: string }
												| undefined;
											if (!p) return String(_label);
											const [year, w] = p.week.split("-W");
											return epiWeekTitle({
												weekNo: Number(w),
												year: Number(year),
												start: p.start,
												end: p.end,
											});
										}}
									/>
								}
							/>
							<Bar dataKey="reported" fill="var(--color-reported)" radius={[2, 2, 0, 0]} />
							<Bar dataKey="verified" fill="var(--color-verified)" radius={[2, 2, 0, 0]} />
							<Bar dataKey="events" fill="var(--color-events)" radius={[2, 2, 0, 0]} />
							<Bar dataKey="alerts" fill="var(--color-alerts)" radius={[2, 2, 0, 0]} />
						</BarChart>
					</ChartContainer>
				)}
				{data.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
						{(Object.keys(weeklyConfig) as (keyof typeof weeklyConfig)[]).map((k) => (
							<span key={k} className="inline-flex items-center gap-1.5">
								<span
									className="inline-block h-2.5 w-2.5 rounded-sm"
									style={{ backgroundColor: weeklyConfig[k].color as string }}
								/>
								{weeklyConfig[k].label as string}
							</span>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
});
WeeklySignalsCard.displayName = "WeeklySignalsCard";

/* ------------------------------------------------------------------------ */
/* Per-indicator trend cards                                                 */
/* ------------------------------------------------------------------------ */

interface TrendTooltipProps {
	active?: boolean;
	payload?: { payload: IndicatorTrendPoint }[];
	kind: "count" | "proportion";
}

/** Week title, then the value with the counts it is made of. */
function TrendTooltip({ active, payload, kind }: TrendTooltipProps) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	return (
		<div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
			<p className="font-medium text-gray-900">{epiWeekTitle(p)}</p>
			{kind === "count" ? (
				<p className="mt-0.5 tabular-nums text-gray-700">{p.numerator.toLocaleString()} signals</p>
			) : p.denominator === null || p.denominator === 0 ? (
				<p className="mt-0.5 text-gray-500">
					{p.numerator > 0
						? `${p.numerator.toLocaleString()} recorded · no denominator this week`
						: "nothing in scope this week"}
				</p>
			) : (
				<p className="mt-0.5 tabular-nums text-gray-700">
					<span className="font-semibold text-gray-900">{p.value}%</span> ·{" "}
					{p.numerator.toLocaleString()} of {p.denominator.toLocaleString()}
				</p>
			)}
		</div>
	);
}

interface IndicatorTrendCardProps {
	row: EbsIndicatorRow;
	points: IndicatorTrendPoint[];
	isLoading?: boolean;
}

const TREND_HEIGHT = 200;

/** One indicator: its current value, the counts behind it, and its epi-week graph. */
const IndicatorTrendCard = memo<IndicatorTrendCardProps>(({ row, points, isLoading }) => {
	const Icon = INDICATOR_ICONS[row.id] ?? Files;
	const color = STAGE_COLOR[row.stage];
	const config: ChartConfig = { value: { label: row.label, color } };
	const hasData = points.some((p) => p.value !== null && (row.kind === "count" ? p.value > 0 : true));

	return (
		<Card title={hintFor(row)}>
			<CardHeader className="pb-1">
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-w-0 items-center gap-1.5">
						<Icon className={cn("h-4 w-4 shrink-0", STAGE_TEXT[row.stage])} />
						<CardTitle className="truncate text-sm">{row.label}</CardTitle>
					</div>
					<div className="shrink-0 text-right">
						{isLoading ? (
							<Skeleton className="h-5 w-12" />
						) : (
							<p className={cn("text-lg font-bold leading-none tabular-nums", STAGE_TEXT[row.stage])}>
								{row.display}
							</p>
						)}
						{!isLoading && row.detail && (
							<p className="mt-0.5 text-[10px] leading-tight text-gray-500">{row.detail}</p>
						)}
					</div>
				</div>
				<CardDescription className="truncate text-[11px]">{row.definition}</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				{isLoading ? (
					<Skeleton className="w-full" style={{ height: TREND_HEIGHT }} />
				) : points.length === 0 || !hasData ? (
					<ChartEmpty
						message={points.length === 0 ? "No dated signals in scope." : "No data for this indicator yet."}
						height={TREND_HEIGHT}
					/>
				) : (
					<ChartContainer config={config} className="w-full" style={{ height: TREND_HEIGHT }}>
						{row.kind === "count" ? (
							<BarChart data={points} margin={{ left: -8, right: 4, top: 8, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval={weekTickInterval(points.length, 9)}
								/>
								<YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 10 }} allowDecimals={false} />
								<Tooltip content={<TrendTooltip kind="count" />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]}>
									{points.length <= 16 && (
										<LabelList dataKey="value" position="top" fontSize={10} className="fill-muted-foreground" />
									)}
								</Bar>
							</BarChart>
						) : (
							<LineChart data={points} margin={{ left: -4, right: 8, top: 8, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval={weekTickInterval(points.length, 9)}
								/>
								<YAxis
									domain={[0, 100]}
									ticks={[0, 25, 50, 75, 100]}
									tickFormatter={(v: number) => `${v}%`}
									tickLine={false}
									axisLine={false}
									width={40}
									tick={{ fontSize: 10 }}
								/>
								<Tooltip content={<TrendTooltip kind="proportion" />} cursor={{ stroke: "#9ca3af", strokeDasharray: "3 3" }} />
								<Line
									type="monotone"
									dataKey="value"
									stroke="var(--color-value)"
									strokeWidth={2}
									dot={{ fill: "var(--color-value)", r: 2.5 }}
									activeDot={{ r: 4, fill: "#FCDC04" }}
									connectNulls={false}
								/>
							</LineChart>
						)}
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
});
IndicatorTrendCard.displayName = "IndicatorTrendCard";

/**
 * All twelve indicators as trend cards, in table order. Renders the cards
 * only (no grid of its own) so the page can lay them out in the same
 * two-column grid as the other charts.
 */
export const IndicatorTrendCards = memo<BoardProps>(({ summary, isLoading }) => {
	const rows = useMemo(() => buildEbsIndicatorRows(summary), [summary]);
	const trends = useMemo(
		() => new Map(rows.map((r) => [r.id, buildIndicatorTrend(summary, r.id)])),
		[rows, summary]
	);

	return (
		<>
			{rows.map((row) => (
				<IndicatorTrendCard
					key={row.id}
					row={row}
					points={trends.get(row.id) ?? []}
					isLoading={isLoading}
				/>
			))}
		</>
	);
});
IndicatorTrendCards.displayName = "IndicatorTrendCards";

/* ------------------------------------------------------------------------ */
/* Cascade + reporting units                                                 */
/* ------------------------------------------------------------------------ */

const cascadeConfig: ChartConfig = {
	count: { label: "Signals", color: "#0066CC" },
};

/** Every stage a signal passes through, as a count, in pipeline order. */
export const SignalCascadeCard = memo<BoardProps>(({ summary, isLoading }) => {
	const steps = useMemo(() => buildSignalCascade(summary), [summary]);
	const reported = steps[0]?.count ?? 0;
	const data = steps.map((s) => ({
		...s,
		share: reported > 0 ? Math.round((s.count / reported) * 100) : 0,
	}));

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<TrendingDown className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">Signal cascade</CardTitle>
				</div>
				<CardDescription>
					Signals reaching each stage of the pipeline, labelled with the share of
					signals reported.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[240px] w-full" />
				) : reported === 0 ? (
					<ChartEmpty message="No signals in scope." />
				) : (
					<ChartContainer config={cascadeConfig} className="w-full" style={{ height: 240 }}>
						<BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
							<CartesianGrid horizontal={false} strokeDasharray="3 3" />
							<XAxis type="number" tickLine={false} axisLine={false} />
							<YAxis
								type="category"
								dataKey="label"
								width={120}
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 11 }}
								interval={0}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={18}>
								<LabelList
									dataKey="share"
									position="right"
									formatter={(v: number) => `${v}%`}
									className="fill-muted-foreground"
									fontSize={11}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
});
SignalCascadeCard.displayName = "SignalCascadeCard";

function UnitList({
	title,
	items,
	emptyMessage,
}: {
	title: string;
	items: DashboardCountItem[];
	emptyMessage: string;
}) {
	const max = Math.max(...items.map((i) => i.count), 1);
	return (
		<div className="min-w-0">
			<p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
			{items.length === 0 ? (
				<p className="text-xs text-muted-foreground">{emptyMessage}</p>
			) : (
				<ul className="space-y-1.5">
					{items.map((item, i) => (
						// Index-suffixed: a breakdown from an older API can still carry
						// two spellings of one place that collapse to the same key.
						<li key={`${item.key}-${i}`} className="space-y-0.5">
							<div className="flex items-baseline justify-between gap-2 text-xs">
								<span className="min-w-0 truncate text-gray-800" title={item.label}>
									{item.label}
								</span>
								<span className="shrink-0 tabular-nums text-gray-600">{item.count.toLocaleString()}</span>
							</div>
							<div className="h-1.5 rounded-full bg-muted">
								<div
									className="h-1.5 rounded-full bg-uganda-red/80"
									style={{ width: `${(item.count / max) * 100}%` }}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/** Signals reported by reporting unit: detection level, region and district. */
export const ReportingUnitsCard = memo<BoardProps>(({ summary, isLoading }) => {
	const levels = (summary?.signalLevels ?? []).filter((l) => l.count > 0);
	const regions = (summary?.reportedByRegion ?? []).slice(0, 8);
	const districts = summary?.topDistricts ?? [];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Layers className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">Signals by reporting unit</CardTitle>
				</div>
				<CardDescription>
					Where the {(summary?.indicators?.signalsReported ?? 0).toLocaleString()} signals in
					scope were detected — by level, region and district (top 8 of each).
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{[0, 1, 2].map((i) => (
							<Skeleton key={i} className="h-40 w-full" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<UnitList title="By level" items={levels} emptyMessage="No detection level recorded." />
						<UnitList title="By region" items={regions} emptyMessage="No region could be resolved." />
						<UnitList title="By district" items={districts} emptyMessage="No district recorded." />
					</div>
				)}
			</CardContent>
		</Card>
	);
});
ReportingUnitsCard.displayName = "ReportingUnitsCard";
