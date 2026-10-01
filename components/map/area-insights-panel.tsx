"use client";

import { useMemo, useRef, useState } from "react";
import {
	Activity,
	Building2,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	Filter,
	Loader2,
	X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { alertResponse } from "@/constants";
import { altCode } from "@/lib/alt-code";
import { deriveAlertOutcome } from "@/lib/alert-outcome";
import { formatTimeAgo } from "@/lib/format-date";
import type { GeoInsights } from "@/lib/fetch-geo";
import { formatTrend, type Trend, type TrendText } from "@/lib/geo-map-analytics";
import type { Alert } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface InsightChildRow {
	uid: string;
	name: string;
	count: number;
	trend: Trend | undefined;
}

const RESPONSE_CODES = new Map(alertResponse.map((r) => [r.code, r.name]));

/** Display name for a condition row: the form's label when the value is a known code. */
function conditionName(label: string, value?: string): string {
	return (value && RESPONSE_CODES.get(value)) || label;
}

function TrendChip({ trend, className }: { trend: Trend | undefined | null; className?: string }) {
	if (!trend || trend.cls === "none") return null;
	const text = formatTrend(trend);
	const tone =
		trend.delta > 0
			? "bg-red-50 text-red-700 ring-red-200"
			: trend.delta < 0
				? "bg-blue-50 text-blue-700 ring-blue-200"
				: "bg-gray-50 text-gray-600 ring-gray-200";
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-1 rounded px-1 py-px text-[10px] font-semibold tabular-nums ring-1 ring-inset",
				tone,
				className
			)}
		>
			{trend.hotspot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />}
			{text}
		</span>
	);
}

function Section({
	title,
	children,
	aside,
}: {
	title: string;
	children: React.ReactNode;
	aside?: React.ReactNode;
}) {
	return (
		<section className="space-y-1.5">
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h3>
				{aside}
			</div>
			{children}
		</section>
	);
}

/** A tiny area chart of the area's signals per timeline frame. */
function Sparkline({
	values,
	labels,
	active,
	onSelect,
}: {
	values: number[];
	labels: string[];
	active: number | null;
	onSelect: (index: number) => void;
}) {
	const ref = useRef<SVGSVGElement>(null);
	const [hover, setHover] = useState<number | null>(null);
	const W = 280;
	const H = 44;
	const n = values.length;
	const max = Math.max(1, ...values);
	const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
	const y = (v: number) => H - 2 - (v / max) * (H - 6);
	const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
	const area = n > 0 ? `${line}L${x(n - 1).toFixed(1)} ${H}L${x(0).toFixed(1)} ${H}Z` : "";
	const indexAt = (clientX: number) => {
		const rect = ref.current?.getBoundingClientRect();
		if (!rect || n === 0) return null;
		const t = (clientX - rect.left) / rect.width;
		return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
	};
	const shown = hover ?? active;
	const peak = values.indexOf(Math.max(...values));

	return (
		<div>
			<svg
				ref={ref}
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="none"
				className="h-11 w-full cursor-pointer"
				onMouseMove={(e) => setHover(indexAt(e.clientX))}
				onMouseLeave={() => setHover(null)}
				onClick={(e) => {
					const i = indexAt(e.clientX);
					if (i !== null) onSelect(i);
				}}
				role="img"
				aria-label="Signals over time in this area"
			>
				<path d={area} className="fill-uganda-red/15" />
				<path d={line} fill="none" className="stroke-uganda-red" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
				{shown !== null && n > 0 && (
					<line
						x1={x(shown)}
						x2={x(shown)}
						y1={0}
						y2={H}
						className={hover !== null ? "stroke-gray-500" : "stroke-gray-900"}
						strokeWidth={1}
						strokeDasharray={hover !== null ? "2 2" : undefined}
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</svg>
			<div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
				<span>{labels[0]}</span>
				<span className="truncate font-medium text-gray-700">
					{shown !== null && n > 0
						? `${labels[shown]}: ${values[shown].toLocaleString()}`
						: n > 0
							? `Peak ${labels[peak]}: ${values[peak].toLocaleString()}`
							: ""}
				</span>
				<span>{labels[n - 1]}</span>
			</div>
		</div>
	);
}

/** Horizontal bar row; clickable when `onClick` is given. */
function BarRow({
	label,
	count,
	max,
	total,
	selected,
	onClick,
	onHover,
	trailing,
	title,
}: {
	label: string;
	count: number;
	max: number;
	total?: number;
	selected?: boolean;
	onClick?: () => void;
	onHover?: (on: boolean) => void;
	trailing?: React.ReactNode;
	title?: string;
}) {
	const body = (
		<>
			<div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
				<span className="flex min-w-0 items-center gap-1 truncate">
					{selected !== undefined && (
						<span
							className={cn(
								"flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border",
								selected ? "border-uganda-red bg-uganda-red text-white" : "border-gray-300"
							)}
						>
							{selected && <Check className="h-2.5 w-2.5" />}
						</span>
					)}
					<span className="truncate">{label}</span>
				</span>
				<span className="flex shrink-0 items-center gap-1.5">
					{trailing}
					<span className="font-semibold tabular-nums">
						{count.toLocaleString()}
						{total ? (
							<span className="ml-1 font-normal text-muted-foreground">
								({Math.round((count / total) * 100)}%)
							</span>
						) : null}
					</span>
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full", selected === false ? "bg-uganda-red/60" : "bg-uganda-red")}
					style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
				/>
			</div>
		</>
	);
	if (!onClick) return <div title={title}>{body}</div>;
	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => onHover?.(true)}
			onMouseLeave={() => onHover?.(false)}
			onFocus={() => onHover?.(true)}
			onBlur={() => onHover?.(false)}
			title={title}
			className="-mx-1 block w-[calc(100%+0.5rem)] rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
		>
			{body}
		</button>
	);
}

