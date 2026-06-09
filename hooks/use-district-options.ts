"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchDistricts } from "@/lib/fetch-admin-units";

export function useDistrictOptions(currentValue?: string) {
	const {
		data,
		error: swrError,
		isLoading,
	} = useSWR("district-options", fetchDistricts);

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
