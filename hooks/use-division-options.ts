"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
	fetchDistrictUnits,
	fetchSubcountiesByDistrict,
} from "@/lib/fetch-admin-units";

/**
 * Resolve the divisions/subcounties for a district *name* from the admin-units
 * hierarchy. The subcounty endpoint is keyed by district id, so we first map
 * the (verbatim) district name to its id via the districts list, then fetch its
 * subcounties.
 */
async function fetchDivisionsForDistrict(
	districtName: string
): Promise<string[]> {
	const target = districtName.trim().toLowerCase();
	if (!target) return [];

	const districts = await fetchDistrictUnits();
	const ids = districts
		.filter((d) => d.name.trim().toLowerCase() === target)
		.map((d) => d.id);
	if (ids.length === 0) return [];

	const lists = await Promise.all(
		ids.map((id) => fetchSubcountiesByDistrict(id))
	);

	const byKey = new Map<string, string>();
	for (const list of lists) {
		for (const opt of list) {
			const name = opt.name.trim();
			if (name) byKey.set(name.toLowerCase(), name);
		}
	}
	return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * Divisions/subcounties for the selected district. Disabled (no fetch) until a
 * concrete district is chosen — divisions only make sense scoped to a district.
 */
export function useDivisionOptions(districtName?: string) {
	const enabled = Boolean(districtName && districtName !== "all");

	const {
		data,
		error: swrError,
		isLoading,
	} = useSWR(
		enabled ? ["division-options", districtName] : null,
		([, name]) => fetchDivisionsForDistrict(name as string)
	);

	const divisions = useMemo(() => data ?? [], [data]);

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load divisions"
		: null;

	return { divisions, loading: isLoading, error, enabled };
}
