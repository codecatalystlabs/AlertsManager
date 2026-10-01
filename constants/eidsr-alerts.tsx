export const EIDSR_ALERTS_CONFIG = {
	PAGE_TITLE: "6767 Signals",
	PAGE_DESCRIPTION:
		"SMS signals sent to 6767, pulled from eIDSR. Each new one is logged into Raw Information as it arrives.",
	ITEMS_PER_PAGE: 10,
	EXPORT_FILENAME_PREFIX: "6767_messages",
	/** Background refresh cadence for the 6767 table while the page is open. */
	AUTO_REFRESH_INTERVAL_MS: 60_000,
	/** Max rows pulled in one request when exporting all matching messages. */
	EXPORT_MAX_ROWS: 100000,
} as const;

/** EIDSR / 6767 messages API paths (under /api/v1). */
export const EIDSR_API_PATHS = {
	events: "/eidsr/local/events",
	eventById: (localId: number) => `/eidsr/local/events/${localId}`,
	refresh: "/eidsr/local/refresh",
	/** GET — live progress of the running/last sync. */
	refreshStatus: "/eidsr/local/refresh/status",
	/** POST verify 6767 event into alerts */
	eventVerify: (id: number) => `/eidsr/local/events/${id}/verify`,
} as const;

/**
 * Status values, matched exactly server-side. SMS-inbox messages carry eIDSR's
 * SMS status; records from the old tracker feed carry the event status.
 */
export const EIDSR_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "PROCESSED", label: "Processed (SMS)" },
	{ value: "UNHANDLED", label: "Unhandled (SMS)" },
	{ value: "INCOMING", label: "Incoming (SMS)" },
	{ value: "PROCESSING", label: "Processing (SMS)" },
	{ value: "FAILED", label: "Failed (SMS)" },
	{ value: "COMPLETED", label: "Completed (event)" },
	{ value: "ACTIVE", label: "Active (event)" },
] as const;

/** Sex filter values. "all" = no filter; others are matched exactly server-side. */
export const EIDSR_SEX_FILTER_OPTIONS = [
	{ value: "all", label: "Any sex" },
	{ value: "Male", label: "Male" },
	{ value: "Female", label: "Female" },
] as const;

/**
 * Forward-verification traceability filter. Scopes the 6767 list by whether an
 * event was forwarded to a district and whether that forwarded alert has since
 * been verified there. "all" = no filter; the rest map to the server's
 * `forward_verification` query param.
 */
export const EIDSR_FORWARD_VERIFICATION_FILTER_OPTIONS = [
	{ value: "all", label: "Any forwarding" },
	{ value: "forwarded", label: "Forwarded (any)" },
	{ value: "forwarded_verified", label: "Forwarded & verified" },
	{ value: "forwarded_pending", label: "Forwarded, pending" },
] as const;

export interface EidsrAlertsFilterState {
	status: string;
	fromDate: string;
	toDate: string;
	updatedAfter: string;
	localId: string;
	/** Free-text search across reporter, phone, message, location, …; "" = none. */
	search: string;
	/** Suspected disease/syndrome substring; "" = none. */
	disease: string;
	/** Location/district substring; "" = none. */
	district: string;
	/** Location/division (subcounty) substring; "" = none. */
	division: string;
	/** Sex; "all" = none. */
	sex: string;
	/** Canonical source-of-alert label; "all" = none. */
	source: string;
	/** Forward-verification scope; "all" = none. See the options above. */
	forwardVerification: string;
}

export const EIDSR_INITIAL_FILTERS: EidsrAlertsFilterState = {
	status: "all",
	fromDate: "",
	toDate: "",
	updatedAfter: "",
	localId: "",
	search: "",
	disease: "",
	district: "",
	division: "",
	sex: "all",
	source: "all",
	forwardVerification: "all",
};
