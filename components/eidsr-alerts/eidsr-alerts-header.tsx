import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	RefreshCw,
	CloudDownload,
	Download,
	FileSpreadsheet,
} from "lucide-react";
import { EIDSR_ALERTS_CONFIG } from "@/constants/eidsr-alerts";
import { LAYOUT } from "@/constants/layout";

interface EidsrAlertsHeaderProps {
	onRefresh: () => void;
	onSyncFromRemote: () => void;
	onExportCsv: () => void;
	onExportExcel: () => void;
	isRefreshing?: boolean;
	isSyncing?: boolean;
	isExporting?: boolean;
}

export const EidsrAlertsHeader = memo<EidsrAlertsHeaderProps>(
	({
		onRefresh,
		onSyncFromRemote,
		onExportCsv,
		onExportExcel,
		isRefreshing = false,
		isSyncing = false,
		isExporting = false,
	}) => {
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h1 className={LAYOUT.pageTitle}>{EIDSR_ALERTS_CONFIG.PAGE_TITLE}</h1>
					<p className={LAYOUT.pageSubtitle}>
						{EIDSR_ALERTS_CONFIG.PAGE_DESCRIPTION}
					</p>
				</div>
				<div className="flex flex-wrap gap-1.5 justify-end">
					<Button
						onClick={onRefresh}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
						disabled={isRefreshing || isSyncing}
					>
						<RefreshCw
							className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
						/>
						{isRefreshing ? "Refreshing..." : "Refresh list"}
					</Button>
					<Button
						onClick={onExportCsv}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
						disabled={isExporting}
					>
						<Download className="h-4 w-4" />
						{isExporting ? "Exporting…" : "Download CSV"}
					</Button>
					<Button
						onClick={onExportExcel}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
						disabled={isExporting}
					>
						<FileSpreadsheet className="h-4 w-4" />
						{isExporting ? "Exporting…" : "Download Excel"}
					</Button>
					<Button
						onClick={onSyncFromRemote}
						size="sm"
						className="bg-uganda-red hover:bg-uganda-red/90 gap-1.5 h-8"
						disabled={isSyncing || isRefreshing}
					>
						<CloudDownload
							className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`}
						/>
						{isSyncing ? "Updating…" : "Update 6767 Messages"}
					</Button>
				</div>
			</div>
		);
	}
);

EidsrAlertsHeader.displayName = "EidsrAlertsHeader";
