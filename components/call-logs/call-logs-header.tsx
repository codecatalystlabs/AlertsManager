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
	({ onRefresh, onExportExcel, onExportCsv, isRefreshing = false }) => {
		return (
			<header className="animate-reveal">
				<div className="flex items-center gap-3 mb-5">
					<span className="h-1 w-8 bg-accent-red rounded-full" />
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Surveillance · Inbound calls
					</span>
				</div>
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
					<div className="max-w-2xl">
						<h1 className="serif text-4xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
							{CALL_LOGS_CONFIG.PAGE_TITLE}
						</h1>
						<p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
							{CALL_LOGS_CONFIG.PAGE_DESCRIPTION}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3 shrink-0">
						<Button
							onClick={onRefresh}
							disabled={isRefreshing}
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								{isRefreshing ? "Refreshing" : "Refresh"}
							</span>
						</Button>
						<Button
							onClick={onExportCsv}
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
						>
							<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
							<span className="mono uppercase tracking-widest font-bold">
								CSV
							</span>
						</Button>
						<Button
							onClick={onExportExcel}
							className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
						>
							<FileSpreadsheet
								className="h-3.5 w-3.5"
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								Excel
							</span>
						</Button>
					</div>
				</div>
			</header>
		);
	}
);

CallLogsHeader.displayName = "CallLogsHeader";
