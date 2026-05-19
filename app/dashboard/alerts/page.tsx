"use client";

import React, { useState, useCallback } from "react";
import {
	AlertsHeader,
	AlertsStats,
	AlertsFilters,
	AlertsTable,
} from "@/components/alerts";
import { ErrorAlert, LoadingSpinner } from "@/components/dashboard";
import { AlertDetailsDialog } from "@/components/alert-details-dialog";
import { AlertEditDialog } from "@/components/alert-edit-dialog";
import { useAlertsData } from "@/hooks/use-alerts-data";
import { Alert as AlertType } from "@/lib/auth";
import { LOADING_MESSAGES } from "@/constants/dashboard";

/**
 * Alerts Page Component
 *
 * Comprehensive alerts management page with advanced filtering, statistics,
 * and data management capabilities. Built with modular components and
 * custom hooks for optimal performance and maintainability.
 *
 * Features:
 * - Real-time alerts data with custom hook
 * - Advanced filtering by status, district, source, and date
 * - Statistics dashboard with visual cards
 * - Data export functionality
 * - CRUD operations with optimistic updates
 * - Performance optimized with memoization
 *
 * @returns {JSX.Element} The alerts page component
 */
export default function AlertsPage(): JSX.Element {
	const {
		alerts,
		filteredAlerts,
		stats,
		filters,
		loading,
		error,
		deletingId,
		uniqueDistricts,
		uniqueSources,
		setFilters,
		refetch,
		deleteAlert,
		exportToCSV,
		exportToExcel,
	} = useAlertsData();

	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

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

	const handleViewAlert = useCallback((alert: AlertType) => {
		setSelectedAlert(alert);
		setIsDetailsDialogOpen(true);
	}, []);

	const handleEditAlert = useCallback((alert: AlertType) => {
		setSelectedAlert(alert);
		setIsEditDialogOpen(true);
	}, []);

	const handleEditComplete = useCallback(() => {
		refetch();
	}, [refetch]);

	const closeDialogs = useCallback(() => {
		setIsDetailsDialogOpen(false);
		setIsEditDialogOpen(false);
		setSelectedAlert(null);
	}, []);

	const handleRetry = useCallback(async () => {
		await handleRefresh();
	}, [handleRefresh]);

	if (loading) {
		return <LoadingSpinner message={LOADING_MESSAGES.ALERTS} />;
	}

	return (
		<div className="space-y-8">
			<AlertsHeader
				onRefresh={handleRefresh}
				onExportExcel={exportToExcel}
				onExportCsv={exportToCSV}
				isRefreshing={isRefreshing}
			/>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRetry}
					retrying={isRefreshing}
				/>
			)}

			<AlertsStats stats={stats} />

			<AlertsFilters
				filters={filters}
				onFiltersChange={setFilters}
				uniqueDistricts={uniqueDistricts}
				uniqueSources={uniqueSources}
			/>

			<AlertsTable
				alerts={filteredAlerts}
				deletingId={deletingId}
				onDeleteAlert={handleDeleteAlert}
				onViewAlert={handleViewAlert}
				onEditAlert={handleEditAlert}
			/>

			{selectedAlert && (
				<>
					<AlertDetailsDialog
						isOpen={isDetailsDialogOpen}
						onClose={closeDialogs}
						alert={selectedAlert}
					/>

					<AlertEditDialog
						isOpen={isEditDialogOpen}
						onClose={closeDialogs}
						alert={selectedAlert}
						onEditComplete={handleEditComplete}
					/>
				</>
			)}
		</div>
	);
}
