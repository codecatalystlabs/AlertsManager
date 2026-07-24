import React, { memo } from "react";
import { HeartPulse, HeartOff, HelpCircle, ClipboardList } from "lucide-react";
import { BorderStatCard } from "@/components/ui/border-stat-card";
import { LAYOUT } from "@/constants/layout";

interface AlertsStatsProps {
	stats: {
		alive: number;
		dead: number;
		unknown: number;
		total: number;
	};
}

export const AlertsStats = memo<AlertsStatsProps>(({ stats }) => {
	const statCards = [
		{
			title: "Alive Signals",
			value: stats.alive,
			icon: HeartPulse,
			borderColor: "border-l-success",
			textColor: "text-success",
			iconColor: "text-success",
		},
		{
			title: "Dead Signals",
			value: stats.dead,
			icon: HeartOff,
			borderColor: "border-l-destructive",
			textColor: "text-destructive",
			iconColor: "text-destructive",
		},
		{
			title: "Unknown Signals",
			value: stats.unknown,
			icon: HelpCircle,
			borderColor: "border-l-warning",
			textColor: "text-warning",
			iconColor: "text-warning",
		},
		{
			title: "Total Alerts",
			value: stats.total,
			icon: ClipboardList,
			borderColor: "border-l-primary",
			textColor: "text-primary",
			iconColor: "text-primary",
		},
	];

	return (
		<div className={LAYOUT.statsGrid}>
			{statCards.map((card) => (
				<BorderStatCard key={card.title} {...card} />
			))}
		</div>
	);
});

AlertsStats.displayName = "AlertsStats";
