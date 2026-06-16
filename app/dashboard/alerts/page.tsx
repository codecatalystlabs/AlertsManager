"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
	AlertsHeader,
	AlertsStats,
	AlertsFilters,
	AlertsTable,
} from "@/components/alerts";
import { ErrorAlert } from "@/components/dashboard";
import { StatsGridSkeleton, FiltersSkeleton } from "@/components/ui/skeletons";
import { useAlertsData } from "@/hooks/use-alerts-data";

const AlertDetailsDialog = dynamic(
	() =>
		import("@/components/alert-details-dialog").then((m) => ({
			default: m.AlertDetailsDialog,
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
import { Alert as AlertType, AuthService } from "@/lib/auth";
import { LAYOUT } from "@/constants/layout";

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
export default function AlertsPage(): React.JSX.Element {
	const {
		filteredAlerts,
		stats,
		filters,
		pagination,
		loading,
		isValidating,
		error,
		deletingId,
		uniqueSources,
		setFilters,
		setPage,
		setPageSize,
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

	const handleViewAlert = useCallback(async (alert: AlertType) => {
		try {
			const fullAlert = await AuthService.fetchAlert(alert.id as number);
			setSelectedAlert(fullAlert);
		} catch (error) {
			console.error("Failed to load full alert details:", error);
			setSelectedAlert(alert);
		}
		setIsDetailsDialogOpen(true);
	}, []);

	const handleEditAlert = useCallback(async (alert: AlertType) => {
		try {
			const fullAlert = await AuthService.fetchAlert(alert.id as number);
			setSelectedAlert(fullAlert);
		} catch (error) {
			console.error("Failed to load full alert for editing:", error);
			setSelectedAlert(alert);
		}
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

	return (
		<div className={LAYOUT.pageGap}>
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

			{loading ? (
				<StatsGridSkeleton count={4} />
			) : (
				<AlertsStats stats={stats} />
			)}

			{loading ? (
				<FiltersSkeleton fields={5} />
			) : (
				<AlertsFilters
					filters={filters}
					onFiltersChange={setFilters}
					uniqueSources={uniqueSources}
				/>
			)}

			<AlertsTable
				alerts={filteredAlerts}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading || isValidating}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
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
