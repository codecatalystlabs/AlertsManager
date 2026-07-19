import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface BorderStatCardProps {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	borderColor: string;
	textColor: string;
	iconColor: string;
	/** When present, the card becomes an interactive filter toggle. */
	onClick?: () => void;
	isActive?: boolean;
}

/**
 * Left-border stat tile: colour-coded border + icon + value. The Alerts and
 * Call-Logs stat grids each declared their own identical copy of this (one
 * static, one clickable) — this is the single component, interactive only when
 * `onClick` is supplied.
 */
export const BorderStatCard = memo<BorderStatCardProps>(
	({ title, value, icon: Icon, borderColor, textColor, iconColor, onClick, isActive }) => {
		const body = (
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
		);

		if (onClick) {
			return (
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
					aria-pressed={isActive}
					aria-label={`Filter table by ${title}`}
					className={cn(
						"min-w-0 border-l-4",
						borderColor,
						"cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-red focus-visible:ring-offset-2",
						isActive && "ring-2 ring-uganda-red shadow-md bg-muted/30"
					)}
				>
					{body}
				</Card>
			);
		}

		return (
			<Card
				className={cn(
					"min-w-0 border-l-4",
					borderColor,
					"transition-shadow hover:shadow-md"
				)}
			>
				{body}
			</Card>
		);
	}
);

BorderStatCard.displayName = "BorderStatCard";