function ShowMore({
	expanded,
	onToggle,
	hidden,
}: {
	expanded: boolean;
	onToggle: () => void;
	hidden: number;
}) {
	if (hidden <= 0 && !expanded) return null;
	return (
		<button
			type="button"
			onClick={onToggle}
			className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-uganda-red"
		>
			{expanded ? (
				<>
					<ChevronUp className="h-3 w-3" /> Show fewer
				</>
			) : (
				<>
					<ChevronDown className="h-3 w-3" /> Show {hidden} more
				</>
			)}
		</button>
	);
}

export interface AreaInsightsPanelProps {
	className?: string;
	areaName: string;
	areaKind: "Country" | "Region" | "District";
	/** The area's count as the map shows it (the frame's, when the timeline is on). */
	total: number;
	/** The timeline frame being shown, or null for the whole selected period. */
	frameLabel: string | null;
	trend: Trend | null;
	trendText: TrendText;
	share: { pct: number; of: string } | null;
	rank: { rank: number; of: number; noun: string } | null;
	spark: { values: number[]; labels: string[]; active: number | null } | null;
	onSparkSelect: (index: number) => void;
	childNoun: string;
	rows: InsightChildRow[];
	onRowHover: (uid: string | null) => void;
	onRowClick: (uid: string) => void;
	insights: GeoInsights | undefined;
	insightsLoading: boolean;
	insightsError?: Error;
	selectedResponses: string[];
	selectedOutcomes: string[];
	onToggleResponse: (value: string) => void;
	onToggleOutcome: (value: string) => void;
	onOpenAlert: (alert: Alert) => void;
	onClose: () => void;
}

/**
 * The map's companion panel. It always describes the area the map is showing
 * — Uganda, the open region, or the open district — and updates as you drill:
 * its count and trend, how it ranks, a sparkline of its signals over time,
 * how far the EBS pipeline has carried them, the child areas ranked (hover to
 * outline one on the map, click to open it), what the signals are and how
 * they were verified (click a row to filter the map by it), the health
 * facilities there, and its latest signals.
 */
