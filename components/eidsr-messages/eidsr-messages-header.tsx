import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CloudDownload } from "lucide-react";
import { EIDSR_MESSAGES_CONFIG } from "@/constants/eidsr-messages";
import { LAYOUT } from "@/constants/layout";

interface EidsrMessagesHeaderProps {
	onRefresh: () => void;
	onSync: () => void;
	isRefreshing?: boolean;
	isSyncing?: boolean;
}

export const EidsrMessagesHeader = memo<EidsrMessagesHeaderProps>(
	({ onRefresh, onSync, isRefreshing = false, isSyncing = false }) => (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div>
				<h1 className={LAYOUT.pageTitle}>{EIDSR_MESSAGES_CONFIG.PAGE_TITLE}</h1>
				<p className={LAYOUT.pageSubtitle}>
					{EIDSR_MESSAGES_CONFIG.PAGE_DESCRIPTION}
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
					onClick={onSync}
					size="sm"
					className="bg-uganda-red hover:bg-uganda-red/90 gap-1.5 h-8"
					disabled={isSyncing || isRefreshing}
				>
					<CloudDownload
						className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`}
					/>
					{isSyncing ? "Syncing…" : "Sync EIDSR Messages"}
				</Button>
			</div>
		</div>
	)
);

EidsrMessagesHeader.displayName = "EidsrMessagesHeader";
