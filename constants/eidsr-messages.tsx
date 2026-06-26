export const EIDSR_MESSAGES_CONFIG = {
	PAGE_TITLE: "EIDSR SMS Messages",
	PAGE_DESCRIPTION:
		"Local EIDSR SMS messages — sync, review, verify into alerts, and manage",
	ITEMS_PER_PAGE: 25,
} as const;

/** EIDSR local SMS messages API paths (under /api/v1). */
export const EIDSR_MESSAGES_API_PATHS = {
	messages: "/eidsr/local/messages",
	messageById: (id: number) => `/eidsr/local/messages/${id}`,
	/** POST verify — primary route */
	verify: (id: number) => `/eidsr/local/messages/${id}/verify`,
	/** POST verify — alternate route order */
	verifyAlt: (id: number) => `/eidsr/local/messages/verify/${id}`,
	sync: "/eidsr/local/messages/sync",
	stats: "/eidsr/local/messages/stats",
	options: "/eidsr/local/messages/options",
} as const;

export const EIDSR_MESSAGE_STAT_LABELS: Record<string, string> = {
	total: "Total messages",
	totalMessages: "Total messages",
	linked: "Linked",
	unlinked: "Not linked",
	verified: "Verified",
	verifiedMessages: "Verified messages",
	unverified: "Unverified",
	unverifiedMessages: "Unverified messages",
	synced: "Synced",
	syncedMessages: "Synced messages",
	pending: "Pending",
};
