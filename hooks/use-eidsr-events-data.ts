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
	getEidsr6767SyncStatus,
	listEidsr6767,
	probeEidsrSmsApi,
	syncEidsr6767,
} from "@/lib/fetch-eidsr-6767";
import type {
	EidsrEventsListParams,
	EidsrSyncProgress,
} from "@/lib/fetch-eidsr-events";
import type { EidsrMessageOptions } from "@/lib/fetch-eidsr-messages";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";
import { sourceFilterValues } from "@/lib/source-of-alert";
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
	syncProgress: EidsrSyncProgress | null;
	verificationFilter: EidsrLinkFilter;
	setVerificationFilter: (f: EidsrLinkFilter) => void;
	setFilters: (patch: Partial<EidsrAlertsFilterState>) => void;
	clearFilters: () => void;
	applyFilters: () => Promise<void>;
	setPage: (page: number) => void;
	setPageSize: (limit: number) => void;
	refetch: () => Promise<void>;
	syncFromRemote: (opts?: { fullSync?: boolean }) => Promise<void>;
	exportToCsv: () => Promise<void>;
	exportToExcel: () => Promise<void>;
	isExporting: boolean;
	updateLocalMessage: (message: EidsrMessage) => void;
	markMessageLinked: (
		id: number,
		linkedAlertId: number | null,
		markVerified?: boolean
	) => void;
	markMessageForwarded: (id: number, district: string) => void;
}

function toEventsApiParams(
	filters: EidsrAlertsFilterState,
	verificationFilter: EidsrLinkFilter,
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
	if (filters.search.trim()) params.search = filters.search.trim();
	if (filters.disease.trim()) params.disease = filters.disease.trim();
	if (filters.district.trim()) params.district = filters.district.trim();
	if (filters.sex && filters.sex !== "all") params.sex = filters.sex;
	if (filters.source && filters.source !== "all") {
		// Expand the canonical label into every legacy stored alias so e.g.
		// "Community" also matches rows saved as "Community Member".
		params.source = sourceFilterValues(filters.source).join(",");
	}
	// Link status is filtered server-side (no more client-side page scanning).
	if (verificationFilter === "linked") params.linked = true;
	else if (verificationFilter === "unlinked") params.linked = false;
	// Forward-verification traceability scope (also server-side).
	if (filters.forwardVerification && filters.forwardVerification !== "all") {
		params.forward_verification = filters.forwardVerification;
	}
	return params;
}

/** Human summary of a finished sync, emphasising new records pulled. */
function summarizeSync(p: EidsrSyncProgress): string {
	const mode = p.incremental ? "Incremental sync" : "Full sync";
	const changes: string[] = [];
	if (p.imported > 0) changes.push(`${p.imported} new`);
	if (p.updated > 0) changes.push(`${p.updated} updated`);
	const what = changes.length ? changes.join(", ") : "no new messages";
	return `${mode} complete — ${what} (scanned ${p.scanned} of ${p.remoteTotal} remote events).`;
}

/** Received/created time as a sortable number; unknown/invalid dates sort last. */
function receivedTimestamp(m: EidsrMessage): number {
	const raw = m.receivedAt || m.createdAt;
	const t = raw ? new Date(raw).getTime() : 0;
	return Number.isNaN(t) ? 0 : t;
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
 * Single fetcher for the 6767 list. Every filter (status, dates, link status,
 * search) is applied server-side, so one page request is enough and the
 * returned pagination total already reflects the active filters.
 * - `localId` set → fetch that one event.
 * - otherwise → server-paginated page.
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

	const pageResult = await listEidsr6767(
		toEventsApiParams(filters, verificationFilter, page, limit)
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
	const [syncProgress, setSyncProgress] = useState<EidsrSyncProgress | null>(
		null
	);
	// Errors from actions (sync) that aren't part of the SWR fetch lifecycle.
	const [actionError, setActionError] = useState<string | null>(null);

	const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
		["eidsr-6767", filters, verificationFilter, page, limit] as const,
		([, f, vf, p, l]) => fetchEidsr6767(f, vf, p, l),
		{
			keepPreviousData: true,
			// Poll while the page is visible instead of refreshing on every
			// window-focus event, which can disrupt table review and dialogs.
			refreshInterval: EIDSR_ALERTS_CONFIG.AUTO_REFRESH_INTERVAL_MS,
			refreshWhenHidden: false,
			refreshWhenOffline: false,
			revalidateOnFocus: false,
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
		// The server already applied every filter; here we only float pending
		// (unverified) messages to the top of the current page, newest first
		// within each group, so new arrivals are easy to spot.
		return [...allMessages].sort((a, b) => {
			const byVerified =
				Number(isEidsr6767Verified(a)) - Number(isEidsr6767Verified(b));
			if (byVerified !== 0) return byVerified;
			return receivedTimestamp(b) - receivedTimestamp(a);
		});
	}, [allMessages]);

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

	const syncFromRemote = useCallback(
		async (opts?: { fullSync?: boolean }) => {
			setIsSyncing(true);
			setSyncMessage(null);
			setActionError(null);
			setSyncProgress(null);
			try {
				// Kick off a background sync (incremental by default) — returns at
				// once, so the request never hits the proxy/undici timeout that used
				// to surface as a misleading "could not pull data from EIDSR" error.
				const start = await syncEidsr6767(opts?.fullSync ?? false);
				setSyncProgress(start.progress);

				// Poll the live progress until the background sync settles.
				const deadline = Date.now() + 20 * 60 * 1000; // 20-min safety cap
				let final: EidsrSyncProgress = start.progress;
				for (;;) {
					await new Promise((resolve) => setTimeout(resolve, 1200));
					let status: EidsrSyncProgress;
					try {
						status = await getEidsr6767SyncStatus();
					} catch {
						if (Date.now() > deadline) break;
						continue; // transient poll error — keep watching
					}
					setSyncProgress(status);
					final = status;
					if (!status.running || Date.now() > deadline) break;
				}

				if (final.phase === "error") {
					setActionError(final.error || "Failed to sync from EIDSR");
				} else {
					setSyncMessage(summarizeSync(final));
					setPageState(1);
					await mutate();
				}
			} catch (err) {
				setActionError(
					err instanceof Error ? err.message : "Failed to sync from EIDSR"
				);
			} finally {
				setIsSyncing(false);
			}
		},
		[mutate]
	);

	const loadMessagesForExport = useCallback(async (): Promise<
		EidsrMessage[]
	> => {
		// Server applies all filters (status, dates, link status, search), so the
		// exported set matches what the table shows — no client re-filtering.
		const pageResult = await listEidsr6767(
			toEventsApiParams(
				filters,
				verificationFilter,
				1,
				EIDSR_ALERTS_CONFIG.EXPORT_MAX_ROWS
			)
		);
		return pageResult.messages.map((m) => enrichEidsrMessage(m));
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

	const markMessageForwarded = useCallback(
		(id: number, district: string) => {
			// Optimistically stamp the forwarded district/time so the row's
			// "Forwarded" badge updates immediately, then revalidate.
			const now = new Date().toISOString();
			void mutate(
				(prev) =>
					prev
						? {
								...prev,
								allMessages: prev.allMessages.map((m) =>
									m.id === id
										? {
												...m,
												forwardedToDistrict: district,
												forwardedAt: now,
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
		syncProgress,
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
		markMessageForwarded,
	};
}
