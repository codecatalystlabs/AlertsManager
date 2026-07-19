import React, { memo, useMemo } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerSort } from "@/hooks/use-server-sort";
import { DataTable } from "@/components/ui/data-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	ALERTS_CONFIG,
	createAlertsTableColumns,
	type AlertsTableCallbacks,
} from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";
import { alertSlaRowClass } from "@/lib/alert-sla";
import { canDeleteAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTickingNow } from "@/hooks/use-ticking-now";
import type { AlertsSort } from "@/hooks/use-alerts-data";

// Only columns the backend can sort on (alertOrderClause whitelist) are wired;
// a sort toggle on any other header is ignored.
const COLUMN_TO_SORT_KEY: Record<string, string> = {
	id: "id",
	date: "date",
	status: "status",
	alertCaseName: "name",
	alertCaseDistrict: "district",
};
const SORT_KEY_TO_COLUMN: Record<string, string> = {
	id: "id",
	date: "date",
	status: "status",
	name: "alertCaseName",
	district: "alertCaseDistrict",
};

interface AlertsTableProps {
	alerts: AlertType[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	deletingId: number | null;
	onDeleteAlert: (alertId: number) => Promise<void>;
	onViewAlert?: (alert: AlertType) => void;
	onEditAlert?: (alert: AlertType) => void;
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Current server-side sort, and a setter, so a header sort orders the whole dataset. */
	sort: AlertsSort;
	onSortChange: (sort: AlertsSort) => void;
}

export const AlertsTable = memo<AlertsTableProps>(
	({
		alerts,
		totalCount,
		page,
		pageSize,
		totalPages,
		isLoading,
		onPageChange,
		onPageSizeChange,
		deletingId,
		onDeleteAlert,
		onViewAlert,
		onEditAlert,
		onColumnFiltersChange,
		sort,
		onSortChange,
	}) => {
		const canDelete = canDeleteAlerts(useCurrentUser());
		const now = useTickingNow();
		const callbacks: AlertsTableCallbacks = useMemo(
			() => ({
				onDelete: onDeleteAlert,
				onView: onViewAlert,
				onEdit: onEditAlert,
				deletingId,
				canDelete,
			}),
			[onDeleteAlert, onViewAlert, onEditAlert, deletingId, canDelete]
		);

		const columns = useMemo(
			() => createAlertsTableColumns(callbacks),
			[callbacks]
		);

		const { sortingState, handleSortingChange } = useServerSort(
			COLUMN_TO_SORT_KEY,
			SORT_KEY_TO_COLUMN,
			sort,
			onSortChange
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={LAYOUT.cardTitle}>
						Verified Alerts ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<DataTable
						columns={columns}
						data={alerts}
						enableHeaderFilters
						searchKey="alertCaseName"
						searchPlaceholder="Search by case name..."
						pageSize={pageSize}
						manualPagination
						manualFiltering
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
						onColumnFiltersChange={onColumnFiltersChange}
						manualSorting
						sorting={sortingState}
						onSortingChange={handleSortingChange}
						isLoading={isLoading}
						// Tint each row by how long the alert has been in the system:
						// green <=1h, orange 1-6h, red >6h. `now` ticks every minute so a
						// pending row re-tints as it ages, without waiting for a refetch.
						getRowClassName={(row) => alertSlaRowClass(row.original, now)}
					/>
				</CardContent>
			</Card>
		);
	}
);

AlertsTable.displayName = "AlertsTable";
