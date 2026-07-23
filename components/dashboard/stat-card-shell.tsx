import React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The dashboard's one KPI-card layout: title + value on the left, an icon chip
 * on the right, and an optional icon-led sub-text line. Every dashboard stat
 * card (the workflow KPIs and the verification-SLA row) renders through this
 * shell so they stay pixel-identical in size and structure — variants only
 * restyle the face and ink via the class props.
 */

export interface StatCardInk {
	/** Card face (background/border). */
	face: string;
	title: string;
	value: string;
	/** Sub-text line colour. */
	sub: string;
	chipBg: string;
	chipText: string;
	/** Skeleton tone that stays visible on this face. */
	skeleton: string;
}

/** The default white-card ink used by the workflow KPI cards. */
export const DEFAULT_STAT_INK: StatCardInk = {
	face: "border border-gray-200 bg-white",
	title: "text-gray-500",
	value: "text-gray-900",
	sub: "text-gray-500",
	chipBg: "bg-muted",
	chipText: "text-muted-foreground",
	skeleton: "",
};

interface StatCardShellProps {
	title: string;
	value: string;
	subText?: string;
	icon: LucideIcon;
	ink?: StatCardInk;
	/** Native tooltip explaining the number. */
	hint?: string;
	onClick?: () => void;
	className?: string;
	/** Show placeholder skeletons in place of value/sub-text while loading. */
	isLoading?: boolean;
}

export function StatCardShell({
	title,
	value,
	subText,
	icon: Icon,
	ink = DEFAULT_STAT_INK,
	hint,
	onClick,
	className,
	isLoading,
}: StatCardShellProps) {
	return (
		<Card
			className={cn(
				"transition-shadow hover:shadow-md",
				ink.face,
				onClick && "cursor-pointer",
				className
			)}
			onClick={onClick}
			title={hint}
		>
			<CardContent className="p-3">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className={cn("truncate text-xs font-medium", ink.title)}>
							{title}
						</p>
						{isLoading ? (
							<Skeleton className={cn("mt-1.5 h-6 w-16", ink.skeleton)} />
						) : (
							<p className={cn("mt-0.5 text-xl font-bold", ink.value)}>
								{value}
							</p>
						)}
					</div>
					<div
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
							ink.chipBg
						)}
					>
						<Icon className={cn("h-4 w-4", ink.chipText)} />
					</div>
				</div>
				{isLoading ? (
					<Skeleton className={cn("mt-2 h-3 w-24", ink.skeleton)} />
				) : (
					subText && (
						<div
							className={cn(
								"mt-1.5 flex items-center gap-1 text-[11px] leading-tight",
								ink.sub
							)}
						>
							<Icon className={cn("h-3 w-3 shrink-0", ink.chipText)} />
							<span className="truncate">{subText}</span>
						</div>
					)
				)}
			</CardContent>
		</Card>
	);
}
