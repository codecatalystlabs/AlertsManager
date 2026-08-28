"use client";

import { useCallback, useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import { SyncProgressPanel } from "@/components/sync";
import {
	EidsrAlertsFilters,
	EidsrAlertsHeader,
	EidsrForwardTabs,
	EidsrAlertsTable,
} from "@/components/eidsr-alerts";
import { ForwardToDistrictDialog } from "@/components/forward-to-district-dialog";
import {
	EidsrMessageDetailsDialog,
	EidsrMessageEditDialog,
} from "@/components/eidsr-messages";
import { EidsrMessagesStats } from "@/components/eidsr-messages/eidsr-messages-stats";
import { useEidsrEventsData } from "@/hooks/use-eidsr-events-data";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { getEidsr6767ById, moveEidsr6767ToRegister } from "@/lib/fetch-eidsr-6767";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";
import { LAYOUT } from "@/constants/layout";
import { useToast } from "@/hooks/use-toast";

export default function EidsrAlertsPage() {
	const { toast } = useToast();
	const {
		messages,
		stats,
		filters,
		pagination,
		loading,
		isSyncing,
		error,
		syncMessage,
		syncProgress,
		forwardFilter,
		setForwardFilter,
		setFilters,
		setColumnFilters,
		filtersResetKey,
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
		markMessageForwarded,
	} = useEidsrEventsData();

	const invalidateAlerts = useInvalidateAlerts();

	const [selected, setSelected] = useState<EidsrMessage | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [moveOpen, setMoveOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleSync = useCallback(async () => {
		await syncFromRemote();
	}, [syncFromRemote]);

	const handleApplyFilters = useCallback(async () => {
		await applyFilters();
	}, [applyFilters]);

	const handleClearFilters = useCallback(async () => {
		clearFilters();
		await applyFilters();
	}, [clearFilters, applyFilters]);

	const loadMessageForAction = useCallback(
		async (message: EidsrMessage) => {
			try {
				const { message: fresh } = await getEidsr6767ById(message.id);
				return fresh;
			} catch (err) {
				toast({
					title: "Could not load message",
					description:
						err instanceof Error
							? err.message
							: "GET /eidsr/local/messages/{id} failed",
					variant: "destructive",
				});
				return message;
			}
		},
		[toast]
	);

	const handleView = useCallback(
		async (message: EidsrMessage) => {
			const fresh = await loadMessageForAction(message);
			setSelected(fresh);
			setDetailsOpen(true);
		},
		[loadMessageForAction]
	);

	const handleEdit = useCallback((message: EidsrMessage) => {
		setSelected(message);
		setEditOpen(true);
	}, []);

	const handleMove = useCallback((message: EidsrMessage) => {
		setSelected(message);
		setMoveOpen(true);
	}, []);

	const handleMoved = useCallback(
		(district: string) => {
			if (selected) {
				// Stamp the district AND the link so the row shows its new ALT id
				// straight away; the revalidate then drops it off the "Not moved"
				// tab, which is where the user is standing.
				markMessageForwarded(selected.id, district);
			}
			void invalidateAlerts();
			void refetch();
		},
		[selected, markMessageForwarded, invalidateAlerts, refetch]
	);

	return (
		<div className={LAYOUT.pageGap}>
			<EidsrAlertsHeader
				onRefresh={handleRefresh}
				onSyncFromRemote={handleSync}
				onExportCsv={exportToCsv}
				onExportExcel={exportToExcel}
				isRefreshing={isRefreshing}
				isSyncing={isSyncing}
				isExporting={isExporting}
			/>

			<EidsrMessagesStats
				stats={stats}
				activeFilter={forwardFilter}
				onFilterChange={setForwardFilter}
			/>

			<SyncProgressPanel
				source="EIDSR"
				isSyncing={isSyncing}
				progress={syncProgress}
				summaryMessage={syncMessage}
			/>

			{/* Load errors only — sync failures are surfaced by the panel above
			    (its progress carries phase === "error"). */}
			{error && syncProgress?.phase !== "error" && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<EidsrAlertsFilters
				filters={filters}
				onFiltersChange={setFilters}
				onApply={handleApplyFilters}
				onClear={handleClearFilters}
				isLoading={loading || isSyncing}
			/>

			{/* One split, because there is now one way in. The old linked/unlinked
			    strip asked the same question a second time, from back when
			    "verify into alerts" was a separate route into the register. */}
			<EidsrForwardTabs
				value={forwardFilter}
				onChange={setForwardFilter}
				count={pagination.total}
			/>

			<EidsrAlertsTable
				messages={messages}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onColumnFiltersChange={setColumnFilters}
				filtersResetKey={filtersResetKey}
				onView={handleView}
				onEdit={handleEdit}
				onMove={handleMove}
			/>

			<EidsrMessageDetailsDialog
				isOpen={detailsOpen}
				onClose={() => {
					setDetailsOpen(false);
					setSelected(null);
				}}
				message={selected}
			/>

			<EidsrMessageEditDialog
				isOpen={editOpen}
				onClose={() => setEditOpen(false)}
				message={selected}
				onSaved={(updated) => {
					updateLocalMessage(updated);
					setSelected(updated);
					toast({
						title: "Message updated",
						description: "6767 SMS message saved.",
					});
				}}
			/>

			<ForwardToDistrictDialog
				isOpen={moveOpen}
				onClose={() => setMoveOpen(false)}
				sourceLabel="6767 signal"
				title="Move to Signal Register"
				description="Creates a Signal Register entry for this 6767 signal, with its own alert id, in the district you choose. It lands untriaged, ready to be triaged and verified there."
				submitLabel="Move to register"
				successTitle="Signal moved to the register"
				alreadyForwarded={selected?.forwardedToDistrict ?? null}
				reportedLocation={
					[selected?.village, selected?.alertCaseDistrict]
						.map((part) => part?.trim())
						.filter(Boolean)
						.join(", ") || null
				}
				onForward={(district, note) =>
					moveEidsr6767ToRegister(selected!.id, { district, note })
				}
				onForwarded={handleMoved}
			/>

		</div>
	);
}
