import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DashboardExport } from "@/components/dashboard/dashboard-export";
import type { CallLogAlert } from "@/app/dashboard/types";

interface WelcomeSectionProps {
	onRefresh: () => void;
	lastUpdated?: Date;
	isRefreshing?: boolean;
	/** Alerts currently visible under the active filters — used for export. */
	exportAlerts?: CallLogAlert[];
}

function formatTimestamp(d: Date) {
	const date = d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${date} · ${time}`;
}

export const WelcomeSection = memo<WelcomeSectionProps>(
	({
		onRefresh,
		lastUpdated = new Date(),
		isRefreshing = false,
		exportAlerts = [],
	}) => {
		return (
			<section className="animate-reveal">
				<div className="flex items-center gap-3 mb-6">
					<span className="h-1 w-8 bg-accent-red rounded-full" />
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						National Monitoring · {formatTimestamp(lastUpdated)}
					</span>
				</div>

				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
					<div className="max-w-3xl">
						<h1 className="serif text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-foreground text-balance">
							Monitor the country&rsquo;s health alerts,{" "}
							<em className="italic text-accent-red">today.</em>
						</h1>
					</div>

					<div className="flex items-center gap-3 shrink-0">
						<div className="hidden md:flex items-center gap-2 mr-1">
							<span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-soft" />
							<span className="mono text-[10px] uppercase tracking-widest font-bold text-foreground">
								Feed Active
							</span>
						</div>
						<Button
							onClick={onRefresh}
							disabled={isRefreshing}
							variant="ghost"
							className="px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto border border-foreground/10"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${
									isRefreshing ? "animate-spin" : ""
								}`}
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								{isRefreshing ? "Refreshing" : "Refresh"}
							</span>
						</Button>
						<DashboardExport
							alerts={exportAlerts}
							disabled={isRefreshing}
						/>
					</div>
				</div>
			</section>
		);
	}
);

WelcomeSection.displayName = "WelcomeSection";
