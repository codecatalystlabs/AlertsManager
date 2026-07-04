import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { ColumnFiltersState } from "@tanstack/react-table";
import {
	ECHIS_ALERTS_CONFIG,
	ECHIS_INITIAL_NDW_FILTERS,
	type NdwAlertsFilterState,
} from "@/constants/echis-alerts";
import {
	getEchisStats,
	getEchisSyncStatus,
	listEchisAlerts,
	syncEchisAlerts,
	type EchisAlertRow,
	type NdwSyncProgress,
} from "@/lib/fetch-ndw-alerts";
import { countActiveNdwFilters } from "@/constants/ndw-filter-fields";
import { columnFiltersToEchisLocalParams } from "@/lib/echis-column-filters";

function summarizeSync(p: NdwSyncProgress): string {
	const mode = p.incremental ? "Incremental sync" : "Full sync";
	if (p.error) return p.error;
	const changes: string[] = [];
	if (p.imported > 0) changes.push(`${p.imported} new`);
	if (p.updated > 0) changes.push(`${p.updated} updated`);
	const what = changes.length ? changes.join(", ") : "no new records";
	return `${mode} complete — ${what} (scanned ${p.scanned}).`;
}

export function useEchisAlertsData() {
	const [filters, setFilters] = useState<NdwAlertsFilterState>(ECHIS_INITIAL_NDW_FILTERS);
	const [applied, setApplied] = useState<NdwAlertsFilterState>(ECHIS_INITIAL_NDW_FILTERS);
	// Per-column header filters (server-side, mirroring the 6767 table): they scope
	// the whole synced dataset, not just the loaded page.
	const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([]);
	// Bumped on clear so the data-table clears its header funnel UI too.
	const [filtersResetKey, setFiltersResetKey] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState<number>(ECHIS_ALERTS_CONFIG.ITEMS_PER_PAGE);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [syncProgress, setSyncProgress] = useState<NdwSyncProgress | null>(null);

	// Track the recursive sync-status poll so it can be cancelled on unmount —
	// otherwise it keeps firing requests + setState on an unmounted component until
	// the backend reports running:false (possibly never).
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
		};
	}, []);

	// Mapped once so the SWR key only changes when the resulting server params
	// change (not on every referentially-new ColumnFiltersState array).
	const columnParams = useMemo(
		() => columnFiltersToEchisLocalParams(columnFilters),
		[columnFilters]
	);

	const swrKey = useMemo(
		() => ["echis-alerts", applied, page, limit, columnParams] as const,
		[applied, page, limit, columnParams]
	);

	const { data, error, isLoading, isValidating, mutate } = useSWR(
		swrKey,
		async () => {
			const hasNdwFilters = countActiveNdwFilters(applied.ndwFilters) > 0;
			// The inline "filter synced records" card and the per-column header
			// filters both produce local query params; merge them, with the column
			// filters winning on overlap (mirrors the Alerts/6767 convention).
			const mergedLocal = { ...applied.local, ...columnParams };
			const hasLocalFilters = Object.keys(mergedLocal).length > 0;
			const [list, stats] = await Promise.all([
				listEchisAlerts({
					page,
					limit,
					search: applied.search || undefined,
					live: hasNdwFilters || undefined,
					ndwFilters: hasNdwFilters ? applied.ndwFilters : undefined,
					// Live (NDW proxy) and local-DB filtering are mutually exclusive:
					// the local filters aren't NDW columns, so sending them with a live
					// request is a silent no-op. Only send them outside live mode.
					localFilters:
						!hasNdwFilters && hasLocalFilters ? mergedLocal : undefined,
				}),
				getEchisStats().catch(() => ({ totalAlerts: 0, note: undefined })),
			]);
			return { ...list, stats };
		},
		{ refreshInterval: ECHIS_ALERTS_CONFIG.AUTO_REFRESH_INTERVAL_MS }
	);

	const alerts: EchisAlertRow[] = data?.alerts ?? [];
	const pagination = data?.pagination ?? {
		page: 1,
		limit,
		total: 0,
		totalPages: 0,
	};
	const stats = {
		total: data?.stats.totalAlerts ?? pagination.total,
		filtered: pagination.total,
		live: Boolean(data?.live),
		note: data?.stats?.note as string | undefined,
	};

	const pollSync = useCallback(async () => {
		const progress = await getEchisSyncStatus();
		if (!mountedRef.current) return;
		setSyncProgress(progress);
		if (progress.running) {
			pollTimerRef.current = setTimeout(() => void pollSync(), 2000);
			return;
		}
		setIsSyncing(false);
		setSyncMessage(summarizeSync(progress));
		await mutate();
	}, [mutate]);

	const syncFromRemote = useCallback(
		async (opts?: { fullSync?: boolean; refreshExisting?: boolean }) => {
			setIsSyncing(true);
			setSyncMessage("Starting sync from NDW…");
			try {
				const res = await syncEchisAlerts(
					opts?.fullSync ?? false,
					opts?.refreshExisting ?? true
				);
				setSyncProgress(res.progress);
				if (res.progress.running) {
					pollTimerRef.current = setTimeout(() => void pollSync(), 1500);
				} else {
					setIsSyncing(false);
					setSyncMessage(summarizeSync(res.progress));
					await mutate();
				}
			} catch (e) {
				setIsSyncing(false);
				setSyncMessage(e instanceof Error ? e.message : "Sync failed");
			}
		},
		[mutate, pollSync]
	);

	return {
		alerts,
		stats,
		filters,
		pagination,
		loading: isLoading,
		isValidating,
		isSyncing,
		error: error instanceof Error ? error.message : error ? String(error) : null,
		syncMessage,
		syncProgress,
		filtersResetKey,
		// Header column filters re-scope the whole dataset, so reset to page 1.
		setColumnFilters: (next: ColumnFiltersState) => {
			setColumnFiltersState(next);
			setPage(1);
		},
		setSearch: (search: string) => setFilters((f) => ({ ...f, search })),
		// Building an NDW (live) filter set drops any inline local filters, since
		// the two modes are mutually exclusive (see the fetcher).
		setNdwFilters: (ndwFilters: Record<string, string>) =>
			setFilters((f) => ({ ...f, ndwFilters, local: {} })),
		setOperators: (operators: Record<string, string>) =>
			setFilters((f) => ({ ...f, operators })),
		// Inline local filters apply immediately by updating `applied`, which
		// changes the SWR key and refetches against the local DB list endpoint.
		// They also clear NDW (live) filters so the local filter actually takes
		// effect rather than being ignored by a live request.
		applyLocalFilters: (local: Record<string, string>) => {
			setFilters((f) => ({ ...f, local, ndwFilters: {} }));
			setApplied((a) => ({ ...a, local, ndwFilters: {} }));
			setPage(1);
		},
		clearLocalFilters: () => {
			setFilters((f) => ({ ...f, local: {} }));
			setApplied((a) => ({ ...a, local: {} }));
			setPage(1);
		},
		clearFilters: () => {
			setFilters(ECHIS_INITIAL_NDW_FILTERS);
			setApplied(ECHIS_INITIAL_NDW_FILTERS);
			// Also drop any per-column header filters and reset the table's funnel UI.
			setColumnFiltersState([]);
			setFiltersResetKey((k) => k + 1);
			setPage(1);
		},
		applyFilters: async () => {
			// Committing filters changes the SWR key (applied/page), which itself
			// triggers the refetch — an explicit mutate() here would only revalidate
			// the STALE key (old filters), wasting a request.
			setApplied(filters);
			setPage(1);
		},
		setPage,
		setPageSize: (n: number) => {
			setLimit(n);
			setPage(1);
		},
		refetch: async () => {
			await mutate();
		},
		syncFromRemote,
		updateLocalAlert: (alert: EchisAlertRow) => {
			void mutate(
				(current) =>
					current
						? {
								...current,
								alerts: current.alerts.map((a) =>
									a.id === alert.id ? alert : a
								),
							}
						: current,
				{ revalidate: false }
			);
		},
	};
}
