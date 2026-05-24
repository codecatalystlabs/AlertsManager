import React, { memo } from "react";
import {
	PhoneIncoming,
	PhoneOutgoing,
	PhoneCall,
	Phone,
	type LucideIcon,
} from "lucide-react";
import {
	type CallLogsStatFilter,
	getActiveStatFromFilters,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import { cn } from "@/lib/utils";

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

type Accent = "green" | "red" | "yellow" | "neutral";

const accentBar: Record<Accent, string> = {
	green: "bg-accent-green",
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	neutral: "bg-foreground/30",
};

const accentText: Record<Accent, string> = {
	green: "text-accent-green",
	red: "text-accent-red",
	yellow: "text-foreground",
	neutral: "text-muted-foreground",
};

interface StatCardProps {
	statKey: CallLogsStatFilter;
	title: string;
	eyebrow: string;
	value: number;
	icon: LucideIcon;
	accent: Accent;
	isActive: boolean;
	onClick: () => void;
}

const StatCard = memo<StatCardProps>(
	({ title, eyebrow, value, icon: Icon, accent, isActive, onClick }) => (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={isActive}
			aria-label={`Filter table by ${title}`}
			className={cn(
				"relative w-full text-left bg-card px-6 py-7 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
				isActive ? "bg-foreground/[0.03]" : "hover:bg-foreground/[0.02]"
			)}
		>
			<span
				className={cn(
					"absolute left-0 top-7 bottom-7 w-[2px] rounded-full",
					accentBar[accent],
					isActive && "w-[3px]"
				)}
				aria-hidden="true"
			/>
			<div className="flex items-start justify-between gap-4 mb-5">
				<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
					{eyebrow}
				</p>
				<Icon
					className={cn("h-4 w-4 shrink-0", accentText[accent])}
					strokeWidth={1.75}
				/>
			</div>
			<p className="text-xs font-medium text-foreground/80 mb-3">{title}</p>
			<p className="mono text-3xl font-medium tracking-tighter text-foreground tabular-nums leading-none">
				{value.toLocaleString()}
			</p>
		</button>
	)
);

StatCard.displayName = "StatCard";

export const CallLogsStats = memo<CallLogsStatsProps>(
	({ stats, filters, onStatClick }) => {
		const activeStat = getActiveStatFromFilters(filters);

		const statCards: Array<Omit<StatCardProps, "isActive" | "onClick">> = [
			{
				statKey: "alive",
				title: "Cases Alive",
				eyebrow: "α · Outcomes",
				value: stats.alive,
				icon: PhoneIncoming,
				accent: "green",
			},
			{
				statKey: "other",
				title: "Other Status",
				eyebrow: "β · Outcomes",
				value: stats.other,
				icon: PhoneOutgoing,
				accent: "red",
			},
			{
				statKey: "verified",
				title: "Verified",
				eyebrow: "γ · Workflow",
				value: stats.verified,
				icon: PhoneCall,
				accent: "neutral",
			},
			{
				statKey: "pending",
				title: "Pending Review",
				eyebrow: "δ · Workflow",
				value: stats.pending,
				icon: Phone,
				accent: "yellow",
			},
		];

		return (
			<section className="animate-reveal [animation-delay:100ms]">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
					{statCards.map((card) => (
						<StatCard
							key={card.statKey}
							{...card}
							isActive={activeStat === card.statKey}
							onClick={() => onStatClick(card.statKey)}
						/>
					))}
				</div>
			</section>
		);
	}
);

CallLogsStats.displayName = "CallLogsStats";
