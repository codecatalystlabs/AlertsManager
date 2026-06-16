import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LAYOUT } from "@/constants/layout";

/**
 * Composite skeleton placeholders that mirror the real layouts (cards, charts,
 * tables, filters) so swapping loading → loaded causes no layout shift. All
 * blocks use the shimmer-animated {@link Skeleton} primitive.
 */

/* ------------------------------------------------------------------ cards */

/** Single compact KPI/stat card placeholder (matches call-logs/alerts stats). */
export function StatCardSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn(LAYOUT.card, "min-w-0", className)}>
			<CardContent className="p-3">
				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
					<div className="min-w-0 flex-1 space-y-1.5">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-5 w-12" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/** Grid of stat-card skeletons (default 4, matching LAYOUT.statsGrid). */
export function StatsGridSkeleton({
	count = 4,
	className,
}: {
	count?: number;
	className?: string;
}) {
	return (
		<div className={cn(LAYOUT.statsGrid, className)}>
			{Array.from({ length: count }).map((_, i) => (
				<StatCardSkeleton key={i} />
			))}
		</div>
	);
}

/* ----------------------------------------------------------- charts/graphs */

// Deterministic bar heights (avoids hydration mismatch from Math.random).
const BAR_HEIGHTS = [52, 78, 40, 64, 88, 34, 70, 58, 46, 82, 60, 38];

/** The plotting area of a chart: animated bars rising from a baseline. */
export function ChartCanvasSkeleton({
	bars = 9,
	className,
}: {
	bars?: number;
	className?: string;
}) {
	return (
		<div className={cn("flex h-full w-full flex-col gap-2", className)}>
			<div className="flex flex-1 items-end gap-2 border-b border-l border-muted px-2 pb-px">
				{Array.from({ length: bars }).map((_, i) => (
					<Skeleton
						key={i}
						className="flex-1 rounded-t-md rounded-b-none"
						style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
					/>
				))}
			</div>
			{/* x-axis tick labels */}
			<div className="flex justify-between px-2">
				{Array.from({ length: Math.min(bars, 6) }).map((_, i) => (
					<Skeleton key={i} className="h-2.5 w-8" />
				))}
			</div>
		</div>
	);
}

/** Full chart card placeholder: header (title) + plotting area. */
export function ChartSkeleton({
	className,
	height = 260,
	bars = 9,
	withLegend = false,
}: {
	className?: string;
	height?: number;
	bars?: number;
	withLegend?: boolean;
}) {
	return (
		<Card className={cn(LAYOUT.card, className)}>
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-3 w-56" />
			</CardHeader>
			<CardContent>
				{withLegend && (
					<div className="mb-3 flex flex-wrap gap-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-center gap-1.5">
								<Skeleton className="h-3 w-3 rounded-sm" />
								<Skeleton className="h-3 w-16" />
							</div>
						))}
					</div>
				)}
				<div style={{ height }}>
					<ChartCanvasSkeleton bars={bars} />
				</div>
			</CardContent>
		</Card>
	);
}

/* ---------------------------------------------------------------- tables */

/**
 * Table placeholder: a header row plus `rows` body rows of `columns` cells.
 * Self-contained (its own border) — drop it inside a card's content area.
 */
export function TableSkeleton({
	rows = 8,
	columns = 6,
	className,
}: {
	rows?: number;
	columns?: number;
	className?: string;
}) {
	const gridStyle: React.CSSProperties = {
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
	};
	return (
		<div className={cn("overflow-hidden rounded-md border", className)}>
			{/* header */}
			<div className="grid gap-4 border-b bg-muted/40 px-3 py-2.5" style={gridStyle}>
				{Array.from({ length: columns }).map((_, i) => (
					<Skeleton key={i} className="h-3.5 w-full max-w-24" />
				))}
			</div>
			{/* body */}
			{Array.from({ length: rows }).map((_, r) => (
				<div
					key={r}
					className="grid gap-4 border-b px-3 py-3 last:border-0"
					style={gridStyle}
				>
					{Array.from({ length: columns }).map((_, c) => (
						<Skeleton
							key={c}
							className={cn("h-4", c === 0 ? "w-3/4" : "w-full max-w-28")}
						/>
					))}
				</div>
			))}
		</div>
	);
}

/* --------------------------------------------------------------- filters */

/** Filter bar placeholder: a chip row + a grid of label/input fields. */
export function FiltersSkeleton({
	fields = 5,
	className,
}: {
	fields?: number;
	className?: string;
}) {
	return (
		<Card className={cn(LAYOUT.card, className)}>
			<CardContent className="space-y-3 p-3">
				{/* date-preset chip row */}
				<div className="flex flex-wrap items-center gap-1.5">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-7 w-20 rounded-full" />
					))}
				</div>
				{/* field grid: label + input per field */}
				<div className={LAYOUT.filtersGrid}>
					{Array.from({ length: fields }).map((_, i) => (
						<div key={i} className="min-w-0 space-y-1">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-9 w-full" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
