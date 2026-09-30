"use client";

import { memo, useMemo, type ReactNode } from "react";
import {
	Activity,
	BarChart3,
	ClipboardCheck,
	Cross,
	Gauge,
	Layers,
	ListChecks,
	Map,
	MessageSquareReply,
	Siren,
	Stethoscope,
	Timer,
	Users,
	type LucideIcon,
} from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Pie,
	PieChart,
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
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ChartSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";
import { buildCompleteness, isMissingLabel, splitMissing } from "@/lib/data-completeness";

/**
 * The Reports → Overview tab: how complete the record is, then the
 * breakdowns the dashboard does not carry — when, what, where, who reported,
 * how each gate closed, risk levels and the case profile. The dashboard owns
 * the pipeline figures (headline tiles, weekly volume, where signals are
 * now); repeating them here only gave the reader two places to compare.
 *
 * Every number comes from the one scoped GET /dashboard/summary payload, so
 * the charts reconcile with each other and with the dashboard.
 *
 * Ranked bars, not donuts, radial rings or treemaps: a length is read more
 * accurately than an angle or an area, and a ranking is the question each
 * of these answers. Buckets that record a MISSING value ("Unknown", "Not
 * recorded", "Unspecified") are never ranked among real values — a bar
 * reading "Unspecified" at the top of "Conditions reported" says nothing
 * about conditions. They are counted in a footnote under each chart and in
 * the completeness panel at the top of the tab.
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
	return isMissingLabel(label) || /not assessed|other|n\/a|untriaged|awaiting/i.test(label);
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

/**
 * How complete the record is, field by field — the question to ask before
 * reading any breakdown below. Each meter is the share of signals in scope
 * carrying a usable value; the missing remainder is what every chart on this
 * tab leaves out of its ranking. Green from 90%, amber from 70%, red below.
 */
