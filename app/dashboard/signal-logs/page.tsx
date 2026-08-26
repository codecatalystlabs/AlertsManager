"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
	STAT_FILTER_PRESETS,
	type CallLogsStatFilter,
} from "@/constants/call-logs";
import {
	CallLogsHeader,
	CallLogsStats,
	CallLogsFilters,
	CallLogsTable,
} from "@/components/call-logs";
import { ErrorAlert } from "@/components/dashboard";
import { TriageDialog } from "@/components/triage";
import { RiskAssessmentDialog } from "@/components/risk";
import { FeedbackDialog } from "@/components/feedback";
import { StatsGridSkeleton, FiltersSkeleton } from "@/components/ui/skeletons";
import { useCallLogsData, type AlertLog } from "@/hooks/use-call-logs-data";
import { useInvalidateAlerts } from "@/hooks/use-invalidate-alerts";
import { AuthService } from "@/lib/auth";
import { PipelineStrip } from "@/components/pipeline";
import { STAGE_DESCRIPTION, isQueueStage, stageLabel } from "@/lib/pipeline";
import {
	registerViewFilters,
	registerViewFromParams,
	registerViewStage,
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
		stats,
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
	// Null for the queues that are not one of the four tabs (risk, feedback,
	// off-pipeline): those keep their own list, without a tab strip offering to
	// navigate out of the queue that was asked for.
	const view = registerViewFromParams(searchParams?.get("view"), stageParam);
	// The gate this view stands at — drives the page heading and the pipeline
	// strip's highlight, so landing on Untriaged reads as "Awaiting triage"
	// rather than as an unexplained partial register.
	const viewStage = registerViewStage(view) ?? stageParam;

	// Apply a view's filters ONCE per URL change, keyed by what the URL asked
	// for. Re-applying whenever the filters drift would undo any refinement the
	// user then makes in the filter bar (picking Verified inside the Untriaged
	// tab would snap straight back).
	const appliedViewRef = useRef<string | null>(null);
	useEffect(() => {
		const wanted = view ?? `stage:${stageParam ?? ""}`;
		if (appliedViewRef.current === wanted) return;
		appliedViewRef.current = wanted;
		setFilters(
			view
				? registerViewFilters(view)
				: { stage: stageParam ?? "", verification: "all" }
		);
		// setFilters is stable; re-running on every render would reset paging.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [view, stageParam]);

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

	const handleStatCardClick = useCallback(
		(stat: CallLogsStatFilter) => {
			setFilters(STAT_FILTER_PRESETS[stat]);
			requestAnimationFrame(() => {
				tableSectionRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			});
		},
		[setFilters]
	);

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
				isRefreshing={isRefreshing || isValidating}
				exporting={exporting}
				queueLabel={stageLabel(viewStage)}
				queueHint={viewStage ? STAGE_DESCRIPTION[viewStage] : null}
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

			{loading ? (
				<StatsGridSkeleton count={4} />
			) : (
				<CallLogsStats
					stats={stats}
					filters={filters}
					onStatClick={handleStatCardClick}
				/>
			)}

			{loading ? (
				<FiltersSkeleton fields={5} />
			) : (
				<CallLogsFilters
					filters={filters}
					onFiltersChange={setFilters}
					onClearFilters={clearFilters}
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
