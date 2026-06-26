export const ECHIS_ALERTS_CONFIG = {
	PAGE_TITLE: "eCHIS Alerts",
	PAGE_DESCRIPTION:
		"Community Health Toolkit (eCHIS) EBS signals — sync from NDW and review",
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

export const ECHIS_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
	local: {},
};

/** Inline local-filter fields for eCHIS → backend local query param names. */
export type EchisLocalFilters = {
	district: string;
	county: string;
	verificationStatus: string;
	fromDate: string;
	toDate: string;
};

export const ECHIS_INITIAL_LOCAL_FILTERS: EchisLocalFilters = {
	district: "",
	county: "",
	verificationStatus: "",
	fromDate: "",
	toDate: "",
};

/** Maps the inline UI fields to the backend's local query params. */
export function echisLocalFiltersToParams(
	f: EchisLocalFilters
): Record<string, string> {
	const p: Record<string, string> = {};
	if (f.district.trim()) p.district = f.district.trim();
	if (f.county.trim()) p.county = f.county.trim();
	if (f.verificationStatus.trim())
		p.verificationStatus = f.verificationStatus.trim();
	if (f.fromDate.trim()) p.from_date = f.fromDate.trim();
	if (f.toDate.trim()) p.to_date = f.toDate.trim();
	return p;
}
