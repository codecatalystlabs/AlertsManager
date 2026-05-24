import React, { memo, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	createAlertsTableColumns,
	type AlertsTableCallbacks,
} from "@/constants/alerts";

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
			<section className="animate-reveal [animation-delay:200ms] editorial-card">
				<header className="px-6 py-5 flex items-baseline justify-between gap-4 border-b border-foreground/[0.08]">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ · Register
						</p>
						<h2 className="serif text-xl font-medium tracking-tight text-foreground">
							All alerts
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
						searchKey="alertCaseName"
						searchPlaceholder="Search by case name…"
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

AlertsTable.displayName = "AlertsTable";
