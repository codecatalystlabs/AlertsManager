"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, FlaskConical, MoreHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LAYOUT } from "@/constants/layout";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

import {
	LAB_REGIONS,
	LAB_SOURCES,
	LAB_STATUSES,
	generateSignals,
	type LabSignal,
} from "./synthetic-signals";

/**
 * A proving ground for components/data-table: the same table every list
 * screen uses, driven by synthetic rows at up to a quarter of a million, so
 * its modes, column tools and performance can be tried without touching
 * real signals. Not linked from the sidebar.
 */

const SIZES = [1_000, 10_000, 100_000, 250_000];

const PRIORITY_CLASS: Record<LabSignal["priority"], string> = {
	High: "border-destructive/30 bg-destructive/10 text-destructive",
	Medium: "border-warning/40 bg-warning/15 text-foreground",
	Low: "border-border bg-muted text-muted-foreground",
};
const STATUS_CLASS: Record<LabSignal["status"], string> = {
	Untriaged: "bg-muted text-muted-foreground",
	Triaged: "bg-action/10 text-action",
	Verified: "bg-success/10 text-success",
	"Risk assessed": "bg-warning/15 text-foreground",
	Discarded: "bg-destructive/10 text-destructive line-through",
};

function toOptions(values: readonly string[]) {
	return values.map((value) => ({ value, label: value }));
}

