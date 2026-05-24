import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Download, FileSpreadsheet } from "lucide-react";

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
			<header className="animate-reveal">
				<div className="flex items-center gap-3 mb-5">
					<span className="h-1 w-8 bg-accent-red rounded-full" />
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Surveillance · Register
					</span>
				</div>
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
					<div className="max-w-2xl">
						<h1 className="serif text-4xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
							Alerts <em className="italic text-accent-red">register</em>
						</h1>
						<p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
							Every alert filed across Uganda&rsquo;s 135 districts —
							filterable by status, district, source, and verification
							state.
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
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
						>
							<FileSpreadsheet
								className="h-3.5 w-3.5"
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								Excel
							</span>
						</Button>
						<Button
							onClick={() => router.push("/add-alert")}
							className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
						>
							<Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
							<span className="mono uppercase tracking-widest font-bold">
								New Alert
							</span>
						</Button>
					</div>
				</div>
			</header>
		);
	}
);

AlertsHeader.displayName = "AlertsHeader";
