"use client";

import { useState } from "react";
import {
	ChevronLeft,
	ChevronRight,
	Loader2,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	X,
} from "lucide-react";

import type { GeoTimeline } from "@/lib/fetch-geo";
import { describeFrame } from "@/lib/geo-map-analytics";
import { cn } from "@/lib/utils";

export const TIMELINE_SPEEDS = [0.5, 1, 2, 4] as const;

const GRANULARITY_NOUN: Record<GeoTimeline["granularity"], string> = {
	day: "day",
	week: "week",
	month: "month",
};

interface MapTimelineBarProps {
	timeline: GeoTimeline | undefined;
	loading: boolean;
	error?: Error;
	/** Per-frame signals in the area on screen (for the histogram). */
	values: number[];
	areaName: string;
	index: number;
	onIndexChange: (index: number) => void;
	playing: boolean;
	onPlayingChange: (playing: boolean) => void;
	speed: number;
	onSpeedChange: (speed: number) => void;
	cumulative: boolean;
	onCumulativeChange: (cumulative: boolean) => void;
	onClose: () => void;
	/** e.g. "Loading subcounty frames…" while the drilled level catches up. */
	notice?: string | null;
}

/**
 * Plays the map back through time. The histogram is the area's signal count
 * per frame (click or drag a bar to jump there); the map recolours to the
 * frame's counts on a colour scale fixed across the whole playback, so a shade
 * means the same number on every frame. "Cumulative" shows the running total
 * up to each frame instead of the frame alone.
 */