export default function TableLabPage() {
	const [size, setSize] = useState(100_000);
	const [data, setData] = useState<LabSignal[]>(() => generateSignals(100_000));
	const [genMs, setGenMs] = useState<number | null>(null);
	const [selection, setSelection] = useState(true);
	const [expandable, setExpandable] = useState(true);
	const [loading, setLoading] = useState(false);
	const [failing, setFailing] = useState(false);

	const regenerate = (n: number) => {
		setSize(n);
		const t0 = performance.now();
		const rows = generateSignals(n);
		setGenMs(Math.round(performance.now() - t0));
		setData(rows);
	};

	const columns = useMemo<ColumnDef<LabSignal>[]>(
		() => [
			{
				accessorKey: "id",
				header: "Signal",
				meta: { cardTitle: true, filterPlaceholder: "SIG-000123" },
				cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
			},
			{
				accessorKey: "reportedAt",
				header: "Reported",
				meta: { filterVariant: "dateRange" },
				cell: ({ getValue }) => formatDateTime(getValue<string>()),
			},
			{
				accessorKey: "region",
				header: "Region",
				meta: { filterVariant: "multiSelect", filterOptions: toOptions(LAB_REGIONS) },
			},
			{
				accessorKey: "district",
				header: "District",
				meta: { filterVariant: "multiSelect" },
			},
			{
				accessorKey: "signal",
				header: "Signal type",
				meta: { filterVariant: "multiSelect", maxWidth: 200 },
			},
			{
				accessorKey: "source",
				header: "Source",
				meta: { filterVariant: "select", filterOptions: toOptions(LAB_SOURCES) },
			},
			{
				accessorKey: "priority",
				header: "Priority",
				meta: { filterVariant: "select", filterOptions: toOptions(["High", "Medium", "Low"]) },
				sortingFn: (a, b) => {
					const rank = { High: 3, Medium: 2, Low: 1 };
					return rank[a.original.priority] - rank[b.original.priority];
				},
				cell: ({ getValue }) => {
					const v = getValue<LabSignal["priority"]>();
					return (
						<Badge variant="outline" className={cn("h-5 px-1.5 text-[11px] font-medium", PRIORITY_CLASS[v])}>
							{v}
						</Badge>
					);
				},
			},
			{
				accessorKey: "status",
				header: "Status",
				meta: { filterVariant: "multiSelect", filterOptions: toOptions(LAB_STATUSES) },
				cell: ({ getValue }) => {
					const v = getValue<LabSignal["status"]>();
					return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", STATUS_CLASS[v])}>{v}</span>;
				},
			},
			{
				accessorKey: "cases",
				header: "Cases",
				meta: { numeric: true, filterVariant: "numberRange", aggregate: "sum" },
			},
			{
				accessorKey: "deaths",
				header: "Deaths",
				meta: { numeric: true, filterVariant: "numberRange", aggregate: "sum" },
				cell: ({ getValue }) => {
					const v = getValue<number>();
					return <span className={cn(v > 0 && "font-semibold text-destructive")}>{v}</span>;
				},
			},
			{
				accessorKey: "verified",
				header: "Verified",
				meta: { filterVariant: "boolean", aggregate: (values) => `${values.filter(Boolean).length.toLocaleString()} yes` },
				cell: ({ getValue }) =>
					getValue<boolean>() ? (
						<CheckCircle2 className="h-4 w-4 text-success" aria-label="Yes" />
					) : (
						<span className="text-muted-foreground">—</span>
					),
			},
			{
				accessorKey: "responseHours",
				header: "Response (h)",
				meta: { numeric: true, filterVariant: "numberRange", aggregate: "avg" },
				cell: ({ getValue }) => getValue<number>().toFixed(1),
			},
			{ accessorKey: "reporter", header: "Reporter" },
			{ accessorKey: "phone", header: "Phone", meta: { hideInCard: true } },
			{ accessorKey: "notes", header: "Notes", meta: { maxWidth: 320, hideInCard: true } },
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				enableHiding: false,
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-6 w-6 [&_svg]:size-3.5" aria-label="Row actions">
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="text-xs">
							<DropdownMenuItem onSelect={() => toast.success(`Would open ${row.original.id}`)}>Open</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() => setData((prev) => prev.filter((r) => r.id !== row.original.id))}
								className="text-destructive"
							>
								Remove row
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[]
	);

	return (
		<div className={LAYOUT.pageGap}>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<h1 className={cn(LAYOUT.pageTitle, "flex items-center gap-2")}>
						<FlaskConical className="h-5 w-5 text-action" /> Data table lab
					</h1>
					<p className={LAYOUT.pageSubtitle}>
						The shared table, on synthetic signals — nothing here is real data. Try Endless scrolling, grouping
						(column menu), the details panel (<kbd className="rounded border bg-muted px-1 text-[10px]">i</kbd>),
						right-click on a cell, and <kbd className="rounded border bg-muted px-1 text-[10px]">?</kbd> for shortcuts.
					</p>
				</div>
			</div>

			<Card className={LAYOUT.card}>
				<CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2.5">
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-muted-foreground">Rows</span>
						<div className="flex gap-0.5 rounded-md bg-muted p-0.5">
							{SIZES.map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => regenerate(n)}
									className={cn(
										"h-7 rounded px-2 text-xs font-medium tabular-nums",
										size === n ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
									)}
								>
									{n.toLocaleString()}
								</button>
							))}
						</div>
						{genMs !== null && <span className="text-[11px] text-muted-foreground">generated in {genMs} ms</span>}
					</div>
					{[
						{ id: "lab-select", label: "Row selection", value: selection, set: setSelection },
						{ id: "lab-expand", label: "Expandable rows", value: expandable, set: setExpandable },
						{ id: "lab-loading", label: "Loading", value: loading, set: setLoading },
						{ id: "lab-error", label: "Error state", value: failing, set: setFailing },
					].map((t) => (
						<div key={t.id} className="flex items-center gap-2">
							<Switch id={t.id} checked={t.value} onCheckedChange={t.set} />
							<Label htmlFor={t.id} className="text-xs font-normal">
								{t.label}
							</Label>
						</div>
					))}
				</CardContent>
			</Card>

			<Card className={LAYOUT.card}>
				<CardContent className="pt-2.5">
					<DataTable
						key={`${selection}-${expandable}`}
						id="table-lab"
						columns={columns}
						data={data}
						getRowId={(row) => row.id}
						enableHeaderFilters
						defaultScrollMode="virtual"
						pageSize={25}
						pageSizeOptions={[10, 25, 50, 100, 250, 500]}
						enableRowSelection={selection}
						isLoading={loading}
						error={failing ? "The lab pretended the server failed." : undefined}
						onRefresh={() => {
							setFailing(false);
							regenerate(size);
						}}
						exportFilename="table_lab_signals"
						initialState={{ columnVisibility: { phone: false } }}
						getRowClassName={(row) => (row.original.priority === "High" && !row.original.verified ? "bg-destructive/[0.04]" : undefined)}
						renderSubComponent={
							expandable
								? (row) => (
										<div className="grid gap-3 p-3 text-xs sm:grid-cols-3">
											<div>
												<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reported by</p>
												<p className="font-medium">{row.original.reporter}</p>
												<p className="text-muted-foreground">{row.original.phone}</p>
											</div>
											<div>
												<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Where</p>
												<p className="font-medium">
													{row.original.district}, {row.original.region}
												</p>
												<p className="text-muted-foreground">via {row.original.source}</p>
											</div>
											<div>
												<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</p>
												<p className="whitespace-normal">{row.original.notes || "—"}</p>
											</div>
										</div>
									)
								: undefined
						}
						bulkActions={({ rows, clearSelection }) => (
							<>
								<button
									type="button"
									className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-background/10"
									onClick={() => {
										const ids = new Set(rows.map((r) => r.id));
										setData((prev) =>
											prev.map((r) => (ids.has(r.id) ? { ...r, verified: true, status: "Verified" } : r))
										);
										toast.success(`Marked ${rows.length.toLocaleString()} verified`);
										clearSelection();
									}}
								>
									<CheckCircle2 className="h-3.5 w-3.5" /> Mark verified
								</button>
								<button
									type="button"
									className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-background/10"
									onClick={() => {
										const ids = new Set(rows.map((r) => r.id));
										setData((prev) => prev.filter((r) => !ids.has(r.id)));
										toast.success(`Removed ${rows.length.toLocaleString()} rows`);
										clearSelection();
									}}
								>
									<Trash2 className="h-3.5 w-3.5" /> Remove
								</button>
							</>
						)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
