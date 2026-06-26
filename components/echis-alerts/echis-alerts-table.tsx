import { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { LAYOUT } from "@/constants/layout";
import { Eye, MoreHorizontal } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function fmtDate(v?: string) {
	if (!v) return "—";
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

interface EchisAlertsTableProps {
	alerts: EchisAlertRow[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onView: (alert: EchisAlertRow) => void;
}

export const EchisAlertsTable = memo<EchisAlertsTableProps>(
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
		const columns = useMemo<ColumnDef<EchisAlertRow>[]>(
			() => [
				{
					accessorKey: "date",
					header: "Date",
					cell: ({ row }) => fmtDate(row.original.date),
				},
				{ accessorKey: "district", header: "District" },
				{ accessorKey: "county", header: "County" },
				{ accessorKey: "subCounty", header: "Sub-county" },
				{ accessorKey: "healthFacility", header: "Health facility" },
				{
					accessorKey: "vhtName",
					header: "VHT name",
					cell: ({ row }) => row.original.vhtName || "—",
				},
				{
					accessorKey: "vhtPhone",
					header: "VHT phone",
					cell: ({ row }) => row.original.vhtPhone || "—",
				},
				{
					accessorKey: "verificationStatus",
					header: "Verification",
					cell: ({ row }) => (
						<Badge variant="outline" className="text-[10px] font-normal">
							{row.original.verificationStatus || "—"}
						</Badge>
					),
				},
				{
					accessorKey: "briefDescription",
					header: "Description",
					cell: ({ row }) => (
						<span className="line-clamp-2 max-w-[240px] text-xs">
							{row.original.briefDescription || "—"}
						</span>
					),
				},
				{
					id: "actions",
					header: "",
					cell: ({ row }) => (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => onView(row.original)}>
									<Eye className="h-4 w-4 mr-2" />
									View
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					),
				},
			],
			[onView]
		);

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium">
						eCHIS signals ({totalCount.toLocaleString()})
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
EchisAlertsTable.displayName = "EchisAlertsTable";
