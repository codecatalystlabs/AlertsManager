import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { CALL_LOGS_CONFIG } from "@/constants/call-logs";

interface CallLogsHeaderProps {
	onRefresh: () => void;
	onExport: () => void;
	isRefreshing?: boolean;
}

export const CallLogsHeader = memo<CallLogsHeaderProps>(
	({ onRefresh, onExport, isRefreshing = false }) => {
		return (
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-uganda-black">
						{CALL_LOGS_CONFIG.PAGE_TITLE}
					</h1>
					<p className="text-gray-600">
						{CALL_LOGS_CONFIG.PAGE_DESCRIPTION}
					</p>
				</div>
				<div className="flex space-x-2">
					<Button
						onClick={onRefresh}
						variant="outline"
						className="gap-2"
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
						onClick={onExport}
						className="bg-uganda-red hover:bg-uganda-red/90 gap-2"
					>
						<Download className="h-4 w-4" />
						Export to Excel
					</Button>
				</div>
			</div>
		);
	}
);

CallLogsHeader.displayName = "CallLogsHeader";
