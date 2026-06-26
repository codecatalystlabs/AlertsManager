import { memo } from "react";
import { Button } from "@/components/ui/button";
import { CloudDownload, RefreshCw } from "lucide-react";
import { ECHIS_ALERTS_CONFIG } from "@/constants/echis-alerts";
import { LAYOUT } from "@/constants/layout";

interface EchisAlertsHeaderProps {
	onRefresh: () => void;
	onSyncFromRemote: () => void;
	isRefreshing?: boolean;
	isSyncing?: boolean;
}

export const EchisAlertsHeader = memo<EchisAlertsHeaderProps>(
	({ onRefresh, onSyncFromRemote, isRefreshing, isSyncing }) => (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div>
				<h1 className={LAYOUT.pageTitle}>{ECHIS_ALERTS_CONFIG.PAGE_TITLE}</h1>
				<p className={LAYOUT.pageSubtitle}>
					{ECHIS_ALERTS_CONFIG.PAGE_DESCRIPTION}
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
					{isRefreshing ? "Refreshing…" : "Refresh list"}
				</Button>
				<Button
					onClick={onSyncFromRemote}
					size="sm"
					className="gap-1.5 h-8"
					disabled={isSyncing}
				>
					<CloudDownload
						className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`}
					/>
					{isSyncing ? "Syncing from NDW…" : "Sync from NDW"}
				</Button>
			</div>
		</div>
	)
);
EchisAlertsHeader.displayName = "EchisAlertsHeader";