export const DataCompletenessPanel = memo<PanelProps>(({ summary, isLoading }) => {
	const fields = useMemo(() => buildCompleteness(summary), [summary]);
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<ClipboardCheck className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">How complete is the record?</CardTitle>
				</div>
				<CardDescription className="text-[11px]">
					Share of the {(summary?.total ?? 0).toLocaleString()} signals in scope with a usable value in
					each field. What is missing here is left out of the rankings below, not guessed.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[88px] w-full" />
				) : (
					<ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
						{fields.map((f) => {
							const tone =
								f.percent === null ? null : f.percent >= 90 ? "good" : f.percent >= 70 ? "watch" : "bad";
							return (
								<li key={f.key} title={f.hint} className="min-w-0">
									<div className="flex items-baseline justify-between gap-2 text-xs">
										<span className="truncate text-gray-700">{f.label}</span>
										<span
											className={cn(
												"shrink-0 font-semibold tabular-nums",
												tone === null && "text-gray-400",
												tone === "good" && "text-emerald-700",
												tone === "watch" && "text-amber-700",
												tone === "bad" && "text-red-700"
											)}
										>
											{f.percent === null ? "—" : `${f.percent}%`}
										</span>
									</div>
									<div className="mt-0.5 h-1.5 rounded-full bg-muted">
										<div
											className={cn(
												"h-1.5 rounded-full",
												tone === "good" && "bg-emerald-500",
												tone === "watch" && "bg-amber-500",
												tone === "bad" && "bg-red-500"
											)}
											style={{ width: `${f.percent ?? 0}%` }}
										/>
									</div>
									<p className="mt-0.5 truncate text-[10px] text-gray-500">
										{f.missing > 0 ? `${f.missing.toLocaleString()} ${f.missingLabel}` : "none missing"}
									</p>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
});
DataCompletenessPanel.displayName = "DataCompletenessPanel";

/* ------------------------------------------------------------------------ */
/* Charts                                                                    */
/* ------------------------------------------------------------------------ */

/** Whether a timeline period ("2026-09" or "2026-09-29") is still under way. */
function isCurrentPeriod(period: string): boolean {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
	return period === month || period === `${month}-${pad(d.getDate())}`;
}

/**
 * Signals over time — one bar per month (or day, for short ranges). The
 * period still under way is faded and labelled: a half-finished month drawn
 * at full strength always reads as a collapse.
 */
function SignalsTrendCard({ summary, isLoading }: PanelProps) {
	const data = useMemo(
		() => (summary?.timeline ?? []).map((p) => ({ ...p, partial: isCurrentPeriod(p.period) })),
		[summary?.timeline]
	);
	const unit = summary?.granularity === "monthly" ? "month" : "day";
	const n = data.length;
	return (
		<ChartCard
			icon={Activity}
			title="Signals over time"
			description={`Signals reported per ${unit}. The ${unit} in progress is faded.`}
			className="lg:col-span-2"
			isLoading={isLoading}
			empty={n === 0}
			emptyMessage="No dated signals in scope."
			height={220}
		>
			<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 220 }}>
				<BarChart data={data} margin={{ left: -8, right: 8, top: 16, bottom: 0 }} barCategoryGap="18%">
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tick={{ fontSize: 10 }}
						interval={n <= 14 ? 0 : Math.ceil(n / 14) - 1}
					/>
					<YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10 }} allowDecimals={false} />
					<Tooltip
						cursor={{ fill: "rgba(0,0,0,0.04)" }}
						content={({ active, payload }) => {
							const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
							if (!active || !p) return null;
							return (
								<HoverCard
									title={p.partial ? `${p.label} (in progress)` : p.label}
									rows={[{ label: "Signals", value: p.count.toLocaleString(), fill: BLUE }]}
								/>
							);
						}}
					/>
					<Bar dataKey="count" fill={BLUE} radius={[3, 3, 0, 0]} isAnimationActive={false}>
						{data.map((p) => (
							<Cell key={p.period} fillOpacity={p.partial ? 0.35 : 1} />
						))}
						{n <= 16 && (
							<LabelList dataKey="count" position="top" fontSize={10} className="fill-gray-700" formatter={(v: number) => v.toLocaleString()} />
						)}
					</Bar>
				</BarChart>
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
	const verifiedAll = (sla?.verifiedWithinDeadline ?? 0) + (sla?.verifiedLate ?? 0);
	const kpi4 = share(sla?.verifiedWithinDeadline ?? 0, verifiedAll);
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
			title="Verification timeliness (KPI 4)"
			description={`Against each signal's priority deadline (12h High, 24h Medium, 48h Low). ${
				kpi4 === null ? "Nothing verified in scope." : `${kpi4}% of verified signals met it — target 80%.`
			}`}
			isLoading={isLoading}
			empty={total === 0}
			height={56}
			aside={<LegendList items={items} total={total} columns={2} />}
		>
			<StackedShareBar items={items} total={total} />
		</ChartCard>
	);
}

/**
 * Ranked horizontal bars, one hue shaded by magnitude. Buckets recording a
 * missing value are pulled out of the ranking into a footnote with their
 * share, so the longest bar is always a real place, source or condition.
 */
