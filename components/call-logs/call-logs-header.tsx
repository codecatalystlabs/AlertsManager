import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { CALL_LOGS_CONFIG } from "@/constants/call-logs";
import { LAYOUT } from "@/constants/layout";

interface CallLogsHeaderProps {
	onRefresh: () => void;
	onExportExcel: () => void;
	onExportCsv: () => void;
	isRefreshing?: boolean;
	/** Which export is in progress, if any — drives the button spinners. */
	exporting?: "csv" | "excel" | null;
}

export const CallLogsHeader = memo<CallLogsHeaderProps>(
	({
		onRefresh,
		onExportExcel,
		onExportCsv,
		isRefreshing = false,
		exporting = null,
	}) => {
		const isExporting = exporting !== null;
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h1 className={LAYOUT.pageTitle}>
						{CALL_LOGS_CONFIG.PAGE_TITLE}
					</h1>
					<p className={LAYOUT.pageSubtitle}>
						{CALL_LOGS_CONFIG.PAGE_DESCRIPTION}
					</p>
				</div>
				<div className="flex flex-wrap gap-1.5 justify-end">
					<Button
						onClick={onRefresh}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
						disabled={isRefreshing}
					>
						<RefreshCw
							className={`h-4 w-4 ${
								isRefreshing ? "animate-spin" : ""
							}`}
						/>
						{isRefreshing ? "Refreshing..." : "Refresh"}
					</Button>
					<Button
						onClick={onExportCsv}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
						disabled={isExporting || isRefreshing}
					>
						{exporting === "csv" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						{exporting === "csv" ? "Exporting…" : "Export CSV"}
					</Button>
					<Button
						onClick={onExportExcel}
						size="sm"
						className="bg-uganda-red hover:bg-uganda-red/90 gap-1.5 h-8"
						disabled={isExporting || isRefreshing}
					>
						{exporting === "excel" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<FileSpreadsheet className="h-4 w-4" />
						)}
						{exporting === "excel" ? "Exporting…" : "Export Excel"}
					</Button>
				</div>
			</div>
		);
	}
);

CallLogsHeader.displayName = "CallLogsHeader";
