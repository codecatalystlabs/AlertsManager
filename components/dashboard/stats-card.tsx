import React, { memo } from "react";
import { StatCardConfig, StatAccent } from "@/constants/dashboard";
import { AlertCounts } from "@/app/dashboard/types";
import { cn } from "@/lib/utils";

interface StatsCardProps {
	config: StatCardConfig;
	data: AlertCounts & {
		todayAlerts: number;
		todayVerified: number;
		verificationRate: number;
	};
	onClick?: () => void;
	className?: string;
}

const accentBar: Record<StatAccent, string> = {
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	green: "bg-accent-green",
	neutral: "bg-foreground/30",
};

const accentText: Record<StatAccent, string> = {
	red: "text-accent-red",
	yellow: "text-foreground",
	green: "text-accent-green",
	neutral: "text-muted-foreground",
};

export const StatsCard = memo<StatsCardProps>(
	({ config, data, onClick, className }) => {
		const { title, key, icon: Icon, accent, eyebrow, isPercentage } = config;

		const getValue = (): string => {
			const value = data[key as keyof typeof data];
			if (key === "verificationRate") {
				return data.total > 0
					? `${Math.round((data.verified / data.total) * 100)}`
					: "0";
			}
			if (typeof value === "number") {
				return value.toLocaleString();
			}
			return String(value);
		};

		const getSubText = (): string => {
			switch (key) {
				case "verified":
					return `of ${data.total.toLocaleString()} alerts`;
				case "notVerified":
					return `of ${data.total.toLocaleString()} alerts`;
				case "total":
					return `${data.verified.toLocaleString()} verified · ${data.notVerified.toLocaleString()} pending`;
				case "verificationRate":
					return `${data.verified.toLocaleString()} of ${data.total.toLocaleString()} verified`;
				case "todayAlerts":
					return "Inflow over the last 24h";
				case "todayVerified":
					return "Cleared in the last 24h";
				default:
					return "";
			}
		};

		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					"group relative w-full text-left bg-card px-6 py-7 transition-colors",
					"hover:bg-foreground/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
					onClick && "cursor-pointer",
					className
				)}
				aria-label={`${title}: ${getValue()}`}
			>
				<span
					className={cn(
						"absolute left-0 top-7 bottom-7 w-[2px] rounded-full",
						accentBar[accent]
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

				<p className="text-xs font-medium text-foreground/80 mb-3">
					{title}
				</p>

				<div className="flex items-baseline gap-1.5">
					<span className="mono text-4xl font-medium tracking-tighter text-foreground tabular-nums leading-none">
						{getValue()}
					</span>
					{isPercentage && (
						<span className="mono text-lg text-muted-foreground">
							%
						</span>
					)}
				</div>

				{getSubText() && (
					<p className="mt-4 mono text-[10px] uppercase tracking-tight text-muted-foreground">
						{getSubText()}
					</p>
				)}
			</button>
		);
	}
);

StatsCard.displayName = "StatsCard";
