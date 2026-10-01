"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, History, MapPin, Radio, RefreshCw } from "lucide-react";

import { LAYOUT } from "@/constants/layout";
import { ErrorAlert } from "@/components/dashboard";
import {
	DashboardRangePicker,
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard/dashboard-range-picker";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { alertResponse } from "@/constants";
import { useGeoLayers } from "@/hooks/use-geo-layers";
import { GEO_OUTCOME_FILTER_OPTIONS } from "@/lib/geo-outcome-filter";
import { toYmd } from "@/lib/geo-map-analytics";
import type { GeoQuery } from "@/lib/fetch-geo";

// Leaflet touches `window`, so the map workspace is client-only (no SSR) and lazy-loaded.
const SignalsMapExplorer = dynamic(
	() =>
		import("@/components/map/signals-map-explorer").then((m) => ({
			default: m.SignalsMapExplorer,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-[72vh] min-h-[420px] w-full animate-pulse rounded-md bg-gray-100" />
		),
	}
);

/** Live mode re-polls every minute (see LIVE_REFRESH_MS in the explorer). */
const LIVE_REFRESH_MS = 60_000;

/**
 * localStorage key remembering whether the side panel is shown. Kept from the
 * old "Top 10 districts" panel so the preference carries over to Insights,
 * which still opens with that ranking.
 */
const INSIGHTS_VISIBLE_KEY = "map-top-districts-visible";

function readFlag(key: string, fallback: boolean): boolean {
	try {
		const v = localStorage.getItem(key);
		return v === null ? fallback : v !== "0";
	} catch {
		return fallback;
	}
}

function writeFlag(key: string, value: boolean): void {
	try {
		localStorage.setItem(key, value ? "1" : "0");
	} catch {
		/* storage blocked — the choice just isn't remembered */
	}
}

const RESPONSE_NAMES = new Map(alertResponse.map((r) => [r.code, r.name]));

function summarise(values: string[], all: string, nameOf: (v: string) => string): string {
	if (values.length === 0) return all;
	const names = values.map(nameOf);
	return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

/**
 * Signals Map — a click-to-drill map of signal volume across Uganda. The overview
 * shows every region; clicking a region opens just that region's districts, and
 * clicking a district opens just that district's subcounties. A breadcrumb climbs
 * back up. Counts honour the same date window, canonical district matching and
 * RBAC scope as the dashboard.
 *
 * Around the map: trend comparison with hotspot rings, timeline playback, an
 * area insights panel, search, live updates, full screen, deep links, image and
 * Excel exports, and keyboard shortcuts (see SignalsMapExplorer).
 */
export default function MapPage(): React.JSX.Element {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [responses, setResponses] = useState<string[]>([]);
	const [outcomes, setOutcomes] = useState<string[]>([]);
	const [live, setLive] = useState(false);
	const [timelineOpen, setTimelineOpen] = useState(false);
	// Shown by default; the preference persists across visits. Read after mount
	// so the server and first client render agree (no hydration mismatch).
	const [insightsOpen, setInsightsOpen] = useState(true);
	useEffect(() => {
		setInsightsOpen(readFlag(INSIGHTS_VISIBLE_KEY, true));
	}, []);
	const changeInsightsOpen = useCallback((open: boolean) => {
		setInsightsOpen(open);
		writeFlag(INSIGHTS_VISIBLE_KEY, open);
	}, []);

	// Live updates only make sense when the window reaches today.
	const today = toYmd(new Date());
	const liveAvailable = !range.to || range.to >= today;
	useEffect(() => {
		if (!liveAvailable) setLive(false);
	}, [liveAvailable]);

	const query: GeoQuery = useMemo(
		() => ({
			fromDate: range.from || undefined,
			toDate: range.to || undefined,
			responses: responses.length ? responses : undefined,
			outcomes: outcomes.length ? outcomes : undefined,
		}),
		[range.from, range.to, responses, outcomes]
	);

	const responseOptions = useMemo(
		() => alertResponse.map((r) => ({ value: r.code, label: r.name })),
		[]
	);

	const { regions, districts, loading, validating, error, refetch } =
		useGeoLayers(query, { refreshInterval: live ? LIVE_REFRESH_MS : 0 });

	const toggle = (value: string) => (prev: string[]) =>
		prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];

	const rangeLabel =
		range.from && range.to
			? `${range.from} to ${range.to}`
			: range.from
				? `From ${range.from}`
				: range.to
					? `Through ${range.to}`
					: "All time";
	const filterLabel = [
		summarise(responses, "All response types", (v) => RESPONSE_NAMES.get(v) ?? v),
		summarise(outcomes, "All outcomes", (v) => v),
	].join(" · ");

	return (
		<div className={LAYOUT.pageGap}>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h1 className={LAYOUT.pageTitle}>
						<MapPin className="mr-2 inline h-5 w-5 text-uganda-red" />
						Signals Map
					</h1>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					{/* Response taxonomy (same list as the dashboard) — value is the
					    disease code, which the backend folds onto the canonical bucket.
					    Empty selection = all types. */}
					<MultiSelect
						options={responseOptions}
						selected={responses}
						onChange={setResponses}
						allLabel="All response types"
						searchPlaceholder="Search response type…"
						emptyText="No response types."
						ariaLabel="Filter by response type"
						disabled={loading}
						className="w-[170px]"
						contentClassName="w-[280px]"
					/>
					{/* Verification-outcome buckets — derived server-side per alert,
					    matching the dashboard's Verification Outcomes chart. */}
					<MultiSelect
						options={GEO_OUTCOME_FILTER_OPTIONS}
						selected={outcomes}
						onChange={setOutcomes}
						allLabel="All outcomes"
						searchPlaceholder="Search outcome…"
						emptyText="No outcomes."
						ariaLabel="Filter by verification outcome"
						disabled={loading}
						className="w-[150px]"
					/>
					<DashboardRangePicker onChange={setRange} disabled={loading} />
					<Button
						variant={live ? "secondary" : "outline"}
						size="sm"
						className={`h-8 ${live ? "text-emerald-700" : ""}`}
						onClick={() => setLive((v) => !v)}
						disabled={!liveAvailable}
						title={
							!liveAvailable
								? "Live updates need a date range that includes today"
								: live
									? "Stop live updates (L)"
									: "Refresh every minute and flash areas that get new signals (L)"
						}
						aria-pressed={live}
					>
						<Radio className={`mr-1 h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} />
						Live
					</Button>
					<Button
						variant={timelineOpen ? "secondary" : "outline"}
						size="sm"
						className="h-8"
						onClick={() => setTimelineOpen((v) => !v)}
						title={
							timelineOpen
								? "Close the timeline (T)"
								: "Play the map back over time (T)"
						}
						aria-pressed={timelineOpen}
					>
						<History className="mr-1 h-3.5 w-3.5" />
						Timeline
					</Button>
					<Button
						variant={insightsOpen ? "secondary" : "outline"}
						size="sm"
						className="h-8"
						onClick={() => changeInsightsOpen(!insightsOpen)}
						title={
							insightsOpen
								? "Hide the insights panel (I)"
								: "Show the insights panel (I)"
						}
						aria-pressed={insightsOpen}
					>
						<Activity className="mr-1 h-3.5 w-3.5" />
						Insights
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-8"
						onClick={refetch}
						disabled={validating}
					>
						<RefreshCw
							className={`mr-1 h-3.5 w-3.5 ${validating ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</div>

			{error && <ErrorAlert error={error.message} onRetry={refetch} />}

			<SignalsMapExplorer
				query={query}
				regions={regions}
				districts={districts}
				loading={loading}
				validating={validating}
				live={live}
				liveAvailable={liveAvailable}
				onLiveChange={setLive}
				timelineOpen={timelineOpen}
				onTimelineOpenChange={setTimelineOpen}
				insightsOpen={insightsOpen}
				onInsightsOpenChange={changeInsightsOpen}
				onToggleResponse={(v) => setResponses(toggle(v))}
				onToggleOutcome={(v) => setOutcomes(toggle(v))}
				rangeLabel={rangeLabel}
				filterLabel={filterLabel}
			/>

			<p className="text-[11px] text-muted-foreground">
				The overview shows every region. Click a region to open just its
				districts, then click a district to open just its subcounties (loaded on
				demand); use the breadcrumb, Esc, or the locator inset to move back.
				Hover any area for its count and trend. Pulsing rings mark hotspots —
				areas rising fast against the comparison window. The timeline plays the
				map back frame by frame; the insights panel describes whatever area is
				on screen, and its condition/outcome rows filter the map when clicked.
				Counts use the same canonical district matching and date window as the
				dashboard; signals whose location can&apos;t be matched to a boundary
				aren&apos;t plotted.
			</p>
		</div>
	);
}
