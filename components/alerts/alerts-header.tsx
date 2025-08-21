import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Download } from "lucide-react";
import { ALERTS_CONFIG } from "@/constants/alerts";

interface AlertsHeaderProps {
	onRefresh: () => void;
	onExport: () => void;
	isRefreshing?: boolean;
}

export const AlertsHeader = memo<AlertsHeaderProps>(
	({ onRefresh, onExport, isRefreshing = false }) => {
		const router = useRouter();

		return (
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-uganda-black">
						{ALERTS_CONFIG.PAGE_TITLE}
					</h1>
					<p className="text-gray-600 mt-1">
						{ALERTS_CONFIG.PAGE_DESCRIPTION}
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
						onClick={() => router.push("/add-alert")}
						className="bg-uganda-red hover:bg-uganda-red/90 gap-2"
					>
						<Plus className="w-4 h-4" />
						Create Alert
					</Button>
					<Button
						onClick={onExport}
						className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90 gap-2"
					>
						<Download className="w-4 h-4" />
						Export to Excel
					</Button>
				</div>
			</div>
		);
	}
);

AlertsHeader.displayName = "AlertsHeader";
