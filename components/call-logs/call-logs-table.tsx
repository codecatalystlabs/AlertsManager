import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import { LAYOUT } from "@/constants/layout";
import {
	CALL_LOGS_CONFIG,
	createCallLogsTableColumns,
	type CallLogsTableCallbacks,
} from "@/constants/call-logs";
import { verifiedTableRowClass } from "@/lib/verified-row-style";

interface CallLogsTableProps {
	alerts: AlertLog[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	onVerifyAlert: (alert: AlertLog) => void;
	onDeleteAlert: (alertId: number) => Promise<void>;
}

export const CallLogsTable = memo<CallLogsTableProps>(
	({
		alerts,
		totalCount,
		page,
		pageSize,
		totalPages,
		isLoading,
		onPageChange,
		onPageSizeChange,
		onViewDetails,
		onEditAlert,
		onVerifyAlert,
		onDeleteAlert,
	}) => {
		const callbacks: CallLogsTableCallbacks = useMemo(
			() => ({
				onViewDetails,
				onEditAlert,
				onVerifyAlert,
				onDeleteAlert,
			}),
			[onViewDetails, onEditAlert, onVerifyAlert, onDeleteAlert]
		);

		const columns = useMemo(
			() => createCallLogsTableColumns(callbacks),
			[callbacks]
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

CallLogsTable.displayName = "CallLogsTable";
