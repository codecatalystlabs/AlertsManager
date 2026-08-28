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
import { StatsGridSkeleton } from "@/components/ui/skeletons";
import { useAlertsData } from "@/hooks/use-alerts-data";

// The composer pulls in `docx` and jsPDF on demand; keeping the whole dialog out
// of the initial bundle keeps this page's first paint where it was.
const SpotRepDialog = dynamic(
	() =>
		import("@/components/spotrep").then((m) => ({
			default: m.SpotRepDialog,
		})),
	{ ssr: false }
);

const AlertDetailsDialog = dynamic(
	() =>
		import("@/components/alert-details-dialog").then((m) => ({
			default: m.AlertDetailsDialog,
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
		setColumnFilters,
		setFilters,
		sort,
		setSort,
		setPage,
		setPageSize,
		refetch,
		exportToCSV,
		exportToExcel,
	} = useAlertsData();

	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

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

	// Spot report (EBS step 5), issued from this list because this list IS the
	// pipeline's output. Unlike the row menus upstream it reads the WHOLE record
	// — the verifier's note, the lab result, the risk worksheet all end up in the
	// narrative — and the list endpoint does not carry every one of those
	// columns. So the full alert is fetched, and the composer opens immediately
	// with a loading state rather than after the round trip.
	const [spotRepOpen, setSpotRepOpen] = useState(false);
	const [spotRepAlert, setSpotRepAlert] = useState<AlertType | null>(null);
	const [spotRepLoading, setSpotRepLoading] = useState(false);
	const handleGenerateSpotRep = useCallback(async (alert: AlertType) => {
		setSpotRepAlert(null);
		setSpotRepLoading(true);
		setSpotRepOpen(true);
		try {
			setSpotRepAlert(await AuthService.fetchAlert(alert.id as number));
		} catch (error) {
			console.error("Failed to load full alert for the spot report:", error);
			// The row itself still carries most of the report; drafting from it is
			// better than an empty dialog.
			setSpotRepAlert(alert);
		} finally {
			setSpotRepLoading(false);
		}
	}, []);

	const closeDialogs = useCallback(() => {
		setIsDetailsDialogOpen(false);
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

			{/* Always mounted, never swapped for a skeleton. Changing a filter
			    puts the list back into `loading` (a new SWR key has no cached
			    data), and unmounting the card there threw away its open/closed
			    state — the panel snapped shut on every field you touched. The
			    controls do not depend on the fetched list anyway. */}
			<AlertsFilters filters={filters} onFiltersChange={setFilters} />

			<AlertsTable
				alerts={filteredAlerts}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading || isValidating}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onColumnFiltersChange={setColumnFilters}
				sort={sort}
				onSortChange={setSort}
				onViewAlert={handleViewAlert}
				onGenerateSpotRep={handleGenerateSpotRep}
			/>

			<SpotRepDialog
				open={spotRepOpen}
				onOpenChange={(open) => {
					setSpotRepOpen(open);
					if (!open) setSpotRepAlert(null);
				}}
				alert={spotRepAlert}
				loading={spotRepLoading}
			/>

			{selectedAlert && (
				<AlertDetailsDialog
					isOpen={isDetailsDialogOpen}
					onClose={closeDialogs}
					alert={selectedAlert}
				/>
			)}
		</div>
	);
}
