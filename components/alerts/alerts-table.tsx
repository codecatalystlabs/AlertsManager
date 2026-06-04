import React, { memo, useMemo } from "react";
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
	}) => {
		const callbacks: AlertsTableCallbacks = useMemo(
			() => ({
				onDelete: onDeleteAlert,
				onView: onViewAlert,
				onEdit: onEditAlert,
				deletingId,
			}),
			[onDeleteAlert, onViewAlert, onEditAlert, deletingId]
		);

		const columns = useMemo(
			() => createAlertsTableColumns(callbacks),
			[callbacks]
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
						searchKey="alertCaseName"
						searchPlaceholder="Search by case name..."
						pageSize={pageSize}
						manualPagination
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
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
