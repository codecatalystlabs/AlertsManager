import React, { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { Eye, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EidsrMessagesTableProps {
	messages: EidsrMessage[];
	isLoading?: boolean;
	onView: (message: EidsrMessage) => void;
	onEdit: (message: EidsrMessage) => void;
	onVerify: (message: EidsrMessage) => void;
	onDelete: (message: EidsrMessage) => void;
}

function createColumns(handlers: {
	onView: (m: EidsrMessage) => void;
	onEdit: (m: EidsrMessage) => void;
	onVerify: (m: EidsrMessage) => void;
	onDelete: (m: EidsrMessage) => void;
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
				const parts = [
					row.original.village,
					row.original.alertCaseDistrict,
				].filter(Boolean);
				const text = parts.join(", ") || "—";
				return (
					<span className="block max-w-[180px] truncate" title={text}>
						{text}
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
						className="block max-w-[240px] truncate"
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
			id: "verification",
			header: "Verification",
			cell: ({ row }) =>
				row.original.isVerified ? (
					<Badge className="bg-green-600 hover:bg-green-600">Verified</Badge>
				) : (
					<Badge variant="secondary">Unverified</Badge>
				),
		},
		{
			accessorKey: "linkedAlertId",
			header: "Linked alert",
			cell: ({ row }) =>
				row.original.linkedAlertId != null
					? `ALT${String(row.original.linkedAlertId).padStart(3, "0")}`
					: "—",
		},
		{
			id: "date",
			header: "Received",
			cell: ({ row }) =>
				row.original.receivedAt || row.original.createdAt || "—",
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const m = row.original;
				const linked = m.linkedAlertId != null;
				return (
					<div className="flex flex-wrap gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="View"
							onClick={() => handlers.onView(m)}
						>
							<Eye className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="Edit"
							onClick={() => handlers.onEdit(m)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title={
								linked
									? "Verify again (update linked alert)"
									: "Verify into alerts"
							}
							onClick={() => handlers.onVerify(m)}
						>
							<ShieldCheck
								className="h-4 w-4"
							/>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-destructive hover:text-destructive"
							title="Delete"
							onClick={() => handlers.onDelete(m)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				);
			},
		},
	];
}

export const EidsrMessagesTable = memo<EidsrMessagesTableProps>(
	({ messages, isLoading, onView, onEdit, onVerify, onDelete }) => {
		const columns = useMemo(
			() =>
				createColumns({
					onView,
					onEdit,
					onVerify,
					onDelete,
				}),
			[onView, onEdit, onVerify, onDelete]
		);

		return (
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">SMS messages</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={messages}
						isLoading={isLoading}
						pageSize={25}
						searchKey="messageText"
						searchPlaceholder="Search messages..."
					/>
				</CardContent>
			</Card>
		);
	}
);

EidsrMessagesTable.displayName = "EidsrMessagesTable";
