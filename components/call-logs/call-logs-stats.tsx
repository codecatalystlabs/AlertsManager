import React, { memo } from "react";
import { HeartPulse, HeartCrack, ShieldCheck, Clock } from "lucide-react";
import { BorderStatCard } from "@/components/ui/border-stat-card";
import {
	type CallLogsStatFilter,
	getActiveStatFromFilters,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import { LAYOUT } from "@/constants/layout";

interface CallLogsStatsProps {
	stats: {
		alive: number;
		other: number;
		verified: number;
		pending: number;
	};
	filters: CallLogsFilterState;
	onStatClick: (stat: CallLogsStatFilter) => void;
}

export const CallLogsStats = memo<CallLogsStatsProps>(
	({ stats, filters, onStatClick }) => {
		const activeStat = getActiveStatFromFilters(filters);

		const statCards: Array<{
			statKey: CallLogsStatFilter;
			title: string;
			value: number;
			icon: React.ComponentType<{ className?: string }>;
			borderColor: string;
			textColor: string;
			iconColor: string;
		}> = [
			{
				statKey: "alive",
				title: "Cases Alive",
				value: stats.alive,
				icon: HeartPulse,
				borderColor: "border-l-success",
				textColor: "text-success",
				iconColor: "text-success",
			},
			{
				statKey: "other",
				title: "Other Status",
				value: stats.other,
				icon: HeartCrack,
				borderColor: "border-l-destructive",
				textColor: "text-destructive",
				iconColor: "text-destructive",
			},
			{
				statKey: "verified",
				title: "Verified",
				value: stats.verified,
				icon: ShieldCheck,
				borderColor: "border-l-success",
				textColor: "text-success",
				iconColor: "text-success",
			},
			{
				statKey: "pending",
				title: "Pending Verification",
				value: stats.pending,
				icon: Clock,
				borderColor: "border-l-warning",
				textColor: "text-warning",
				iconColor: "text-warning",
			},
		];

		return (
			<div className={LAYOUT.statsGrid}>
				{statCards.map((card) => (
					<BorderStatCard
						key={card.statKey}
						{...card}
						isActive={activeStat === card.statKey}
						onClick={() => onStatClick(card.statKey)}
					/>
				))}
			</div>
		);
	}
);

CallLogsStats.displayName = "CallLogsStats";