export function MapTimelineBar({
	timeline,
	loading,
	error,
	values,
	areaName,
	index,
	onIndexChange,
	playing,
	onPlayingChange,
	speed,
	onSpeedChange,
	cumulative,
	onCumulativeChange,
	onClose,
	notice,
}: MapTimelineBarProps) {
	const [hover, setHover] = useState<number | null>(null);
	const buckets = timeline?.buckets ?? [];
	const n = buckets.length;
	const shown = hover ?? index;
	const max = values.reduce((m, v) => Math.max(m, v), 0);
	const runningTotal = values.slice(0, index + 1).reduce((s, v) => s + v, 0);

	const btn =
		"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 hover:text-uganda-red disabled:pointer-events-none disabled:opacity-40";

	return (
		<div
			className="flex shrink-0 flex-col gap-1.5 border-t border-gray-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
			data-export-ignore
		>
			{/* Transport */}
			<div className="flex items-center gap-0.5">
				<button
					type="button"
					className={cn(btn, "h-8 w-8 bg-uganda-red text-white hover:bg-uganda-red/90 hover:text-white")}
					onClick={() => {
						if (!playing && index >= n - 1) onIndexChange(0);
						onPlayingChange(!playing);
					}}
					disabled={n < 2}
					title={playing ? "Pause (Space)" : "Play (Space)"}
					aria-label={playing ? "Pause" : "Play"}
				>
					{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
				</button>
				<button type="button" className={btn} onClick={() => onIndexChange(0)} disabled={index <= 0} title="First frame" aria-label="First frame">
					<SkipBack className="h-3.5 w-3.5" />
				</button>
				<button type="button" className={btn} onClick={() => onIndexChange(Math.max(0, index - 1))} disabled={index <= 0} title="Previous frame (←)" aria-label="Previous frame">
					<ChevronLeft className="h-4 w-4" />
				</button>
				<button type="button" className={btn} onClick={() => onIndexChange(Math.min(n - 1, index + 1))} disabled={index >= n - 1} title="Next frame (→)" aria-label="Next frame">
					<ChevronRight className="h-4 w-4" />
				</button>
				<button type="button" className={btn} onClick={() => onIndexChange(n - 1)} disabled={index >= n - 1} title="Latest frame" aria-label="Latest frame">
					<SkipForward className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* Frame readout */}
			<div className="min-w-0 sm:w-56 sm:shrink-0">
				{loading && !timeline ? (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading timeline…
					</div>
				) : error ? (
					<div className="text-xs text-red-700">Timeline unavailable: {error.message}</div>
				) : timeline && n > 0 ? (
					<>
						<div className="truncate text-xs font-semibold text-gray-900">
							{describeFrame(buckets[Math.min(shown, n - 1)], timeline.granularity)}
						</div>
						<div className="truncate text-[11px] text-muted-foreground">
							{(values[shown] ?? 0).toLocaleString()} signal{values[shown] === 1 ? "" : "s"} in {areaName}
							{cumulative && hover === null && ` · ${runningTotal.toLocaleString()} to date`}
						</div>
					</>
				) : (
					<div className="text-xs text-muted-foreground">No signals in this window.</div>
				)}
			</div>

			{/* Histogram scrubber */}
			<div className="min-w-0 flex-1">
				<div
					className="relative flex h-9 items-end gap-px"
					onMouseLeave={() => setHover(null)}
					role="slider"
					aria-label="Timeline frame"
					aria-valuemin={1}
					aria-valuemax={n}
					aria-valuenow={index + 1}
					aria-valuetext={buckets[index]?.label}
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
						else if (e.key === "ArrowRight") onIndexChange(Math.min(n - 1, index + 1));
						else if (e.key === "Home") onIndexChange(0);
						else if (e.key === "End") onIndexChange(n - 1);
						else return;
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{buckets.map((b, i) => {
						const v = values[i] ?? 0;
						const h = max > 0 ? Math.max(v > 0 ? 8 : 3, (v / max) * 100) : 3;
						const active = cumulative ? i <= index : i === index;
						return (
							<button
								key={b.start}
								type="button"
								tabIndex={-1}
								className="group relative h-full min-w-[2px] flex-1"
								onMouseEnter={() => setHover(i)}
								onMouseDown={() => {
									onPlayingChange(false);
									onIndexChange(i);
								}}
								onMouseOver={(e) => {
									// Drag-to-scrub: a held primary button moves the frame.
									if (e.buttons === 1) onIndexChange(i);
								}}
								title={`${b.label}: ${v.toLocaleString()} signal${v === 1 ? "" : "s"}`}
								aria-label={`${b.label}: ${v} signals`}
							>
								<span
									className={cn(
										"absolute inset-x-0 bottom-0 rounded-t-[2px] transition-colors",
										i === index
											? "bg-uganda-red"
											: active
												? "bg-uganda-red/45"
												: hover === i
													? "bg-gray-500"
													: "bg-gray-300 group-hover:bg-gray-400"
									)}
									style={{ height: `${h}%` }}
								/>
							</button>
						);
					})}
				</div>
				{n > 0 && (
					<div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
						<span>{buckets[0].label}</span>
						{notice ? <span className="text-amber-700">{notice}</span> : (
							<span>
								{n} {GRANULARITY_NOUN[timeline!.granularity]}
								{n === 1 ? "" : "s"}
							</span>
						)}
						<span>{buckets[n - 1].label}</span>
					</div>
				)}
			</div>

			{/* Options */}
			<div className="flex items-center gap-1.5">
				<div className="flex rounded-md border border-gray-200 p-0.5 text-[11px]">
					{[
						{ v: false, label: `Per ${timeline ? GRANULARITY_NOUN[timeline.granularity] : "frame"}` },
						{ v: true, label: "Cumulative" },
					].map((o) => (
						<button
							key={o.label}
							type="button"
							onClick={() => onCumulativeChange(o.v)}
							aria-pressed={cumulative === o.v}
							className={cn(
								"rounded px-1.5 py-0.5 font-medium transition-colors",
								cumulative === o.v ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"
							)}
						>
							{o.label}
						</button>
					))}
				</div>
				<select
					value={speed}
					onChange={(e) => onSpeedChange(Number(e.target.value))}
					className="h-7 rounded-md border border-gray-200 bg-white px-1 text-[11px] text-gray-700"
					aria-label="Playback speed"
					title="Playback speed"
				>
					{TIMELINE_SPEEDS.map((s) => (
						<option key={s} value={s}>
							{s}×
						</option>
					))}
				</select>
				<button type="button" className={btn} onClick={onClose} title="Close the timeline (T)" aria-label="Close the timeline">
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
