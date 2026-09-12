"use client";

import { memo, useMemo, type ReactNode } from "react";
import {
	Activity,
	BarChart3,
	CalendarRange,
	Cross,
	Gauge,
	Layers,
	ListChecks,
	Map,
	PieChart as PieChartIcon,
	Play,
	ShieldCheck,
	Siren,
	Split,
	Stethoscope,
	Timer,
	Trash2,
	Users,
	Files,
	type LucideIcon,
} from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	LabelList,
	Line,
	Pie,
	PieChart,
	RadialBar,
	RadialBarChart,
	Tooltip,
	Treemap,
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
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ChartSkeleton } from "@/components/ui/skeletons";
import {
	AMBER_INK,
	EMERALD_INK,
	INDIGO_INK,
	ROSE_INK,
	SKY_INK,
	SLATE_INK,
	StatCard,
	TEAL_INK,
	VIOLET_INK,
} from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";
import { epiWeekTitle } from "@/lib/ebs-indicators";

/**
 * The administrative overview: a KPI row of stat tiles, then one grid of
 * charts that each use a DIFFERENT form for a different job — area for the
 * trend, a composed bar+line for the weekly volume, donuts for part-to-whole,
 * 100%-stacked bars for the gate outcomes, horizontal bars for ranked places,
 * a treemap for district share, a radial bar for the detection levels and a
 * status-coloured column chart for risk levels. Every number comes from the
 * one scoped GET /dashboard/summary payload, so the tiles and the charts
 * reconcile with each other and with the dashboard.
 *
 * Colour rules (dataviz skill): one hue, light→dark, for magnitude; the fixed
 * six-hue categorical order below for identity, never cycled past six (the
 * tail folds into "Other"); status colours only for state, always with a
 * label beside them.
 */

/* ------------------------------------------------------------------------ */
/* Palette                                                                   */
/* ------------------------------------------------------------------------ */

/** Categorical slots in fixed order — validated (light surface) with the dataviz validator. */
const CAT = ["#0066CC", "#D90000", "#d97706", "#16a34a", "#7c3aed", "#db2777"] as const;
/** Neutral for Unknown / Not recorded / Other — never a series colour. */
const NEUTRAL = "#9ca3af";

const STATUS = {
	good: "#16a34a",
	warning: "#d97706",
	serious: "#ea580c",
	critical: "#D90000",
	info: "#0066CC",
} as const;

const BLUE = CAT[0];
const RED = CAT[1];

/** Blend two hex colours, t in 0..1. */
function mix(a: string, b: string, t: number): string {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
	return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Sequential shade for a magnitude: light tint → full hue. */
function shade(hue: string, value: number, max: number): string {
	const t = max > 0 ? 0.25 + 0.75 * (value / max) : 0.25;
	return mix("#ffffff", hue, t);
}

function share(part: number, whole: number): number | null {
	if (whole <= 0 || part < 0 || part > whole) return null;
	return Math.round((part / whole) * 100);
}

function pct(part: number, whole: number): string {
	const p = share(part, whole);
	return p === null ? "" : `${p}%`;
}

function isNeutralLabel(label: string): boolean {
	return /unknown|not recorded|not assessed|other|unspecified|n\/a|untriaged|awaiting/i.test(label);
}

/** Fixed-order categorical colouring; neutral-looking labels get the grey. */
function colourItems(items: DashboardCountItem[]): (DashboardCountItem & { fill: string })[] {
	let slot = 0;
	return items.map((it) => {
		if (isNeutralLabel(it.label)) return { ...it, fill: NEUTRAL };
		const fill = CAT[Math.min(slot, CAT.length - 1)];
		slot++;
		return { ...it, fill };
	});
}

/** Keep at most `max` named slices; fold the rest into "Other". */
function foldTail(items: DashboardCountItem[], max: number): DashboardCountItem[] {
	const sorted = [...items].filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
	if (sorted.length <= max) return sorted;
	const head = sorted.slice(0, max - 1);
	const rest = sorted.slice(max - 1).reduce((s, i) => s + i.count, 0);
	return [...head, { key: "other", label: "Other", count: rest }];
}

function truncate(value: string, max = 20): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/* ------------------------------------------------------------------------ */
/* Shared chrome                                                             */
/* ------------------------------------------------------------------------ */

const EMPTY_CONFIG: ChartConfig = { count: { label: "Signals", color: BLUE } };

function ChartCard({
	icon: Icon,
	title,
	description,
	className,
	isLoading,
	empty,
	emptyMessage = "Nothing in scope.",
	height = 220,
	children,
	aside,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	className?: string;
	isLoading?: boolean;
	empty?: boolean;
	emptyMessage?: string;
	height?: number;
	children: ReactNode;
	/** Optional legend / list rendered beside or under the plot. */
	aside?: ReactNode;
}) {
	return (
		<Card className={className}>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Icon className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">{title}</CardTitle>
				</div>
				<CardDescription className="text-[11px]">{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<ChartSkeleton height={height} />
				) : empty ? (
					<div
						className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground"
						style={{ height }}
					>
						{emptyMessage}
					</div>
				) : (
					<>
						{children}
						{aside}
					</>
				)}
			</CardContent>
		</Card>
	);
}

