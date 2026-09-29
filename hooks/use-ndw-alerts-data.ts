import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { NdwAlertsFilterState } from "@/constants/echis-alerts";
import type { NdwSource, NdwSyncProgress } from "@/lib/fetch-ndw-alerts";
import { countActiveNdwFilters } from "@/constants/ndw-filter-fields";
import { altCode } from "@/lib/alt-code";
import { notifyAlertsChanged } from "@/lib/alerts-events";

export type { NdwAlertsFilterState };

/**
 * Human summary of a finished sync. Leads with what the user will act on: how
 * many new records arrived and that they are already in Raw Information.
 */
function summarizeSync(p: NdwSyncProgress): string {
	if (p.error) return p.error;
	const mode = p.incremental ? "Incremental sync" : "Full sync";
	const changes: string[] = [];
	if (p.imported > 0) changes.push(`${p.imported} new`);
	if (p.updated > 0) changes.push(`${p.updated} updated`);
	const what = changes.length ? changes.join(", ") : "no new records";
	let summary = `${mode} complete — ${what} (scanned ${p.scanned}).`;
	const log = p.autoLog;
	if (log?.enabled && log.logged > 0) {
		const range =
			log.firstAlertId && log.lastAlertId
				? log.firstAlertId === log.lastAlertId
					? ` as ${altCode(log.firstAlertId)}`
					: ` as ${altCode(log.firstAlertId)}–${altCode(log.lastAlertId)}`
				: "";
		summary += ` ${log.logged} logged into Raw Information${range}, untriaged.`;
	}
	return summary;
}

export interface NdwAlertsDataConfig<TRow, TFacets> {
	/** SWR key namespace, e.g. "echis-alerts" / "poe-alerts". */
	key: string;
	/** Per-source client from createNdwSource(). */
	source: NdwSource<TRow, TFacets>;
	/**
	 * Local query param the segment tiles drive ("segment" for POE, "signal"
	 * for eCHIS). Sent with both the list and the facets request; the server
	 * leaves it out of the tile counts themselves, so every tile keeps showing
	 * its own number while one is selected.
	 */
	segmentParam: string;
	initialFilters: NdwAlertsFilterState;
	itemsPerPage: number;
	autoRefreshMs: number;
	/** Maps the table's per-column header filters → backend local query params. */
	columnParamsFn: (columnFilters: ColumnFiltersState) => Record<string, string>;
}

/**
 * List/sync/filter engine for an NDW signal feed (eCHIS or POE). The two feeds'
 * hooks were byte-identical apart from the source client, SWR key and column
 * mapper; this is the single implementation, and useEchisAlertsData /
 * usePoeAlertsData are thin config wrappers over it.
 */
