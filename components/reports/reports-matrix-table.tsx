"use client";

import { memo, useCallback } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/constants/layout";
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
			<Card className={cn(LAYOUT.card, "flex flex-col")}>
				<CardHeader className={cn(LAYOUT.cardHeader, "flex-row items-start justify-between gap-2 space-y-0")}>
					<div className="min-w-0 flex-1">
						<CardTitle className={LAYOUT.cardTitle}>{title}</CardTitle>
						<p className="text-xs text-muted-foreground">{periodLabel}</p>
					</div>
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 px-2 gap-1"
							disabled={!canExport || isLoading}
							onClick={handleExportCsv}
							title="Export CSV"
						>
							<Download className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">CSV</span>
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-7 px-2 gap-1 bg-uganda-red hover:bg-uganda-red/90"
							disabled={!canExport || isLoading}
							onClick={handleExportExcel}
							title="Export Excel"
						>
							<FileSpreadsheet className="h-3 w-3" />
							<span className="text-xs hidden sm:inline">Excel</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className={cn(LAYOUT.cardContent, "pt-0")}>
					{isLoading ? (
						<div className="h-[240px] animate-pulse rounded-md border bg-muted/40" />
					) : !matrix?.rows?.length ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No matrix data for this date range.
						</p>
					) : (
						<div className="max-h-[min(280px,45vh)] overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
							<Table className="min-w-max border-collapse text-xs">
								<TableHeader className="sticky top-0 z-20">
									<TableRow className="bg-slate-100 hover:bg-slate-100 border-b-2 border-slate-200">
										<TableHead className="h-9 min-w-[5.5rem] px-2 font-semibold text-slate-800 sticky left-0 z-30 bg-slate-100 border-r border-slate-200">
											District
										</TableHead>
										{matrix.columns.map((col) => (
											<TableHead
												key={col}
												className="h-9 min-w-[4.5rem] px-2 text-center font-semibold text-slate-800 whitespace-nowrap border-r border-slate-100 last:border-r-0"
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
												"border-b border-slate-100 transition-colors",
												rowIndex % 2 === 0
													? "bg-white"
													: "bg-slate-50/90",
												"hover:bg-amber-50/60"
											)}
										>
											<TableCell className="h-8 px-2 font-medium text-slate-900 sticky left-0 z-10 bg-inherit border-r border-slate-200 whitespace-nowrap">
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
