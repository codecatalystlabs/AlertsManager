"use client";

import { useMemo } from "react";
import useSWR from "swr";

import {
	fetchGeoRegions,
	fetchGeoDistricts,
	fetchGeoSubcounties,
	fetchGeoTimeline,
	fetchGeoInsights,
	type GeoFeatureCollection,
	type GeoInsights,
	type GeoQuery,
	type GeoTimeline,
} from "@/lib/fetch-geo";
import type { DayWindow } from "@/lib/geo-map-analytics";

/** Stable, order-independent cache-key part for the query's filters. */
export function geoFilterKey(query: GeoQuery): string {
	const responses = [...(query.responses ?? [])].sort().join(",");
	const outcomes = [...(query.outcomes ?? [])].sort().join(",");
	return `${responses}|${outcomes}|${query.stage ?? ""}`;
}

/** Live mode re-polls every minute; otherwise data only reloads on demand. */
export interface GeoRefreshOptions {
	refreshInterval?: number;
}

export interface UseGeoLayersReturn {
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	loading: boolean;
	validating: boolean;
	error: Error | undefined;
	refetch: () => void;
}

/**
 * useGeoLayers loads the two always-needed boundary layers for the drill-down
 * map: every region and every district (each ~30 KB / ~220 KB simplified, with
 * geometry + centroid + alert count). Subcounties are NOT loaded here — they're
 * fetched per district on demand when a district is opened, so the heavy
 * subcounty geometry never ships wholesale. Both honour the date window and
 * RBAC scope.
 */
export function useGeoLayers(
	query: GeoQuery,
	opts: GeoRefreshOptions = {}
): UseGeoLayersReturn {
	const from = query.fromDate || "";
	const to = query.toDate || "";
	const filters = geoFilterKey(query);
	const swrOpts = {
		keepPreviousData: true,
		revalidateOnFocus: false,
		refreshInterval: opts.refreshInterval ?? 0,
	};

	const regions = useSWR<GeoFeatureCollection>(
		["geo-regions", from, to, filters],
		() => fetchGeoRegions(query),
		swrOpts
	);
	const districts = useSWR<GeoFeatureCollection>(
		["geo-districts-all", from, to, filters],
		() => fetchGeoDistricts("", query),
		swrOpts
	);

	return {
		regions: regions.data,
		districts: districts.data,
		loading: regions.isLoading || districts.isLoading,
		validating: regions.isValidating || districts.isValidating,
		error: (regions.error || districts.error) as Error | undefined,
		refetch: () => {
			void regions.mutate();
			void districts.mutate();
		},
	};
}

/** The open district's subcounties (with geometry), fetched on demand. */
export function useGeoSubcounties(
	query: GeoQuery,
	districtUid: string | null,
	opts: GeoRefreshOptions = {}
) {
	return useSWR<GeoFeatureCollection>(
		districtUid
			? ["geo-subcounties", districtUid, query.fromDate, query.toDate, geoFilterKey(query)]
			: null,
		() => fetchGeoSubcounties(districtUid as string, query),
		{ revalidateOnFocus: false, refreshInterval: opts.refreshInterval ?? 0 }
	);
}

/**
 * Counts-only regions + districts (+ the open district's subcounties) for one
 * day window, merged into a uid → count map (uids are unique across levels).
 * Feeds the trend comparison. `window` null disables the fetch.
 */
export function useGeoWindowCounts(
	query: GeoQuery,
	window: DayWindow | null,
	districtUid: string | null,
	opts: GeoRefreshOptions = {}
): { counts: Map<string, number> | null; loading: boolean } {
	const q: GeoQuery = window
		? { ...query, fromDate: window.from, toDate: window.to }
		: query;
	const base = window ? [window.from, window.to, geoFilterKey(query)] : null;
	const swrOpts = {
		keepPreviousData: true,
		revalidateOnFocus: false,
		refreshInterval: opts.refreshInterval ?? 0,
	};

	const regions = useSWR<GeoFeatureCollection>(
		base ? ["geo-win-regions", ...base] : null,
		() => fetchGeoRegions(q, { countsOnly: true }),
		swrOpts
	);
	const districts = useSWR<GeoFeatureCollection>(
		base ? ["geo-win-districts", ...base] : null,
		() => fetchGeoDistricts("", q, { countsOnly: true }),
		swrOpts
	);
	const subs = useSWR<GeoFeatureCollection>(
		base && districtUid ? ["geo-win-subcounties", districtUid, ...base] : null,
		() => fetchGeoSubcounties(districtUid as string, q, { countsOnly: true }),
		swrOpts
	);

	// Memoised on the responses, so consumers can depend on the map's identity.
	const counts = useMemo(() => {
		if (!window || !regions.data || !districts.data) return null;
		const m = new Map<string, number>();
		for (const fc of [regions.data, districts.data, subs.data]) {
			for (const f of fc?.features ?? []) m.set(f.properties.uid, f.properties.count);
		}
		return m;
	}, [window, regions.data, districts.data, subs.data]);

	return { counts, loading: Boolean(window) && (!counts || subs.isLoading) };
}

/**
 * Per-frame counts of every district. Loaded whenever the timeline or the
 * insights sparkline needs it; region frames are derived from it client-side.
 */
export function useGeoTimeline(
	query: GeoQuery,
	enabled: boolean,
	opts: GeoRefreshOptions = {}
) {
	return useSWR<GeoTimeline>(
		enabled
			? ["geo-timeline", query.fromDate, query.toDate, geoFilterKey(query)]
			: null,
		() => fetchGeoTimeline(query),
		{
			keepPreviousData: true,
			revalidateOnFocus: false,
			refreshInterval: opts.refreshInterval ?? 0,
		}
	);
}

/**
 * Per-frame counts of one district's subcounties, pinned to the district
 * timeline's window and granularity so both share exactly the same frames.
 */
export function useGeoSubTimeline(
	query: GeoQuery,
	districtUid: string | null,
	base: GeoTimeline | undefined,
	enabled: boolean,
	opts: GeoRefreshOptions = {}
) {
	return useSWR<GeoTimeline>(
		enabled && districtUid && base
			? ["geo-timeline-sub", districtUid, base.from, base.to, base.granularity, geoFilterKey(query)]
			: null,
		() =>
			fetchGeoTimeline(
				{ ...query, fromDate: base!.from, toDate: base!.to },
				{ districtUid: districtUid!, granularity: base!.granularity }
			),
		{ revalidateOnFocus: false, refreshInterval: opts.refreshInterval ?? 0 }
	);
}

/** Insights for the area the map is showing (country, a region or a district). */
export function useGeoInsights(
	query: GeoQuery,
	area: { regionUid?: string; districtUid?: string },
	enabled: boolean,
	opts: GeoRefreshOptions = {}
) {
	return useSWR<GeoInsights>(
		enabled
			? [
					"geo-insights",
					area.regionUid ?? "",
					area.districtUid ?? "",
					query.fromDate,
					query.toDate,
					geoFilterKey(query),
				]
			: null,
		() => fetchGeoInsights(query, area),
		{
			keepPreviousData: true,
			revalidateOnFocus: false,
			refreshInterval: opts.refreshInterval ?? 0,
		}
	);
}
