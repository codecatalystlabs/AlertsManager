import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
	POE_ALERTS_CONFIG,
	POE_INITIAL_NDW_FILTERS,
	type NdwAlertsFilterState,
} from "@/constants/poe-alerts";
import {
	getPoeStats,
	getPoeSyncStatus,
	listPoeAlerts,
	syncPoeAlerts,
	type NdwSyncProgress,
	type PoeAlertRow,
} from "@/lib/fetch-ndw-alerts";
import { countActiveNdwFilters } from "@/constants/ndw-filter-fields";

function summarizeSync(p: NdwSyncProgress): string {
	const mode = p.incremental ? "Incremental sync" : "Full sync";
	if (p.error) return p.error;
	const changes: string[] = [];
	if (p.imported > 0) changes.push(`${p.imported} new`);
	if (p.updated > 0) changes.push(`${p.updated} updated`);
	const what = changes.length ? changes.join(", ") : "no new records";
	return `${mode} complete — ${what} (scanned ${p.scanned}).`;
}

export function usePoeAlertsData() {
	const [filters, setFilters] = useState<NdwAlertsFilterState>(POE_INITIAL_NDW_FILTERS);
	const [applied, setApplied] = useState<NdwAlertsFilterState>(POE_INITIAL_NDW_FILTERS);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState<number>(POE_ALERTS_CONFIG.ITEMS_PER_PAGE);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [syncProgress, setSyncProgress] = useState<NdwSyncProgress | null>(null);

	const swrKey = useMemo(
		() => ["poe-alerts", applied, page, limit] as const,
		[applied, page, limit]
	);

	const { data, error, isLoading, isValidating, mutate } = useSWR(
		swrKey,
		async () => {
			const hasNdwFilters = countActiveNdwFilters(applied.ndwFilters) > 0;
			const hasLocalFilters = Object.keys(applied.local).length > 0;
			const [list, stats] = await Promise.all([
				listPoeAlerts({
					page,
					limit,
					search: applied.search || undefined,
					live: hasNdwFilters || undefined,
					ndwFilters: hasNdwFilters ? applied.ndwFilters : undefined,
					localFilters: hasLocalFilters ? applied.local : undefined,
				}),
				getPoeStats().catch(() => ({ totalAlerts: 0 })),
			]);
			return { ...list, stats };
		},
		{ refreshInterval: POE_ALERTS_CONFIG.AUTO_REFRESH_INTERVAL_MS }
	);

	const alerts: PoeAlertRow[] = data?.alerts ?? [];
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
	};

	const pollSync = useCallback(async () => {
		const progress = await getPoeSyncStatus();
		setSyncProgress(progress);
		if (progress.running) {
			setTimeout(() => void pollSync(), 2000);
			return;
		}
		setIsSyncing(false);
		setSyncMessage(summarizeSync(progress));
		await mutate();
	}, [mutate]);

	const syncFromRemote = useCallback(
		async (opts?: { fullSync?: boolean }) => {
			setIsSyncing(true);
			setSyncMessage("Starting sync from NDW…");
			try {
				const res = await syncPoeAlerts(opts?.fullSync ?? false);
				setSyncProgress(res.progress);
				if (res.progress.running) {
					setTimeout(() => void pollSync(), 1500);
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
		setSearch: (search: string) => setFilters((f) => ({ ...f, search })),
		setNdwFilters: (ndwFilters: Record<string, string>) =>
			setFilters((f) => ({ ...f, ndwFilters })),
		setOperators: (operators: Record<string, string>) =>
			setFilters((f) => ({ ...f, operators })),
		// Inline local filters apply immediately by updating `applied`, which
		// changes the SWR key and refetches against the local DB list endpoint.
		applyLocalFilters: (local: Record<string, string>) => {
			setFilters((f) => ({ ...f, local }));
			setApplied((a) => ({ ...a, local }));
			setPage(1);
		},
		clearLocalFilters: () => {
			setFilters((f) => ({ ...f, local: {} }));
			setApplied((a) => ({ ...a, local: {} }));
			setPage(1);
		},
		clearFilters: () => {
			setFilters(POE_INITIAL_NDW_FILTERS);
			setApplied(POE_INITIAL_NDW_FILTERS);
			setPage(1);
		},
		applyFilters: async () => {
			setApplied(filters);
			setPage(1);
			await mutate();
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
	};
}