export function useNdwAlertsData<TRow extends { id: number }, TFacets>({
	key,
	source,
	segmentParam,
	initialFilters,
	itemsPerPage,
	autoRefreshMs,
	columnParamsFn,
}: NdwAlertsDataConfig<TRow, TFacets>) {
	// What the list is filtered by right now. The quick-filter bar and the live
	// NDW sheet each stage their own edits and commit here in one step.
	const [applied, setApplied] = useState<NdwAlertsFilterState>(initialFilters);
	// The selected segment tile ("" = all); applies immediately, like a tab.
	const [segment, setSegmentState] = useState("");
	// Per-column header filters (server-side): they scope the whole synced
	// dataset, not just the loaded page.
	const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([]);
	// Bumped on clear so the data-table clears its header funnel UI too.
	const [filtersResetKey, setFiltersResetKey] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState<number>(itemsPerPage);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [syncProgress, setSyncProgress] = useState<NdwSyncProgress | null>(null);

	// Track the recursive sync-status poll so it can be cancelled on unmount —
	// otherwise it keeps firing requests + setState on an unmounted component
	// until the backend reports running:false (possibly never).
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
		() => columnParamsFn(columnFilters),
		[columnParamsFn, columnFilters]
	);

	const swrKey = useMemo(
		() => [key, applied, segment, page, limit, columnParams] as const,
		[key, applied, segment, page, limit, columnParams]
	);

	const { data, error, isLoading, isValidating, mutate } = useSWR(
		swrKey,
		async () => {
			const hasNdwFilters = countActiveNdwFilters(applied.ndwFilters) > 0;
			// The quick-filter bar, the per-column header filters and the segment
			// tile all produce local query params; merge them, with the column
			// filters winning on overlap (mirrors the Alerts/6767 convention).
			const mergedLocal: Record<string, string> = {
				...applied.local,
				...columnParams,
				...(segment ? { [segmentParam]: segment } : {}),
			};
			const hasLocalFilters = Object.keys(mergedLocal).length > 0;
			const [list, stats] = await Promise.all([
				source.list({
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
				source.stats().catch(() => ({ totalAlerts: 0, note: undefined })),
			]);
			return { ...list, stats };
		},
		{ refreshInterval: autoRefreshMs }
	);

	// Tile counts + chip options for the synced mirror under the applied
	// filters. The segment is sent too: the server leaves it out of the tile
	// counts (every tile keeps its number) but applies it to the chip options,
	// so "Kasese 12" inside "Needs follow-up" means 12 follow-ups. Not keyed on
	// page: paging never changes a count. keepPreviousData holds the old numbers
	// while new ones load, so the tiles do not blink on every change.
	const facetsKey = useMemo(
		() => [`${key}-facets`, applied.search, applied.local, columnParams, segment] as const,
		[key, applied.search, applied.local, columnParams, segment]
	);
	const {
		data: facets,
		isLoading: facetsLoading,
		mutate: mutateFacets,
	} = useSWR(
		facetsKey,
		() =>
			source.facets({
				search: applied.search || undefined,
				localFilters: {
					...applied.local,
					...columnParams,
					...(segment ? { [segmentParam]: segment } : {}),
				},
			}),
		{ refreshInterval: autoRefreshMs, keepPreviousData: true }
	);

	const alerts: TRow[] = data?.alerts ?? [];
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

	// The server logs a sync's new records into Raw Information itself; tell
	// the register's views so they do not show a stale list.
	const finishSync = useCallback(
		async (progress: NdwSyncProgress) => {
			setIsSyncing(false);
			setSyncMessage(summarizeSync(progress));
			if ((progress.autoLog?.logged ?? 0) > 0) notifyAlertsChanged();
			await Promise.all([mutate(), mutateFacets()]);
		},
		[mutate, mutateFacets]
	);

	const pollSync = useCallback(async () => {
		const progress = await source.syncStatus();
		if (!mountedRef.current) return;
		setSyncProgress(progress);
		if (progress.running) {
			pollTimerRef.current = setTimeout(() => void pollSync(), 2000);
			return;
		}
		await finishSync(progress);
	}, [finishSync, source]);

	const syncFromRemote = useCallback(
		async (opts?: { fullSync?: boolean; refreshExisting?: boolean }) => {
			setIsSyncing(true);
			setSyncMessage("Starting sync from NDW…");
			try {
				// refreshExisting defaults to true so a sync re-scans and UPDATES
				// existing rows — incremental-only would never pick up changes
				// (verification/risk) to already-synced signals.
				const res = await source.sync(
					opts?.fullSync ?? false,
					opts?.refreshExisting ?? true
				);
				setSyncProgress(res.progress);
				if (res.progress.running) {
					pollTimerRef.current = setTimeout(() => void pollSync(), 1500);
				} else {
					await finishSync(res.progress);
				}
			} catch (e) {
				setIsSyncing(false);
				setSyncMessage(e instanceof Error ? e.message : "Sync failed");
			}
		},
		[finishSync, pollSync, source]
	);

	// Memoized so its identity is stable across renders. The DataTable reports its
	// column-filter state via an effect keyed on the callback identity; an inline
	// (unstable) callback would make that effect fire every render and call
	// setPage(1), pinning the table on page 1 (pagination could never advance).
	const setColumnFilters = useCallback((next: ColumnFiltersState) => {
		setColumnFiltersState(next);
		setPage(1);
	}, []);

	const setSegment = useCallback((next: string) => {
		setSegmentState(next);
		setPage(1);
	}, []);

	return {
		alerts,
		stats,
		/** The filters the list is showing (search, quick/local, live NDW). */
		applied,
		facets,
		facetsLoading,
		segment,
		setSegment,
		pagination,
		loading: isLoading,
		isValidating,
		isSyncing,
		error: error instanceof Error ? error.message : error ? String(error) : null,
		syncMessage,
		syncProgress,
		filtersResetKey,
		// Header column filters re-scope the whole dataset, so reset to page 1.
		setColumnFilters,
		/**
		 * Commit the quick-filter bar: search + local (synced-mirror) params.
		 * Clears any live NDW filters — the two modes are mutually exclusive (a
		 * live request ignores local params; see the fetcher). Changing
		 * `applied` changes the SWR key, which is what refetches.
		 */
		applyQuickFilters: (search: string, local: Record<string, string>) => {
			setApplied((a) => ({ ...a, search, local, ndwFilters: {}, operators: {} }));
			setPage(1);
		},
		/** Commit the live NDW sheet; drops the local filters for the same reason. */
		applyLiveFilters: (
			ndwFilters: Record<string, string>,
			operators: Record<string, string>
		) => {
			setApplied((a) => ({ ...a, ndwFilters, operators, local: {} }));
			setPage(1);
		},
		/** Leave live NDW mode and go back to the synced records. */
		clearLiveFilters: () => {
			setApplied((a) => ({ ...a, ndwFilters: {}, operators: {} }));
			setPage(1);
		},
		clearFilters: () => {
			setApplied(initialFilters);
			// Also drop any per-column header filters and reset the table's funnel UI.
			setColumnFiltersState([]);
			setFiltersResetKey((k) => k + 1);
			setPage(1);
		},
		setPage,
		setPageSize: (n: number) => {
			setLimit(n);
			setPage(1);
		},
		refetch: async () => {
			await Promise.all([mutate(), mutateFacets()]);
		},
		syncFromRemote,
		updateLocalAlert: (alert: TRow) => {
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