export function AreaInsightsPanel(props: AreaInsightsPanelProps) {
	const {
		className,
		areaName,
		areaKind,
		total,
		frameLabel,
		trend,
		trendText,
		share,
		rank,
		spark,
		onSparkSelect,
		childNoun,
		rows,
		onRowHover,
		onRowClick,
		insights,
		insightsLoading,
		insightsError,
		selectedResponses,
		selectedOutcomes,
		onToggleResponse,
		onToggleOutcome,
		onOpenAlert,
		onClose,
	} = props;
	const [allRows, setAllRows] = useState(false);
	const [allConditions, setAllConditions] = useState(false);

	const ranked = useMemo(
		() =>
			rows
				.filter((r) => r.count > 0)
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
		[rows]
	);
	const rowsShown = allRows ? ranked : ranked.slice(0, 8);
	const rowMax = ranked[0]?.count ?? 0;
	const risingCount = ranked.filter((r) => r.trend?.hotspot).length;

	const conditions = insights?.responses ?? [];
	const conditionsShown = allConditions ? conditions : conditions.slice(0, 6);
	const conditionMax = conditions[0]?.count ?? 0;
	// Raw response value → canonical label, so "EbolaVirusDisease" reads "Ebola (EVD)".
	const labelOfResponse = useMemo(() => {
		const m = new Map<string, string>();
		for (const r of insights?.responses ?? []) if (r.value) m.set(r.value, r.label);
		return m;
	}, [insights]);
	const outcomes = insights?.outcomes ?? [];
	const outcomeMax = outcomes[0]?.count ?? 0;
	const pipelineTotal = insights?.total ?? 0;
	const selResponses = new Set(selectedResponses);
	const selOutcomes = new Set(selectedOutcomes);
	const periodNote = frameLabel ? "whole selected period" : null;

	return (
		<Card className={cn("flex min-h-0 flex-col", className)}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<Activity className="h-4 w-4 text-uganda-red" />
					<span className="flex-1">Area insights</span>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="-my-1 h-6 w-6 text-muted-foreground"
						onClick={onClose}
						title="Hide the insights panel (I)"
						aria-label="Hide the insights panel"
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
				{/* Hero */}
				<div className="space-y-1">
					<div className="flex items-center gap-1.5">
						<span className="truncate text-base font-semibold text-gray-900">{areaName}</span>
						<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							{areaKind}
						</span>
					</div>
					<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
						<span className="text-2xl font-bold tabular-nums text-gray-900">
							{total.toLocaleString()}
						</span>
						<span className="text-xs text-muted-foreground">
							signal{total === 1 ? "" : "s"}
							{frameLabel ? ` · ${frameLabel}` : ""}
						</span>
					</div>
					{trend && trend.cls !== "none" && (
						<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
							<TrendChip trend={trend} />
							<span>
								{trendText.current ? `${trendText.current}: ${trend.cur.toLocaleString()} · ` : ""}
								{trendText.vs}
							</span>
						</div>
					)}
					{(share || rank) && (
						<div className="text-[11px] text-muted-foreground">
							{share && (
								<span>
									{share.pct < 0.1 && share.pct > 0 ? "<0.1" : share.pct.toFixed(1)}% of {share.of}
								</span>
							)}
							{share && rank && " · "}
							{rank && (
								<span>
									#{rank.rank} of {rank.of} {rank.noun}
								</span>
							)}
						</div>
					)}
					{spark && spark.values.length > 1 && (
						<div className="pt-1">
							<Sparkline
								values={spark.values}
								labels={spark.labels}
								active={spark.active}
								onSelect={onSparkSelect}
							/>
						</div>
					)}
				</div>

				{/* Ranked child areas */}
				<Section
					title={`Top ${childNoun}`}
					aside={
						risingCount > 0 ? (
							<span className="flex items-center gap-1 text-[10px] font-medium text-red-700">
								<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
								{risingCount} rising
							</span>
						) : undefined
					}
				>
					{ranked.length === 0 ? (
						<p className="py-2 text-xs text-muted-foreground">
							No {childNoun} with signals {frameLabel ? "in this frame" : "under the current filters"}.
						</p>
					) : (
						<div className="space-y-1">
							<ol className="space-y-1">
								{rowsShown.map((r, i) => (
									<li key={r.uid}>
										<BarRow
											label={`${i + 1}. ${r.name}`}
											count={r.count}
											max={rowMax}
											onClick={() => onRowClick(r.uid)}
											onHover={(on) => onRowHover(on ? r.uid : null)}
											trailing={<TrendChip trend={r.trend} />}
											title={
												childNoun === "subcounties"
													? `List the signals in ${r.name}`
													: `Open ${r.name}`
											}
										/>
									</li>
								))}
							</ol>
							<ShowMore
								expanded={allRows}
								onToggle={() => setAllRows((v) => !v)}
								hidden={ranked.length - rowsShown.length}
							/>
						</div>
					)}
				</Section>

				{insightsError ? (
					<p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
						Couldn&apos;t load the area breakdown: {insightsError.message}
					</p>
				) : insightsLoading && !insights ? (
					<div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
						<Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the area breakdown…
					</div>
				) : insights ? (
					<div className={cn("space-y-4 transition-opacity", insightsLoading && "opacity-60")}>
						{/* EBS pipeline */}
						{insights.pipeline.length > 0 && (
							<Section
								title="Pipeline"
								aside={
									<span className="text-[10px] text-muted-foreground">
										of {pipelineTotal.toLocaleString()}
										{periodNote ? ` · ${periodNote}` : ""}
									</span>
								}
							>
								<div className="space-y-1">
									{insights.pipeline.map((s) => (
										<BarRow
											key={s.key}
											label={s.label}
											count={s.count}
											max={pipelineTotal}
											total={pipelineTotal}
										/>
									))}
								</div>
							</Section>
						)}

						{conditions.length > 0 && (
							<Section
								title="Conditions"
								aside={
									<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
										<Filter className="h-2.5 w-2.5" /> click to filter
									</span>
								}
							>
								<div className="space-y-1">
									{conditionsShown.map((c) => {
										const filterable = Boolean(c.value && RESPONSE_CODES.has(c.value));
										const selected = filterable && selResponses.has(c.value!);
										return (
											<BarRow
												key={c.label}
												label={conditionName(c.label, c.value)}
												count={c.count}
												max={conditionMax}
												selected={filterable && selResponses.size > 0 ? selected : undefined}
												onClick={filterable ? () => onToggleResponse(c.value!) : undefined}
												title={
													filterable
														? selected
															? "Remove this condition from the map filter"
															: "Filter the map to this condition"
														: "Not a filterable response type"
												}
											/>
										);
									})}
									<ShowMore
										expanded={allConditions}
										onToggle={() => setAllConditions((v) => !v)}
										hidden={conditions.length - conditionsShown.length}
									/>
								</div>
							</Section>
						)}

						{outcomes.length > 0 && (
							<Section title="Verification outcome">
								<div className="space-y-1">
									{outcomes.map((o) => {
										const selected = Boolean(o.value && selOutcomes.has(o.value));
										return (
											<BarRow
												key={o.label}
												label={o.label}
												count={o.count}
												max={outcomeMax}
												selected={o.value && selOutcomes.size > 0 ? selected : undefined}
												onClick={o.value ? () => onToggleOutcome(o.value!) : undefined}
												title={
													selected
														? "Remove this outcome from the map filter"
														: "Filter the map to this outcome"
												}
											/>
										);
									})}
								</div>
							</Section>
						)}

						{insights.facilities.total > 0 && (
							<Section title="Health facilities">
								<div className="grid grid-cols-3 gap-1.5 text-center">
									{[
										{ label: "Active", value: insights.facilities.total },
										{ label: "Functional", value: insights.facilities.functional },
										{ label: "Reporting", value: insights.facilities.reporting },
									].map((s) => (
										<div key={s.label} className="rounded-md border bg-muted/30 px-1 py-1.5">
											<div className="text-sm font-semibold tabular-nums">{s.value.toLocaleString()}</div>
											<div className="text-[10px] text-muted-foreground">{s.label}</div>
										</div>
									))}
								</div>
								{insights.total > 0 && insights.facilities.functional > 0 && (
									<p className="flex items-center gap-1 text-[10px] text-muted-foreground">
										<Building2 className="h-3 w-3" />
										{(insights.total / insights.facilities.functional).toFixed(1)} signals per functional facility
									</p>
								)}
							</Section>
						)}

						{insights.recent.length > 0 && (
							<Section title="Latest signals">
								<ul className="divide-y rounded-md border">
									{insights.recent.map((a) => (
										<li key={a.id}>
											<button
												type="button"
												onClick={() => onOpenAlert(a)}
												className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
											>
												<span className="flex items-center justify-between gap-2 text-xs">
													<span className="truncate font-medium">
														{a.response
															? conditionName(labelOfResponse.get(a.response) ?? a.response, a.response)
															: "Unspecified"}
													</span>
													<span className="shrink-0 font-mono text-[10px] text-muted-foreground">
														{altCode(a.id)}
													</span>
												</span>
												<span className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
													<span className="truncate">
														{[a.alertCaseDistrict, a.alertCaseSubCounty].filter(Boolean).join(" › ") || "—"}
													</span>
													<span className="flex shrink-0 items-center gap-1">
														<Clock className="h-2.5 w-2.5" />
														{formatTimeAgo(a.date, "—")}
													</span>
												</span>
												<span className="text-[10px] text-gray-600">{deriveAlertOutcome(a)}</span>
											</button>
										</li>
									))}
								</ul>
							</Section>
						)}

						{insights.unplotted > 0 && (
							<p className="text-[10px] text-muted-foreground">
								+{insights.unplotted.toLocaleString()} signal{insights.unplotted === 1 ? "" : "s"} in
								scope whose district matches no boundary — not on the map.
							</p>
						)}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