/** Small hover card: a title line and one or more "swatch label value" rows. */
function HoverCard({
	title,
	rows,
}: {
	title: string;
	rows: { label: string; value: string; fill?: string }[];
}) {
	return (
		<div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
			<p className="font-medium text-gray-900">{title}</p>
			{rows.map((r) => (
				<p key={r.label} className="mt-0.5 flex items-center gap-1.5 tabular-nums text-gray-700">
					{r.fill && <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: r.fill }} />}
					<span className="text-gray-500">{r.label}</span>
					<span className="ml-auto font-semibold text-gray-900">{r.value}</span>
				</p>
			))}
		</div>
	);
}

/** Legend rows with count and share — the direct labels every multi-series chart needs. */
function LegendList({
	items,
	total,
	columns = 2,
}: {
	items: { label: string; count: number; fill: string }[];
	total: number;
	columns?: 1 | 2;
}) {
	return (
		<ul className={cn("mt-2 grid gap-x-4 gap-y-1 text-[11px]", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
			{items.map((it) => (
				<li key={it.label} className="flex min-w-0 items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: it.fill }} />
					<span className="min-w-0 truncate text-gray-700" title={it.label}>
						{it.label}
					</span>
					<span className="ml-auto shrink-0 tabular-nums text-gray-900">
						{it.count.toLocaleString()}
						{total > 0 && <span className="ml-1 text-gray-400">{pct(it.count, total)}</span>}
					</span>
				</li>
			))}
		</ul>
	);
}

/* ------------------------------------------------------------------------ */
/* KPI tiles                                                                 */
/* ------------------------------------------------------------------------ */

interface PanelProps {
	summary: DashboardSummary | undefined;
	isLoading?: boolean;
}

/** Eight administrative headline figures, in pipeline order. */
export const AdminOverviewCards = memo<PanelProps>(({ summary, isLoading }) => {
	const s = summary;
	const ind = s?.indicators;
	const total = s?.total ?? 0;
	const tiles = [
		{
			title: "Signals reported",
			value: total,
			sub: "all signals in scope",
			icon: Files,
			ink: SKY_INK,
			hint: "Every signal in the selected scope.",
		},
		{
			title: "Triaged",
			value: s?.triaged ?? 0,
			sub: `${pct(s?.triaged ?? 0, total) || "—"} of signals`,
			icon: ListChecks,
			ink: AMBER_INK,
			hint: "Signals that went through the EBS step-2 triage gate.",
		},
		{
			title: "Verified",
			value: s?.verified ?? 0,
			sub: `${pct(s?.verified ?? 0, total) || "—"} of signals`,
			icon: ShieldCheck,
			ink: EMERALD_INK,
			hint: "Signals with a recorded verification outcome.",
		},
		{
			title: "Confirmed events",
			value: ind?.events ?? 0,
			sub: `${pct(ind?.events ?? 0, s?.verified ?? 0) || "—"} of verified`,
			icon: Split,
			ink: INDIGO_INK,
			hint: "Verified signals whose outcome is Confirmed.",
		},
		{
			title: "Risk assessed",
			value: ind?.eventsRiskAssessed ?? 0,
			sub: `${pct(ind?.eventsRiskAssessed ?? 0, ind?.events ?? 0) || "—"} of events`,
			icon: Gauge,
			ink: VIOLET_INK,
			hint: "Confirmed events carrying a risk level.",
		},
		{
			title: "Response initiated",
			value: ind?.responseInitiated ?? 0,
			sub: `${pct(ind?.responseInitiated ?? 0, ind?.eventsRiskAssessed ?? 0) || "—"} of assessed`,
			icon: Play,
			ink: TEAL_INK,
			hint: "Assessed events where a response was initiated.",
		},
		{
			title: "Alerts",
			value: s?.alerts ?? 0,
			sub: `${pct(s?.alerts ?? 0, total) || "—"} of signals`,
			icon: Siren,
			ink: ROSE_INK,
			hint: "Verified signals that were not discarded.",
		},
		{
			title: "Discarded",
			value: s?.discarded ?? 0,
			sub: `${pct(s?.discarded ?? 0, s?.verified ?? 0) || "—"} of verified`,
			icon: Trash2,
			ink: SLATE_INK,
			hint: "Verified signals whose outcome was Discarded.",
		},
	];
	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
			{tiles.map((t) => (
				<StatCard
					key={t.title}
					title={t.title}
					value={t.value.toLocaleString()}
					subText={t.sub}
					hint={t.hint}
					icon={t.icon}
					ink={t.ink}
					isLoading={isLoading}
				/>
			))}
		</div>
	);
});
AdminOverviewCards.displayName = "AdminOverviewCards";

/* ------------------------------------------------------------------------ */
/* Charts                                                                    */
/* ------------------------------------------------------------------------ */

/** Signals over time — a single-series area (trend). */
function SignalsTrendCard({ summary, isLoading }: PanelProps) {
	const data = summary?.timeline ?? [];
	const unit = summary?.granularity === "monthly" ? "month" : "day";
	const n = data.length;
	return (
		<ChartCard
			icon={Activity}
			title="Signals over time"
			description={`Signals reported per ${unit} across the selected scope.`}
			className="lg:col-span-2"
			isLoading={isLoading}
			empty={n === 0}
			emptyMessage="No dated signals in scope."
			height={220}
		>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 220 }}>
				<AreaChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
					<defs>
						<linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
							<stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10 }}
						interval={n <= 14 ? 0 : Math.ceil(n / 14) - 1}
					/>
					<YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10 }} allowDecimals={false} />
					<Tooltip
						cursor={{ stroke: "#9ca3af", strokeDasharray: "3 3" }}
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as { label: string; count: number } | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: "Signals", value: p.count.toLocaleString(), fill: BLUE }]} />;
						}}
					/>
					<Area
						type="monotone"
						dataKey="count"
						stroke={BLUE}
						strokeWidth={2}
						fill="url(#adminTrendFill)"
						dot={false}
						activeDot={{ r: 4, fill: "#FCDC04", stroke: BLUE }}
					/>
				</AreaChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Weekly volume — reported as bars, alerts as a line, one count axis. */
