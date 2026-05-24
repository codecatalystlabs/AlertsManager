"use client";

import { memo, useCallback } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReportMatrix } from "@/lib/fetch-reports";
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
}

export const ReportsMatrixTable = memo<ReportsMatrixTableProps>(
	({ matrix, fallbackTitle, periodLabel, exportKey, isLoading }) => {
		const title = matrix?.title?.trim() || fallbackTitle;
		const canExport = Boolean(matrix?.rows?.length);

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
			<section className="animate-reveal [animation-delay:200ms] editorial-card flex flex-col">
				<header className="px-6 py-5 flex items-start justify-between gap-3 border-b border-foreground/[0.08]">
					<div className="min-w-0 flex-1">
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
							B · Matrix
						</p>
						<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
							{title}
						</h2>
						<p className="mt-1 mono text-[10px] uppercase tracking-widest text-muted-foreground">
							{periodLabel}
						</p>
					</div>
					<div className="flex shrink-0 gap-2">
						<Button
							type="button"
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
							disabled={!canExport || isLoading}
							onClick={handleExportCsv}
							title="Export CSV"
						>
							<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
							<span className="mono uppercase tracking-widest font-bold hidden sm:inline">
								CSV
							</span>
						</Button>
						<Button
							type="button"
							className="px-4 py-2 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
							disabled={!canExport || isLoading}
							onClick={handleExportExcel}
							title="Export Excel"
						>
							<FileSpreadsheet
								className="h-3.5 w-3.5"
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold hidden sm:inline">
								Excel
							</span>
						</Button>
					</div>
				</header>

				<div className="p-5">
					{isLoading ? (
						<div className="h-[240px] animate-pulse bg-foreground/[0.04] rounded-sm" />
					) : !matrix?.rows?.length ? (
						<p className="py-10 text-center mono text-[10px] uppercase tracking-widest text-muted-foreground">
							No matrix data for this date range.
						</p>
					) : (
						<div className="max-h-[min(360px,50vh)] overflow-auto rounded-sm border border-foreground/[0.08]">
							<Table className="min-w-max border-collapse text-xs">
								<TableHeader className="sticky top-0 z-20">
									<TableRow className="bg-background hover:bg-background border-b border-foreground/[0.08]">
										<TableHead className="h-10 min-w-[6rem] px-3 mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground sticky left-0 z-30 bg-background border-r border-foreground/[0.08]">
											District
										</TableHead>
										{matrix.columns.map((col) => (
											<TableHead
												key={col}
												className="h-10 min-w-[4.5rem] px-3 text-center mono text-[10px] uppercase tracking-tight font-bold text-foreground whitespace-nowrap"
											>
												{col}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{matrix.rows.map((row, rowIndex) => (
										<TableRow
											key={row.label}
											className={cn(
												"border-b border-foreground/[0.04] transition-colors",
												rowIndex % 2 === 0
													? "bg-card"
													: "bg-foreground/[0.015]",
												"hover:bg-accent-yellow/[0.08]"
											)}
										>
											<TableCell className="h-9 px-3 text-xs font-medium text-foreground sticky left-0 z-10 bg-inherit border-r border-foreground/[0.08] whitespace-nowrap">
												{row.label}
											</TableCell>
											{matrix.columns.map((_, colIndex) => {
												const value =
													row.values[colIndex] ?? 0;
												return (
													<TableCell
														key={`${row.label}-${colIndex}`}
														className={cn(
															"h-9 px-3 text-center mono text-xs tabular-nums",
															value > 0
																? "text-foreground font-medium"
																: "text-muted-foreground/40"
														)}
													>
														{value}
													</TableCell>
												);
											})}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</section>
		);
	}
);

ReportsMatrixTable.displayName = "ReportsMatrixTable";
