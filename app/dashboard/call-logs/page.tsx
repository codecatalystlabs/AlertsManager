"use client";

import React, { useState, useCallback } from "react";
import {
	CallLogsHeader,
	CallLogsStats,
	CallLogsFilters,
	CallLogsTable,
} from "@/components/call-logs";
import { ErrorAlert, LoadingSpinner } from "@/components/dashboard";
import { AlertVerificationDialog } from "@/components/alert-verification-dialog";
import { AlertDetailsDialog } from "@/components/alert-details-dialog";
import { AlertEditDialog } from "@/components/alert-edit-dialog";
import { useCallLogsData, type AlertLog } from "@/hooks/use-call-logs-data";
import { LOADING_MESSAGES } from "@/constants/dashboard";

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
export default function CallLogsPage(): JSX.Element {
	const {
		alerts,
		filteredAlerts,
		stats,
		filters,
		loading,
		error,
		selectedAlert,
		setFilters,
		setSelectedAlert,
		refetch,
		deleteAlert,
		exportToExcel,
		clearFilters,
	} = useCallLogsData();

	// Dialog states
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
	const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
		useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleViewDetails = useCallback(
		(alert: AlertLog) => {
			setSelectedAlert(alert);
			setIsDetailsDialogOpen(true);
		},
		[setSelectedAlert]
	);

	const handleVerifyAlert = useCallback(
		(alert: AlertLog) => {
			setSelectedAlert(alert);
			setIsVerificationDialogOpen(true);
		},
		[setSelectedAlert]
	);

	const handleEditAlert = useCallback(
		(alert: AlertLog) => {
			setSelectedAlert(alert);
			setIsEditDialogOpen(true);
		},
		[setSelectedAlert]
	);

	const handleDeleteAlert = useCallback(
		async (alertId: number) => {
			try {
				await deleteAlert(alertId);
			} catch (error) {
				// Error is already handled in the hook
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

	if (loading) {
		return <LoadingSpinner message={LOADING_MESSAGES.CALL_LOGS} />;
	}

	return (
		<div className="space-y-6">
			<CallLogsHeader
				onRefresh={handleRefresh}
				onExport={exportToExcel}
				isRefreshing={isRefreshing}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<CallLogsStats stats={stats} />

			<CallLogsFilters
				filters={filters}
				onFiltersChange={setFilters}
				onClearFilters={clearFilters}
			/>

			<CallLogsTable
				alerts={filteredAlerts}
				onViewDetails={handleViewDetails}
				onEditAlert={handleEditAlert}
				onVerifyAlert={handleVerifyAlert}
				onDeleteAlert={handleDeleteAlert}
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
