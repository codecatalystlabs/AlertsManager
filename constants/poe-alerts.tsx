export const POE_ALERTS_CONFIG = {
	PAGE_TITLE: "POE Alerts",
	PAGE_DESCRIPTION:
		"Point of Entry traveller health alerts — sync from NDW and review",
	ITEMS_PER_PAGE: 10,
	AUTO_REFRESH_INTERVAL_MS: 60_000,
} as const;

export type NdwAlertsFilterState = {
	search: string;
	ndwFilters: Record<string, string>;
	operators: Record<string, string>;
	/** Inline filters over locally synced rows (backend query params → value). */
	local: Record<string, string>;
};

export const POE_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
	local: {},
};

export const POE_RISK_LEVEL_OPTIONS = ["high", "medium", "low"] as const;

/** Inline local-filter fields for POE → backend local query param names. */
export type PoeLocalFilters = {
	port: string;
	nation: string;
	risk: string;
	fromDate: string;
	toDate: string;
};

export const POE_INITIAL_LOCAL_FILTERS: PoeLocalFilters = {
	port: "",
	nation: "",
	risk: "",
	fromDate: "",
	toDate: "",
};

/**
 * Maps inline UI fields to backend local query params. Param names deliberately
 * avoid PoeFilterFields() ("nationality"/"risk_level") so the request is not
 * switched to the live NDW proxy.
 */
export function poeLocalFiltersToParams(
	f: PoeLocalFilters
): Record<string, string> {
	const p: Record<string, string> = {};
	if (f.port.trim()) p.port = f.port.trim();
	if (f.nation.trim()) p.nation = f.nation.trim();
	if (f.risk.trim()) p.risk = f.risk.trim();
	if (f.fromDate.trim()) p.from_date = f.fromDate.trim();
	if (f.toDate.trim()) p.to_date = f.toDate.trim();
	return p;
}
