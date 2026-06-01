export const EIDSR_ALERTS_CONFIG = {
	PAGE_TITLE: "6767 Alerts",
	PAGE_DESCRIPTION:
		"EIDSR events synced from the 6767 hotline program (local mirror)",
	ITEMS_PER_PAGE: 10,
} as const;

export const EIDSR_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "SCHEDULE", label: "Scheduled" },
	{ value: "OVERDUE", label: "Overdue" },
	{ value: "SKIPPED", label: "Skipped" },
] as const;

export interface EidsrAlertsFilterState {
	status: string;
	fromDate: string;
	toDate: string;
	updatedAfter: string;
	localId: string;
}

export const EIDSR_INITIAL_FILTERS: EidsrAlertsFilterState = {
	status: "all",
	fromDate: "",
	toDate: "",
	updatedAfter: "",
	localId: "",
};
