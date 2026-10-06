import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { feedActions, type Feed } from "@/lib/access";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LAYOUT } from "@/constants/layout";
import { forwardedToLabel, signalRegisterHref } from "@/lib/signal-register-link";
import type { ForwardedAlertRef } from "@/lib/fetch-ndw-alerts";
import { hiddenByDefault } from "@/lib/table-columns";

/** The fields the shared NDW columns (Status / actions) read. */
export interface NdwSignalRow {
	id: number;
	live?: boolean;
	linkedAlertId?: number;
	linkedAlert?: ForwardedAlertRef;
	forwardedAlertId?: number;
	forwardedToDistrict?: string;
	forwardedAlert?: ForwardedAlertRef;
}

/**
 * The live Signal Register row this record already has (forwarded, else
 * verified into), or null. The snapshots are only attached for rows that
 * still exist, so a record whose row was deleted reads as not in the register.
 */
export function ndwRegisterAlertId(row: NdwSignalRow | null | undefined): number | null {
	return row?.forwardedAlert?.id ?? row?.linkedAlert?.id ?? null;
}

/** "Forward again" once the record is in the register, else the first-time label. */
export function ndwForwardLabel(row: NdwSignalRow): string {
	return ndwRegisterAlertId(row) != null ? "Forward again" : "Forward to district";
}

interface NdwRowHandlers<TRow> {
	onView: (row: TRow) => void;
	onForward?: (row: TRow) => void;
	onVerify?: (row: TRow) => void;
	/** What the account's role allows on this feed (lib/access feedActions). */
	canForward: boolean;
	canVerify: boolean;
}

/**
 * Where a record went, on one line: the district it was forwarded to (a link
 * to that alert in the register) and/or the alert it was verified into, each
 * with that alert's live Verified/Pending chip. "—" when nothing was done.
 */
export function NdwStatusCell({ row }: { row: NdwSignalRow }) {
	// A sync logs a record even when it names no district, so the register
	// link alone means "in Raw Information".
	const forwarded = Boolean(row.forwardedToDistrict || row.forwardedAlertId);
	const linked = Boolean(row.linkedAlert);
	if (!forwarded && !linked) return <span className="text-muted-foreground">—</span>;

	const district = (row.forwardedToDistrict ?? "").replace(/\s+District$/i, "").trim();
	return (
		<div className="flex items-center gap-1.5">
			{forwarded && (
				<Link
					href={signalRegisterHref(row.forwardedAlertId)}
					title={forwardedToLabel(row.forwardedToDistrict ?? "")}
					className="inline-flex max-w-[11rem] items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[11px] hover:bg-muted"
				>
					<Send className="h-3 w-3 shrink-0 text-muted-foreground" />
					<span className="truncate">{district || "Raw Information"}</span>
				</Link>
			)}
			{forwarded && <AlertVerifyChip alert={row.forwardedAlert} />}
			{linked && (
				<>
					<span className="text-[11px] text-muted-foreground">In alerts</span>
					<AlertVerifyChip alert={row.linkedAlert} />
				</>
			)}
		</div>
	);
}

/**
 * The Status / row-actions columns — identical across the eCHIS and POE
 * tables — appended after each feed's domain columns.
 */
export function buildNdwSharedColumns<TRow extends NdwSignalRow>({
	onView,
	onForward,
	onVerify,
	canForward,
	canVerify,
}: NdwRowHandlers<TRow>): ColumnDef<TRow>[] {
	return [
		{
			// id stays "inAlerts": the header filter maps it to ?linked= (see
			// columnFiltersToEchisLocalParams / columnFiltersToPoeLocalParams).
			id: "inAlerts",
			accessorFn: (row) => (row.linkedAlertId ? "linked" : "unlinked"),
			header: "Status",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: [
					{ value: "linked", label: "Verified into alerts" },
					{ value: "unlinked", label: "Not verified into alerts" },
				],
			},
			cell: ({ row }) => <NdwStatusCell row={row.original} />,
		},
		{
			id: "actions",
			header: "",
			enableColumnFilter: false,
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							aria-label="Row actions"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onView(row.original)}>
							<Eye className="h-4 w-4 mr-2" />
							View details
						</DropdownMenuItem>
						{canForward && onForward && !row.original.live && (
							<DropdownMenuItem onClick={() => onForward(row.original)}>
								<Send className="h-4 w-4 mr-2" />
								{ndwForwardLabel(row.original)}
							</DropdownMenuItem>
						)}
						{canVerify && onVerify && !row.original.live && (
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
	/** Which feed the rows come from; decides which permissions apply. */
	feed: Feed;
	/** Card heading — the selected segment, e.g. "Needs follow-up". */
	title: string;
	/** What one row is, plural, for the count ("travellers", "signals"). */
	noun: string;
	/** The feed-specific leading columns; the shared columns are appended. */
	domainColumns: ColumnDef<TRow>[];
	/**
	 * Feed columns to put after Status (before the row menu) — long free text
	 * that is fine to scroll to, so Status stays on screen on a laptop.
	 */
	trailingColumns?: ColumnDef<TRow>[];
	/** Column ids hidden by default — contact details per lib/table-columns.ts. */
	hiddenColumns?: string[];
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
	/** Shown instead of "No results." — say why, and how to get rows back. */
	emptyState?: ReactNode;
	onView: (row: TRow) => void;
	onForward?: (row: TRow) => void;
	onVerify?: (row: TRow) => void;
}

/**
 * Shared table shell for an NDW signal feed (eCHIS / POE). Owns everything but
 * the domain columns: the Card wrapper, the shared Status/actions columns, and
 * the server-side DataTable wiring. A click anywhere on a row opens it.
 */
export function NdwSignalsTable<TRow extends NdwSignalRow>({
	feed,
	title,
	noun,
	domainColumns,
	trailingColumns,
	hiddenColumns,
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
	emptyState,
	onView,
	onForward,
	onVerify,
}: NdwSignalsTableProps<TRow>) {
	const user = useCurrentUser();
	const { forward: canForward, verify: canVerify } = feedActions(user, feed);
	const columns = useMemo<ColumnDef<TRow>[]>(() => {
		const [status, actions] = buildNdwSharedColumns<TRow>({
			onView,
			onForward,
			onVerify,
			canForward,
			canVerify,
		});
		return [...domainColumns, status, ...(trailingColumns ?? []), actions];
	}, [domainColumns, trailingColumns, onView, onForward, onVerify, canForward, canVerify]);

	return (
		<Card className={LAYOUT.card}>
			<CardHeader className="flex-row items-baseline justify-between space-y-0">
				<CardTitle className="text-sm font-semibold">{title}</CardTitle>
				<span className="text-xs tabular-nums text-muted-foreground">
					{totalCount.toLocaleString()} {noun}
				</span>
			</CardHeader>
			<CardContent className="p-0">
				<DataTable
					id={`ndw-${feed}`}
					columns={columns}
					initialState={{ columnVisibility: hiddenByDefault(...(hiddenColumns ?? [])) }}
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
					onRowClick={onView}
					emptyState={emptyState}
				/>
			</CardContent>
		</Card>
	);
}
