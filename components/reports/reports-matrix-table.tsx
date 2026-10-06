"use client";

import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ListFilter, X } from "lucide-react";
import { ExcelIcon, CsvIcon } from "@/components/ui/file-type-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeletons";
import { LAYOUT } from "@/constants/layout";
import type { ReportMatrix } from "@/lib/fetch-reports";
import { isMissingLabel } from "@/lib/data-completeness";
import {
	exportReportMatrixToCsv,
	exportReportMatrixToExcel,
	notifyExportEmpty,
} from "@/lib/report-export";

interface ReportsMatrixTableProps {
	matrix: ReportMatrix | null;
	fallbackTitle: string;
	periodLabel: string;
	exportKey: string;
	isLoading?: boolean;
	/** Rendered under the title — e.g. what the disease filter left out. */
	note?: ReactNode;
}

/** Sort key: a metric column index, or the district name. */
type SortKey = number | "district";

/**
 * District × metric table. Opens sorted by the first metric (Signals),
 * largest first, so the districts carrying the load lead; click any header
 * to re-sort. A total row sits on top, and the two honesty rows — no district
 * recorded, text that names no district — always sit at the bottom, never
 * ranked among real districts.
 */
export const ReportsMatrixTable = memo<ReportsMatrixTableProps>(
	({ matrix, fallbackTitle, periodLabel, exportKey, isLoading, note }) => {
		const [districtFilter, setDistrictFilter] = useState("");
		const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 0, desc: true });
		const title = matrix?.title?.trim() || fallbackTitle;
		const canExport = Boolean(matrix?.rows?.length);
		const visibleRows = useMemo(() => {
			const rows = matrix?.rows ?? [];
			const filter = districtFilter.trim().toLowerCase();
			const filtered = filter
				? rows.filter((row) => row.label.toLowerCase().includes(filter))
				: rows;
			const cmp = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
				const d =
					sort.key === "district"
						? a.label.localeCompare(b.label)
						: (a.values[sort.key] ?? 0) - (b.values[sort.key] ?? 0) ||
							b.label.localeCompare(a.label);
				return sort.desc ? -d : d;
			};
			return [
				...filtered.filter((r) => !isMissingLabel(r.label)).sort(cmp),
				...filtered.filter((r) => isMissingLabel(r.label)),
			];
		}, [districtFilter, matrix?.rows, sort]);

		const toggleSort = useCallback((key: SortKey) => {
			setSort((prev) =>
				prev.key === key ? { key, desc: !prev.desc } : { key, desc: key !== "district" }
			);
		}, []);
		const sortIcon = (key: SortKey) =>
			sort.key === key ? (
				sort.desc ? (
					<ArrowDown className="h-3 w-3" />
				) : (
					<ArrowUp className="h-3 w-3" />
				)
			) : null;

		const handleExportCsv = useCallback(() => {
			if (!exportReportMatrixToCsv(matrix, exportKey)) {
				notifyExportEmpty();
			}
		}, [matrix, exportKey]);

		const handleExportExcel = useCallback(async () => {
			try {
				const ok = await exportReportMatrixToExcel(
					matrix,
					exportKey,
					periodLabel
				);
				if (!ok) notifyExportEmpty();
			} catch (err) {
				console.error("Excel export failed:", err);
				window.alert("Failed to export Excel file. Please try again.");
			}
		}, [matrix, exportKey, periodLabel]);

		return (
			<Card className={cn(LAYOUT.card, "flex flex-col")}>
				<CardHeader className={cn(LAYOUT.cardHeader, "flex-row items-start justify-between gap-2 space-y-0")}>
					<div className="min-w-0 flex-1">
						<CardTitle className={LAYOUT.cardTitle}>{title}</CardTitle>
						<p className="text-xs text-muted-foreground">{periodLabel}</p>
						{note}
					</div>
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
							disabled={!canExport || isLoading}
							onClick={handleExportCsv}
							title="Export CSV"
						>
							<CsvIcon className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">CSV</span>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
							disabled={!canExport || isLoading}
							onClick={handleExportExcel}
							title="Export Excel"
						>
							<ExcelIcon className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">Excel</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className={cn(LAYOUT.cardContent, "pt-0")}>
					{isLoading ? (
						<TableSkeleton rows={12} columns={8} />
					) : !matrix?.rows?.length ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No matrix data for this date range.
						</p>
					) : (
						<div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
							<Table className="min-w-max border-collapse text-xs">
								<TableHeader className="sticky top-0 z-20">
									<TableRow className="bg-slate-100 hover:bg-slate-100 border-b-2 border-slate-200">
										<TableHead className="h-9 min-w-[5.5rem] px-2 font-semibold text-slate-800 sticky left-0 z-30 bg-slate-100 border-r border-slate-200">
											<div className="flex items-center gap-1">
												<button
													type="button"
													className="inline-flex items-center gap-0.5 hover:text-uganda-red"
													onClick={() => toggleSort("district")}
													title="Sort by district name"
												>
													District
													{sortIcon("district")}
												</button>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-6 w-6"
															aria-label="Filter District"
															title="Filter District"
														>
															<ListFilter
																className={cn(
																	"h-3.5 w-3.5",
																	districtFilter.trim()
																		? "text-uganda-red"
																		: "text-slate-500"
																)}
															/>
														</Button>
													</PopoverTrigger>
													<PopoverContent
														align="start"
														className="w-64 p-3"
													>
														<div className="space-y-3">
															<div className="flex items-center justify-between gap-2">
																<p className="truncate text-xs font-semibold uppercase tracking-wide">
																	Filter District
																</p>
																{districtFilter.trim() && (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="h-6 w-6"
																		aria-label="Clear District filter"
																		onClick={() =>
																			setDistrictFilter("")
																		}
																	>
																		<X className="h-3.5 w-3.5" />
																	</Button>
																)}
															</div>
															<Input
																value={districtFilter}
																onChange={(event) =>
																	setDistrictFilter(
																		event.target.value
																	)
																}
																placeholder="District"
																className="h-8 text-xs"
															/>
														</div>
													</PopoverContent>
												</Popover>
											</div>
										</TableHead>
										{matrix.columns.map((col, colIndex) => (
											<TableHead
												key={col}
												className="h-9 min-w-[4.5rem] px-2 text-center font-semibold text-slate-800 whitespace-nowrap border-r border-slate-100 last:border-r-0"
											>
												<button
													type="button"
													className="inline-flex items-center gap-0.5 hover:text-uganda-red"
													onClick={() => toggleSort(colIndex)}
													title={`Sort by ${col}`}
												>
													{col}
													{sortIcon(colIndex)}
												</button>
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow className="border-b-2 border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
										<TableCell
											className="h-8 px-2 font-semibold text-slate-900 sticky left-0 z-10 bg-slate-100 border-r border-slate-200 whitespace-nowrap"
											title={districtFilter.trim() ? "The total over every district, not only the rows the district filter is showing." : undefined}
										>
											{districtFilter.trim() ? "Total (all districts)" : "Total"}
										</TableCell>
										{matrix.columns.map((col, colIndex) => (
											<TableCell
												key={`total-${col}`}
												className="h-8 px-2 text-center tabular-nums font-semibold text-slate-900 border-r border-slate-100 last:border-r-0"
											>
												{(matrix.totals[colIndex] ?? 0).toLocaleString()}
											</TableCell>
										))}
									</TableRow>
									{visibleRows.map((row, rowIndex) => (
										<TableRow
											key={row.label}
											className={cn(
												"border-b border-slate-100 transition-colors",
												rowIndex % 2 === 0
													? "bg-white"
													: "bg-slate-50/90",
												"hover:bg-warning/10"
											)}
										>
											<TableCell
												className={cn(
													"h-8 px-2 font-medium sticky left-0 z-10 bg-inherit border-r border-slate-200 whitespace-nowrap",
													isMissingLabel(row.label) ? "italic text-slate-500" : "text-slate-900"
												)}
											>
												{row.label}
											</TableCell>
											{matrix.columns.map((_, colIndex) => {
												const value = row.values[colIndex] ?? 0;
												return (
													<TableCell
														key={`${row.label}-${colIndex}`}
														className={cn(
															"h-8 px-2 text-center tabular-nums border-r border-slate-50 last:border-r-0",
															value > 0
																? "text-slate-900 font-medium"
																: "text-slate-400"
														)}
													>
														{value}
													</TableCell>
												);
											})}
										</TableRow>
									))}
									{visibleRows.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={matrix.columns.length + 1}
												className="h-20 text-center text-sm text-muted-foreground"
											>
												No matching districts.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}
);

ReportsMatrixTable.displayName = "ReportsMatrixTable";
