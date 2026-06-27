import React, { memo, useMemo } from "react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	ALERTS_CONFIG,
	createAlertsTableColumns,
	type AlertsTableCallbacks,
} from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";
import { verifiedTableRowClass } from "@/lib/verified-row-style";
import { canDeleteAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
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

		const sortingState: SortingState = useMemo(() => {
			const columnId = sort.by ? SORT_KEY_TO_COLUMN[sort.by] : undefined;
			return columnId ? [{ id: columnId, desc: sort.order === "desc" }] : [];
		}, [sort]);

		const handleSortingChange = useMemo(
			() => (next: SortingState) => {
				const first = next[0];
				if (!first) {
					onSortChange({ by: "", order: "desc" });
					return;
				}
				const key = COLUMN_TO_SORT_KEY[first.id];
				// Ignore sort toggles on columns the server can't sort on.
				if (!key) return;
				onSortChange({ by: key, order: first.desc ? "desc" : "asc" });
			},
			[onSortChange]
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={LAYOUT.cardTitle}>
						All Alerts ({totalCount.toLocaleString()})
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
						getRowClassName={(row) =>
							verifiedTableRowClass(!!row.original.isVerified)
						}
					/>
				</CardContent>
			</Card>
		);
	}
);

AlertsTable.displayName = "AlertsTable";
