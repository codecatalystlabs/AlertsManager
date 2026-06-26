"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import { SyncProgressPanel } from "@/components/sync";
import {
	EidsrAlertsFilters,
	EidsrAlertsHeader,
	EidsrLinkedTabs,
	EidsrAlertsTable,
	ForwardAlertDialog,
} from "@/components/eidsr-alerts";
import {
	EidsrMessageDetailsDialog,
	EidsrMessageEditDialog,
} from "@/components/eidsr-messages";
import { EidsrMessagesStats } from "@/components/eidsr-messages/eidsr-messages-stats";
import { useEidsrEventsData } from "@/hooks/use-eidsr-events-data";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { eidsrMessageToAlertShape } from "@/lib/eidsr-message-to-alert";
import { getEidsr6767ById } from "@/lib/fetch-eidsr-6767";
import { resolveEidsrVerifyId } from "@/lib/eidsr-message-normalize";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";
import { LAYOUT } from "@/constants/layout";
import { useToast } from "@/hooks/use-toast";

const AlertVerificationDialog = dynamic(
	() =>
		import("@/components/alert-verification-dialog").then(
			(m) => m.AlertVerificationDialog
		),
	{ ssr: false }
);

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
		verificationFilter,
		setVerificationFilter,
		setFilters,
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
		markMessageLinked,
		markMessageForwarded,
	} = useEidsrEventsData();

	const invalidateAlerts = useInvalidateAlerts();

	const [selected, setSelected] = useState<EidsrMessage | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [verifyAlertShape, setVerifyAlertShape] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [verifyInProgressId, setVerifyInProgressId] = useState<number | null>(
		null
	);
	const [forwardOpen, setForwardOpen] = useState(false);
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

	const handleVerify = useCallback((message: EidsrMessage) => {
		setSelected(message);
		setVerifyAlertShape(eidsrMessageToAlertShape(message));
		setVerifyOpen(true);
	}, []);

	const handleForward = useCallback((message: EidsrMessage) => {
		setSelected(message);
		setForwardOpen(true);
	}, []);

	const handleForwarded = useCallback(
		(district: string) => {
			if (selected) {
				markMessageForwarded(selected.id, district);
			}
			void invalidateAlerts();
			void refetch();
		},
		[selected, markMessageForwarded, invalidateAlerts, refetch]
	);

	const handleVerificationComplete = useCallback(
		(linkedAlertId?: number | null) => {
			if (selected) {
				markMessageLinked(selected.id, linkedAlertId ?? null, true);
			}
			void invalidateAlerts();
			void refetch();
			setVerifyInProgressId(null);
		},
		[selected, markMessageLinked, refetch, invalidateAlerts]
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
				activeFilter={verificationFilter}
				onFilterChange={setVerificationFilter}
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

			<EidsrLinkedTabs
				value={verificationFilter}
				onChange={setVerificationFilter}
			/>

			<EidsrAlertsTable
				messages={messages}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading}
				verifyInProgressId={verifyInProgressId}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onInAlertsFilterChange={setVerificationFilter}
				onView={handleView}
				onEdit={handleEdit}
				onVerify={handleVerify}
				onForward={handleForward}
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

			<ForwardAlertDialog
				isOpen={forwardOpen}
				onClose={() => setForwardOpen(false)}
				message={selected}
				onForwarded={handleForwarded}
			/>

			{verifyOpen && verifyAlertShape && selected && (
				<AlertVerificationDialog
					isOpen={verifyOpen}
					onClose={() => {
						setVerifyOpen(false);
						setVerifyAlertShape(null);
					}}
					alert={verifyAlertShape}
					verificationMode="eidsr"
					eidsrMessageId={resolveEidsrVerifyId(selected)}
					eidsrEventLocalId={selected.id}
					onVerificationComplete={() => {}}
					onEidsrVerified={(alertId) => {
						handleVerificationComplete(alertId);
						setVerifyOpen(false);
						setVerifyAlertShape(null);
					}}
					onVerifyingChange={(verifying) =>
						setVerifyInProgressId(verifying ? selected.id : null)
					}
				/>
			)}
		</div>
	);
}
