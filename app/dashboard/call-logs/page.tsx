"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
	STAT_FILTER_PRESETS,
	type CallLogsStatFilter,
} from "@/constants/call-logs";
import {
	CallLogsHeader,
	CallLogsStats,
	CallLogsFilters,
	CallLogsVerificationTabs,
	CallLogsTable,
} from "@/components/call-logs";
import { ErrorAlert } from "@/components/dashboard";
import { useCallLogsData, type AlertLog } from "@/hooks/use-call-logs-data";
import { AuthService } from "@/lib/auth";

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
 * Call Logs Page Component
 *
 * Comprehensive call logs management page with advanced filtering, statistics,
 * and alert management capabilities. Built with modular components and
 * custom hooks for optimal performance and maintainability.
 *
 * Features:
 * - Real-time call logs data with custom hook
 * - Advanced filtering by status, source, and search term
 * - Statistics dashboard with visual cards
 * - Alert verification and editing workflows
 * - CRUD operations with user confirmation
 * - Dialog management for detailed operations
 * - Performance optimized with memoization
 *
 * @returns {JSX.Element} The call logs page component
 */
export default function CallLogsPage(): React.JSX.Element {
	const {
		filteredAlerts,
		stats,
		filters,
		pagination,
		loading,
		isValidating,
		error,
		selectedAlert,
		setFilters,
		setSelectedAlert,
		setPage,
		setPageSize,
		refetch,
		deleteAlert,
		exportToExcel,
		exportToCSV,
		exporting,
		clearFilters,
	} = useCallLogsData();

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
		refetch();
	}, [refetch]);

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
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<CallLogsStats
				stats={stats}
				filters={filters}
				onStatClick={handleStatCardClick}
			/>

			<CallLogsFilters
				filters={filters}
				onFiltersChange={setFilters}
				onClearFilters={clearFilters}
			/>

			<CallLogsVerificationTabs
				value={filters.verification}
				onChange={(verification) => setFilters({ verification })}
			/>

			<div ref={tableSectionRef}>
				<CallLogsTable
					alerts={filteredAlerts}
					totalCount={pagination.total}
					page={pagination.page}
					pageSize={pagination.limit}
					totalPages={pagination.totalPages}
					isLoading={loading || isValidating}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					onViewDetails={handleViewDetails}
					onEditAlert={handleEditAlert}
					onVerifyAlert={handleVerifyAlert}
					onDeleteAlert={handleDeleteAlert}
				/>
			</div>

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
