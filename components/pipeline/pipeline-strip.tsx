"use client";

import Link from "next/link";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import {
	STAGE_ALERT,
	STAGE_DESCRIPTION,
	STAGE_STEP,
	fetchPipeline,
	stageHref,
	type PipelineStage,
	type StageKey,
} from "@/lib/pipeline";
import { AlertTriangle, ChevronRight, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The EBS steps, made visible.
 *
 * The dashboard already reported each step separately — a triage breakdown
 * here, an SLA card there — which tells you how each step is doing but never
 * shows the SHAPE of the pipeline: how far the register has been carried, and
 * where work is still standing. That is what a focal person opening the app
 * needs before anything else.
 *
 * Each tile headlines what has CLEARED that gate — triaged, verified, risk
 * assessed — with the queue still waiting on it underneath, in red when any of
 * that queue is past its national deadline. A strip of "awaiting" counts
 * reported only what was missing: it could not tell a stage nobody had started
 * from one that was finished, since both read zero-ish from opposite ends.
 *
 * Every tile is a link, and its number comes from the same predicate the list
 * filters on, so a tile reading 6,010 opens a list of 6,010.
 */
export function PipelineStrip({
	/** Scope filters passed through, so the strip matches the list beneath it. */
	params,
	/** The stage the page is currently showing, highlighted in the strip. */
	activeStage,
	className,
}: {
	params?: Record<string, string | undefined>;
	activeStage?: string | null;
	className?: string;
}) {
	const key = ["pipeline", JSON.stringify(params ?? {})];
	const { data, error, isLoading, isValidating, mutate } = useSWR(
		key,
		() => fetchPipeline(params),
		{
			revalidateOnFocus: false,
			keepPreviousData: true,
		}
	);

	if (error) {
		// Non-blocking by construction: the strip is a summary OF the list, so
		// losing it costs context, not data. Amber rather than red says exactly
		// that — a red banner nobody can clear is how people learn to stop
		// reading red banners — and Retry means a transient blip costs a click
		// instead of a page reload.
		return (
			<div
				role="status"
				className={cn(
					"flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border surface-warning px-4 py-3",
					className
				)}
			>
				<AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Pipeline summary unavailable</p>
					<p className="text-xs text-muted-foreground">
						The step-by-step signal counts could not be loaded. The signal
						list below is complete and unaffected.
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-8 gap-1.5"
					onClick={() => void mutate()}
					disabled={isValidating}
				>
					<RefreshCw
						className={cn("h-3.5 w-3.5", isValidating && "animate-spin")}
					/>
					{isValidating ? "Retrying…" : "Retry"}
				</Button>
			</div>
		);
	}

	const stages = data?.stages ?? [];

	return (
		<nav
			aria-label="EBS steps"
			className={cn(
				"rounded-none border border-gray-200 bg-white px-2 py-1.5 shadow-sm",
				className
			)}
		>
			<div className="mb-1 flex items-baseline justify-between gap-3 px-1">
				<h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
					EBS steps
				</h2>
				{data && (
					<p className="text-[11px] text-gray-500">
						{data.total.toLocaleString()} signals in scope
					</p>
				)}
			</div>

			<ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
				{isLoading && stages.length === 0
					? Array.from({ length: 4 }).map((_, i) => (
						<li key={i} className="min-w-[124px] flex-1">
							<div className="h-[52px] animate-pulse rounded bg-gray-100" />
						</li>
					))
					: stages.map((stage, index) => (
						<li
							key={stage.key}
							className="flex min-w-[124px] flex-1 items-stretch"
						>
							<StageTile
								stage={stage}
								active={activeStage === stage.key}
							/>
							{index < stages.length - 1 && (
								<ChevronRight
									aria-hidden
									className="mx-0.5 hidden h-4 w-4 shrink-0 self-center text-gray-300 sm:block"
								/>
							)}
						</li>
					))}
			</ol>
		</nav>
	);
}

function StageTile({
	stage,
	active,
}: {
	stage: PipelineStage;
	active: boolean;
}) {
	const step = STAGE_STEP[stage.key as StageKey];
	const overdue = stage.overdue > 0 ? stage.overdue : 0;
	const pending = stage.pending > 0 ? stage.pending : 0;
	const description = STAGE_DESCRIPTION[stage.key as StageKey];

	const body = (
		<>
			<div className="flex items-center gap-1.5">
				{step != null && (
					<span className="font-mono text-[10px] font-semibold text-gray-400">
						{String(step).padStart(2, "0")}
					</span>
				)}
				<span className="truncate text-[11px] font-medium text-gray-600">
					{stage.label}
				</span>
				{!stage.available && (
					<Lock aria-hidden className="ml-auto h-3 w-3 shrink-0 text-gray-400" />
				)}
			</div>
			<div className="mt-0.5 flex items-baseline gap-1.5">
				<span
					className={cn(
						"text-base font-bold leading-tight tabular-nums",
						stage.available ? "text-uganda-black" : "text-gray-400"
					)}
				>
					{stage.available ? stage.count.toLocaleString() : "—"}
				</span>
			</div>
			{/* The backlog, demoted to the second line — still the number
			    someone works today, but no longer the one that stands for the
			    stage. Detection has no queue of its own, so it says nothing
			    rather than inventing one. */}
			{overdue > 0 ? (
				<p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-destructive">
					<AlertTriangle aria-hidden className="h-3 w-3" />
					{pending.toLocaleString()} waiting · {overdue.toLocaleString()} overdue
				</p>
			) : (
				<p className="mt-0.5 text-[10px] text-gray-400">
					{pending > 0
						? `${pending.toLocaleString()} waiting`
						: stage.overdue < 0
							? " "
							: "nothing waiting"}
				</p>
			)}
		</>
	);

	const shell = cn(
		"flex w-full flex-col rounded border px-2 py-1.5 text-left transition-colors",
		active
			? "border-uganda-red bg-uganda-red/5 ring-1 ring-uganda-red"
			: "border-gray-200",
		overdue > 0 && !active && "border-destructive/30"
	);

	// An unavailable stage is not a link: there is nothing to open, and a tile
	// that navigates nowhere is worse than one that plainly says so.
	if (!stage.available) {
		return (
			<div
				className={cn(shell, "cursor-default bg-gray-50/60")}
				title={stage.note ?? description}
			>
				{body}
			</div>
		);
	}

	return (
		<Link
			href={stageHref(stage.key)}
			className={cn(shell, "hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-yellow")}
			title={description}
			aria-current={active ? "page" : undefined}
		>
			{body}
		</Link>
	);
}

export { STAGE_ALERT };
