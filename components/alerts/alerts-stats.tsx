import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LAYOUT } from "@/constants/layout";

interface AlertsStatsProps {
	stats: {
		alive: number;
		dead: number;
		unknown: number;
		total: number;
	};
}

interface StatCardProps {
	title: string;
	value: number;
	icon: string;
	gradient: string;
	iconBg: string;
	textColor: string;
}

const StatCard = memo<StatCardProps>(
	({ title, value, icon, gradient, iconBg, textColor }) => (
		<Card className={`bg-gradient-to-br ${gradient} border-opacity-50 shadow-sm min-w-0`}>
			<CardContent className="p-2">
				<div className="flex items-center gap-2 min-w-0">
					<div
						className={`h-7 w-7 ${iconBg} rounded-full flex items-center justify-center shrink-0`}
					>
						<span className="text-white font-bold text-xs">{icon}</span>
					</div>
					<div className="min-w-0">
						<p
							className={`${textColor.replace(
								"700",
								"600"
							)} text-[11px] font-medium truncate leading-tight`}
						>
							{title}
						</p>
						<p className={`text-lg font-bold leading-tight ${textColor}`}>
							{value.toLocaleString()}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
);

StatCard.displayName = "StatCard";

export const AlertsStats = memo<AlertsStatsProps>(({ stats }) => {
	const statCards = [
		{
			title: "Alive Cases",
			value: stats.alive,
			icon: "A",
			gradient: "from-green-50 to-green-100",
			iconBg: "bg-green-500",
			textColor: "text-green-700",
		},
		{
			title: "Dead Cases",
			value: stats.dead,
			icon: "D",
			gradient: "from-red-50 to-red-100",
			iconBg: "bg-red-500",
			textColor: "text-red-700",
		},
		{
			title: "Unknown Cases",
			value: stats.unknown,
			icon: "U",
			gradient: "from-yellow-50 to-yellow-100",
			iconBg: "bg-yellow-500",
			textColor: "text-yellow-700",
		},
		{
			title: "Total Alerts",
			value: stats.total,
			icon: "T",
			gradient: "from-blue-50 to-blue-100",
			iconBg: "bg-blue-500",
			textColor: "text-blue-700",
		},
	];

	return (
		<div className={LAYOUT.statsGrid}>
			{statCards.map((card) => (
				<StatCard
					key={card.title}
					{...card}
				/>
			))}
		</div>
	);
});

AlertsStats.displayName = "AlertsStats";
