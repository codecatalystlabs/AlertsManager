"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchRegions } from "@/lib/fetch-admin-units";

/**
 * Region names for the Region filter, from the official admin-units hierarchy
 * (GET /admin-units/regions). Returns `regionOptions` ({id,name}) too so callers
 * can resolve the selected region name to the id that scopes the District list.
 * If the current value isn't in the list, it's prepended so the select can
 * still display it.
 */
export function useRegionOptions(currentValue?: string) {
	const {
		data,
		error: swrError,
		isLoading,
	} = useSWR("region-options", fetchRegions);

	const regionOptions = useMemo(() => data ?? [], [data]);
	const regions = useMemo(
		() => regionOptions.map((r) => r.name),
		[regionOptions]
	);

	const options = useMemo(() => {
		const trimmed = currentValue?.trim();
		if (!trimmed || trimmed === "all" || regions.includes(trimmed))
			return regions;
		return [trimmed, ...regions].sort((a, b) => a.localeCompare(b));
	}, [regions, currentValue]);

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load regions"
		: null;

	return { regions: options, regionOptions, loading: isLoading, error };
}
