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
	resolveInAlertsRef,
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
	ShieldCheck,
} from "lucide-react";

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
	onInAlertsFilterChange?: (filter: "all" | "linked" | "unlinked") => void;
	/** Receives per-column header filter changes so they query the whole dataset. */
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	/** Bumped when the filter bar is cleared, to also clear the header funnels. */
	filtersResetKey?: number;
	onView: (message: EidsrMessage) => void;
	onEdit: (message: EidsrMessage) => void;
	onVerify: (message: EidsrMessage) => void;
	onForward: (message: EidsrMessage) => void;
}

function createColumns(handlers: {
	onView: (m: EidsrMessage) => void;
	onEdit: (m: EidsrMessage) => void;
	onVerify: (m: EidsrMessage) => void;
	onForward: (m: EidsrMessage) => void;
	verifyInProgressId: number | null;
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
			id: "inAlerts",
			accessorFn: (row) =>
				resolveInAlertsRef(row) != null ? "linked" : "unlinked",
			header: "In alerts",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: [
					{ value: "linked", label: "Linked" },
					{ value: "unlinked", label: "Not linked" },
				],
			},
			cell: ({ row }) => {
				// The verify-into-alerts linked alert, or — failing that — a
				// forwarded alert the district has since verified. Both surface
				// here as a green ALT id so a forwarded alert lights up "In
				// alerts" once verified, the same way verify-into-alerts does.
				const ref = resolveInAlertsRef(row.original);
				return ref ? (
					<div className="flex flex-col items-start gap-1">
						<Badge className="bg-success hover:bg-success">
							{altCode(ref.id)}
						</Badge>
						{/* Surface the alert's live verification state too. */}
						<AlertVerifyChip alert={ref.alert} />
					</div>
				) : (
					<Badge variant="secondary">Not linked</Badge>
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
			id: "forwarded",
			header: "Forwarded",
			enableColumnFilter: false,
			cell: ({ row }) => {
				const m = row.original;
				if (!m.forwardedToDistrict) {
					return <span className="text-muted-foreground">—</span>;
				}
				return (
					<div className="flex flex-col items-start gap-1">
						<Badge
							variant="secondary"
							className="gap-1 whitespace-nowrap"
							title={`Forwarded to ${m.forwardedToDistrict}`}
						>
							<Send className="h-3 w-3" />
							{m.forwardedToDistrict}
						</Badge>
						{/* Traceability: did the district verify the forwarded alert? */}
						<AlertVerifyChip alert={m.forwardedAlert} />
					</div>
				);
			},
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableColumnFilter: false,
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
								{handlers.canForward && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="flex items-center gap-2"
											onClick={() => handlers.onForward(m)}
										>
											<Send className="h-4 w-4" />
											Forward to district
										</DropdownMenuItem>
									</>
								)}
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
		onInAlertsFilterChange,
		onColumnFiltersChange,
		filtersResetKey,
		onView,
		onEdit,
		onVerify,
		onForward,
	}) => {
		const canForward = canForwardAlerts(useCurrentUser());
		const columns = useMemo(
			() =>
				createColumns({
					onView,
					onEdit,
					onVerify,
					onForward,
					verifyInProgressId,
					canForward,
				}),
			[onView, onEdit, onVerify, onForward, verifyInProgressId, canForward]
		);
		// This table is server-paginated, so header filters run server-side
		// (manualFiltering): onColumnFiltersChange routes them to the hook, which
		// re-queries the WHOLE dataset, not just the loaded page. Only the columns
		// the backend can filter expose a funnel (Status, Location, In-alerts,
		// Received); the free-text columns opt out (enableColumnFilter: false) and
		// stay searchable via the dedicated EidsrAlertsFilters bar. The legacy
		// onInAlertsFilterChange prop is kept for API compatibility but unused —
		// the In-alerts column header filter now covers it.
		void onInAlertsFilterChange;

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
