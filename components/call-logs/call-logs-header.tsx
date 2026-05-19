import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { CALL_LOGS_CONFIG } from "@/constants/call-logs";

interface CallLogsHeaderProps {
	onRefresh: () => void;
	onExportExcel: () => void;
	onExportCsv: () => void;
	isRefreshing?: boolean;
}

export const CallLogsHeader = memo<CallLogsHeaderProps>(
	({
		onRefresh,
		onExportExcel,
		onExportCsv,
		isRefreshing = false,
	}) => {
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
				<div className="flex flex-wrap gap-2 justify-end">
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
						onClick={onExportCsv}
						variant="outline"
						className="gap-2"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</Button>
					<Button
						onClick={onExportExcel}
						className="bg-uganda-red hover:bg-uganda-red/90 gap-2"
					>
						<FileSpreadsheet className="h-4 w-4" />
						Export Excel
					</Button>
				</div>
			</div>
		);
	}
);

CallLogsHeader.displayName = "CallLogsHeader";
