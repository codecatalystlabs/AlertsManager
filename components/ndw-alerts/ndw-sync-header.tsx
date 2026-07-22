import { memo } from "react";
import { Button } from "@/components/ui/button";
import { CloudDownload, RefreshCw } from "lucide-react";
import { LAYOUT } from "@/constants/layout";

interface NdwSyncHeaderProps {
	title: string;
	description: string;
	onRefresh: () => void;
	onSyncFromRemote: () => void;
	isRefreshing?: boolean;
	isSyncing?: boolean;
}

/**
 * Page header for an NDW signal feed: title/description + Refresh-list and
 * Sync-from-NDW buttons. The eCHIS and POE headers were byte-identical apart
 * from their CONFIG import; this is the one component, driven by title/description.
 */
export const NdwSyncHeader = memo<NdwSyncHeaderProps>(
	({ title, description, onRefresh, onSyncFromRemote, isRefreshing, isSyncing }) => (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div>
				<h1 className={LAYOUT.pageTitle}>{title}</h1>
				<p className={LAYOUT.pageSubtitle}>{description}</p>
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
NdwSyncHeader.displayName = "NdwSyncHeader";
