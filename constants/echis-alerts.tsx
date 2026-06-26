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
};

export const ECHIS_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
};
