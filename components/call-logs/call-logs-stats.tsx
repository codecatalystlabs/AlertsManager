import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneIncoming, PhoneOutgoing, PhoneCall, Phone } from "lucide-react";
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
				`border-l-4 ${borderColor} cursor-pointer transition-all duration-200`,
				"hover:shadow-md hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-red focus-visible:ring-offset-2",
				isActive && "ring-2 ring-uganda-red shadow-md bg-muted/30"
			)}
			aria-pressed={isActive}
			aria-label={`Filter table by ${title}`}
		>
			<CardContent className="p-3">
				<div className="flex items-center gap-2">
					<Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
					<div className="min-w-0">
						<p className="text-xs font-medium text-gray-600">
							{title}
						</p>
						<p className={`text-xl font-bold ${textColor}`}>
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
				icon: PhoneIncoming,
				borderColor: "border-l-green-500",
				textColor: "text-green-600",
				iconColor: "text-green-600",
			},
			{
				statKey: "other",
				title: "Other Status",
				value: stats.other,
				icon: PhoneOutgoing,
				borderColor: "border-l-red-500",
				textColor: "text-red-600",
				iconColor: "text-red-600",
			},
			{
				statKey: "verified",
				title: "Verified",
				value: stats.verified,
				icon: PhoneCall,
				borderColor: "border-l-blue-500",
				textColor: "text-blue-600",
				iconColor: "text-blue-600",
			},
			{
				statKey: "pending",
				title: "Pending Verification",
				value: stats.pending,
				icon: Phone,
				borderColor: "border-l-yellow-500",
				textColor: "text-yellow-600",
				iconColor: "text-yellow-600",
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
