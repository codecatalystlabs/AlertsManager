import React, { memo, useMemo } from "react";
import { type ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerSort } from "@/hooks/use-server-sort";
import { DataTable } from "@/components/ui/data-table";
import { AlertLog, type CallLogsSort } from "@/hooks/use-call-logs-data";
import { LAYOUT } from "@/constants/layout";
import {
	CALL_LOGS_CONFIG,
	createCallLogsTableColumns,
	type CallLogsTableCallbacks,
} from "@/constants/call-logs";
import { alertSlaRowClass } from "@/lib/alert-sla";
import { useTickingNow } from "@/hooks/use-ticking-now";
import { canDeleteAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";

// Table column id <-> API sort_by key. Only the columns the server can sort on
// are listed; clicking any other header's sort toggle is ignored.
const COLUMN_TO_SORT_KEY: Record<string, string> = {
	id: "id",
	date: "date",
	personReporting: "reporter",
};
const SORT_KEY_TO_COLUMN: Record<string, string> = {
	id: "id",
	date: "date",
	reporter: "personReporting",
};

interface CallLogsTableProps {
	alerts: AlertLog[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	sort: CallLogsSort;
	onSortChange: (sort: CallLogsSort) => void;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	onVerifyAlert: (alert: AlertLog) => void;
	onDeleteAlert: (alertId: number) => Promise<void>;
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Bumped when the parent clears filters, so the table resets its header-filter UI. */
	filtersResetKey?: number;
}

export const CallLogsTable = memo<CallLogsTableProps>(
	({
		alerts,
		totalCount,
		page,
		pageSize,
		totalPages,
		sort,
		onSortChange,
		isLoading,
		onPageChange,
		onPageSizeChange,
		onViewDetails,
		onEditAlert,
		onVerifyAlert,
		onDeleteAlert,
		onColumnFiltersChange,
		filtersResetKey,
	}) => {
		const canDelete = canDeleteAlerts(useCurrentUser());
		const now = useTickingNow();
		const callbacks: CallLogsTableCallbacks = useMemo(
			() => ({
				onViewDetails,
				onEditAlert,
				onVerifyAlert,
				onDeleteAlert,
				canDelete,
			}),
			[onViewDetails, onEditAlert, onVerifyAlert, onDeleteAlert, canDelete]
		);

		const columns = useMemo(
			() => createCallLogsTableColumns(callbacks),
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
						Alert Logs ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<DataTable
						columns={columns}
						data={alerts}
						enableHeaderFilters
						searchKey="personReporting"
						searchPlaceholder="Search reporters..."
						pageSize={pageSize}
						manualPagination
						manualFiltering
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
						onColumnFiltersChange={onColumnFiltersChange}
						filtersResetKey={filtersResetKey}
						manualSorting
						sorting={sortingState}
						onSortingChange={handleSortingChange}
						isLoading={isLoading}
						// Tint each row by time in system: green <=1h, orange 1-6h,
						// red >6h. The clock stops at verification, so a pending row
						// keeps ageing (`now` ticks every minute) while a verified one
						// freezes at the colour it earned.
						getRowClassName={(row) => alertSlaRowClass(row.original, now)}
					/>
				</CardContent>
			</Card>
		);
	}
);

CallLogsTable.displayName = "CallLogsTable";
