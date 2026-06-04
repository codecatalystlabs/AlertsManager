import React, { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { LAYOUT } from "@/constants/layout";
import { verifiedTableRowClass } from "@/lib/verified-row-style";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";
import { Eye, Loader2, MoreHorizontal, Pencil, ShieldCheck } from "lucide-react";

interface EidsrAlertsTableProps {
	messages: EidsrMessage[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	verifyInProgressId?: number | null;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onView: (message: EidsrMessage) => void;
	onEdit: (message: EidsrMessage) => void;
	onVerify: (message: EidsrMessage) => void;
}

function createColumns(handlers: {
	onView: (m: EidsrMessage) => void;
	onEdit: (m: EidsrMessage) => void;
	onVerify: (m: EidsrMessage) => void;
	verifyInProgressId: number | null;
}): ColumnDef<EidsrMessage>[] {
	return [
		{
			accessorKey: "id",
			header: "ID",
			cell: ({ row }) => (
				<span className="font-medium">{row.original.id}</span>
			),
		},
		{
			accessorKey: "messageId",
			header: "Message ID",
			cell: ({ row }) => row.original.messageId || "—",
		},
		{
			accessorKey: "personReporting",
			header: "Reporter",
			cell: ({ row }) => row.original.personReporting || "—",
		},
		{
			accessorKey: "contactNumber",
			header: "Phone",
			cell: ({ row }) => row.original.contactNumber || "—",
		},
		{
			id: "location",
			header: "Location",
			cell: ({ row }) => {
				const text = [row.original.village, row.original.alertCaseDistrict]
					.filter(Boolean)
					.join(", ");
				return (
					<span
						className="block max-w-[200px] truncate"
						title={text || undefined}
					>
						{text || "—"}
					</span>
				);
			},
		},
		{
			accessorKey: "messageText",
			header: "Message",
			cell: ({ row }) => {
				const text = row.original.messageText || "—";
				return (
					<span
						className="block max-w-[280px] truncate"
						title={text !== "—" ? text : undefined}
					>
						{text}
					</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) =>
				row.original.status ? (
					<Badge variant="outline">{row.original.status}</Badge>
				) : (
					"—"
				),
		},
		{
			id: "inAlerts",
			header: "In alerts",
			cell: ({ row }) =>
				row.original.linkedAlertId != null ? (
					<Badge className="bg-green-600 hover:bg-green-600">
						ALT{String(row.original.linkedAlertId).padStart(3, "0")}
					</Badge>
				) : (
					<Badge variant="secondary">Not linked</Badge>
				),
		},
		{
			id: "date",
			header: "Received",
			cell: ({ row }) =>
				row.original.receivedAt || row.original.createdAt || "—",
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			cell: ({ row }) => {
				const m = row.original;
				const verifying = handlers.verifyInProgressId === m.id;

				return (
					<div className="text-right">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="h-8 w-8 p-0 hover:bg-uganda-yellow/10"
									aria-label={`Actions for 6767 message ${m.id}`}
								>
									<span className="sr-only">Open menu</span>
									{verifying ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<MoreHorizontal className="h-4 w-4" />
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuItem
									className="flex items-center gap-2"
									onClick={() => handlers.onView(m)}
								>
									<Eye className="h-4 w-4" />
									View details
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center gap-2"
									onClick={() => handlers.onEdit(m)}
								>
									<Pencil className="h-4 w-4" />
									Edit
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="flex items-center gap-2 text-uganda-red focus:text-uganda-red"
									onClick={() => handlers.onVerify(m)}
									disabled={verifying}
								>
									<ShieldCheck className="h-4 w-4" />
									Verify into alerts
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];
}

export const EidsrAlertsTable = memo<EidsrAlertsTableProps>(
	({
		messages,
		totalCount,
		page,
		pageSize,
		totalPages,
		isLoading = false,
		verifyInProgressId = null,
		onPageChange,
		onPageSizeChange,
		onView,
		onEdit,
		onVerify,
	}) => {
		const columns = useMemo(
			() =>
				createColumns({
					onView,
					onEdit,
					onVerify,
					verifyInProgressId,
				}),
			[onView, onEdit, onVerify, verifyInProgressId]
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={LAYOUT.cardTitle}>
						6767 events ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<DataTable
						columns={columns}
						data={messages}
						pageSize={pageSize}
						manualPagination
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
						isLoading={isLoading}
						getRowClassName={(row) =>
							verifiedTableRowClass(isEidsr6767Verified(row.original))
						}
					/>
				</CardContent>
			</Card>
		);
	}
);

EidsrAlertsTable.displayName = "EidsrAlertsTable";
