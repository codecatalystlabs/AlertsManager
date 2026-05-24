import React, { memo, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import {
	createCallLogsTableColumns,
	type CallLogsTableCallbacks,
} from "@/constants/call-logs";

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
			<section className="animate-reveal [animation-delay:200ms] editorial-card">
				<header className="px-6 py-5 flex items-baseline justify-between gap-4 border-b border-foreground/[0.08]">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ · Inbound log
						</p>
						<h2 className="serif text-xl font-medium tracking-tight text-foreground">
							Alert logs
						</h2>
					</div>
					<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums shrink-0">
						{totalCount.toLocaleString()} records
					</p>
				</header>
				<div className="px-6 py-6">
					<DataTable
						columns={columns}
						data={alerts}
						searchKey="personReporting"
						searchPlaceholder="Search reporters…"
						pageSize={pageSize}
						manualPagination
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
						isLoading={isLoading}
					/>
				</div>
			</section>
		);
	}
);

CallLogsTable.displayName = "CallLogsTable";
