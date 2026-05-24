import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface AlertsStatsProps {
	stats: {
		alive: number;
		dead: number;
		unknown: number;
		total: number;
		verified: number;
		awaitingVerification: number;
	};
}

type Accent = "green" | "red" | "yellow" | "neutral";

interface StatCardProps {
	title: string;
	eyebrow: string;
	value: number;
	accent: Accent;
}

const accentBar: Record<Accent, string> = {
	green: "bg-accent-green",
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	neutral: "bg-foreground/30",
};

const StatCard = memo<StatCardProps>(({ title, eyebrow, value, accent }) => (
	<div className="relative bg-card px-6 py-7">
		<span
			className={cn(
				"absolute left-0 top-7 bottom-7 w-[2px] rounded-full",
				accentBar[accent]
			)}
			aria-hidden="true"
		/>
		<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
			{eyebrow}
		</p>
		<p className="text-xs font-medium text-foreground/80 mb-3">{title}</p>
		<p className="mono text-3xl font-medium tracking-tighter text-foreground tabular-nums leading-none">
			{value.toLocaleString()}
		</p>
	</div>
));

StatCard.displayName = "StatCard";

export const AlertsStats = memo<AlertsStatsProps>(({ stats }) => {
	const verificationCards: StatCardProps[] = [
		{
			title: "Total Alerts",
			eyebrow: "Ω · All-time",
			value: stats.total,
			accent: "neutral",
		},
		{
			title: "Verified Alerts",
			eyebrow: "✓ · Confirmed",
			value: stats.verified,
			accent: "green",
		},
		{
			title: "Awaiting Verification",
			eyebrow: "△ · Backlog",
			value: stats.awaitingVerification,
			accent: "red",
		},
	];

	const outcomeCards: StatCardProps[] = [
		{
			title: "Alive Cases",
			eyebrow: "α · Outcomes",
			value: stats.alive,
			accent: "green",
		},
		{
			title: "Dead Cases",
			eyebrow: "β · Outcomes",
			value: stats.dead,
			accent: "red",
		},
		{
			title: "Unknown",
			eyebrow: "γ · Pending status",
			value: stats.unknown,
			accent: "yellow",
		},
	];

	return (
		<section className="animate-reveal [animation-delay:100ms] space-y-4">
			{/* Verification strip — primary */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
				{verificationCards.map((card) => (
					<StatCard key={card.title} {...card} />
				))}
			</div>

			{/* Outcomes strip — secondary */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
				{outcomeCards.map((card) => (
					<StatCard key={card.title} {...card} />
				))}
			</div>
		</section>
	);
});

AlertsStats.displayName = "AlertsStats";