function WeeklyVolumeCard({ summary, isLoading }: PanelProps) {
	const series = summary?.indicatorSeries ?? [];
	const multiYear = series.length > 1 && series[0].year !== series[series.length - 1].year;
	const data = useMemo(
		() =>
			series.map((p) => ({
				...p,
				label: multiYear
					? `W${String(p.weekNo).padStart(2, "0")} '${String(p.year).slice(2)}`
					: `W${String(p.weekNo).padStart(2, "0")}`,
				reported: p.counts.signalsReported,
				verified: p.counts.signalsVerified,
				alerts: p.counts.alertsReported,
			})),
		[series, multiYear]
	);
	const n = data.length;
	const legend = [
		{ label: "Reported", count: data.reduce((s, d) => s + d.reported, 0), fill: mix("#ffffff", BLUE, 0.55) },
		{ label: "Verified", count: data.reduce((s, d) => s + d.verified, 0), fill: BLUE },
		{ label: "Alerts", count: data.reduce((s, d) => s + d.alerts, 0), fill: RED },
	];
	return (
		<ChartCard
			icon={CalendarRange}
			title="Weekly volume"
			description="Signals reported and verified (bars) and alerts issued (line), per epi week."
			className="lg:col-span-2"
			isLoading={isLoading}
			empty={n === 0}
			emptyMessage="No dated signals in scope."
			height={220}
			aside={<LegendList items={legend} total={0} columns={2} />}
		>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 220 }}>
				<ComposedChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }} barGap={2}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10 }}
						interval={n <= 13 ? 0 : Math.ceil(n / 13) - 1}
					/>
					<YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10 }} allowDecimals={false} />
					<Tooltip
						cursor={{ fill: "rgba(0,0,0,0.04)" }}
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
							if (!active || !p) return null;
							return (
								<HoverCard
									title={epiWeekTitle(p)}
									rows={[
										{ label: "Reported", value: p.reported.toLocaleString(), fill: legend[0].fill },
										{ label: "Verified", value: p.verified.toLocaleString(), fill: legend[1].fill },
										{ label: "Alerts", value: p.alerts.toLocaleString(), fill: legend[2].fill },
									]}
								/>
							);
						}}
					/>
					<Bar dataKey="reported" fill={legend[0].fill} radius={[3, 3, 0, 0]} />
					<Bar dataKey="verified" fill={legend[1].fill} radius={[3, 3, 0, 0]} />
					<Line type="monotone" dataKey="alerts" stroke={RED} strokeWidth={2} dot={{ r: 2.5, fill: RED }} />
				</ComposedChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Donut of what happened to the signals — a part-to-whole of the pipeline exits. */