function RankedBarsCard({
	icon,
	title,
	description,
	items,
	hue,
	isLoading,
	unit = "Signals",
	max = 10,
	className,
	missingNoun = "not recorded",
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	items: DashboardCountItem[];
	hue: string;
	isLoading?: boolean;
	unit?: string;
	max?: number;
	className?: string;
	/** How the footnote names the missing remainder. */
	missingNoun?: string;
}) {
	const { named, missing } = useMemo(() => splitMissing(items), [items]);
	const data = useMemo(
		() => named.filter((i) => i.count > 0).sort((a, b) => b.count - a.count).slice(0, max),
		[named, max]
	);
	const all = items.reduce((s, i) => s + i.count, 0);
	const top = data[0]?.count ?? 0;
	const height = Math.max(160, data.length * 26 + 16);
	return (
		<ChartCard
			icon={icon}
			title={title}
			description={description}
			className={className}
			isLoading={isLoading}
			empty={data.length === 0}
			emptyMessage={missing > 0 ? `All ${missing.toLocaleString()} signals in scope are ${missingNoun}.` : undefined}
			height={height}
			aside={
				missing > 0 ? (
					<p className="mt-1 text-[11px] text-gray-500">
						+ {missing.toLocaleString()} {missingNoun}
						{all > 0 && ` (${pct(missing, all)} of signals)`} — not ranked.
					</p>
				) : undefined
			}
		>
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

/**
 * KPI 10 — were reporters told what happened to their signal? Over the
 * signals that reached a conclusion (confirmed or discarded); a signal still
 * open owes nothing yet. Target: more than 80%.
 */
function FeedbackCard({ summary, isLoading }: PanelProps) {
	const due = summary?.feedbackDue ?? 0;
	const given = summary?.feedbackGiven ?? 0;
	const rate = share(given, due);
	const items = [
		{ key: "given", label: "Reporter told", count: given, fill: STATUS.good },
		{ key: "pending", label: "Not yet told", count: Math.max(0, due - given), fill: STATUS.warning },
	].filter((i) => i.count > 0);
	return (
		<ChartCard
			icon={MessageSquareReply}
			title="Feedback to reporters (KPI 10)"
			description={
				rate === null
					? "No signal in scope has reached a conclusion yet."
					: `${rate}% of the ${due.toLocaleString()} concluded signals (confirmed or discarded) had their reporter told — target 80%.`
			}
			isLoading={isLoading}
			empty={due === 0}
			emptyMessage="No concluded signals in scope."
			height={56}
			aside={<LegendList items={items} total={due} columns={2} />}
		>
			<StackedShareBar items={items} total={due} />
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
				<BarChart data={data} margin={{ left: -4, right: 8, top: 16, bottom: 0 }} barCategoryGap={12}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => truncate(v, 12)} />
					<YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10 }} allowDecimals={false} />
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
	const ageSplit = splitMissing(summary?.age ?? []);
	const age = ageSplit.named.filter((i) => i.count > 0);
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
			description={`Age bands of the reported cases, with the sex split beside them.${
				ageSplit.missing > 0 ? ` ${ageSplit.missing.toLocaleString()} cases with no age recorded are not drawn.` : ""
			}`}
			className="lg:col-span-2"
			isLoading={isLoading}
			empty={ageTotal === 0 && sexTotal === 0}
			emptyMessage="No case demographics recorded in scope."
			height={200}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<ChartContainer config={EMPTY_CONFIG} className="w-full" style={{ height: 190 }}>
						<BarChart data={age} margin={{ left: -4, right: 8, top: 16, bottom: 0 }} barCategoryGap={8}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} />
							<YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10 }} allowDecimals={false} />
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
		<RankedBarsCard
			icon={Siren}
			title="Conditions reported"
			description="The suspected disease or condition each signal was raised for."
			items={summary?.diseases ?? []}
			hue={RED}
			isLoading={isLoading}
			missingNoun="with no disease recorded"
		/>
		<RankedBarsCard
			icon={BarChart3}
			title="Signals by region"
			description="By the official region of the case district."
			items={summary?.reportedByRegion ?? []}
			hue={BLUE}
			isLoading={isLoading}
			max={16}
			missingNoun="with a district that maps to no region"
		/>
		<RankedBarsCard
			icon={Map}
			title="Leading districts"
			description="The districts reporting the most signals."
			items={summary?.topDistricts ?? []}
			hue={BLUE}
			isLoading={isLoading}
			missingNoun="with no district recorded"
		/>
		<RankedBarsCard
			icon={Layers}
			title="Signals by source"
			description="Who reported the signal, as recorded at intake."
			items={summary?.sources ?? []}
			hue={CAT[4]}
			isLoading={isLoading}
		/>
		<RankedBarsCard
			icon={Users}
			title="Detection level (KPI 1)"
			description="The level the signal was detected at. A transport (SMS 6767, a call, eCHIS) says how it travelled, not where it was found, so it is not guessed into a level."
			items={summary?.signalLevels ?? []}
			hue={CAT[3]}
			isLoading={isLoading}
			missingNoun="with only a transport or nothing recorded"
		/>
		<TriageOutcomesCard summary={summary} isLoading={isLoading} />
		<VerificationTimelinessCard summary={summary} isLoading={isLoading} />
		<RiskLevelColumnsCard summary={summary} isLoading={isLoading} />
		<FeedbackCard summary={summary} isLoading={isLoading} />
		<CaseStatusCard summary={summary} isLoading={isLoading} />
		<CaseProfileCard summary={summary} isLoading={isLoading} />
	</div>
));
AdminOverviewCharts.displayName = "AdminOverviewCharts";
