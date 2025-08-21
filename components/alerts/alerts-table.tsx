import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	createAlertsTableColumns,
	type AlertsTableCallbacks,
} from "@/constants/alerts";

interface AlertsTableProps {
	alerts: AlertType[];
	deletingId: number | null;
	onDeleteAlert: (alertId: number) => Promise<void>;
	onViewAlert?: (alert: AlertType) => void;
	onEditAlert?: (alert: AlertType) => void;
}

export const AlertsTable = memo<AlertsTableProps>(
	({ alerts, deletingId, onDeleteAlert, onViewAlert, onEditAlert }) => {
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
			<Card>
				<CardHeader>
					<CardTitle>All Alerts ({alerts.length})</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={alerts}
						searchKey="alertCaseName"
						searchPlaceholder="Search by case name..."
					/>
				</CardContent>
			</Card>
		);
	}
);

AlertsTable.displayName = "AlertsTable";
