import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import {
	CALL_LOGS_CONFIG,
	createCallLogsTableColumns,
	type CallLogsTableCallbacks,
} from "@/constants/call-logs";

interface CallLogsTableProps {
	alerts: AlertLog[];
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	onVerifyAlert: (alert: AlertLog) => void;
	onDeleteAlert: (alertId: number) => Promise<void>;
}

export const CallLogsTable = memo<CallLogsTableProps>(
	({ alerts, onViewDetails, onEditAlert, onVerifyAlert, onDeleteAlert }) => {
		const callbacks: CallLogsTableCallbacks = useMemo(
			() => ({
				onViewDetails,
				onEditAlert,
				onVerifyAlert,
				onDeleteAlert,
			}),
			[onViewDetails, onEditAlert, onVerifyAlert, onDeleteAlert]
		);

		// console.log(alerts,"alerts");

		const columns = useMemo(
			() => createCallLogsTableColumns(callbacks),
			[callbacks]
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle>
						Alert Logs ({alerts.length} records)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={alerts}
						searchKey="personReporting"
						searchPlaceholder="Search reporters..."
						pageSize={CALL_LOGS_CONFIG.ITEMS_PER_PAGE}
					/>
				</CardContent>
			</Card>
		);
	}
);

CallLogsTable.displayName = "CallLogsTable";
