"use client";

import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatsCard } from "./stats-card";
import {
	StatCardConfig,
	STAT_CARDS,
	ADDITIONAL_STATS,
} from "@/constants/dashboard";
import { AlertCounts } from "@/app/dashboard/types";

interface StatsGridProps {
	alertCounts: AlertCounts;
	todayAlerts: number;
	todayVerified: number;
}

export const StatsGrid = memo<StatsGridProps>(
	({ alertCounts, todayAlerts, todayVerified }) => {
		const router = useRouter();

		const statsData = useMemo(
			() => ({
				...alertCounts,
				todayAlerts,
				todayVerified,
				verificationRate:
					alertCounts.total > 0
						? Math.round(
								(alertCounts.verified / alertCounts.total) * 100
							)
						: 0,
			}),
			[alertCounts, todayAlerts, todayVerified]
		);

		const handleCardClick = (config: StatCardConfig) => {
			if (config.route) router.push(config.route);
		};

		return (
			<section className="space-y-6">
				<div className="flex items-baseline justify-between">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ 01 · Snapshot
						</p>
						<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
							The state of the alert backlog
						</h2>
					</div>
					
				</div>

				{/* Primary KPI strip — four cards joined by hairline borders */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
					{STAT_CARDS.map((c, i) => (
						<div
							key={c.id}
							className="animate-reveal"
							style={{ animationDelay: `${i * 50}ms` }}
						>
							<StatsCard
								config={c}
								data={statsData}
								onClick={() => handleCardClick(c)}
							/>
						</div>
					))}
				</div>

				{/* Secondary "today" strip */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
					{ADDITIONAL_STATS.map((c, i) => (
						<div
							key={c.id}
							className="animate-reveal"
							style={{ animationDelay: `${(i + 4) * 50}ms` }}
						>
							<StatsCard
								config={c}
								data={statsData}
								onClick={() => handleCardClick(c)}
							/>
						</div>
					))}
				</div>
			</section>
		);
	}
);

StatsGrid.displayName = "StatsGrid";
