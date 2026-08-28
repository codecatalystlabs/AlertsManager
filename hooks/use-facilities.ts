"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import {
	fetchFacilities,
	fetchFacilityFacets,
	type FacilityQuery,
} from "@/lib/facilities";

/** SWR key root, so mutations can invalidate every facility page at once. */
export const FACILITIES_KEY = "facilities";
export const FACILITY_FACETS_KEY = "facility-facets";

/**
 * One PAGE of the master facility list.
 *
 * Deliberately not a "load all facilities" hook. The list is ~8,700 rows, so
 * every filter and the paging live server-side and the query is part of the SWR
 * key — a search re-fetches rather than filtering a client-side copy that would
 * have to exist first.
 *
 * `keepPreviousData` is what stops the table blanking on each keystroke while
 * the next page is in flight.
 */
export function useFacilities(query: FacilityQuery) {
	const { data, error, isLoading, isValidating, mutate } = useSWR(
		[FACILITIES_KEY, query],
		() => fetchFacilities(query),
		{
			revalidateOnFocus: false,
			keepPreviousData: true,
		}
	);

	return {
		facilities: data?.facilities ?? [],
		total: data?.total ?? 0,
		limit: data?.limit ?? query.limit ?? 50,
		offset: data?.offset ?? query.offset ?? 0,
		loading: isLoading,
		validating: isValidating,
		error: error instanceof Error ? error.message : null,
		refetch: mutate,
	};
}

/**
 * The filter values reachable under the current scope, read from the data
 * rather than hard-coded.
 *
 * The scope is part of the SWR key, so changing region re-fetches the district
 * list for that region — the cascade. `keepPreviousData` stops every dropdown
 * momentarily emptying while the new facets are in flight.
 */
export function useFacilityFacets(query: FacilityQuery = {}) {
	const { data, error, isLoading } = useSWR(
		[FACILITY_FACETS_KEY, query],
		() => fetchFacilityFacets(query),
		{ revalidateOnFocus: false, keepPreviousData: true }
	);
	return {
		facets: data,
		loading: isLoading,
		error: error instanceof Error ? error.message : null,
	};
}

/**
 * Invalidate every cached facility page and the facets after a write.
 *
 * The facets matter as much as the rows: adding the first facility in a new
 * district must make that district selectable in the filter, or the admin
 * cannot find the row they just created.
 */
export function useInvalidateFacilities() {
	const { mutate } = useSWRConfig();
	return useCallback(() => {
		void mutate(
			(key) =>
				Array.isArray(key) &&
				(key[0] === FACILITIES_KEY || key[0] === FACILITY_FACETS_KEY),
			undefined,
			{ revalidate: true }
		);
	}, [mutate]);
}
