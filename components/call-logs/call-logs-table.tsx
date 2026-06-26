import React, { memo, useMemo } from "react";
import { type SortingState, type ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { AlertLog, type CallLogsSort } from "@/hooks/use-call-logs-data";
import { LAYOUT } from "@/constants/layout";
import {
	CALL_LOGS_CONFIG,
	createCallLogsTableColumns,
	type CallLogsTableCallbacks,
} from "@/constants/call-logs";
import { verifiedTableRowClass } from "@/lib/verified-row-style";
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
	}) => {
		const canDelete = canDeleteAlerts(useCurrentUser());
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

CallLogsTable.displayName = "CallLogsTable";
