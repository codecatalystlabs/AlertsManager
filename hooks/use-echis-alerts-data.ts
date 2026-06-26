import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
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
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState<number>(ECHIS_ALERTS_CONFIG.ITEMS_PER_PAGE);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [syncProgress, setSyncProgress] = useState<NdwSyncProgress | null>(null);

	const swrKey = useMemo(
		() => ["echis-alerts", applied, page, limit] as const,
		[applied, page, limit]
	);

	const { data, error, isLoading, isValidating, mutate } = useSWR(
		swrKey,
		async () => {
			const hasNdwFilters = countActiveNdwFilters(applied.ndwFilters) > 0;
			const [list, stats] = await Promise.all([
				listEchisAlerts({
					page,
					limit,
					search: applied.search || undefined,
					live: hasNdwFilters || undefined,
					ndwFilters: hasNdwFilters ? applied.ndwFilters : undefined,
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
		clearFilters: () => {
			setFilters(ECHIS_INITIAL_NDW_FILTERS);
			setApplied(ECHIS_INITIAL_NDW_FILTERS);
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
