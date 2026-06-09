import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
	EIDSR_ALERTS_CONFIG,
	EIDSR_INITIAL_FILTERS,
	type EidsrAlertsFilterState,
} from "@/constants/eidsr-alerts";
import {
	enrichEidsrMessage,
	type EidsrMessage,
} from "@/lib/eidsr-message-normalize";
import {
	getEidsr6767ById,
	getEidsr6767Options,
	getEidsr6767Stats,
	listEidsr6767,
	probeEidsrSmsApi,
	syncEidsr6767,
} from "@/lib/fetch-eidsr-6767";
import type { EidsrEventsListParams } from "@/lib/fetch-eidsr-events";
import type { EidsrMessageOptions } from "@/lib/fetch-eidsr-messages";
import {
	isEidsr6767LinkedToAlert,
	isEidsr6767Verified,
} from "@/lib/eidsr-verified-state";
import {
	exportEidsrMessagesToCsv,
	exportEidsrMessagesToExcel,
} from "@/lib/eidsr-export";

interface EidsrPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

type EidsrLinkFilter = "all" | "linked" | "unlinked";

interface UseEidsrEventsDataReturn {
	messages: EidsrMessage[];
	allMessages: EidsrMessage[];
	supportsSmsApi: boolean;
	stats: Record<string, number>;
	options: EidsrMessageOptions;
	filters: EidsrAlertsFilterState;
	pagination: EidsrPagination;
	loading: boolean;
	isSyncing: boolean;
	isValidating: boolean;
	error: string | null;
	syncMessage: string | null;
	verificationFilter: EidsrLinkFilter;
	setVerificationFilter: (f: EidsrLinkFilter) => void;
	setFilters: (patch: Partial<EidsrAlertsFilterState>) => void;
	clearFilters: () => void;
	applyFilters: () => Promise<void>;
	setPage: (page: number) => void;
	setPageSize: (limit: number) => void;
	refetch: () => Promise<void>;
	syncFromRemote: () => Promise<void>;
	exportToCsv: () => Promise<void>;
	exportToExcel: () => Promise<void>;
	isExporting: boolean;
	updateLocalMessage: (message: EidsrMessage) => void;
	markMessageLinked: (
		id: number,
		linkedAlertId: number | null,
		markVerified?: boolean
	) => void;
}

function toEventsApiParams(
	filters: EidsrAlertsFilterState,
	page: number,
	limit: number
): EidsrEventsListParams {
	const params: EidsrEventsListParams = { page, limit };
	if (filters.status && filters.status !== "all") {
		params.status = filters.status;
	}
	if (filters.fromDate) params.from_date = filters.fromDate;
	if (filters.toDate) params.to_date = filters.toDate;
	if (filters.updatedAfter) params.updated_after = filters.updatedAfter;
	return params;
}

function filterMessagesClient(
	messages: EidsrMessage[],
	filters: EidsrAlertsFilterState,
	verificationFilter: EidsrLinkFilter
): EidsrMessage[] {
	const localId = filters.localId.trim();
	if (localId) {
		const id = Number(localId);
		if (Number.isInteger(id) && id > 0) {
			return messages.filter((m) => m.id === id);
		}
	}

	return messages.filter((m) => {
		if (verificationFilter === "linked" && !isEidsr6767LinkedToAlert(m)) {
			return false;
		}
		if (verificationFilter === "unlinked" && isEidsr6767LinkedToAlert(m)) {
			return false;
		}
		if (filters.status && filters.status !== "all") {
			if ((m.status || "").toUpperCase() !== filters.status.toUpperCase()) {
				return false;
			}
		}
		return true;
	});
}

function paginateMessages(
	messages: EidsrMessage[],
	page: number,
	limit: number
): EidsrMessage[] {
	const start = Math.max(0, page - 1) * limit;
	return messages.slice(start, start + limit);
}

function totalPagesFor(total: number, limit: number): number {
	return limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
}

/** Received/created time as a sortable number; unknown/invalid dates sort last. */
function receivedTimestamp(m: EidsrMessage): number {
	const raw = m.receivedAt || m.createdAt;
	const t = raw ? new Date(raw).getTime() : 0;
	return Number.isNaN(t) ? 0 : t;
}

async function listMessagesForLinkFilter(
	filters: EidsrAlertsFilterState
): Promise<{ messages: EidsrMessage[]; total: number }> {
	const maxRows = EIDSR_ALERTS_CONFIG.EXPORT_MAX_ROWS;
	const firstPage = await listEidsr6767(toEventsApiParams(filters, 1, maxRows));
	const messages = firstPage.messages.map((m) => enrichEidsrMessage(m));
	const total = firstPage.pagination.total;
	const cappedTotal = Math.min(total, maxRows);
	const pageLimit = firstPage.pagination.limit || messages.length;

	if (
		pageLimit <= 0 ||
		messages.length >= cappedTotal ||
		firstPage.pagination.totalPages <= 1
	) {
		return { messages, total };
	}

	for (
		let page = 2;
		page <= firstPage.pagination.totalPages && messages.length < cappedTotal;
		page += 1
	) {
		const remaining = maxRows - messages.length;
		const nextPage = await listEidsr6767(
			toEventsApiParams(filters, page, Math.min(pageLimit, remaining))
		);
		messages.push(...nextPage.messages.map((m) => enrichEidsrMessage(m)));
	}

	return { messages, total };
}

