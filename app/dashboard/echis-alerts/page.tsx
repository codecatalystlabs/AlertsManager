"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorAlert } from "@/components/dashboard";
import {
	EchisAlertDetailsDialog,
	EchisAlertsHeader,
	EchisAlertsTable,
} from "@/components/echis-alerts";
import { NdwFilterBar } from "@/components/ndw-alerts/ndw-filter-bar";
import { NdwAlertsStats } from "@/components/ndw-alerts/ndw-alerts-stats";
import { ECHIS_NDW_FILTER_FIELDS } from "@/constants/ndw-filter-fields";
import { useEchisAlertsData } from "@/hooks/use-echis-alerts-data";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { LAYOUT } from "@/constants/layout";
import { CheckCircle2, CloudDownload } from "lucide-react";

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

			{syncMessage ? (
				<Alert>
					<CheckCircle2 className="h-4 w-4" />
					<AlertDescription>{syncMessage}</AlertDescription>
				</Alert>
			) : null}

			{isSyncing && syncProgress ? (
				<Alert>
					<CloudDownload className="h-4 w-4 animate-pulse" />
					<AlertDescription>
						Syncing page {syncProgress.page}
						{syncProgress.pageCount ? ` / ${syncProgress.pageCount}` : ""} — scanned{" "}
						{syncProgress.scanned}, imported {syncProgress.imported}
					</AlertDescription>
				</Alert>
			) : null}

			<NdwAlertsStats
				total={stats.total}
				filtered={stats.filtered}
				label="cht_signal_verification"
				live={stats.live}
				note={stats.note}
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