function OutcomeDonutCard({ summary, isLoading }: PanelProps) {
	const total = summary?.total ?? 0;
	const verified = summary?.verified ?? 0;
	const discarded = summary?.discarded ?? 0;
	const events = summary?.indicators?.events ?? 0;
	const otherVerified = Math.max(0, verified - discarded - events);
	const unverified = summary?.notVerified ?? Math.max(0, total - verified);
	const slices = [
		{ key: "events", label: "Confirmed events", count: events, fill: CAT[3] },
		{ key: "verifiedOther", label: "Verified, other outcome", count: otherVerified, fill: CAT[0] },
		{ key: "discarded", label: "Discarded", count: discarded, fill: CAT[1] },
		{ key: "unverified", label: "Awaiting verification", count: unverified, fill: NEUTRAL },
	].filter((s) => s.count > 0);
	const sum = slices.reduce((s, x) => s + x.count, 0);
	return (
		<ChartCard
			icon={PieChartIcon}
			title="Signal outcomes"
			description="How the signals in scope have been resolved so far."
			isLoading={isLoading}
			empty={sum === 0}
			height={220}
			aside={<LegendList items={slices} total={sum} columns={1} />}
		>
			<ChartContainer config={EMPTY_CONFIG} className="mx-auto w-full" style={{ height: 200 }}>
				<PieChart>
					<Tooltip
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof slices)[number] | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: "Signals", value: `${p.count.toLocaleString()} · ${pct(p.count, sum)}`, fill: p.fill }]} />;
						}}
					/>
					<Pie data={slices} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={2} stroke="#fff">
						{slices.map((s) => (
							<Cell key={s.key} fill={s.fill} />
						))}
					</Pie>
					<text x="50%" y="47%" textAnchor="middle" className="fill-gray-900 text-xl font-bold tabular-nums">
						{sum.toLocaleString()}
					</text>
					<text x="50%" y="58%" textAnchor="middle" className="fill-gray-500 text-[10px]">
						signals
					</text>
				</PieChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** One 100%-stacked horizontal bar per gate: triage exits and verification timeliness. */
function StackedShareBar({
	items,
	total,
}: {
	items: { key: string; label: string; count: number; fill: string }[];
	total: number;
}) {
	const row = items.reduce<Record<string, number | string>>((acc, it) => ({ ...acc, [it.key]: it.count }), { name: "all" });
	return (
		<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 56 }}>
			<BarChart data={[row]} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }} barCategoryGap={0}>
				<XAxis type="number" domain={[0, total]} hide />
				<YAxis type="category" dataKey="name" hide />
				<Tooltip
					cursor={false}
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null;
						return (
							<HoverCard
								title="Share of signals"
								rows={items.map((it) => ({ label: it.label, value: `${it.count.toLocaleString()} · ${pct(it.count, total)}`, fill: it.fill }))}
							/>
						);
					}}
				/>
				{items.map((it, i) => (
					<Bar
						key={it.key}
						dataKey={it.key}
						stackId="share"
						fill={it.fill}
						stroke="#fff"
						strokeWidth={2}
						radius={i === 0 ? [4, 0, 0, 4] : i === items.length - 1 ? [0, 4, 4, 0] : 0}
					>
						<LabelList
							dataKey={it.key}
							position="center"
							fill="#fff"
							fontSize={10}
							formatter={(v: number) => (share(v, total) ?? 0) >= 8 ? pct(v, total) : ""}
						/>
					</Bar>
				))}
			</BarChart>
		</ChartContainer>
	);
}

