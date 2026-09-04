"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
} from "@/constants/call-logs";
import {
	CallLogsHeader,
	CallLogsFilters,
	CallLogsTable,
	TriagedSplitTabs,
} from "@/components/call-logs";
import { ErrorAlert } from "@/components/dashboard";
import { TriageDialog } from "@/components/triage";
import { RiskAssessmentDialog } from "@/components/risk";
import { FeedbackDialog } from "@/components/feedback";
import { useCallLogsData, type AlertLog } from "@/hooks/use-call-logs-data";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";
import { AuthService, type Alert } from "@/lib/auth";
import { PipelineStrip } from "@/components/pipeline";
import {
	STAGE_FEEDBACK,
	isQueueStage,
	stageLabel,
} from "@/lib/pipeline";
import {
	SPLIT_DISCARDED,
	VIEW_TRIAGED,
	VIEW_UNTRIAGED,
	registerViewFilters,
	registerViewFromParams,
	registerViewHref,
	registerViewStage,
	triagedSplitFromParams,
	type TriagedSplit,
} from "@/lib/register-view";

const AlertDetailsDialog = dynamic(
	() =>
		import("@/components/alert-details-dialog").then((m) => ({
			default: m.AlertDetailsDialog,
		})),
	{ ssr: false }
);

const AlertVerificationDialog = dynamic(
	() =>
		import("@/components/alert-verification-dialog").then((m) => ({
			default: m.AlertVerificationDialog,
		})),
	{ ssr: false }
);

const AlertEditDialog = dynamic(
	() =>
		import("@/components/alert-edit-dialog").then((m) => ({
			default: m.AlertEditDialog,
		})),
	{ ssr: false }
);
import { LAYOUT } from "@/constants/layout";

/**
 * Signal Logs Page Component
 *
 * Comprehensive signal logs management page with advanced filtering, statistics,
 * and alert management capabilities. Built with modular components and
 * custom hooks for optimal performance and maintainability.
 *
 * Features:
 * - Real-time signal logs data with custom hook
 * - Advanced filtering by status, source, and search term
 * - Statistics dashboard with visual cards
 * - Alert verification and editing workflows
 * - CRUD operations with user confirmation
 * - Dialog management for detailed operations
 * - Performance optimized with memoization
 *
 * @returns {JSX.Element} The signal logs page component
 */
