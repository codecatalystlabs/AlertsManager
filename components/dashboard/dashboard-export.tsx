"use client";

import { useCallback, useState } from "react";
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
	Download,
	FileSpreadsheet,
	FileText,
	ChevronDown,
	Loader2,
} from "lucide-react";
import {
	exportAlertsToCsv,
	exportAlertsToExcel,
} from "@/lib/alert-export";
import type { CallLogAlert } from "@/app/dashboard/types";

interface DashboardExportProps {
	alerts: CallLogAlert[];
	disabled?: boolean;
}

const PREFIX = "dashboard_export";

export function DashboardExport({ alerts, disabled }: DashboardExportProps) {
	const [busy, setBusy] = useState<"csv" | "excel" | null>(null);
	const empty = alerts.length === 0;

	const handleCsv = useCallback(() => {
		if (empty) {
			window.alert("No records match the current filters.");
			return;
		}
		setBusy("csv");
		try {
			exportAlertsToCsv(alerts, PREFIX);
		} catch (err) {
			console.error("CSV export failed:", err);
			window.alert("Failed to export CSV file.");
		} finally {
			setBusy(null);
		}
	}, [alerts, empty]);

	const handleExcel = useCallback(async () => {
		if (empty) {
			window.alert("No records match the current filters.");
			return;
		}
		setBusy("excel");
		try {
			await exportAlertsToExcel(alerts, PREFIX, "Dashboard");
		} catch (err) {
			console.error("Excel export failed:", err);
			window.alert("Failed to export Excel file.");
		} finally {
			setBusy(null);
		}
	}, [alerts, empty]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					disabled={disabled || empty}
					className="px-4 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 disabled:opacity-40 rounded-sm gap-2 h-auto"
				>
					{busy ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
					)}
					<span className="mono uppercase tracking-widest font-bold">
						Export
					</span>
					<ChevronDown className="h-3 w-3 opacity-70" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-56 rounded-sm p-1"
			>
				<DropdownMenuLabel className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
					Export {alerts.length.toLocaleString()} record
					{alerts.length === 1 ? "" : "s"}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={(e) => {
						e.preventDefault();
						handleCsv();
					}}
					className="gap-2.5 text-sm cursor-pointer rounded-sm focus:bg-foreground/5"
				>
					<FileText
						className="h-3.5 w-3.5 text-muted-foreground"
						strokeWidth={1.75}
					/>
					<span className="flex-1">Download as CSV</span>
					<span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
						.csv
					</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={(e) => {
						e.preventDefault();
						handleExcel();
					}}
					className="gap-2.5 text-sm cursor-pointer rounded-sm focus:bg-foreground/5"
				>
					<FileSpreadsheet
						className="h-3.5 w-3.5 text-muted-foreground"
						strokeWidth={1.75}
					/>
					<span className="flex-1">Download as Excel</span>
					<span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
						.xlsx
					</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