function TriageOutcomesCard({ summary, isLoading }: PanelProps) {
	const items = useMemo(() => {
		const raw = (summary?.triageOutcomes ?? []).filter((i) => i.count > 0);
		// Fixed colour per exit, whatever order the API lists them in.
		return raw.map((it) => {
			const l = it.label.toLowerCase();
			const fill = l.includes("forward")
				? CAT[0]
				: l.includes("log")
					? CAT[4]
					: l.includes("discard")
						? CAT[1]
						: isNeutralLabel(it.label)
							? NEUTRAL
							: CAT[2];
			return { ...it, fill };
		});
	}, [summary?.triageOutcomes]);
	const total = items.reduce((s, i) => s + i.count, 0);
	return (
		<ChartCard
			icon={ListChecks}
			title="Triage exits"
			description="Which way each signal left the triage gate, as a share of all signals."
			isLoading={isLoading}
			empty={total === 0}
			height={56}
			aside={<LegendList items={items} total={total} columns={2} />}
		>
			<StackedShareBar items={items} total={total} />
		</ChartCard>
	);
}

function VerificationTimelinessCard({ summary, isLoading }: PanelProps) {
	const sla = summary?.verificationSla;
	const items = [
		{ key: "onTime", label: "Verified within deadline", count: sla?.verifiedWithinDeadline ?? 0, fill: STATUS.good },
		{ key: "late", label: "Verified late", count: sla?.verifiedLate ?? 0, fill: STATUS.warning },
		{ key: "pending", label: "Pending, within deadline", count: sla?.pendingWithinDeadline ?? 0, fill: STATUS.info },
		{ key: "breached", label: "Pending, overdue", count: sla?.pendingBreached ?? 0, fill: STATUS.critical },
	].filter((i) => i.count > 0);
	const total = items.reduce((s, i) => s + i.count, 0);
	return (
		<ChartCard
			icon={Timer}
			title="Verification timeliness"
			description="Against each signal's priority deadline: 12h High, 24h Medium, 48h Low."
			isLoading={isLoading}
			empty={total === 0}
			height={56}
			aside={<LegendList items={items} total={total} columns={2} />}
		>
			<StackedShareBar items={items} total={total} />
		</ChartCard>
	);
}

/** Ranked horizontal bars, one hue shaded by magnitude. */
function RankedBarsCard({
	icon,
	title,
	description,
	items,
	hue,
	isLoading,
	unit = "Signals",
	max = 10,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	items: DashboardCountItem[];
	hue: string;
	isLoading?: boolean;
	unit?: string;
	max?: number;
}) {
	const data = useMemo(
		() => [...items].filter((i) => i.count > 0).sort((a, b) => b.count - a.count).slice(0, max),
		[items, max]
	);
	const top = data[0]?.count ?? 0;
	const height = Math.max(200, data.length * 28 + 24);
	return (
		<ChartCard icon={icon} title={title} description={description} isLoading={isLoading} empty={data.length === 0} height={height}>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height }}>
				<BarChart data={data} layout="vertical" margin={{ left: 4, right: 40, top: 0, bottom: 0 }} barCategoryGap={6}>
					<CartesianGrid horizontal={false} strokeDasharray="3 3" />
					<XAxis type="number" hide />
					<YAxis
						type="category"
						dataKey="label"
						width={120}
						tickLine={false}
						axisLine={false}
						interval={0}
						tick={{ fontSize: 11 }}
						tickFormatter={(v: string) => truncate(v)}
					/>
					<Tooltip
						cursor={{ fill: "rgba(0,0,0,0.04)" }}
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as DashboardCountItem | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: unit, value: p.count.toLocaleString(), fill: hue }]} />;
						}}
					/>
					<Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
						{data.map((d) => (
							<Cell key={d.key} fill={shade(hue, d.count, top)} />
						))}
						<LabelList dataKey="count" position="right" fontSize={10} className="fill-gray-700" formatter={(v: number) => v.toLocaleString()} />
					</Bar>
				</BarChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Treemap cell: area = signals, shade = magnitude, label when it fits. */
