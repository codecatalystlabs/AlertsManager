import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Download, FileSpreadsheet } from "lucide-react";
import { ALERTS_CONFIG } from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";

interface AlertsHeaderProps {
	onRefresh: () => void;
	onExportExcel: () => void;
	onExportCsv: () => void;
	isRefreshing?: boolean;
}

export const AlertsHeader = memo<AlertsHeaderProps>(
	({ onRefresh, onExportExcel, onExportCsv, isRefreshing = false }) => {
		const router = useRouter();

		return (
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
				<div>
					<h1 className={LAYOUT.pageTitle}>
						{ALERTS_CONFIG.PAGE_TITLE}
					</h1>
					<p className={LAYOUT.pageSubtitle}>
						{ALERTS_CONFIG.PAGE_DESCRIPTION}
					</p>
				</div>
				<div className="flex flex-wrap gap-1.5">
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
						onClick={() => router.push("/add-alert")}
						size="sm"
						className="bg-uganda-red hover:bg-uganda-red/90 gap-1.5 h-8"
					>
						<Plus className="w-4 h-4" />
						Create Alert
					</Button>
					<Button
						onClick={onExportCsv}
						variant="outline"
						size="sm"
						className="gap-1.5 h-8"
					>
						<Download className="w-4 h-4" />
						Export CSV
					</Button>
					<Button
						onClick={onExportExcel}
						size="sm"
						className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90 gap-1.5 h-8"
					>
						<FileSpreadsheet className="w-4 h-4" />
						Export Excel
					</Button>
				</div>
			</div>
		);
	}
);

AlertsHeader.displayName = "AlertsHeader";
