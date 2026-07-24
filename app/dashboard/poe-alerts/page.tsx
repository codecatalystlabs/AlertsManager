"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import {
	PoeAlertDetailsDialog,
	PoeAlertsFilters,
	PoeAlertsTable,
} from "@/components/poe-alerts";
import { NdwSyncHeader } from "@/components/ndw-alerts/ndw-sync-header";
import { NdwFilterBar } from "@/components/ndw-alerts/ndw-filter-bar";
import { NdwAlertsStats } from "@/components/ndw-alerts/ndw-alerts-stats";
import { ForwardToDistrictDialog } from "@/components/forward-to-district-dialog";
import { SyncProgressPanel } from "@/components/sync";
import { POE_NDW_FILTER_FIELDS } from "@/constants/ndw-filter-fields";
import { POE_ALERTS_CONFIG } from "@/constants/poe-alerts";
import { usePoeAlertsData } from "@/hooks/use-poe-alerts-data";
import { forwardPoeAlert, type PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { poeToAlertShape } from "@/lib/ndw-alert-to-shape";
import { LAYOUT } from "@/constants/layout";

const AlertVerificationDialog = dynamic(
	() =>
		import("@/components/alert-verification-dialog").then(
			(m) => m.AlertVerificationDialog
		),
	{ ssr: false }
);

export default function PoeAlertsPage() {
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
		setColumnFilters,
		filtersResetKey,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
	} = usePoeAlertsData();

	const [selected, setSelected] = useState<PoeAlertRow | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [forwardTarget, setForwardTarget] = useState<PoeAlertRow | null>(null);
	const [forwardOpen, setForwardOpen] = useState(false);
	const [verifyTarget, setVerifyTarget] = useState<PoeAlertRow | null>(null);
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Stabilize the prefill shape so the verify dialog isn't handed a brand-new
	// object on every SWR auto-refresh (belt-and-suspenders alongside the dialog's
	// id-keyed reset effect).
	const verifyAlertShape = useMemo(
		() => (verifyTarget ? poeToAlertShape(verifyTarget) : null),
		[verifyTarget]
	);

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
			<NdwSyncHeader
				title={POE_ALERTS_CONFIG.PAGE_TITLE}
				description={POE_ALERTS_CONFIG.PAGE_DESCRIPTION}
				onRefresh={() => void handleRefresh()}
				onSyncFromRemote={() => void syncFromRemote()}
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
				fields={POE_NDW_FILTER_FIELDS}
				search={filters.search}
				searchPlaceholder="Search name, passport, port, flight…"
				filters={filters.ndwFilters}
				operators={filters.operators}
				onSearchChange={setSearch}
				onFiltersChange={setNdwFilters}
				onOperatorsChange={setOperators}
				onApply={() => void applyFilters()}
				onClear={() => void clearFilters()}
				isLoading={loading}
			/>

			<PoeAlertsFilters
				onApply={applyLocalFilters}
				onClear={clearLocalFilters}
				isLoading={loading}
			/>

			<PoeAlertsTable
				alerts={alerts}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onColumnFiltersChange={setColumnFilters}
				filtersResetKey={filtersResetKey}
				onView={(a) => {
					setSelected(a);
					setDetailsOpen(true);
				}}
				onForward={(a) => {
					setForwardTarget(a);
					setForwardOpen(true);
				}}
				onVerify={(a) => {
					setVerifyTarget(a);
					setVerifyOpen(true);
				}}
			/>

			<PoeAlertDetailsDialog
				alert={selected}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
			/>

			<ForwardToDistrictDialog
				isOpen={forwardOpen}
				onClose={() => setForwardOpen(false)}
				sourceLabel="POE alert"
				alreadyForwarded={forwardTarget?.forwardedToDistrict ?? null}
				onForward={(district, note) =>
					forwardPoeAlert(forwardTarget!.id, { district, note })
				}
				onForwarded={() => void refetch()}
			/>

			{verifyOpen && verifyTarget && verifyAlertShape && (
				<AlertVerificationDialog
					isOpen={verifyOpen}
					onClose={() => {
						setVerifyOpen(false);
						setVerifyTarget(null);
					}}
					alert={verifyAlertShape}
					ndwSource="poe"
					ndwId={verifyTarget.id}
					onVerificationComplete={() => void refetch()}
				/>
			)}
		</div>
	);
}
