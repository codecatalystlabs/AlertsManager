"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
	fetchDistricts,
	fetchDistrictNamesByRegion,
} from "@/lib/fetch-admin-units";

/**
 * District names for a select, sourced from the official admin-units hierarchy
 * (GET /admin-units/...) and kept verbatim (with " District"/" City"). When
 * `regionId` is supplied the list is scoped to that region's districts (drives
 * the Region → District cascade); otherwise every district is returned.
 * `currentValue` is kept selectable even if it isn't in the list.
 */
export function useDistrictOptions(currentValue?: string, regionId?: number) {
	const {
		data,
		error: swrError,
		isLoading,
	} = useSWR(
		regionId ? ["district-options", regionId] : "district-options",
		regionId ? () => fetchDistrictNamesByRegion(regionId) : fetchDistricts
	);

	const districts = useMemo(() => data ?? [], [data]);

	const options = useMemo(() => {
		const trimmed = currentValue?.trim();
		if (!trimmed) return districts;
		if (districts.includes(trimmed)) return districts;
		return [trimmed, ...districts].sort((a, b) => a.localeCompare(b));
	}, [districts, currentValue]);

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load districts"
		: null;

	return { districts: options, loading: isLoading, error };
}
