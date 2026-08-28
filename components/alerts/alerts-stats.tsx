import React, { memo } from "react";
import { HeartPulse, HeartOff, HelpCircle, ClipboardList } from "lucide-react";
import { StatCard, accentInk } from "@/components/ui/stat-card";
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
			ink: accentInk("success"),
		},
		{
			title: "Dead Signals",
			value: stats.dead,
			icon: HeartOff,
			ink: accentInk("destructive"),
		},
		{
			title: "Unknown Signals",
			value: stats.unknown,
			icon: HelpCircle,
			ink: accentInk("warning"),
		},
		{
			title: "Total Alerts",
			value: stats.total,
			icon: ClipboardList,
			ink: accentInk("primary"),
		},
	];

	return (
		<div className={LAYOUT.statsGrid}>
			{statCards.map((card) => (
				<StatCard key={card.title} {...card} />
			))}
		</div>
	);
});

AlertsStats.displayName = "AlertsStats";