function TreemapCell(props: {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	name?: string;
	size?: number;
	max?: number;
}) {
	const { x = 0, y = 0, width = 0, height = 0, name = "", size = 0, max = 1 } = props;
	if (width <= 0 || height <= 0) return null;
	const fill = shade(BLUE, size, max);
	const dark = size / max > 0.45;
	const showLabel = width > 56 && height > 30;
	return (
		<g>
			<rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} rx={4} fill={fill} />
			{showLabel && (
				<>
					<text x={x + 8} y={y + 16} fontSize={11} fill={dark ? "#fff" : "#111827"} fontWeight={600}>
						{truncate(name, Math.max(4, Math.floor(width / 7)))}
					</text>
					<text x={x + 8} y={y + 30} fontSize={10} fill={dark ? "rgba(255,255,255,0.85)" : "#374151"}>
						{size.toLocaleString()}
					</text>
				</>
			)}
		</g>
	);
}

function DistrictTreemapCard({ summary, isLoading }: PanelProps) {
	const data = useMemo(
		() =>
			(summary?.topDistricts ?? [])
				.filter((d) => d.count > 0)
				.map((d) => ({ name: d.label, size: d.count })),
		[summary?.topDistricts]
	);
	const max = data.reduce((m, d) => Math.max(m, d.size), 0);
	return (
		<ChartCard
			icon={Map}
			title="District share"
			description="The leading districts by signals reported — area and shade both scale with the count."
			isLoading={isLoading}
			empty={data.length === 0}
			height={240}
		>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 240 }}>
				<Treemap data={data} dataKey="size" nameKey="name" aspectRatio={4 / 3} isAnimationActive={false} content={<TreemapCell max={max} />}>
					<Tooltip
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as { name: string; size: number } | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.name} rows={[{ label: "Signals", value: p.size.toLocaleString(), fill: BLUE }]} />;
						}}
					/>
				</Treemap>
			</ChartContainer>
		</ChartCard>
	);
}

/** Donut with a folded tail: sources of signals. */
function SourcesDonutCard({ summary, isLoading }: PanelProps) {
	const slices = useMemo(() => colourItems(foldTail(summary?.sources ?? [], 6)), [summary?.sources]);
	const total = slices.reduce((s, i) => s + i.count, 0);
	return (
		<ChartCard
			icon={Layers}
			title="Signals by source"
			description="Who reported the signals — the six largest sources, the rest folded into Other."
			isLoading={isLoading}
			empty={total === 0}
			height={200}
			aside={<LegendList items={slices} total={total} columns={2} />}
		>
			<ChartContainer config={EMPTY_CONFIG} className="mx-auto w-full" style={{ height: 180 }}>
				<PieChart>
					<Tooltip
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof slices)[number] | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: "Signals", value: `${p.count.toLocaleString()} · ${pct(p.count, total)}`, fill: p.fill }]} />;
						}}
					/>
					<Pie data={slices} dataKey="count" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={2} stroke="#fff">
						{slices.map((s) => (
							<Cell key={s.key} fill={s.fill} />
						))}
					</Pie>
				</PieChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Radial bars: signals by the level they were detected at. */
function DetectionLevelRadialCard({ summary, isLoading }: PanelProps) {
	const items = useMemo(
		() =>
			colourItems(
				[...(summary?.signalLevels ?? [])].filter((i) => i.count > 0).sort((a, b) => b.count - a.count).slice(0, 6)
			),
		[summary?.signalLevels]
	);
	const total = items.reduce((s, i) => s + i.count, 0);
	// Outer ring = largest, so the rings read as a ranking from the outside in.
	const data = items.map((i) => ({ ...i, name: i.label }));
	return (
		<ChartCard
			icon={Users}
			title="Detection level"
			description="Where the signals were first picked up: community, facility, district and above."
			isLoading={isLoading}
			empty={total === 0}
			height={200}
			aside={<LegendList items={items} total={total} columns={2} />}
		>
			<ChartContainer config={EMPTY_CONFIG} className="mx-auto w-full" style={{ height: 180 }}>
				<RadialBarChart data={data} innerRadius="22%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={12}>
					<Tooltip
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: "Signals", value: `${p.count.toLocaleString()} · ${pct(p.count, total)}`, fill: p.fill }]} />;
						}}
					/>
					{/* Each row carries its own `fill`; RadialBar reads it per ring. */}
					<RadialBar dataKey="count" background={{ fill: "#f3f4f6" }} cornerRadius={6} isAnimationActive={false} />
				</RadialBarChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Status-coloured columns: risk level across confirmed events. */
