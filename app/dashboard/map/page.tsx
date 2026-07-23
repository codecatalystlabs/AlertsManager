"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw, TrendingUp } from "lucide-react";

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
import { TopDistrictsCard } from "@/components/map/top-districts-card";
import { GEO_OUTCOME_FILTER_OPTIONS } from "@/lib/geo-outcome-filter";
import type { GeoQuery } from "@/lib/fetch-geo";

// Leaflet touches `window`, so the map is client-only (no SSR) and lazy-loaded.
const AlertsGeoMap = dynamic(
	() =>
		import("@/components/map/alerts-geo-map").then((m) => ({
			default: m.AlertsGeoMap,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-full w-full animate-pulse rounded-md bg-gray-100" />
		),
	}
);

/**
 * Signals Map — a click-to-drill map of signal volume across Uganda. The overview
 * shows every region; clicking a region opens just that region's districts, and
 * clicking a district opens just that district's subcounties. A breadcrumb climbs
 * back up. Counts honour the same date window, canonical district matching and
 * RBAC scope as the dashboard.
 */
/** localStorage key remembering whether the top-districts panel is shown. */
const TOP_DISTRICTS_VISIBLE_KEY = "map-top-districts-visible";

export default function MapPage(): React.JSX.Element {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [responses, setResponses] = useState<string[]>([]);
	const [outcomes, setOutcomes] = useState<string[]>([]);
	// Shown by default; the preference persists across visits. Read after mount
	// so the server and first client render agree (no hydration mismatch).
	const [showTopDistricts, setShowTopDistricts] = useState(true);
	useEffect(() => {
		setShowTopDistricts(
			localStorage.getItem(TOP_DISTRICTS_VISIBLE_KEY) !== "0"
		);
	}, []);
	function toggleTopDistricts() {
		setShowTopDistricts((shown) => {
			localStorage.setItem(TOP_DISTRICTS_VISIBLE_KEY, shown ? "0" : "1");
			return !shown;
		});
	}

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
		useGeoLayers(query);

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
						variant={showTopDistricts ? "secondary" : "outline"}
						size="sm"
						className="h-8"
						onClick={toggleTopDistricts}
						title={
							showTopDistricts
								? "Hide the top districts panel"
								: "Show the top districts panel"
						}
						aria-pressed={showTopDistricts}
					>
						<TrendingUp className="mr-1 h-3.5 w-3.5" />
						Top 5
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

			<div className="flex flex-wrap items-center justify-end gap-2">
				<div className="text-xs text-muted-foreground">
					{regions
						? `${regions.total.toLocaleString()} signals plotted • click a region to drill into its districts`
						: "Loading…"}
				</div>
			</div>

			<div className="flex flex-col gap-3 lg:flex-row">
				<div className="h-[72vh] min-h-[420px] min-w-0 flex-1">
					<AlertsGeoMap
						regions={regions}
						districts={districts}
						query={query}
						validating={validating}
					/>
				</div>
				{showTopDistricts && (
					<TopDistrictsCard
						districts={districts}
						loading={loading}
						className="lg:w-72 lg:shrink-0"
						onClose={toggleTopDistricts}
					/>
				)}
			</div>

			<p className="text-[11px] text-muted-foreground">
				The overview shows every region. Click a region to open just its
				districts, then click a district to open just its subcounties (loaded on
				demand); use the breadcrumb to climb back up. Hover any area for its name
				and count. Counts use the same canonical district matching and date
				window as the dashboard; signals whose location can&apos;t be matched to a
				boundary aren&apos;t plotted.
			</p>
		</div>
	);
}
