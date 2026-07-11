import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, HeartOff, HelpCircle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
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
	icon: React.ComponentType<{ className?: string }>;
	borderColor: string;
	textColor: string;
	iconColor: string;
}

// Styled to match the Call Logs stat cards: plain white card with a colour-coded
// left border, a lucide icon, and a colour-coded value (no gradient fills).
const StatCard = memo<StatCardProps>(
	({ title, value, icon: Icon, borderColor, textColor, iconColor }) => (
		<Card
			className={cn(
				"min-w-0 border-l-4",
				borderColor,
				"transition-shadow hover:shadow-md"
			)}
		>
			<CardContent className="p-2">
				<div className="flex items-center gap-2 min-w-0">
					<Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
					<div className="min-w-0">
						<p className="text-[11px] font-medium text-gray-600 truncate leading-tight">
							{title}
						</p>
						<p className={cn("text-lg font-bold leading-tight", textColor)}>
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
				<StatCard
					key={card.title}
					{...card}
				/>
			))}
		</div>
	);
});

AlertsStats.displayName = "AlertsStats";
