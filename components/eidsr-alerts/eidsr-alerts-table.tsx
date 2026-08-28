import { altCode } from "@/lib/alt-code";
import React, { memo, useMemo } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
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
import {
	DataTable,
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import {
	resolveRegisterRef,
	type EidsrMessage,
} from "@/lib/eidsr-message-normalize";
import { EIDSR_STATUS_FILTER_OPTIONS } from "@/constants/eidsr-alerts";
import { LAYOUT } from "@/constants/layout";
import { verifiedTableRowClass } from "@/lib/verified-row-style";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";
import { canForwardAlerts } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AlertVerifyChip } from "@/components/eidsr-alerts/alert-verify-chip";
import {
	Eye,
	Loader2,
	MoreHorizontal,
	Pencil,
	Send,
} from "lucide-react";

interface EidsrAlertsTableProps {
	messages: EidsrMessage[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
	isLoading?: boolean;
	moveInProgressId?: number | null;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Bumped when the filter bar is cleared, to also clear the header funnels. */
	filtersResetKey?: number;
	onView: (message: EidsrMessage) => void;
	onEdit: (message: EidsrMessage) => void;
	/** Move the signal into the Signal Register (asks for a district first). */
	onMove: (message: EidsrMessage) => void;
}

function createColumns(handlers: {
	onView: (m: EidsrMessage) => void;
	onEdit: (m: EidsrMessage) => void;
	onMove: (m: EidsrMessage) => void;
	moveInProgressId: number | null;
	canForward: boolean;
}): ColumnDef<EidsrMessage>[] {
	return [
		{
			accessorKey: "id",
			header: "ID",
			enableColumnFilter: false,
			cell: ({ row }) => (
				<span className="font-medium">{row.original.id}</span>
			),
		},
		{
			accessorKey: "messageId",
			header: "Message ID",
			enableColumnFilter: false,
			cell: ({ row }) => row.original.messageId || "—",
		},
		{
			accessorKey: "personReporting",
			header: "Reporter",
			// No dedicated server filter — searchable via the top filter bar.
			enableColumnFilter: false,
			cell: ({ row }) => row.original.personReporting || "—",
		},
		{
			accessorKey: "contactNumber",
			header: "Phone",
			// No dedicated server filter — searchable via the top filter bar.
			enableColumnFilter: false,
			cell: ({ row }) => row.original.contactNumber || "—",
		},
		{
			id: "location",
			accessorFn: (row) =>
				[row.village, row.alertCaseDistrict].filter(Boolean).join(", "),
			header: "Location",
			filterFn: textIncludesFilter,
			meta: {
				filterPlaceholder: "District",
			},
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
			// No dedicated server filter — searchable via the top filter bar.
			enableColumnFilter: false,
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
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: EIDSR_STATUS_FILTER_OPTIONS.filter(
					(option) => option.value !== "all"
				),
			},
			cell: ({ row }) =>
				row.original.status ? (
					<Badge variant="outline">{row.original.status}</Badge>
				) : (
					"—"
				),
		},
		{
			// One column for one question: is this signal in the Signal Register,
			// and as what? It replaces the old "In alerts" and "Forwarded" pair,
			// which asked the same question twice because two different actions
			// used to answer it — the ALT id in one, the district in the other.
			id: "inRegister",
			accessorFn: (row) =>
				resolveRegisterRef(row) != null ? "moved" : "not_moved",
			header: "Signal register",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: [
					{ value: "moved", label: "In the register" },
					{ value: "not_moved", label: "Not moved yet" },
				],
			},
			cell: ({ row }) => {
				const ref = resolveRegisterRef(row.original);
				if (!ref) {
					return <Badge variant="secondary">Not moved</Badge>;
				}
				return (
					<div className="flex flex-col items-start gap-1">
						<Badge className="bg-success hover:bg-success">
							{altCode(ref.id)}
						</Badge>
						{ref.district && (
							<span
								className="flex items-center gap-1 text-xs text-muted-foreground"
								title={`In the register under ${ref.district}`}
							>
								<Send className="h-3 w-3" />
								{ref.district}
							</span>
						)}
						{/* Where the signal has got to in the pipeline. */}
						<AlertVerifyChip alert={ref.alert} />
					</div>
				);
			},
		},
		{
			id: "date",
			accessorFn: (row) => row.receivedAt || row.createdAt || "",
			header: "Received",
			filterFn: dateRangeFilter,
			meta: {
				filterVariant: "dateRange",
			},
			cell: ({ row }) =>
				row.original.receivedAt || row.original.createdAt || "—",
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableColumnFilter: false,
			cell: ({ row }) => {
				const m = row.original;
				const moving = handlers.moveInProgressId === m.id;
				const registerRef = resolveRegisterRef(m);
				const alreadyMoved = registerRef != null;

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
									{moving ? (
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
								{/* The one way a 6767 signal enters the pipeline.
								    It replaces "Verify into alerts" (which created
								    the row already verified, skipping triage) and
								    "Forward to district" (the same act under a
								    routing name). Verification now happens in the
								    register, after triage. */}
								{handlers.canForward && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="flex items-center gap-2 text-uganda-red focus:text-uganda-red"
											onClick={() => handlers.onMove(m)}
											disabled={alreadyMoved}
											title={
												alreadyMoved
													? `Already in the register as ${altCode(
															registerRef!.id
														)}`
													: undefined
											}
										>
											<Send className="h-4 w-4" />
											{alreadyMoved
												? "Already in the register"
												: "Move to Signal Register"}
										</DropdownMenuItem>
									</>
								)}
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
		moveInProgressId = null,
		onPageChange,
		onPageSizeChange,
		onColumnFiltersChange,
		filtersResetKey,
		onView,
		onEdit,
		onMove,
	}) => {
		const canForward = canForwardAlerts(useCurrentUser());
		const columns = useMemo(
			() =>
				createColumns({
					onView,
					onEdit,
					onMove,
					moveInProgressId,
					canForward,
				}),
			[onView, onEdit, onMove, moveInProgressId, canForward]
		);
		// This table is server-paginated, so header filters run server-side
		// (manualFiltering): onColumnFiltersChange routes them to the hook, which
		// re-queries the WHOLE dataset, not just the loaded page. Only the columns
		// the backend can filter expose a funnel (Status, Location, Signal
		// register, Received); the free-text columns opt out
		// (enableColumnFilter: false) and stay searchable via the dedicated
		// EidsrAlertsFilters bar.

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
