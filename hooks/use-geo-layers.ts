"use client";

import useSWR from "swr";

import {
	fetchGeoRegions,
	fetchGeoDistricts,
	type GeoFeatureCollection,
	type GeoQuery,
} from "@/lib/fetch-geo";

export interface UseGeoLayersReturn {
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	loading: boolean;
	validating: boolean;
	error: Error | undefined;
	refetch: () => void;
}

/**
 * useGeoLayers loads the two always-needed boundary layers for the zoom-driven
 * map: every region and every district (each ~30 KB / ~220 KB simplified, with
 * geometry + centroid + alert count). Subcounties are NOT loaded here — they're
 * fetched per district on demand as the user zooms in, so the heavy subcounty
 * geometry never ships wholesale. Both honour the date window and RBAC scope.
 */
export function useGeoLayers(query: GeoQuery): UseGeoLayersReturn {
	const from = query.fromDate || "";
	const to = query.toDate || "";
	// Stable, order-independent cache keys for the multi-select filters.
	const responses = [...(query.responses ?? [])].sort().join(",");
	const outcomes = [...(query.outcomes ?? [])].sort().join(",");

	const regions = useSWR<GeoFeatureCollection>(
		["geo-regions", from, to, responses, outcomes],
		() => fetchGeoRegions(query),
		{ keepPreviousData: true, revalidateOnFocus: false }
	);
	const districts = useSWR<GeoFeatureCollection>(
		["geo-districts-all", from, to, responses, outcomes],
		() => fetchGeoDistricts("", query),
		{ keepPreviousData: true, revalidateOnFocus: false }
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