/** Stats are supplementary — never let them fail the whole fetch. */
async function safeStats(
	list: EidsrMessage[],
	eventsTotal: number
): Promise<Record<string, number>> {
	try {
		return await getEidsr6767Stats(list, eventsTotal);
	} catch {
		return {};
	}
}

interface EidsrFetchResult {
	allMessages: EidsrMessage[];
	total: number;
	totalPages: number;
	page: number;
	limit: number;
	stats: Record<string, number>;
}

/**
 * Single fetcher for the 6767 list. Branches on mode:
 * - `localId` set → fetch that one event.
 * - `verificationFilter === "all"` → server-paginated page.
 * - linked/unlinked → load all (capped), client-filter; the hook paginates.
 */
async function fetchEidsr6767(
	filters: EidsrAlertsFilterState,
	verificationFilter: EidsrLinkFilter,
	page: number,
	limit: number
): Promise<EidsrFetchResult> {
	const localId = filters.localId.trim();

	if (localId) {
		const id = Number(localId);
		if (!Number.isInteger(id) || id <= 0) {
			throw new Error("Local ID must be a positive whole number");
		}
		const one = await getEidsr6767ById(id);
		const enriched = enrichEidsrMessage(one.message);
		return {
			allMessages: [enriched],
			total: 1,
			totalPages: 1,
			page: 1,
			limit,
			stats: await safeStats([enriched], 1),
		};
	}

	if (verificationFilter === "all") {
		const pageResult = await listEidsr6767(
			toEventsApiParams(filters, page, limit)
		);
		const loaded = pageResult.messages.map((m) => enrichEidsrMessage(m));
		return {
			allMessages: loaded,
			total: pageResult.pagination.total,
			totalPages: pageResult.pagination.totalPages,
			page: pageResult.pagination.page,
			limit: pageResult.pagination.limit,
			stats: await safeStats(loaded, pageResult.pagination.total),
		};
	}

	const { messages: loaded, total } = await listMessagesForLinkFilter(filters);
	const filtered = filterMessagesClient(loaded, filters, verificationFilter);
	return {
		allMessages: filtered,
		total: filtered.length,
		totalPages: totalPagesFor(filtered.length, limit),
		page,
		limit,
		stats: await safeStats(loaded, total),
	};
}

