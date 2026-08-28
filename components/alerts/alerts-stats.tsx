import React, { memo } from "react";
import { HeartPulse, HeartOff, HelpCircle, ClipboardList } from "lucide-react";
import { StatCard, tintedInk } from "@/components/ui/stat-card";
import { LAYOUT } from "@/constants/layout";

interface AlertsStatsProps {
	stats: {
		alive: number;
		dead: number;
		unknown: number;
		total: number;
	};
}

/**
 * The Alerts list's stat row, rendered as the DASHBOARD KPI cards: a plain
 * white tile, the icon carrying the colour, and a caption under the number.
 * Same StatCard as everywhere else — only the ink and the captions differ from
 * the accent-bar variant this row used to use, which read as a different
 * component sitting on a page beside one.
 */
export const AlertsStats = memo<AlertsStatsProps>(({ stats }) => {
	// Shares are of the TOTAL, which is not the sum of the three outcomes: a
	// signal can carry an outcome this row does not bucket. Guarded, so an empty
	// scope says so instead of dividing by zero.
	const share = (count: number): string =>
		stats.total > 0
			? `${Math.round((count / stats.total) * 100)}% of all signals`
			: "no signals in scope";

	const statCards = [
		{
			title: "Alive Signals",
			value: stats.alive,
			subText: share(stats.alive),
			icon: HeartPulse,
			ink: tintedInk("success"),
		},
		{
			title: "Dead Signals",
			value: stats.dead,
			subText: share(stats.dead),
			icon: HeartOff,
			ink: tintedInk("destructive"),
		},
		{
			title: "Unknown Signals",
			value: stats.unknown,
			subText: "outcome not recorded",
			icon: HelpCircle,
			ink: tintedInk("warning"),
		},
		{
			title: "Total Alerts",
			value: stats.total,
			subText: `${stats.alive.toLocaleString()} alive · ${stats.dead.toLocaleString()} dead`,
			icon: ClipboardList,
			ink: tintedInk("primary"),
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
