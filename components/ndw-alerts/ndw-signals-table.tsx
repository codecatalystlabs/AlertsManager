import { useMemo } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, exactStringFilter } from "@/components/ui/data-table";
import { Eye, MoreHorizontal, Send, ShieldCheck } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertVerifyChip } from "@/components/eidsr-alerts/alert-verify-chip";
import { LAYOUT } from "@/constants/layout";
import { canForwardAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ForwardedAlertRef } from "@/lib/fetch-ndw-alerts";

/** The fields the shared NDW columns (In alerts / Forwarded / actions) read. */
export interface NdwSignalRow {
	id: number;
	live?: boolean;
	linkedAlertId?: number;
	linkedAlert?: ForwardedAlertRef;
	forwardedToDistrict?: string;
	forwardedAlert?: ForwardedAlertRef;
}

interface NdwRowHandlers<TRow> {
	onView: (row: TRow) => void;
	onForward?: (row: TRow) => void;
	onVerify?: (row: TRow) => void;
	canForward: boolean;
}

/**
 * The In-alerts / Forwarded / row-actions columns — byte-identical across the
 * eCHIS and POE tables — appended after each feed's domain columns.
 */
export function buildNdwSharedColumns<TRow extends NdwSignalRow>({
	onView,
	onForward,
	onVerify,
	canForward,
}: NdwRowHandlers<TRow>): ColumnDef<TRow>[] {
	return [
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
							<DropdownMenuItem onClick={() => onForward(row.original)}>
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
	];
}

export interface NdwSignalsTableProps<TRow> {
	/** CardTitle label, e.g. "eCHIS signals" / "POE alerts". */
	title: string;
	/** The feed-specific leading columns; the shared columns are appended. */
	domainColumns: ColumnDef<TRow>[];
	alerts: TRow[];
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
	onView: (row: TRow) => void;
	onForward?: (row: TRow) => void;
	onVerify?: (row: TRow) => void;
}

/**
 * Shared table shell for an NDW signal feed (eCHIS / POE). Owns everything but
 * the domain columns: the Card wrapper, the shared In-alerts/Forwarded/actions
 * columns, and the server-side DataTable wiring. The two feed tables collapse to
 * a domain-column list + this component.
 */
export function NdwSignalsTable<TRow extends NdwSignalRow>({
	title,
	domainColumns,
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
}: NdwSignalsTableProps<TRow>) {
	const canForward = canForwardAlerts(useCurrentUser());
	const columns = useMemo<ColumnDef<TRow>[]>(
		() => [
			...domainColumns,
			...buildNdwSharedColumns<TRow>({ onView, onForward, onVerify, canForward }),
		],
		[domainColumns, onView, onForward, onVerify, canForward]
	);

	return (
		<Card className={LAYOUT.card}>
			<CardHeader className="py-3 px-4">
				<CardTitle className="text-sm font-medium">
					{title} ({totalCount.toLocaleString()})
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