export function useEidsrEventsData(): UseEidsrEventsDataReturn {
	const [filters, setFiltersState] = useState<EidsrAlertsFilterState>({
		...EIDSR_INITIAL_FILTERS,
	});
	const [verificationFilter, setVerificationFilterState] =
		useState<EidsrLinkFilter>("all");
	const [page, setPageState] = useState(1);
	const [limit, setLimitState] = useState<number>(
		EIDSR_ALERTS_CONFIG.ITEMS_PER_PAGE
	);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	// Errors from actions (sync) that aren't part of the SWR fetch lifecycle.
	const [actionError, setActionError] = useState<string | null>(null);

	const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
		["eidsr-6767", filters, verificationFilter, page, limit] as const,
		([, f, vf, p, l]) => fetchEidsr6767(f, vf, p, l),
		{
			keepPreviousData: true,
			// Always pull the latest 6767 signals when the user returns to the tab.
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
		}
	);

	const optionsQuery = useSWR("eidsr-6767-options", getEidsr6767Options);
	const smsQuery = useSWR("eidsr-6767-sms-probe", probeEidsrSmsApi);

	const allMessages = useMemo(
		() => data?.allMessages ?? [],
		[data?.allMessages]
	);
	const serverTotal = data?.total ?? 0;
	const serverTotalPages = data?.totalPages ?? 1;
	const stats = data?.stats ?? {};
	const options: EidsrMessageOptions = optionsQuery.data ?? {};
	const supportsSmsApi = smsQuery.data ?? false;

	const error = swrError
		? swrError instanceof Error
			? swrError.message
			: "Failed to load 6767 messages"
		: actionError;

	const pagination = useMemo(
		(): EidsrPagination => ({
			page: Math.min(page, serverTotalPages),
			limit,
			total: serverTotal,
			totalPages: serverTotalPages,
		}),
		[page, limit, serverTotal, serverTotalPages]
	);

	const messages = useMemo(() => {
		const filtered = filterMessagesClient(
			allMessages,
			filters,
			verificationFilter
		);
		// Float pending (unverified) messages to the top, and within each group
		// show the newest signals first so new arrivals appear at the top.
		const sorted = [...filtered].sort((a, b) => {
			const byVerified =
				Number(isEidsr6767Verified(a)) - Number(isEidsr6767Verified(b));
			if (byVerified !== 0) return byVerified;
			return receivedTimestamp(b) - receivedTimestamp(a);
		});

		if (verificationFilter === "all") return sorted;
		const effectivePage = Math.min(page, totalPagesFor(sorted.length, limit));
		return paginateMessages(sorted, effectivePage, limit);
	}, [allMessages, filters, verificationFilter, page, limit]);

	const setFilters = useCallback((patch: Partial<EidsrAlertsFilterState>) => {
		setFiltersState((prev) => ({ ...prev, ...patch }));
		setPageState(1);
	}, []);

	const setVerificationFilter = useCallback((filter: EidsrLinkFilter) => {
		setVerificationFilterState(filter);
		setPageState(1);
	}, []);

	const clearFilters = useCallback(() => {
		setFiltersState({ ...EIDSR_INITIAL_FILTERS });
		setVerificationFilterState("all");
		setPageState(1);
	}, []);

	const applyFilters = useCallback(async () => {
		setPageState(1);
		await mutate();
	}, [mutate]);

	const setPage = useCallback((nextPage: number) => {
		setPageState(nextPage);
	}, []);

	const setPageSize = useCallback((nextLimit: number) => {
		setLimitState(nextLimit);
		setPageState(1);
	}, []);

	const refetch = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const syncFromRemote = useCallback(async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		setActionError(null);
		try {
			await syncEidsr6767();
			setSyncMessage("6767 events updated from EIDSR.");
			setPageState(1);
			await mutate();
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : "Failed to sync from EIDSR"
			);
		} finally {
			setIsSyncing(false);
		}
	}, [mutate]);

	const loadMessagesForExport = useCallback(async (): Promise<
		EidsrMessage[]
	> => {
		const pageResult = await listEidsr6767(
			toEventsApiParams(filters, 1, EIDSR_ALERTS_CONFIG.EXPORT_MAX_ROWS)
		);
		const loaded = pageResult.messages.map((m) => enrichEidsrMessage(m));
		return filterMessagesClient(loaded, filters, verificationFilter);
	}, [filters, verificationFilter]);

	const exportToCsv = useCallback(async () => {
		setIsExporting(true);
		try {
			const rows = await loadMessagesForExport();
			const exported = exportEidsrMessagesToCsv(
				rows,
				EIDSR_ALERTS_CONFIG.EXPORT_FILENAME_PREFIX
			);
			if (!exported) {
				window.alert(
					"No messages to export. Adjust your filters or refresh the data."
				);
			}
		} catch (err) {
			console.error("CSV export failed:", err);
			window.alert("Failed to export CSV file. Please try again.");
		} finally {
			setIsExporting(false);
		}
	}, [loadMessagesForExport]);

	const exportToExcel = useCallback(async () => {
		setIsExporting(true);
		try {
			const rows = await loadMessagesForExport();
			const exported = await exportEidsrMessagesToExcel(
				rows,
				EIDSR_ALERTS_CONFIG.EXPORT_FILENAME_PREFIX,
				"6767 Messages"
			);
			if (!exported) {
				window.alert(
					"No messages to export. Adjust your filters or refresh the data."
				);
			}
		} catch (err) {
			console.error("Excel export failed:", err);
			window.alert("Failed to export Excel file. Please try again.");
		} finally {
			setIsExporting(false);
		}
	}, [loadMessagesForExport]);

	const updateLocalMessage = useCallback(
		(updated: EidsrMessage) => {
			void mutate(
				(prev) =>
					prev
						? {
								...prev,
								allMessages: prev.allMessages.map((m) =>
									m.id === updated.id ? updated : m
								),
							}
						: prev,
				{ revalidate: false }
			);
		},
		[mutate]
	);

	const markMessageLinked = useCallback(
		(id: number, linkedAlertId: number | null, markVerified = false) => {
			// Optimistically patch the row, then revalidate so stats + verified
			// state reconcile with the server.
			void mutate(
				(prev) =>
					prev
						? {
								...prev,
								allMessages: prev.allMessages.map((m) =>
									m.id === id
										? {
												...m,
												isVerified:
													markVerified ||
													linkedAlertId != null ||
													m.isVerified,
												linkedAlertId:
													linkedAlertId ?? m.linkedAlertId,
											}
										: m
								),
							}
						: prev,
				{ revalidate: true }
			);
		},
		[mutate]
	);

	return {
		messages,
		allMessages,
		supportsSmsApi,
		stats,
		options,
		filters,
		pagination,
		loading: isLoading,
		isSyncing,
		isValidating,
		error,
		syncMessage,
		verificationFilter,
		setVerificationFilter,
		setFilters,
		clearFilters,
		applyFilters,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
		exportToCsv,
		exportToExcel,
		isExporting,
		updateLocalMessage,
		markMessageLinked,
	};
}
