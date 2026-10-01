import React, { memo, useMemo } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { LAYOUT } from "@/constants/layout";
import { can, PERM } from "@/lib/access";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RawInformationCell } from "@/components/eidsr-alerts/raw-information-cell";
import { formatDateTime, formatTimeAgo } from "@/lib/format-date";
import { arrivedRecently } from "@/lib/signal-origin";
import {
	Eye,
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
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onInAlertsFilterChange?: (filter: "all" | "linked" | "unlinked") => void;
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Bumped when the filter bar is cleared, to also clear the header funnels. */
	filtersResetKey?: number;
	onView: (message: EidsrMessage) => void;
	onEdit: (message: EidsrMessage) => void;
	/** Opens the log-into-Raw-Information dialog (for signals not yet in it). */
	onMove: (message: EidsrMessage) => void;
	/**
	 * Start of the sync that just finished on this page (ISO). Rows the mirror
	 * first saw at or after it arrived in that sync and are highlighted.
	 */
	highlightSince?: string | null;
}

/** Arrived in the sync that started at `since` (both ISO timestamps). */
function arrivedInSync(message: EidsrMessage, since: string | null | undefined): boolean {
	if (!since || !message.createdAt) return false;
	const at = new Date(message.createdAt).getTime();
	const start = new Date(since).getTime();
	return Number.isFinite(at) && Number.isFinite(start) && at >= start;
}

function createColumns(handlers: {
	onView: (m: EidsrMessage) => void;
	onEdit: (m: EidsrMessage) => void;
	onMove: (m: EidsrMessage) => void;
	/** What the account's role allows (lib/access). */
	canMove: boolean;
	canEdit: boolean;
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
			// When the mirror first saw it — the order the list is in, so the
			// newest sync's arrivals read as the top block of the table.
			id: "synced",
			header: "Synced",
			enableColumnFilter: false,
			cell: ({ row }) => {
				const at = row.original.createdAt;
				return (
					<span
						className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
						title={at ? `Synced ${formatDateTime(at)}` : undefined}
					>
						{formatTimeAgo(at, "—")}
						{arrivedRecently(at) && (
							<span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
								New
							</span>
						)}
					</span>
				);
			},
		},
		{
			// Next to Synced, not at the far edge: "where did it go?" is the
			// question right after "when did it arrive?", and at the end of a
			// wide table it scrolled out of view.
			id: "inRegister",
			accessorFn: (row) =>
				resolveRegisterRef(row) != null ? "moved" : "not_moved",
			header: "Raw Information",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: [
					{ value: "moved", label: "In Raw Information" },
					{ value: "not_moved", label: "Not logged" },
				],
			},
			cell: ({ row }) => <RawInformationCell message={row.original} />,
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
			id: "date",
			accessorFn: (row) => row.receivedAt || row.createdAt || "",
			// The reporter's own event date, as eIDSR has it. Distinct from
			// "Synced", which is when it reached this system.
			header: "Reported",
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
				// Once a signal has its Raw Information row there is nothing left
				// to move: the server would refuse a second one (409). The row's
				// column links to where it is.
				const canMove = handlers.canMove && resolveRegisterRef(m) == null;

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
									<MoreHorizontal className="h-4 w-4" />
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
								{handlers.canEdit && (
									<DropdownMenuItem
										className="flex items-center gap-2"
										onClick={() => handlers.onEdit(m)}
									>
										<Pencil className="h-4 w-4" />
										Edit
									</DropdownMenuItem>
								)}
								{canMove && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="flex items-center gap-2"
											onClick={() => handlers.onMove(m)}
										>
											<Send className="h-4 w-4" />
											Log into Raw Information
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
		onPageChange,
		onPageSizeChange,
		onInAlertsFilterChange,
		onColumnFiltersChange,
		filtersResetKey,
		onView,
		onEdit,
		onMove,
		highlightSince,
	}) => {
		const user = useCurrentUser();
		const canMove = can(user, PERM.eidsrMove);
		const canEdit = can(user, PERM.eidsrEdit);
		const columns = useMemo(
			() =>
				createColumns({
					onView,
					onEdit,
					onMove,
					canMove,
					canEdit,
				}),
			[onView, onEdit, onMove, canMove, canEdit]
		);
		// This table is server-paginated, so header filters run server-side
		// (manualFiltering): onColumnFiltersChange routes them to the hook, which
		// re-queries the WHOLE dataset, not just the loaded page. Only the columns
		// the backend can filter expose a funnel (Raw Information, Location,
		// Reported); the free-text columns opt out (enableColumnFilter: false) and
		// stay searchable via the dedicated EidsrAlertsFilters bar, which also
		// still filters by eIDSR status. The legacy onInAlertsFilterChange prop is
		// kept for API compatibility but unused — the Raw Information column
		// header filter covers it.
		void onInAlertsFilterChange;

		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={LAYOUT.cardTitle}>
						6767 messages ({totalCount.toLocaleString()})
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<DataTable
						id="eidsr-6767"
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
						// This sync's arrivals get a left accent, so "what just came
						// in" stays findable after paging or re-sorting.
						getRowClassName={(row) =>
							arrivedInSync(row.original, highlightSince)
								? // On the first cell: a box-shadow on the <tr> itself is not
									// painted under border-collapse.
									"bg-primary/[0.04] [&>td:first-child]:shadow-[inset_3px_0_0_hsl(var(--primary))]"
								: undefined
						}
					/>
				</CardContent>
			</Card>
		);
	}
);

EidsrAlertsTable.displayName = "EidsrAlertsTable";
