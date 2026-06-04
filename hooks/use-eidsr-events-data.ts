import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface EidsrPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

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
	verificationFilter: "all" | "linked" | "unlinked";
	setVerificationFilter: (f: "all" | "linked" | "unlinked") => void;
	setFilters: (patch: Partial<EidsrAlertsFilterState>) => void;
	clearFilters: () => void;
	applyFilters: () => Promise<void>;
	setPage: (page: number) => void;
	setPageSize: (limit: number) => void;
	refetch: () => Promise<void>;
	syncFromRemote: () => Promise<void>;
	updateLocalMessage: (message: EidsrMessage) => void;
	markMessageLinked: (id: number, linkedAlertId: number | null) => void;
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
	verificationFilter: "all" | "linked" | "unlinked"
): EidsrMessage[] {
	const localId = filters.localId.trim();
	if (localId) {
		const id = Number(localId);
		if (Number.isInteger(id) && id > 0) {
			return messages.filter((m) => m.id === id);
		}
	}

	return messages.filter((m) => {
		if (verificationFilter === "linked" && m.linkedAlertId == null) {
			return false;
		}
		if (verificationFilter === "unlinked" && m.linkedAlertId != null) {
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

export function useEidsrEventsData(): UseEidsrEventsDataReturn {
	const [allMessages, setAllMessages] = useState<EidsrMessage[]>([]);
	const [supportsSmsApi, setSupportsSmsApi] = useState(false);
	const [stats, setStats] = useState<Record<string, number>>({});
	const [options, setOptions] = useState<EidsrMessageOptions>({});
	const [filters, setFiltersState] = useState<EidsrAlertsFilterState>({
		...EIDSR_INITIAL_FILTERS,
	});
	const [verificationFilter, setVerificationFilter] = useState<
		"all" | "linked" | "unlinked"
	>("all");
	const [page, setPageState] = useState(1);
	const [limit, setLimitState] = useState<number>(
		EIDSR_ALERTS_CONFIG.ITEMS_PER_PAGE
	);
	const [serverTotal, setServerTotal] = useState(0);
	const [serverTotalPages, setServerTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	const filtersRef = useRef(filters);
	filtersRef.current = filters;
	const verificationFilterRef = useRef(verificationFilter);
	verificationFilterRef.current = verificationFilter;
	const pageRef = useRef(page);
	pageRef.current = page;
	const limitRef = useRef(limit);
	limitRef.current = limit;

	const pagination = useMemo(
		(): EidsrPagination => ({
			page,
			limit,
			total: serverTotal,
			totalPages: serverTotalPages,
		}),
		[page, limit, serverTotal, serverTotalPages]
	);

	const messages = useMemo(
		() =>
			filterMessagesClient(
				allMessages,
				filters,
				verificationFilter
			),
		[allMessages, filters, verificationFilter]
	);

	const refreshStats = useCallback(
		async (list: EidsrMessage[], eventsTotal: number) => {
			try {
				setStats(await getEidsr6767Stats(list, eventsTotal));
			} catch {
				/* supplementary */
			}
		},
		[]
	);

	const loadMessages = useCallback(async () => {
		setIsValidating(true);
		setError(null);

		try {
			const current = filtersRef.current;
			const localId = current.localId.trim();

			if (localId) {
				const id = Number(localId);
				if (!Number.isInteger(id) || id <= 0) {
					throw new Error("Local ID must be a positive whole number");
				}
				const one = await getEidsr6767ById(id);
				const enriched = enrichEidsrMessage(one.message);
				setAllMessages([enriched]);
				setServerTotal(1);
				setServerTotalPages(1);
				setPageState(1);
				await refreshStats([enriched], 1);
			} else {
				const pageResult = await listEidsr6767(
					toEventsApiParams(
						current,
						pageRef.current,
						limitRef.current
					)
				);
				const loaded = pageResult.messages.map((m) =>
					enrichEidsrMessage(m)
				);
				setAllMessages(loaded);
				setServerTotal(pageResult.pagination.total);
				setServerTotalPages(pageResult.pagination.totalPages);
				setPageState(pageResult.pagination.page);
				setLimitState(pageResult.pagination.limit);
				await refreshStats(loaded, pageResult.pagination.total);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load 6767 messages";
			setError(message);
			setAllMessages([]);
			setServerTotal(0);
			setServerTotalPages(1);
		} finally {
			setLoading(false);
			setIsValidating(false);
		}
	}, [refreshStats]);

	const setFilters = useCallback((patch: Partial<EidsrAlertsFilterState>) => {
		setFiltersState((prev) => {
			const next = { ...prev, ...patch };
			filtersRef.current = next;
			return next;
		});
		setPageState(1);
		pageRef.current = 1;
	}, []);

	const clearFilters = useCallback(() => {
		const reset = { ...EIDSR_INITIAL_FILTERS };
		filtersRef.current = reset;
		setFiltersState(reset);
		setVerificationFilter("all");
		setPageState(1);
		pageRef.current = 1;
	}, []);

	const applyFilters = useCallback(async () => {
		setPageState(1);
		pageRef.current = 1;
		setLoading(true);
		await loadMessages();
	}, [loadMessages]);

	const setPage = useCallback((nextPage: number) => {
		setPageState(nextPage);
		pageRef.current = nextPage;
	}, []);

	const setPageSize = useCallback((nextLimit: number) => {
		setLimitState(nextLimit);
		limitRef.current = nextLimit;
		setPageState(1);
		pageRef.current = 1;
	}, []);

	const refetch = useCallback(async () => {
		setIsValidating(true);
		await loadMessages();
	}, [loadMessages]);

	const syncFromRemote = useCallback(async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		setError(null);

		try {
			await syncEidsr6767();
			setSyncMessage("6767 events updated from EIDSR.");
			setPageState(1);
			pageRef.current = 1;
			await loadMessages();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to sync from EIDSR";
			setError(message);
		} finally {
			setIsSyncing(false);
		}
	}, [loadMessages]);

	const updateLocalMessage = useCallback((updated: EidsrMessage) => {
		setAllMessages((prev) =>
			prev.map((m) => (m.id === updated.id ? updated : m))
		);
	}, []);

	const markMessageLinked = useCallback(
		(id: number, linkedAlertId: number | null) => {
			setAllMessages((prev) => {
				const next = prev.map((m) =>
					m.id === id
						? {
								...m,
								isVerified: linkedAlertId != null,
								linkedAlertId: linkedAlertId ?? m.linkedAlertId,
							}
						: m
				);
				void refreshStats(next, serverTotal);
				return next;
			});
		},
		[refreshStats, serverTotal]
	);

	const loadOptions = useCallback(async () => {
		try {
			setOptions(await getEidsr6767Options());
		} catch {
			/* optional */
		}
	}, []);

	useEffect(() => {
		void probeEidsrSmsApi().then(setSupportsSmsApi);
		void loadOptions();
	}, [loadOptions]);

	useEffect(() => {
		void loadMessages();
	}, [loadMessages, page, limit]);

	return {
		messages,
		allMessages,
		supportsSmsApi,
		stats,
		options,
		filters,
		pagination,
		loading,
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
		updateLocalMessage,
		markMessageLinked,
	};
}
