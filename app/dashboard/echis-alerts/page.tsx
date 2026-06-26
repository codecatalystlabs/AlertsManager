"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import {
	EchisAlertDetailsDialog,
	EchisAlertsFilters,
	EchisAlertsHeader,
	EchisAlertsTable,
} from "@/components/echis-alerts";
import { NdwFilterBar } from "@/components/ndw-alerts/ndw-filter-bar";
import { NdwAlertsStats } from "@/components/ndw-alerts/ndw-alerts-stats";
import { SyncProgressPanel } from "@/components/sync";
import { ECHIS_NDW_FILTER_FIELDS } from "@/constants/ndw-filter-fields";
import { useEchisAlertsData } from "@/hooks/use-echis-alerts-data";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { LAYOUT } from "@/constants/layout";

export default function EchisAlertsPage() {
	const {
		alerts,
		stats,
		filters,
		pagination,
		loading,
		isSyncing,
		error,
		syncMessage,
		syncProgress,
		setSearch,
		setNdwFilters,
		setOperators,
		clearFilters,
		applyFilters,
		applyLocalFilters,
		clearLocalFilters,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
	} = useEchisAlertsData();

	const [selected, setSelected] = useState<EchisAlertRow | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<div className={LAYOUT.pageGap}>
			<EchisAlertsHeader
				onRefresh={() => void handleRefresh()}
				onSyncFromRemote={() => void syncFromRemote({ refreshExisting: true })}
				isRefreshing={isRefreshing}
				isSyncing={isSyncing}
			/>

			{error ? (
				<ErrorAlert error={error} onRetry={() => void refetch()} />
			) : null}

			<SyncProgressPanel
				source="NDW"
				isSyncing={isSyncing}
				progress={syncProgress}
				summaryMessage={syncMessage}
			/>

			<NdwAlertsStats
				total={stats.total}
				filtered={stats.filtered}
				live={stats.live}
			/>

			<NdwFilterBar
				fields={ECHIS_NDW_FILTER_FIELDS}
				search={filters.search}
				searchPlaceholder="Search district, facility, VHT, village…"
				filters={filters.ndwFilters}
				operators={filters.operators}
				onSearchChange={setSearch}
				onFiltersChange={setNdwFilters}
				onOperatorsChange={setOperators}
				onApply={() => void applyFilters()}
				onClear={() => void clearFilters()}
				isLoading={loading}
			/>

			<EchisAlertsFilters
				onApply={applyLocalFilters}
				onClear={clearLocalFilters}
				isLoading={loading}
			/>

			<EchisAlertsTable
				alerts={alerts}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onView={(a) => {
					setSelected(a);
					setDetailsOpen(true);
				}}
			/>

			<EchisAlertDetailsDialog
				alert={selected}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
			/>
		</div>
	);
}
