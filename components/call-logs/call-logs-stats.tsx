import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, HeartCrack, ShieldCheck, Clock } from "lucide-react";
import {
	type CallLogsStatFilter,
	getActiveStatFromFilters,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import { cn } from "@/lib/utils";
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

interface StatCardProps {
	statKey: CallLogsStatFilter;
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	borderColor: string;
	textColor: string;
	iconColor: string;
	isActive: boolean;
	onClick: () => void;
}

const StatCard = memo<StatCardProps>(
	({
		title,
		value,
		icon: Icon,
		borderColor,
		textColor,
		iconColor,
		isActive,
		onClick,
	}) => (
		<Card
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			className={cn(
				"min-w-0",
				`border-l-4 ${borderColor} cursor-pointer transition-all duration-200`,
				"hover:shadow-md hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-red focus-visible:ring-offset-2",
				isActive && "ring-2 ring-uganda-red shadow-md bg-muted/30"
			)}
			aria-pressed={isActive}
			aria-label={`Filter table by ${title}`}
		>
			<CardContent className="p-2">
				<div className="flex items-center gap-2 min-w-0">
					<Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
					<div className="min-w-0">
						<p className="text-[11px] font-medium text-gray-600 truncate leading-tight">
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
					<StatCard
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
