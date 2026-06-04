import { useCallback, useEffect, useRef, useState } from "react";
import {
	EIDSR_ALERTS_CONFIG,
	EIDSR_INITIAL_FILTERS,
	type EidsrAlertsFilterState,
} from "@/constants/eidsr-alerts";
import {
	fetchEidsrEventById,
	fetchEidsrEventsPage,
	refreshEidsrEvents,
	type EidsrEvent,
	type EidsrEventsListParams,
} from "@/lib/fetch-eidsr-events";

interface EidsrPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface UseEidsrEventsDataReturn {
	events: EidsrEvent[];
	filters: EidsrAlertsFilterState;
	pagination: EidsrPagination;
	loading: boolean;
	isSyncing: boolean;
	isValidating: boolean;
	error: string | null;
	syncMessage: string | null;
	setFilters: (patch: Partial<EidsrAlertsFilterState>) => void;
	clearFilters: () => void;
	applyFilters: () => Promise<void>;
	setPage: (page: number) => void;
	setPageSize: (limit: number) => void;
	refetch: () => Promise<void>;
	syncFromRemote: () => Promise<void>;
}

function toApiParams(
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

export function useEidsrEventsData(): UseEidsrEventsDataReturn {
	const [events, setEvents] = useState<EidsrEvent[]>([]);
	const [filters, setFiltersState] = useState<EidsrAlertsFilterState>({
		...EIDSR_INITIAL_FILTERS,
	});
	const [page, setPageState] = useState(1);
	const [limit, setLimitState] = useState<number>(
		EIDSR_ALERTS_CONFIG.ITEMS_PER_PAGE
	);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	const filtersRef = useRef(filters);
	filtersRef.current = filters;
	const pageRef = useRef(page);
	pageRef.current = page;
	const limitRef = useRef(limit);
	limitRef.current = limit;

	const loadEvents = useCallback(async () => {
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
				const event = await fetchEidsrEventById(id);
				setEvents([event]);
				setPageState(1);
				setTotal(1);
				setTotalPages(1);
			} else {
				const result = await fetchEidsrEventsPage(
					toApiParams(current, pageRef.current, limitRef.current)
				);
				setEvents(result.data);
				setPageState(result.page);
				setLimitState(result.limit);
				setTotal(result.total);
				setTotalPages(result.totalPages);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load 6767 alerts";
			setError(message);
			setEvents([]);
			setTotal(0);
			setTotalPages(1);
		} finally {
			setLoading(false);
			setIsValidating(false);
		}
	}, []);

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
		setPageState(1);
		pageRef.current = 1;
	}, []);

	const applyFilters = useCallback(async () => {
		const previousPage = pageRef.current;
		setPageState(1);
		pageRef.current = 1;
		setLoading(true);
		if (previousPage === 1) {
			await loadEvents();
		}
	}, [loadEvents]);

	const setPage = useCallback(
		(nextPage: number) => {
			setPageState(nextPage);
			pageRef.current = nextPage;
		},
		[]
	);

	const setPageSize = useCallback((nextLimit: number) => {
		setLimitState(nextLimit);
		limitRef.current = nextLimit;
		setPageState(1);
		pageRef.current = 1;
	}, []);

	const refetch = useCallback(async () => {
		setIsValidating(true);
		await loadEvents();
	}, [loadEvents]);

	const syncFromRemote = useCallback(async () => {
		setIsSyncing(true);
		setSyncMessage(null);
		setError(null);

		try {
			await refreshEidsrEvents(true);
			setSyncMessage("6767 messages updated from EIDSR.");
			await loadEvents();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to sync 6767 alerts from EIDSR";
			setError(message);
		} finally {
			setIsSyncing(false);
		}
	}, [loadEvents]);

	useEffect(() => {
		loadEvents();
	}, [loadEvents, page, limit]);

	return {
		events,
		filters,
		pagination: { page, limit, total, totalPages },
		loading,
		isSyncing,
		isValidating,
		error,
		syncMessage,
		setFilters,
		clearFilters,
		applyFilters,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
	};
}
