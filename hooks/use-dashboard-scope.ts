import { useCallback, useEffect, useState } from "react";

import {
	AuthService,
	isDistrictScopedRole,
	isRegionScopedRole,
	type User,
} from "@/lib/auth";
import {
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard/dashboard-range-picker";

/**
 * The page-level scope every dashboard figure is computed under: date range,
 * region, district and response type — plus who is looking, because a
 * district-scoped user (District Biostat) only ever sees their district and a
 * region-scoped user (REOC) only ever sees their region. The backend enforces
 * both; this hook only decides which pickers to show.
 *
 * Shared by the indicator dashboard and the Summaries / Reports overview tab
 * so the two pages scope identically and their numbers reconcile.
 */
export interface DashboardScope {
	range: DashboardRangeValue;
	region: string;
	district: string;
	response: string;
	setRange: (range: DashboardRangeValue) => void;
	/** Region scopes the district list, so changing it resets the district. */
	setRegion: (region: string) => void;
	setDistrict: (district: string) => void;
	setResponse: (response: string) => void;
	/** No date bound and no geography filter — "all-time, everywhere". */
	isUnbounded: boolean;

	user: User | null;
	scopedToDistrict: boolean;
	assignedDistrict: string | undefined;
	scopedToRegion: boolean;
	assignedRegion: string | undefined;
	/** One line describing what the figures cover, for the page subtitle. */
	scopeLabel: string;
}

export function useDashboardScope(): DashboardScope {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [region, setRegionState] = useState<string>("all");
	const [district, setDistrict] = useState<string>("all");
	const [response, setResponse] = useState<string>("all");

	// Current user (resolved after mount — localStorage is client-only).
	const [user, setUser] = useState<User | null>(null);
	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);
	const scopedToDistrict = isDistrictScopedRole(user);
	const assignedDistrict = user?.district?.trim();
	const scopedToRegion = isRegionScopedRole(user);
	const assignedRegion = user?.region?.trim();

	const setRegion = useCallback((value: string) => {
		setRegionState(value);
		setDistrict("all");
	}, []);

	const isUnbounded =
		!range.from && !range.to && district === "all" && region === "all";

	const scopeLabel =
		scopedToDistrict && assignedDistrict
			? `Showing data for ${assignedDistrict} district only`
			: scopedToRegion && assignedRegion
				? district !== "all"
					? `Showing data for ${district} district (${assignedRegion} region)`
					: `Showing data for ${assignedRegion} region only`
				: isUnbounded
					? "Showing all-time data"
					: "Showing data for the selected range";

	return {
		range,
		region,
		district,
		response,
		setRange,
		setRegion,
		setDistrict,
		setResponse,
		isUnbounded,
		user,
		scopedToDistrict,
		assignedDistrict,
		scopedToRegion,
		assignedRegion,
		scopeLabel,
	};
}
