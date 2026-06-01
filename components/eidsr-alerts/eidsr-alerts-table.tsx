import React, { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import { getEidsrDataValue } from "@/lib/eidsr-event-fields";
import { LAYOUT } from "@/constants/layout";
import { Eye } from "lucide-react";

interface EidsrAlertsTableProps {
	events: EidsrEvent[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onViewEvent: (event: EidsrEvent) => void;
}

function createEidsrColumns(
	onViewEvent: (event: EidsrEvent) => void
): ColumnDef<EidsrEvent>[] {
	return [
		{
			accessorKey: "id",
			header: "Local ID",
			cell: ({ row }) => (
				<span className="font-medium">{row.original.id}</span>
			),
		},
		{
			accessorKey: "eventDate",
			header: "Event date",
			cell: ({ row }) => row.original.eventDate || "—",
		},
		{
			id: "message",
			header: "Message",
			cell: ({ row }) => {
				const message = getEidsrDataValue(row.original, "narrative");
				return (
					<span
						className="block max-w-[280px] truncate"
						title={message || undefined}
					>
						{message || "—"}
					</span>
				);
			},
		},
		{
			id: "disease",
			header: "Disease",
			cell: ({ row }) => getEidsrDataValue(row.original, "disease") || "—",
		},
		{
			id: "reporter",
			header: "Reporter",
			cell: ({ row }) =>
				getEidsrDataValue(row.original, "reporterName") || "—",
		},
		{
			id: "phone",
			header: "Phone",
			cell: ({ row }) => getEidsrDataValue(row.original, "phone") || "—",
		},
		{
			id: "location",
			header: "Location",
			cell: ({ row }) => {
				const location = getEidsrDataValue(row.original, "location");
				return (
					<span
						className="block max-w-[200px] truncate"
						title={location || undefined}
					>
						{location || "—"}
					</span>
				);
			},
		},
		{
			id: "source",
			header: "Source",
			cell: ({ row }) => getEidsrDataValue(row.original, "source") || "—",
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<Badge variant="secondary">{row.original.status}</Badge>
			),
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			cell: ({ row }) => (
				<div className="text-right">
					<Button
						size="sm"
						variant="outline"
						onClick={() => onViewEvent(row.original)}
						aria-label={`View alert ${row.original.id}`}
					>
						<Eye className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];
}

export const EidsrAlertsTable = memo<EidsrAlertsTableProps>(
	({
		events,
		totalCount,
		page,
		pageSize,
		totalPages,
		isLoading = false,
		onPageChange,
		onPageSizeChange,
		onViewEvent,
	}) => {
		const columns = useMemo(
			() => createEidsrColumns(onViewEvent),
			[onViewEvent]
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={LAYOUT.cardTitle}>
						Events ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<DataTable
						columns={columns}
						data={events}
						pageSize={pageSize}
						manualPagination
						pageCount={totalPages}
						totalRowCount={totalCount}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
						onPageSizeChange={onPageSizeChange}
						isLoading={isLoading}
					/>
				</CardContent>
			</Card>
		);
	}
);

EidsrAlertsTable.displayName = "EidsrAlertsTable";
