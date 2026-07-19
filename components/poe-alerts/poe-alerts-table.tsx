import { memo, useMemo } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { POE_RISK_LEVEL_OPTIONS } from "@/constants/poe-alerts";
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
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Bumped when the filter bar is cleared, to also clear the header funnels. */
	filtersResetKey?: number;
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
		onColumnFiltersChange,
		filtersResetKey,
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
					filterFn: dateRangeFilter,
					meta: { filterVariant: "dateRange" },
					cell: ({ row }) => fmtDate(row.original.createdAtRemote),
				},
				{
					accessorKey: "fullName",
					header: "Traveller",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Traveller name" },
				},
				{
					accessorKey: "passportNumber",
					header: "Passport",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Passport" },
				},
				{
					accessorKey: "nationality",
					header: "Nationality",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Nationality" },
				},
				{
					accessorKey: "portOfEntry",
					header: "Port of entry",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Port of entry" },
				},
				{
					accessorKey: "arrivalDate",
					header: "Arrival",
					filterFn: dateRangeFilter,
					meta: { filterVariant: "dateRange" },
					cell: ({ row }) => fmtDate(row.original.arrivalDate),
				},
				{
					accessorKey: "flightNumber",
					header: "Flight",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Flight" },
				},
				{
					accessorKey: "riskLevel",
					header: "Risk",
					filterFn: exactStringFilter,
					meta: {
						filterVariant: "select",
						filterOptions: POE_RISK_LEVEL_OPTIONS.map((level) => ({
							value: level,
							label: level.charAt(0).toUpperCase() + level.slice(1),
						})),
					},
					cell: ({ row }) => (
						<Badge variant={riskVariant(row.original.riskLevel)}>
							{row.original.riskLevel || "—"}
						</Badge>
					),
				},
				{
					accessorKey: "symptomsText",
					header: "Symptoms",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Symptoms" },
					cell: ({ row }) => (
						<span className="line-clamp-2 max-w-[240px] break-words text-xs">
							{row.original.symptomsText || "—"}
						</span>
					),
				},
				{
					accessorKey: "refCode",
					header: "Ref",
					filterFn: textIncludesFilter,
					meta: { filterPlaceholder: "Ref code" },
				},
				{
					id: "inAlerts",
					accessorFn: (row) => (row.linkedAlertId ? "linked" : "unlinked"),
					header: "In alerts",
					filterFn: exactStringFilter,
					meta: {
						filterVariant: "select",
						filterOptions: [
							{ value: "linked", label: "Linked" },
							{ value: "unlinked", label: "Not linked" },
						],
					},
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
					enableColumnFilter: false,
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
					enableColumnFilter: false,
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
						enableHeaderFilters
						manualFiltering
						onColumnFiltersChange={onColumnFiltersChange}
						filtersResetKey={filtersResetKey}
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