export default function CallLogsPage(): React.JSX.Element {
	const {
		filteredAlerts,
		filters,
		sort,
		pagination,
		loading,
		isValidating,
		error,
		selectedAlert,
		setColumnFilters,
		setFilters,
		setSort,
		setSelectedAlert,
		setPage,
		setPageSize,
		refetch,
		deleteAlert,
		exportToExcel,
		exportToCSV,
		exportProcessedToExcel,
		exporting,
		clearFilters,
		filtersResetKey,
	} = useCallLogsData();

	// The view this page is standing in, owned by the URL so a tab is a
	// shareable destination rather than a filter someone has to rebuild. An
	// unrecognised ?stage= is ignored, which shows the register rather than an
	// empty list with no explanation.
	const router = useRouter();
	const searchParams = useSearchParams();
	const rawStage = searchParams?.get("stage") ?? null;
	const stageParam = isQueueStage(rawStage) ? rawStage : null;
	// Null for the queues that are not one of the four tabs (feedback, which the
	// sidebar reaches as "Risk Assessed", and off-pipeline): those keep their own
	// list, without a tab strip offering to navigate out of the queue that was
	// asked for.
	const view = registerViewFromParams(searchParams?.get("view"), stageParam);
	// Which half of the Triaged tab — the verification queue, or the archive of
	// what was discarded. Read off the same URL, so the split is shareable and
	// the back button steps between the halves.
	const split = triagedSplitFromParams(stageParam);
	const showingDiscarded = view === VIEW_TRIAGED && split === SPLIT_DISCARDED;
	// The Risk and Response columns earn their width only on the Risk Assessed
	// list, which is the feedback queue: every row there has been scored, so the
	// columns read as data. On the queues ahead of it a signal is not assessed
	// YET, so the same columns answer "Not assessed" / "Pending" on every row —
	// work flagged as owed that the pipeline has not reached.
	const showingRiskAssessed = stageParam === STAGE_FEEDBACK;
	// The Verified column, by the same rule. On Untriaged nothing has reached
	// verification yet, and inside the Triaged tab the kept half is the queue
	// WAITING on it — both answer "Pending" on every row. The Discarded half
	// already carries "Discarded at", which names the gate that closed the
	// signal and so says the same thing with the reason attached. It stays on
	// All and on the later queues, where rows genuinely differ.
	const showingVerification = view !== VIEW_UNTRIAGED && view !== VIEW_TRIAGED;
	// The gate this view stands at — drives the page heading and the pipeline
	// strip's highlight, so landing on Untriaged reads as "Awaiting triage"
	// rather than as an unexplained partial register.
	const viewStage = registerViewStage(view, split) ?? stageParam;

	// Apply a view's filters ONCE per URL change, keyed by what the URL asked
	// for. Re-applying whenever the filters drift would undo any refinement the
	// user then makes in the filter bar (picking Verified inside the Untriaged
	// tab would snap straight back).
	const appliedViewRef = useRef<string | null>(null);
	useEffect(() => {
		// Keyed on the SPLIT too, or switching halves of the Triaged tab would be
		// the one navigation that leaves the previous half's stage filter behind.
		const wanted = view ? `${view}:${split}` : `stage:${stageParam ?? ""}`;
		if (appliedViewRef.current === wanted) return;
		appliedViewRef.current = wanted;
		setFilters(
			view
				? registerViewFilters(view, split)
				: { stage: stageParam ?? "", verification: "all" }
		);
		// setFilters is stable; re-running on every render would reset paging.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [view, split, stageParam]);

	// Deep-link from 6767 / eCHIS / POE forwarded badges: ?alert_id=123
	const appliedAlertIdRef = useRef<string | null>(null);
	useEffect(() => {
		const alertId = searchParams?.get("alert_id")?.trim() ?? "";
		if (!alertId || appliedAlertIdRef.current === alertId) return;
		appliedAlertIdRef.current = alertId;
		setColumnFilters([{ id: "id", value: alertId }]);
	}, [searchParams, setColumnFilters]);

	// The URL is the single source of truth for the view, so switching halves
	// navigates rather than setting state the URL would then contradict.
	const handleSplitChange = useCallback(
		(next: TriagedSplit) => {
			router.replace(registerViewHref(VIEW_TRIAGED, next), { scroll: false });
		},
		[router]
	);

	// Revalidates every alerts-derived SWR key (this list + its stats, the Alerts
	// Management table, dashboard cards/charts) — not just this page's list.
	const invalidateAlerts = useInvalidateAlerts();

	// Dialog states
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
	const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
		useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const tableSectionRef = useRef<HTMLDivElement>(null);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleViewDetails = useCallback(
		async (alert: AlertLog) => {
			try {
				const fullAlert = await AuthService.fetchAlert(alert.id);
				setSelectedAlert(fullAlert as AlertLog);
			} catch (error) {
				console.error("Failed to load full alert details:", error);
				setSelectedAlert(alert);
			}
			setIsDetailsDialogOpen(true);
		},
		[setSelectedAlert]
	);

	const handleVerifyAlert = useCallback(
		async (alert: AlertLog) => {
			try {
				const fullAlert = await AuthService.fetchAlert(alert.id);
				setSelectedAlert(fullAlert as AlertLog);
			} catch (error) {
				console.error("Failed to load full alert for verification:", error);
				setSelectedAlert(alert);
			}
			setIsVerificationDialogOpen(true);
		},
		[setSelectedAlert]
	);

	// Triage (EBS step 2). No full-alert fetch needed: the decision only writes
	// priority, and the row already carries the current one for a re-triage.
	const [triageAlert, setTriageAlert] = useState<AlertLog | null>(null);
	const handleTriageAlert = useCallback((alert: AlertLog) => {
		setTriageAlert(alert);
	}, []);

	// Risk assessment (EBS step 4). Like triage it only writes its own columns,
	// so the row already carries everything the dialog needs.
	const [riskAlert, setRiskAlert] = useState<AlertLog | null>(null);
	const handleAssessRisk = useCallback((alert: AlertLog) => {
		setRiskAlert(alert);
	}, []);

	// Reporter feedback (EBS step 7).
	const [feedbackAlert, setFeedbackAlert] = useState<AlertLog | null>(null);
	const handleRecordFeedback = useCallback((alert: AlertLog) => {
		setFeedbackAlert(alert);
	}, []);

	const handleEditAlert = useCallback(
		async (alert: AlertLog) => {
			try {
				const fullAlert = await AuthService.fetchAlert(alert.id);
				setSelectedAlert(fullAlert as AlertLog);
			} catch (error) {
				console.error("Failed to load full alert for editing:", error);
				setSelectedAlert(alert);
			}
			setIsEditDialogOpen(true);
		},
		[setSelectedAlert]
	);

	const handleDeleteAlert = useCallback(
		async (alertId: number) => {
			try {
				await deleteAlert(alertId);
			} catch (error) {
				console.error("Failed to delete alert:", error);
			}
		},
		[deleteAlert]
	);

	const handleVerificationComplete = useCallback(() => {
		// Verifying/editing an alert changes data on other alerts-derived views
		// too (the Alerts Management table, dashboard cards/charts). Invalidate
		// every alerts-rooted SWR key — not just this page's list — so those views
		// don't keep painting the pre-verify snapshot from the persisted cache.
		void invalidateAlerts();
	}, [invalidateAlerts]);

	const handleRetry = useCallback(async () => {
		await handleRefresh();
	}, [handleRefresh]);

	const closeDialogs = useCallback(() => {
		setIsDetailsDialogOpen(false);
		setIsVerificationDialogOpen(false);
		setIsEditDialogOpen(false);
		setSelectedAlert(null);
	}, [setSelectedAlert]);

	return (
		<div className={LAYOUT.pageGap}>
			<CallLogsHeader
				onRefresh={handleRefresh}
				onExportExcel={exportToExcel}
				onExportCsv={exportToCSV}
				// "Export All Signals" lives on the Risk Assessed list only: the list
				// is the feedback queue (scored signals still owing feedback), the
				// file is everything that has reached the same state, fed back or not.
				onExportProcessed={
					showingRiskAssessed ? exportProcessedToExcel : undefined
				}
				isRefreshing={isRefreshing || isValidating}
				exporting={exporting}
				queueLabel={stageLabel(viewStage)}
			/>

			{/* The pipeline itself, above the list it filters. Scoped to the same
			    region/district the list is showing, so the strip never reports a
			    national total beside a district queue. */}
			<PipelineStrip
				activeStage={viewStage}
				params={{
					region: filters.region,
					district: filters.district,
					from_date: filters.fromDate,
					to_date: filters.toDate,
				}}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			{/* Always mounted, never swapped for a skeleton: unmounting it while
			    a filter change reloads the list threw away the card's
			    open/closed state, so the panel snapped shut mid-edit. */}
			<CallLogsFilters
				filters={filters}
				onFiltersChange={setFilters}
				onClearFilters={clearFilters}
			/>

			{/* The triage gate has two endings, and they are opposite kinds of
			    list — a queue with work due on every row, and an archive with
			    none — so the two halves stay separately addressable. */}
			{view === VIEW_TRIAGED && (
				<TriagedSplitTabs
					value={split}
					onChange={handleSplitChange}
					count={pagination.total}
				/>
			)}

			<div ref={tableSectionRef}>
				<CallLogsTable
					alerts={filteredAlerts}
					totalCount={pagination.total}
					page={pagination.page}
					pageSize={pagination.limit}
					totalPages={pagination.totalPages}
					sort={sort}
					onSortChange={setSort}
					isLoading={loading || isValidating}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					onColumnFiltersChange={setColumnFilters}
					filtersResetKey={filtersResetKey}
					showDiscardLevel={showingDiscarded}
					showRisk={showingRiskAssessed}
					showResponse={showingRiskAssessed}
					showVerification={showingVerification}
					onViewDetails={handleViewDetails}
					onEditAlert={handleEditAlert}
					onVerifyAlert={handleVerifyAlert}
					onTriageAlert={handleTriageAlert}
					onAssessRisk={handleAssessRisk}
					onRecordFeedback={handleRecordFeedback}
					onDeleteAlert={handleDeleteAlert}
				/>
			</div>

			<TriageDialog
				open={triageAlert !== null}
				onOpenChange={(open) => !open && setTriageAlert(null)}
				alertId={triageAlert?.id ?? null}
				alert={triageAlert}
				currentPriority={triageAlert?.priority}
				currentDecision={triageAlert?.triageDecision}
				currentSignalCode={triageAlert?.signalCode}
				onTriaged={handleVerificationComplete}
			/>

			<RiskAssessmentDialog
				open={riskAlert !== null}
				onOpenChange={(open) => !open && setRiskAlert(null)}
				alertId={riskAlert?.id ?? null}
				current={riskAlert ?? undefined}
				onAssessed={handleVerificationComplete}
			/>

			<FeedbackDialog
				open={feedbackAlert !== null}
				onOpenChange={(open) => !open && setFeedbackAlert(null)}
				alertId={feedbackAlert?.id ?? null}
				reporterName={feedbackAlert?.personReporting}
				reporterPhone={feedbackAlert?.contactNumber}
				onRecorded={handleVerificationComplete}
			/>

			{/* Dialogs */}
			{selectedAlert && (
				<>
					<AlertDetailsDialog
						isOpen={isDetailsDialogOpen}
						onClose={closeDialogs}
						alert={selectedAlert}
					/>

					<AlertVerificationDialog
						isOpen={isVerificationDialogOpen}
						onClose={closeDialogs}
						alert={selectedAlert}
						onVerificationComplete={
							handleVerificationComplete
						}
					/>

					<AlertEditDialog
						isOpen={isEditDialogOpen}
						onClose={closeDialogs}
						alert={selectedAlert}
						onEditComplete={handleVerificationComplete}
					/>
				</>
			)}
		</div>
	);
}