function RiskLevelColumnsCard({ summary, isLoading }: PanelProps) {
	const data = useMemo(() => {
		const order = ["very high", "high", "medium", "low"];
		const fillFor = (label: string) => {
			const l = label.toLowerCase();
			if (l.includes("very")) return STATUS.critical;
			if (l.includes("high")) return STATUS.serious;
			if (l.includes("medium") || l.includes("moderate")) return STATUS.warning;
			if (l.includes("low")) return STATUS.good;
			return NEUTRAL;
		};
		return [...(summary?.riskLevels ?? [])]
			.filter((i) => i.count > 0)
			.sort((a, b) => {
				const ia = order.findIndex((o) => a.label.toLowerCase().startsWith(o));
				const ib = order.findIndex((o) => b.label.toLowerCase().startsWith(o));
				return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
			})
			.map((i) => ({ ...i, fill: fillFor(i.label) }));
	}, [summary?.riskLevels]);
	const total = data.reduce((s, i) => s + i.count, 0);
	return (
		<ChartCard
			icon={Gauge}
			title="Risk levels"
			description="Confirmed events by their assessed risk level, including those not yet assessed."
			isLoading={isLoading}
			empty={total === 0}
			emptyMessage="No confirmed events in scope."
			height={200}
			aside={<LegendList items={data} total={total} columns={2} />}
		>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 180 }}>
				<BarChart data={data} margin={{ left: -16, right: 8, top: 16, bottom: 0 }} barCategoryGap={12}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => truncate(v, 12)} />
					<YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10 }} allowDecimals={false} />
					<Tooltip
						cursor={{ fill: "rgba(0,0,0,0.04)" }}
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
							if (!active || !p) return null;
							return <HoverCard title={p.label} rows={[{ label: "Events", value: `${p.count.toLocaleString()} · ${pct(p.count, total)}`, fill: p.fill }]} />;
						}}
					/>
					<Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
						{data.map((d) => (
							<Cell key={d.key} fill={d.fill} />
						))}
						<LabelList dataKey="count" position="top" fontSize={10} className="fill-gray-700" formatter={(v: number) => v.toLocaleString()} />
					</Bar>
				</BarChart>
			</ChartContainer>
		</ChartCard>
	);
}

