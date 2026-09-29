"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import {
	Ambulance,
	ArrowRight,
	CalendarRange,
	Clock,
	Copy,
	Cross,
	Eye,
	Files,
	FlaskConical,
	Gauge,
	Layers,
	ListChecks,
	Newspaper,
	Play,
	ShieldCheck,
	Siren,
	Split,
	Timer,
	Workflow,
	type LucideIcon,
} from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	ReferenceLine,
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
import {
	AMBER_INK,
	EMERALD_INK,
	INDIGO_INK,
	ROSE_INK,
	SKY_INK,
	StatCard,
	VIOLET_INK,
} from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";
import {
	buildEbsIndicatorRows,
	buildIndicatorTrend,
	buildWeeklyCascade,
	epiWeekSpanLabel,
	epiWeekTitle,
	percent,
	type EbsIndicatorRow,
	type EbsStage,
	type IndicatorTrendPoint,
	type WeeklyCascadePoint,
} from "@/lib/ebs-indicators";
import { buildSignalFlow, openWorkTotal, type SignalFlowItem } from "@/lib/signal-flow";
import { buildWeeklyBrief, type BriefTone } from "@/lib/weekly-brief";

/**
 * The dashboard board: the weekly brief, headline figures, the signal flow,
 * the weekly chart, one card per indicator and the reporting-unit breakdown.
 *
 * Every figure is a count of the same rows under one reading
 * (services/signal_facts.go), so they nest and reconcile: Alerts ⊆ Risk
 * assessed ⊆ Events ⊆ Verified, and the flow states sum to Signals reported.
 * A proportion indicator is shown as a rate only where its denominator
 * really contains its numerator (lib/ebs-indicators.ts); the week under way
 * is drawn faded everywhere, because a half-finished week always reads as a
 * collapse.
 */

const STAGE_COLOR: Record<EbsStage, string> = {
	detection: "#0066CC",
	triage: "#d97706",
	verification: "#16a34a",
	risk: "#7c3aed",
	response: "#0066CC",
	alert: "#D90000",
};

const STAGE_TEXT: Record<EbsStage, string> = {
	detection: "text-sky-700",
	triage: "text-amber-700",
	verification: "text-emerald-700",
	risk: "text-violet-700",
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

/** Below this many signals in a week, a weekly rate is drawn faded. */
const SMALL_N = 10;
/** Opacity of a bar for the week under way. */
const PARTIAL_OPACITY = 0.35;

function hintFor(row: EbsIndicatorRow): string {
	const parts = [row.definition];
	if (row.kind === "proportion") {
		parts.push(`Numerator: ${row.numeratorLabel}.`, `Denominator: ${row.denominatorLabel}.`);
	}
	if (row.target) parts.push(`${row.target.kpi} target: ${row.target.percent}% or more.`);
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

/* ------------------------------------------------------------------------ */
/* Weekly brief                                                              */
/* ------------------------------------------------------------------------ */

const TONE_DOT: Record<BriefTone, string> = {
	good: "bg-emerald-500",
	watch: "bg-amber-500",
	bad: "bg-red-600",
	neutral: "bg-sky-500",
};

/**
 * The latest complete epi week in five sentences — volume against the prior
 * weeks, triage and risk assessment against their §11 targets, conversion,
 * and the queues open right now. Built from counts the page already has
 * (lib/weekly-brief.ts); hidden when the scope holds no complete week.
 */
export const WeeklyBriefCard = memo<BoardProps & { rangeFrom?: string }>(({ summary, isLoading, rangeFrom }) => {
	const brief = useMemo(() => buildWeeklyBrief(summary, undefined, rangeFrom), [summary, rangeFrom]);
	if (isLoading) return <Skeleton className="h-[132px] w-full" />;
	if (!brief) return null;
	return (
		<Card>
			<CardHeader className="pb-1">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<div className="flex items-center gap-2">
						<Newspaper className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Weekly brief · {brief.title}</CardTitle>
					</div>
					<span className="text-xs text-gray-500">{brief.span}</span>
				</div>
			</CardHeader>
			<CardContent>
				<ul className="grid gap-x-6 gap-y-1 text-[13px] leading-snug md:grid-cols-2">
					{brief.lines.map((line) => (
						<li key={line.key} className="flex items-start gap-2">
							<span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[line.tone])} />
							<span>
								<span className="font-semibold text-gray-900">{line.label}.</span>{" "}
								<span className="text-gray-700">{line.text}</span>
							</span>
						</li>
					))}
				</ul>
				{brief.partialNote && <p className="mt-1.5 text-[11px] text-gray-500">{brief.partialNote}</p>}
			</CardContent>
		</Card>
	);
});
WeeklyBriefCard.displayName = "WeeklyBriefCard";

