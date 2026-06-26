import { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { LAYOUT } from "@/constants/layout";
import { Eye } from "lucide-react";

function fmtDate(v?: string) {
	if (!v) return "—";
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function riskVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
	const l = level.toLowerCase();
	if (l === "high") return "destructive";
	if (l === "medium") return "default";
	return "secondary";
}

interface PoeAlertsTableProps {
	alerts: PoeAlertRow[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onView: (alert: PoeAlertRow) => void;
}

export const PoeAlertsTable = memo<PoeAlertsTableProps>(
	({
		alerts,
		totalCount,
		page,
		pageSize,
		totalPages,
		isLoading,
		onPageChange,
		onPageSizeChange,
		onView,
	}) => {
		const columns = useMemo<ColumnDef<PoeAlertRow>[]>(
			() => [
				{
					accessorKey: "createdAtRemote",
					header: "Created",
					cell: ({ row }) => fmtDate(row.original.createdAtRemote),
				},
				{ accessorKey: "fullName", header: "Traveller" },
				{ accessorKey: "passportNumber", header: "Passport" },
				{ accessorKey: "nationality", header: "Nationality" },
				{ accessorKey: "portOfEntry", header: "Port of entry" },
				{
					accessorKey: "arrivalDate",
					header: "Arrival",
					cell: ({ row }) => fmtDate(row.original.arrivalDate),
				},
				{ accessorKey: "flightNumber", header: "Flight" },
				{
					accessorKey: "riskLevel",
					header: "Risk",
					cell: ({ row }) => (
						<Badge variant={riskVariant(row.original.riskLevel)}>
							{row.original.riskLevel || "—"}
						</Badge>
					),
				},
				{ accessorKey: "symptomsText", header: "Symptoms" },
				{ accessorKey: "refCode", header: "Ref" },
				{
					id: "actions",
					header: "",
					cell: ({ row }) => (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2"
							onClick={() => onView(row.original)}
						>
							<Eye className="h-4 w-4" />
						</Button>
					),
				},
			],
			[onView]
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium">
						POE alerts ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0 pb-2">
					<DataTable
						columns={columns}
						data={alerts}
						hideToolbar
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
PoeAlertsTable.displayName = "PoeAlertsTable";
