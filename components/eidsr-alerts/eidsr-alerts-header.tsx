import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CloudDownload } from "lucide-react";
import { ExcelIcon, CsvIcon } from "@/components/ui/file-type-icons";
import { EIDSR_ALERTS_CONFIG } from "@/constants/eidsr-alerts";
import { LAYOUT } from "@/constants/layout";
import { formatDateTime, formatTimeAgo } from "@/lib/format-date";
import { can, PERM } from "@/lib/access";
import { useCurrentUser } from "@/hooks/use-current-user";

interface EidsrAlertsHeaderProps {
	onRefresh: () => void;
	onSyncFromRemote: () => void;
	onExportCsv: () => void;
	onExportExcel: () => void;
	isRefreshing?: boolean;
	isSyncing?: boolean;
	isExporting?: boolean;
	/** When the last successful sync finished (ISO), if known. */
	lastSyncedAt?: string | null;
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
		lastSyncedAt = null,
	}) => {
		const canSync = can(useCurrentUser(), PERM.eidsrSync);
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h1 className={LAYOUT.pageTitle}>{EIDSR_ALERTS_CONFIG.PAGE_TITLE}</h1>
					<p className={LAYOUT.pageSubtitle}>
						{EIDSR_ALERTS_CONFIG.PAGE_DESCRIPTION}
						{lastSyncedAt && (
							// Whether it is worth syncing now is the first thing to
							// know on arrival; the exact time is on hover.
							<span
								className="ml-1 whitespace-nowrap"
								title={`Last successful sync: ${formatDateTime(lastSyncedAt)}`}
							>
								· Last synced {formatTimeAgo(lastSyncedAt)}
							</span>
						)}
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
						<CsvIcon className="h-4 w-4" />
						{isExporting ? "Exporting…" : "Download CSV"}
					</Button>
					<Button
						onClick={onExportExcel}
						variant="ghost"
						size="sm"
						className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
						disabled={isExporting}
					>
						<ExcelIcon className="h-4 w-4" />
						{isExporting ? "Exporting…" : "Download Excel"}
					</Button>
					{canSync && (
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
					)}
				</div>
			</div>
		);
	}
);

EidsrAlertsHeader.displayName = "EidsrAlertsHeader";
