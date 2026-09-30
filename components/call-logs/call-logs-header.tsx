import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { ExcelIcon, CsvIcon } from "@/components/ui/file-type-icons";
import { CALL_LOGS_CONFIG } from "@/constants/call-logs";
import type { ExportKind } from "@/hooks/use-call-logs-data";
import { LAYOUT } from "@/constants/layout";

interface CallLogsHeaderProps {
	onRefresh: () => void;
	onExportExcel: () => void;
	onExportCsv: () => void;
	/**
	 * "Export All Signals": every signal that has been triaged, verified AND
	 * risk-assessed, as the full case record. Offered on the Risk Assessed list
	 * only — the list named for the state the file is defined by — so the
	 * button is absent (undefined) on every other view.
	 */
	onExportProcessed?: () => void;
	isRefreshing?: boolean;
	/** Which export is in progress, if any — drives the button spinners. */
	exporting?: ExportKind | null;
	/**
	 * The pipeline queue being shown ("Awaiting triage"), when the page is
	 * standing at one gate rather than showing the whole register. The heading
	 * has to say so: a filtered list that looks like the full register is how
	 * someone concludes there are only 6,022 signals in the country.
	 */
	queueLabel?: string | null;
}

export const CallLogsHeader = memo<CallLogsHeaderProps>(
	({
		onRefresh,
		onExportExcel,
		onExportCsv,
		onExportProcessed,
		isRefreshing = false,
		exporting = null,
		queueLabel = null,
	}) => {
		const isExporting = exporting !== null;
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				{/* Heading only. The gloss under it explained the queue to a
				    first-time reader and then went on repeating itself to the people
				    who work here daily; the pipeline strip below still names each
				    gate, and hovering a tile still says what it decides. */}
				<div>
					<h1 className={LAYOUT.pageTitle}>
						{queueLabel ?? CALL_LOGS_CONFIG.PAGE_TITLE}
					</h1>
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
							className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""
								}`}
						/>
						{isRefreshing ? "Refreshing..." : "Refresh"}
					</Button>
					<Button
						onClick={onExportCsv}
						variant="ghost"
						size="sm"
						className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
						disabled={isExporting || isRefreshing}
					>
						{exporting === "csv" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<CsvIcon className="h-4 w-4" />
						)}
						{exporting === "csv" ? "Exporting…" : "Export CSV"}
					</Button>
					<Button
						onClick={onExportExcel}
						variant="ghost"
						size="sm"
						className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
						disabled={isExporting || isRefreshing}
					>
						{exporting === "excel" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<ExcelIcon className="h-4 w-4" />
						)}
						{exporting === "excel" ? "Exporting…" : "Export Excel"}
					</Button>
					{onExportProcessed && (
						<Button
							onClick={onExportProcessed}
							variant="ghost"
							size="sm"
							className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
							disabled={isExporting || isRefreshing}
							title="Every signal that has been triaged, verified and risk-assessed — the full case record with each stage's columns, whether or not feedback has been given (Excel)"
						>
							{exporting === "processed" ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<ExcelIcon className="h-4 w-4" />
							)}
							{exporting === "processed" ? "Exporting…" : "Export All Signals"}
						</Button>
					)}
				</div>
			</div>
		);
	}
);

CallLogsHeader.displayName = "CallLogsHeader";
