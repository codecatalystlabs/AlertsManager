export const EIDSR_ALERTS_CONFIG = {
	PAGE_TITLE: "6767 Alerts",
	PAGE_DESCRIPTION:
		"6767 EIDSR SMS messages — sync, review, and verify into alerts",
	ITEMS_PER_PAGE: 10,
	EXPORT_FILENAME_PREFIX: "6767_messages",
	/** Max rows pulled in one request when exporting all matching messages. */
	EXPORT_MAX_ROWS: 100000,
} as const;

/** EIDSR / 6767 messages API paths (under /api/v1). */
export const EIDSR_API_PATHS = {
	events: "/eidsr/local/events",
	eventById: (localId: number) => `/eidsr/local/events/${localId}`,
	refresh: "/eidsr/local/refresh",
	/** POST verify 6767 event into alerts */
	eventVerify: (id: number) => `/eidsr/local/events/${id}/verify`,
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