/* ------------------------------------------------------------------------ */
/* Headline figures                                                          */
/* ------------------------------------------------------------------------ */

/**
 * The pipeline in eight figures, in the order a signal travels. Each count
 * nests inside the one before it — Alerts ⊆ Risk assessed ⊆ Events ⊆
 * Verified — so every caption's percentage is a real share. The two
 * timeliness tiles lead with their RATE, over the signals a clock can judge,
 * because a count of on-time triages grows with volume and says nothing
 * about timeliness.
 */
export const HeadlineStats = memo<BoardProps>(({ summary, isLoading }) => {
	const i = summary?.indicators;
	const reported = i?.signalsReported ?? 0;
	const triaged = i?.signalsTriaged ?? 0;
	const verified = i?.signalsVerified ?? 0;
	const events = i?.events ?? 0;
	const riskAssessed = i?.eventsRiskAssessed ?? 0;
	const alerts = i?.alertsReported ?? 0;
	const open = openWorkTotal(buildSignalFlow(summary?.signalFlow));

	const rows = useMemo(() => buildEbsIndicatorRows(summary), [summary]);
	const triage = rows.find((r) => r.id === "signals-triaged");
	const verify = rows.find((r) => r.id === "signals-verified");
	const timely = (row: EbsIndicatorRow | undefined) => ({
		value: row?.rate === null || row?.rate === undefined ? "—" : `${row.rate}%`,
		sub: row && row.rateBase
			? `${row.numerator.toLocaleString()} of ${row.rateBase.toLocaleString()} timed${row.target ? ` · target ${row.target.percent}%` : ""}`
			: "nothing timed in scope",
	});
	const triageTimely = timely(triage);
	const verifyTimely = timely(verify);

	const cards = [
		{
			title: "Signals reported",
			value: reported.toLocaleString(),
			sub: open > 0 ? `${open.toLocaleString()} still in a working queue` : "none waiting in a queue",
			hint: "Every signal on the register in scope. 'Working queue' = awaiting triage, verification, risk assessment or feedback.",
			icon: Files,
			ink: SKY_INK,
		},
		{
			title: "Triaged",
			value: triaged.toLocaleString(),
			sub: shareText(triaged, reported, "signals reported"),
			hint: "Signals through the triage gate — a decision or priority is recorded, whichever exit it took.",
			icon: ListChecks,
			ink: AMBER_INK,
		},
		{
			title: "Triaged within 24h",
			value: triageTimely.value,
			sub: triageTimely.sub,
			hint: triage ? hintFor(triage) : undefined,
			icon: Timer,
			ink: AMBER_INK,
		},
		{
			title: "Verified",
			value: verified.toLocaleString(),
			sub: shareText(verified, reported, "signals reported"),
			hint: "An outcome is on record and the signal is not escalated to the field — the register's Verified count.",
			icon: ShieldCheck,
			ink: EMERALD_INK,
		},
		{
			title: "Verified within 24h",
			value: verifyTimely.value,
			sub: verifyTimely.sub,
			hint: verify ? hintFor(verify) : undefined,
			icon: Clock,
			ink: EMERALD_INK,
		},
		{
			title: "Events",
			value: events.toLocaleString(),
			sub: shareText(events, verified, "verified signals"),
			hint: "Verified signals whose outcome is Confirmed — the events that require a risk assessment (signal-to-event conversion, KPI 5).",
			icon: Split,
			ink: INDIGO_INK,
		},
		{
			title: "Risk-assessed",
			value: riskAssessed.toLocaleString(),
			sub: `${shareText(riskAssessed, events, "events")} · target 90%`,
			hint: "Confirmed events carrying a risk level. KPI 6: more than 90% of events assessed.",
			icon: Gauge,
			ink: VIOLET_INK,
		},
		{
			title: "Alerts issued",
			value: alerts.toLocaleString(),
			sub: shareText(alerts, riskAssessed, "risk-assessed events"),
			hint: "Confirmed, risk-assessed events whose reporter has been told — exactly the signals on the Alerts page.",
			icon: Siren,
			ink: ROSE_INK,
		},
	];

	return (
		<div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
			{cards.map((c) => (
				<StatCard
					key={c.title}
					title={c.title}
					value={c.value}
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
/* Signal flow                                                               */
/* ------------------------------------------------------------------------ */

const FLOW_GROUP_TITLE: Record<SignalFlowItem["group"], string> = {
	queue: "Working queues",
	issue: "Needs a look",
	exit: "Closed",
	done: "Finished",
};

function FlowRow({ item }: { item: SignalFlowItem }) {
	const body = (
		<>
			<span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
			<span className={cn("min-w-0 flex-1 truncate", item.group === "queue" ? "font-medium text-gray-900" : "text-gray-700")}>
				{item.label}
			</span>
			<span className="shrink-0 tabular-nums font-semibold text-gray-900">{item.count.toLocaleString()}</span>
			<span className="w-10 shrink-0 text-right tabular-nums text-[11px] text-gray-500">{item.share}%</span>
			{item.href ? (
				<ArrowRight className="h-3 w-3 shrink-0 text-gray-400 group-hover:text-uganda-red" />
			) : (
				<span className="w-3 shrink-0" />
			)}
		</>
	);
	const cls = "group flex items-center gap-2 rounded px-1.5 py-1 text-xs";
	return item.href ? (
		<Link href={item.href} title={`${item.hint} Open the list.`} className={cn(cls, "hover:bg-muted/60")}>
			{body}
		</Link>
	) : (
		<div title={item.hint} className={cls}>
			{body}
		</div>
	);
}

/**
 * Where every signal in scope is now. One horizontal bar, one segment per
 * state, summing to the signals reported — then the states grouped as
 * working queues, closed exits and finished alerts, each queue linking to the
 * register list that holds it. This replaces the old cascade, which drew
 * Verified above Triaged because each bar was counted a different way.
 */
export const SignalFlowCard = memo<BoardProps>(({ summary, isLoading }) => {
	const flow = useMemo(() => buildSignalFlow(summary?.signalFlow), [summary?.signalFlow]);
	const total = flow.reduce((s, f) => s + f.count, 0);
	const open = openWorkTotal(flow);
	const groups = (["queue", "issue", "exit", "done"] as const)
		.map((g) => ({ group: g, items: flow.filter((f) => f.group === g && (f.count > 0 || g === "queue")) }))
		.filter((g) => g.items.length > 0);

	// An API older than the flow sends no `signalFlow`: say nothing rather
	// than "No signals in scope", which would be false.
	if (!isLoading && summary && summary.signalFlow === undefined) return null;

	return (
		<Card className="lg:col-span-2">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Workflow className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Where every signal is now</CardTitle>
					</div>
					{total > 0 && (
						<span className="text-xs text-gray-600">
							<span className="font-semibold text-gray-900">{open.toLocaleString()}</span> of{" "}
							{total.toLocaleString()} in a working queue
						</span>
					)}
				</div>
				<CardDescription>
					Each signal sits in exactly one state, furthest step first, so the states add up to the
					signals reported. Click a queue to open its list.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[150px] w-full" />
				) : total === 0 ? (
					<ChartEmpty message="No signals in scope." height={120} />
				) : (
					<>
						<div className="flex h-5 w-full overflow-hidden rounded-md bg-muted" role="img" aria-label="Signals by current state">
							{flow
								.filter((f) => f.count > 0)
								.map((f) => (
									<div
										key={f.key}
										title={`${f.label}: ${f.count.toLocaleString()} (${f.share}%)`}
										className="h-full border-r border-white last:border-r-0"
										style={{
											width: `${(f.count / total) * 100}%`,
											minWidth: 3,
											backgroundColor: f.color,
										}}
									/>
								))}
						</div>
						<div className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-3">
							{groups.map((g) => (
								<div key={g.group} className="min-w-0">
									<p className="mb-0.5 px-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
										{FLOW_GROUP_TITLE[g.group]}
									</p>
									{g.items.map((item) => (
										<FlowRow key={item.key} item={item} />
									))}
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
});
SignalFlowCard.displayName = "SignalFlowCard";

/* ------------------------------------------------------------------------ */
/* Weekly signals                                                            */
/* ------------------------------------------------------------------------ */

const WEEKLY_SERIES = [
	{ key: "reported", label: "Reported", color: "#93c5fd", size: "92%" },
	{ key: "verified", label: "Verified", color: "#16a34a", size: "66%" },
	{ key: "events", label: "Events", color: "#7c3aed", size: "42%" },
	{ key: "alerts", label: "Alerts issued", color: "#D90000", size: "20%" },
] as const;

function WeeklyTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeeklyCascadePoint }[] }) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	const [year, w] = p.week.split("-W");
	return (
		<div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
			<p className="font-medium text-gray-900">
				{epiWeekTitle({ weekNo: Number(w), year: Number(year), start: p.start, end: p.end })}
			</p>
			{p.partial && <p className="text-[11px] text-amber-700">Week in progress — still filling.</p>}
			<div className="mt-1 space-y-0.5">
				{WEEKLY_SERIES.map((s) => (
					<div key={s.key} className="flex items-center justify-between gap-4">
						<span className="inline-flex items-center gap-1.5 text-gray-600">
							<span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
							{s.label}
						</span>
						<span className="tabular-nums font-semibold text-gray-900">{p[s.key].toLocaleString()}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Signals per epi week with the later stages drawn INSIDE the earlier ones —
 * verified inside reported, events inside verified, alerts inside events.
 * They nest by construction, so one bar per week shows both the volume and
 * how far it got, where four bars side by side showed four unrelated
 * heights. The week under way is faded.
 */
export const WeeklySignalsCard = memo<BoardProps>(({ summary, isLoading }) => {
	const data = useMemo(() => buildWeeklyCascade(summary), [summary]);
	const span = epiWeekSpanLabel(summary);
	const config: ChartConfig = Object.fromEntries(
		WEEKLY_SERIES.map((s) => [s.key, { label: s.label, color: s.color }])
	);

	return (
		// Full width: up to 52 epi weeks need the room, and it keeps the
		// indicator cards below in whole rows of two.
		<Card className="lg:col-span-2">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CalendarRange className="h-4 w-4 text-uganda-red" />
						<CardTitle className="text-base">Signals by epi week</CardTitle>
					</div>
					<span className="text-xs text-gray-500">{span}</span>
				</div>
				<CardDescription>
					How far each week&apos;s signals got: verified, confirmed and issued drawn inside the
					reported bar. Recent weeks are still being worked.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[260px] w-full" />
				) : data.length === 0 ? (
					<ChartEmpty message="No dated signals in scope." height={260} />
				) : (
					<ChartContainer config={config} className="w-full" style={{ height: 260 }}>
						<BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="12%">
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							{WEEKLY_SERIES.map((s, idx) => (
								<XAxis
									key={s.key}
									xAxisId={s.key}
									dataKey="label"
									hide={idx > 0}
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval={weekTickInterval(data.length, 13)}
								/>
							))}
							<YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
							<Tooltip content={<WeeklyTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
							{WEEKLY_SERIES.map((s) => (
								<Bar
									key={s.key}
									xAxisId={s.key}
									dataKey={s.key}
									fill={s.color}
									barSize={s.size}
									radius={[2, 2, 0, 0]}
									isAnimationActive={false}
								>
									{data.map((p) => (
										<Cell key={p.week} fillOpacity={p.partial ? PARTIAL_OPACITY : 1} />
									))}
								</Bar>
							))}
						</BarChart>
					</ChartContainer>
				)}
				{data.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
						{WEEKLY_SERIES.map((s) => (
							<span key={s.key} className="inline-flex items-center gap-1.5">
								<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
								{s.label}
							</span>
						))}
						{data.some((p) => p.partial) && (
							<span className="inline-flex items-center gap-1.5 text-gray-500">
								<span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-300/40" />
								Faded = week in progress
							</span>
						)}
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

function TrendTooltip({
	active,
	payload,
	row,
}: {
	active?: boolean;
	payload?: { payload: IndicatorTrendPoint }[];
	row: EbsIndicatorRow;
}) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	return (
		<div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
			<p className="font-medium text-gray-900">{epiWeekTitle(p)}</p>
			{p.partial && <p className="text-[11px] text-amber-700">Week in progress.</p>}
			{row.rateBase !== null ? (
				<p className="mt-0.5 tabular-nums text-gray-700">
					<span className="font-semibold text-gray-900">{p.rate === null ? "—" : `${p.rate}%`}</span>{" "}
					· {p.numerator.toLocaleString()} of {(p.rateBase ?? 0).toLocaleString()}
					{p.rateBase !== null && p.rateBase > 0 && p.rateBase < SMALL_N && (
						<span className="block text-[11px] text-gray-500">Few signals — read with care.</span>
					)}
				</p>
			) : (
				<p className="mt-0.5 tabular-nums text-gray-700">
					<span className="font-semibold text-gray-900">{p.value.toLocaleString()}</span> {row.unit}
				</p>
			)}
		</div>
	);
}

const TREND_HEIGHT = 180;

/**
 * One indicator. A rate row plots its weekly RATE against a 0–100% axis with
 * the §11 target drawn in, weeks resting on few signals faded; a count row
 * plots weekly counts. The headline is the rate (or count) for the whole
 * scope, and the caption says what it is made of.
 */
const IndicatorTrendCard = memo<{ row: EbsIndicatorRow; points: IndicatorTrendPoint[]; isLoading?: boolean }>(
	({ row, points, isLoading }) => {
		const Icon = INDICATOR_ICONS[row.id] ?? Files;
		const color = STAGE_COLOR[row.stage];
		const isRate = row.rateBase !== null;
		const config: ChartConfig = { value: { label: row.label, color } };
		const data = points.map((p) => ({ ...p, plotted: isRate ? p.rate : p.value }));
		const hasData = data.some((p) => (p.plotted ?? 0) > 0);

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
							{!isLoading && row.target && row.rate !== null && (
								<span
									className={cn(
										"mt-0.5 inline-block rounded px-1 text-[10px] font-medium leading-4",
										row.status === "met" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
									)}
								>
									{row.status === "met" ? "meets" : "below"} {row.target.percent}% target
								</span>
							)}
						</div>
					</div>
					<CardDescription className="truncate text-[11px]">
						{row.caption}
						{row.gap && ` · ${row.gap.count.toLocaleString()} ${row.gap.label}`}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					{isLoading ? (
						<Skeleton className="w-full" style={{ height: TREND_HEIGHT }} />
					) : data.length === 0 || !hasData ? (
						<ChartEmpty
							message={data.length === 0 ? "No dated signals in scope." : "Nothing recorded for this indicator yet."}
							height={TREND_HEIGHT}
						/>
					) : (
						<ChartContainer config={config} className="w-full" style={{ height: TREND_HEIGHT }}>
							<BarChart data={data} margin={{ left: isRate ? -2 : -8, right: 4, top: 10, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tick={{ fontSize: 10 }}
									interval={weekTickInterval(data.length, 9)}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={isRate ? 40 : 36}
									tick={{ fontSize: 10 }}
									allowDecimals={false}
									domain={isRate ? [0, 100] : undefined}
									ticks={isRate ? [0, 50, 100] : undefined}
									tickFormatter={isRate ? (v: number) => `${v}%` : undefined}
								/>
								<Tooltip content={<TrendTooltip row={row} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								{isRate && row.target && (
									<ReferenceLine
										y={row.target.percent}
										stroke="#6b7280"
										strokeDasharray="4 3"
										label={{ value: `target ${row.target.percent}%`, position: "insideTopRight", fontSize: 9, fill: "#6b7280" }}
									/>
								)}
								<Bar dataKey="plotted" fill="var(--color-value)" radius={[2, 2, 0, 0]} isAnimationActive={false}>
									{data.map((p) => (
										<Cell
											key={p.week}
											fillOpacity={
												p.partial || (isRate && p.rateBase !== null && p.rateBase < SMALL_N) ? PARTIAL_OPACITY : 1
											}
										/>
									))}
									{data.length <= 16 && (
										<LabelList
											dataKey="plotted"
											position="top"
											fontSize={10}
											className="fill-muted-foreground"
											formatter={(v: number | null) => (v === null || v === undefined ? "" : isRate ? `${v}%` : v)}
										/>
									)}
								</Bar>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		);
	}
);
IndicatorTrendCard.displayName = "IndicatorTrendCard";

/** The two indicators the page leads with, ahead of every other graph. */
const LEAD_INDICATOR_IDS: readonly string[] = ["signals-triaged", "signals-verified"];

/**
 * The twelve indicators as trend cards, in table order. Renders the cards
 * only (no grid of its own) so the page can lay them out in the same
 * two-column grid as the other charts.
 *
 * `select` splits the set so the page can put the lead indicators first and
 * the remaining ten back in their usual place: "lead" renders the timeliness
 * pair, "rest" everything else, "all" (the default) the full table.
 */
export const IndicatorTrendCards = memo<BoardProps & { select?: "all" | "lead" | "rest" }>(
	({ summary, isLoading, select = "all" }) => {
		const rows = useMemo(() => {
			const all = buildEbsIndicatorRows(summary);
			if (select === "lead") {
				return LEAD_INDICATOR_IDS.map((id) => all.find((r) => r.id === id)).filter(
					(r): r is (typeof all)[number] => r !== undefined
				);
			}
			if (select === "rest") return all.filter((r) => !LEAD_INDICATOR_IDS.includes(r.id));
			return all;
		}, [summary, select]);
		const trends = useMemo(
			() => new Map(rows.map((r) => [r.id, buildIndicatorTrend(summary, r.id)])),
			[rows, summary]
		);

		return (
			<>
				{rows.map((row) => (
					<IndicatorTrendCard key={row.id} row={row} points={trends.get(row.id) ?? []} isLoading={isLoading} />
				))}
			</>
		);
	}
);
IndicatorTrendCards.displayName = "IndicatorTrendCards";

/* ------------------------------------------------------------------------ */
/* Reporting units                                                           */
/* ------------------------------------------------------------------------ */

/** Buckets that say the value is missing rather than naming a place/level. */
function isMissingBucket(label: string): boolean {
	return /^(unknown|not recorded|transport recorded, level not)$/i.test(label.trim());
}

/** How a missing bucket reads in the footnote under a list. */
function missingPhrase(label: string): string {
	switch (label.trim().toLowerCase()) {
		case "transport recorded, level not":
			return "only a transport (SMS, call, eCHIS) recorded";
		case "not recorded":
			return "no source recorded";
		default:
			return "not recorded";
	}
}

function UnitList({
	title,
	items,
	total,
	emptyMessage,
	describeMissing = missingPhrase,
}: {
	title: string;
	items: DashboardCountItem[];
	total: number;
	emptyMessage: string;
	/** How the footnote names each missing bucket. */
	describeMissing?: (label: string) => string;
}) {
	// Named units first, largest first; the "missing" buckets last and grey,
	// so the biggest bar is never "Unknown" by accident of sorting.
	const named = items.filter((i) => !isMissingBucket(i.label));
	const missing = items.filter((i) => isMissingBucket(i.label));
	const max = Math.max(...named.map((i) => i.count), 1);
	const missingTotal = missing.reduce((s, i) => s + i.count, 0);
	return (
		<div className="min-w-0">
			<p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
			{items.length === 0 ? (
				<p className="text-xs text-muted-foreground">{emptyMessage}</p>
			) : (
				<ul className="space-y-1.5">
					{named.map((item, i) => (
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
								<div className="h-1.5 rounded-full bg-uganda-red/80" style={{ width: `${(item.count / max) * 100}%` }} />
							</div>
						</li>
					))}
					{missingTotal > 0 && (
						<li className="pt-0.5 text-[11px] leading-snug text-gray-500">
							+ {missingTotal.toLocaleString()}
							{total > 0 && ` (${Math.round((missingTotal / total) * 100)}%)`} not attributable:{" "}
							{missing.map((m) => `${m.count.toLocaleString()} ${describeMissing(m.label)}`).join(", ")}.
						</li>
					)}
				</ul>
			)}
		</div>
	);
}

/** Signals reported by reporting unit: detection level, region and district. */
export const ReportingUnitsCard = memo<BoardProps>(({ summary, isLoading }) => {
	const total = summary?.indicators?.signalsReported ?? 0;
	const levels = (summary?.signalLevels ?? []).filter((l) => l.count > 0);
	const regions = summary?.reportedByRegion ?? [];
	const topRegions = [
		...regions.filter((r) => !isMissingBucket(r.label)).slice(0, 8),
		...regions.filter((r) => isMissingBucket(r.label)),
	];
	const districts = summary?.topDistricts ?? [];

	return (
		// Last card on the board: spans both columns so it fills the row.
		<Card className="lg:col-span-2">
			<CardHeader>
				<div className="flex items-center gap-2">
					<Layers className="h-4 w-4 text-uganda-red" />
					<CardTitle className="text-base">Signals by reporting unit</CardTitle>
				</div>
				<CardDescription>
					Where the {total.toLocaleString()} signals in scope were detected — by level, region and
					district. Signals whose record names no place or level are counted beneath each list, not
					ranked among them.
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
						<UnitList title="By detection level" items={levels} total={total} emptyMessage="No detection level recorded." />
						<UnitList
							title="By region"
							items={topRegions}
							total={total}
							emptyMessage="No region could be resolved."
							describeMissing={() => "with a district that matches no region"}
						/>
						<UnitList
							title="By district (top 8)"
							items={districts}
							total={total}
							emptyMessage="No district recorded."
							describeMissing={() => "with no district recorded"}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
});
ReportingUnitsCard.displayName = "ReportingUnitsCard";
