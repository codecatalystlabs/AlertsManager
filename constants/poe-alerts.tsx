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
};

export const POE_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
};