/** Age bands as columns with a sex donut beside them — the case profile. */
function CaseProfileCard({ summary, isLoading }: PanelProps) {
	const age = (summary?.age ?? []).filter((i) => i.count > 0);
	const sex = useMemo(() => {
		return (summary?.sex ?? [])
			.filter((i) => i.count > 0)
			.map((i) => {
				const l = i.label.toLowerCase();
				const fill = l.startsWith("m") ? CAT[0] : l.startsWith("f") ? CAT[5] : NEUTRAL;
				return { ...i, fill };
			});
	}, [summary?.sex]);
	const ageTotal = age.reduce((s, i) => s + i.count, 0);
	const sexTotal = sex.reduce((s, i) => s + i.count, 0);
	const ageMax = age.reduce((m, i) => Math.max(m, i.count), 0);
	return (
		<ChartCard
			icon={Stethoscope}
			title="Case profile"
			description="Age bands of the reported cases, with the sex split beside them."
			className="lg:col-span-2"
			isLoading={isLoading}
			empty={ageTotal === 0 && sexTotal === 0}
			emptyMessage="No case demographics recorded in scope."
			height={200}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 190 }}>
						<BarChart data={age} margin={{ left: -16, right: 8, top: 16, bottom: 0 }} barCategoryGap={8}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} />
							<YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10 }} allowDecimals={false} />
							<Tooltip
								cursor={{ fill: "rgba(0,0,0,0.04)" }}
								content={({ active, payload }) => {
									const p = payload?.[0]?.payload as DashboardCountItem | undefined;
									if (!active || !p) return null;
									return <HoverCard title={`Age ${p.label}`} rows={[{ label: "Cases", value: `${p.count.toLocaleString()} · ${pct(p.count, ageTotal)}`, fill: CAT[4] }]} />;
								}}
							/>
							<Bar dataKey="count" radius={[4, 4, 0, 0]}>
								{age.map((d) => (
									<Cell key={d.key} fill={shade(CAT[4], d.count, ageMax)} />
								))}
								<LabelList dataKey="count" position="top" fontSize={10} className="fill-gray-700" formatter={(v: number) => v.toLocaleString()} />
							</Bar>
						</BarChart>
					</ChartContainer>
				</div>
				<div>
					<ChartContainer config={EMPTY_CONFIG} className="mx-auto w-full" style={{ height: 130 }}>
						<PieChart>
							<Tooltip
								content={({ active, payload }) => {
									const p = payload?.[0]?.payload as (typeof sex)[number] | undefined;
									if (!active || !p) return null;
									return <HoverCard title={p.label} rows={[{ label: "Cases", value: `${p.count.toLocaleString()} · ${pct(p.count, sexTotal)}`, fill: p.fill }]} />;
								}}
							/>
							<Pie data={sex} dataKey="count" nameKey="label" innerRadius={34} outerRadius={56} paddingAngle={2} strokeWidth={2} stroke="#fff">
								{sex.map((s) => (
									<Cell key={s.key} fill={s.fill} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<LegendList items={sex} total={sexTotal} columns={1} />
				</div>
			</div>
		</ChartCard>
	);
}

/** Case status (alive / dead / unknown) as a horizontal 100% bar. */
function CaseStatusCard({ summary, isLoading }: PanelProps) {
	const items = useMemo(
		() =>
			(summary?.status ?? [])
				.filter((i) => i.count > 0)
				.map((i) => {
					const l = i.label.toLowerCase();
					const fill = l.includes("alive") ? STATUS.good : l.includes("dead") ? STATUS.critical : isNeutralLabel(i.label) ? NEUTRAL : CAT[0];
					return { ...i, fill };
				}),
		[summary?.status]
	);
	const total = items.reduce((s, i) => s + i.count, 0);
	return (
		<ChartCard
			icon={Cross}
			title="Case status"
			description="Status of the case at the time the signal was reported."
			isLoading={isLoading}
			empty={total === 0}
			height={56}
			aside={<LegendList items={items} total={total} columns={2} />}
		>
			<StackedShareBar items={items} total={total} />
		</ChartCard>
	);
}

/** The charts grid. Two columns on large screens; a few cards span both. */
export const AdminOverviewCharts = memo<PanelProps>(({ summary, isLoading }) => (
	<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<SignalsTrendCard summary={summary} isLoading={isLoading} />
		<WeeklyVolumeCard summary={summary} isLoading={isLoading} />
		<OutcomeDonutCard summary={summary} isLoading={isLoading} />
		<SourcesDonutCard summary={summary} isLoading={isLoading} />
		<TriageOutcomesCard summary={summary} isLoading={isLoading} />
		<VerificationTimelinessCard summary={summary} isLoading={isLoading} />
		<RankedBarsCard
			icon={BarChart3}
			title="Signals by region"
			description="Signals reported, by the official region of the case district."
			items={summary?.reportedByRegion ?? []}
			hue={BLUE}
			isLoading={isLoading}
		/>
		<DistrictTreemapCard summary={summary} isLoading={isLoading} />
		<DetectionLevelRadialCard summary={summary} isLoading={isLoading} />
		<RiskLevelColumnsCard summary={summary} isLoading={isLoading} />
		<RankedBarsCard
			icon={Siren}
			title="Conditions reported"
			description="The diseases and conditions the signals were raised for."
			items={summary?.diseases ?? []}
			hue={RED}
			isLoading={isLoading}
			unit="Alerts"
		/>
		<CaseStatusCard summary={summary} isLoading={isLoading} />
		<CaseProfileCard summary={summary} isLoading={isLoading} />
	</div>
));
AdminOverviewCharts.displayName = "AdminOverviewCharts";
