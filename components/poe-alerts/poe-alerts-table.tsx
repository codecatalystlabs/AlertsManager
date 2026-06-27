import { memo, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { LAYOUT } from "@/constants/layout";
import { Eye, MoreHorizontal, Send, ShieldCheck } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertVerifyChip } from "@/components/eidsr-alerts/alert-verify-chip";
import { canForwardAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";

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
	onForward?: (alert: PoeAlertRow) => void;
	onVerify?: (alert: PoeAlertRow) => void;
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
		onForward,
		onVerify,
	}) => {
		const canForward = canForwardAlerts(useCurrentUser());
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
					id: "inAlerts",
					header: "In alerts",
					cell: ({ row }) =>
						row.original.linkedAlert ? (
							<AlertVerifyChip alert={row.original.linkedAlert} />
						) : (
							<span className="text-muted-foreground">—</span>
						),
				},
				{
					id: "forwarded",
					header: "Forwarded",
					cell: ({ row }) => {
						const a = row.original;
						if (!a.forwardedToDistrict)
							return <span className="text-muted-foreground">—</span>;
						return (
							<div className="flex flex-col items-start gap-1">
								<Badge
									variant="outline"
									className="gap-1 whitespace-nowrap text-[10px] font-normal"
								>
									<Send className="h-3 w-3" />
									{a.forwardedToDistrict}
								</Badge>
								<AlertVerifyChip alert={a.forwardedAlert} />
							</div>
						);
					},
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
								{canForward && onForward && !row.original.live && (
									<DropdownMenuItem
										onClick={() => onForward(row.original)}
									>
										<Send className="h-4 w-4 mr-2" />
										Forward to district
									</DropdownMenuItem>
								)}
								{onVerify && !row.original.live && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="text-uganda-red focus:text-uganda-red"
											onClick={() => onVerify(row.original)}
										>
											<ShieldCheck className="h-4 w-4 mr-2" />
											Verify into alerts
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					),
				},
			],
			[onView, onForward, onVerify, canForward]
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
