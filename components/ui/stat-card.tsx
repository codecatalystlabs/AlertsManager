import React, { memo } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * THE stat card. Every KPI / counter tile in the app renders through this one
 * component — the dashboard KPI row, the verification-SLA row, the triage and
 * risk rows, the Alerts stat grid and the eIDSR message grid all used to ship
 * their own near-identical copy, each a different height.
 *
 * The layout is deliberately tight: one line of label, one line of number, an
 * optional caption, and a small icon — roughly half the height of what it
 * replaces. Variation is colour only (`ink`), never size or structure, so a
 * grid of these always reads as one row of equal tiles.
 */

export interface StatCardInk {
	/** Card face (background + border). */
	face?: string;
	/** Left accent bar colour, e.g. "border-l-success". */
	accent?: string;
	title?: string;
	value?: string;
	/** Caption line colour. */
	sub?: string;
	/** Icon colour (used when there is no chip background). */
	icon?: string;
	/** Icon chip background — omit for a bare icon. */
	chipBg?: string;
	/** Skeleton tone that stays visible on this face. */
	skeleton?: string;
}

/** Plain white tile — the default. */
export const DEFAULT_STAT_INK: StatCardInk = {
	face: "border-border bg-card",
	title: "text-muted-foreground",
	value: "text-foreground",
	sub: "text-muted-foreground",
	icon: "text-muted-foreground",
};

/** White ink on a saturated/gradient face. Pass the face classes. */
export function solidInk(face: string): StatCardInk {
	return {
		face: `border-0 ${face}`,
		title: "text-white/90",
		value: "text-white",
		sub: "text-white/80",
		icon: "text-white",
		chipBg: "bg-white/20",
		skeleton: "bg-white/40",
	};
}

/** Dark ink on amber — white on yellow is unreadable. */
export const AMBER_INK: StatCardInk = {
	face: "border-0 bg-gradient-to-br from-amber-300 to-amber-500",
	title: "text-amber-950/90",
	value: "text-amber-950",
	sub: "text-amber-950/80",
	icon: "text-amber-950",
	chipBg: "bg-amber-950/15",
	skeleton: "bg-amber-950/20",
};

export const SLATE_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-slate-500 to-slate-700"
);
export const EMERALD_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-emerald-500 to-emerald-700"
);
export const SKY_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-sky-500 to-blue-700"
);
export const TEAL_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-teal-500 to-cyan-700"
);
export const ROSE_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-red-500 to-rose-700"
);
export const VIOLET_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-violet-500 to-purple-700"
);
export const INDIGO_INK: StatCardInk = solidInk(
	"bg-gradient-to-br from-indigo-500 to-violet-700"
);

/** Semantic tone, not a palette colour — these follow the theme. */
export type StatTone =
	| "primary"
	| "success"
	| "warning"
	| "destructive"
	| "muted";

const TONE_INK: Record<StatTone, { accent: string; ink: string }> = {
	primary: { accent: "border-l-primary", ink: "text-primary" },
	success: { accent: "border-l-success", ink: "text-success" },
	warning: { accent: "border-l-warning", ink: "text-warning" },
	destructive: { accent: "border-l-destructive", ink: "text-destructive" },
	muted: { accent: "border-l-muted-foreground", ink: "text-muted-foreground" },
};

/**
 * White tile with a coloured left bar and matching number — the eIDSR message
 * grid and the recent-activity pair.
 */
export function accentInk(tone: StatTone): StatCardInk {
	const map = TONE_INK[tone];
	return {
		face: "border-border bg-card",
		accent: map.accent,
		title: "text-muted-foreground",
		value: map.ink,
		sub: "text-muted-foreground",
		icon: map.ink,
	};
}

/**
 * The dashboard KPI look: a plain white tile where the icon carries the only
 * colour and the number stays in the foreground ink. Same tone vocabulary as
 * accentInk, so a row moves between the two looks without re-picking colours.
 */
export function tintedInk(tone: StatTone): StatCardInk {
	return { ...DEFAULT_STAT_INK, icon: TONE_INK[tone].ink };
}

export interface StatCardProps {
	title: string;
	/** Pre-formatted; numbers are localised by the caller. */
	value: string | number;
	icon: LucideIcon;
	/** Optional caption under the number. Kept to one truncated line. */
	subText?: string;
	/** Colour only — never size. */
	ink?: StatCardInk;
	/** Native tooltip explaining what the number counts. */
	hint?: string;
	/** Makes the tile an interactive button (filter toggle / navigation). */
	onClick?: () => void;
	/** Pressed state for toggle tiles. */
	isActive?: boolean;
	/** Placeholder skeletons in place of value/caption while data loads. */
	isLoading?: boolean;
	className?: string;
}

export const StatCard = memo<StatCardProps>(
	({
		title,
		value,
		icon: Icon,
		subText,
		ink = DEFAULT_STAT_INK,
		hint,
		onClick,
		isActive,
		isLoading,
		className,
	}) => {
		const interactive = Boolean(onClick);

		return (
			<Card
				role={interactive ? "button" : undefined}
				tabIndex={interactive ? 0 : undefined}
				aria-pressed={interactive ? isActive : undefined}
				onClick={onClick}
				onKeyDown={
					interactive
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onClick?.();
								}
							}
						: undefined
				}
				title={hint}
				className={cn(
					"flex min-w-0 items-center gap-2 px-2 py-1.5 transition-shadow hover:shadow-md",
					ink.face,
					ink.accent && cn("border-l-4", ink.accent),
					interactive &&
						"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-red focus-visible:ring-offset-1",
					isActive && "ring-2 ring-uganda-red bg-muted/30",
					className
				)}
			>
				<span
					className={cn(
						"flex h-6 w-6 shrink-0 items-center justify-center",
						ink.chipBg && cn("rounded", ink.chipBg)
					)}
				>
					<Icon className={cn("h-4 w-4", ink.icon)} />
				</span>

				<div className="min-w-0 flex-1">
					<p
						className={cn(
							"truncate text-[11px] font-medium leading-none",
							ink.title
						)}
					>
						{title}
					</p>
					{isLoading ? (
						<Skeleton className={cn("mt-1 h-4 w-12", ink.skeleton)} />
					) : (
						<p
							className={cn(
								"mt-0.5 truncate text-base font-bold leading-tight",
								ink.value
							)}
						>
							{typeof value === "number" ? value.toLocaleString() : value}
						</p>
					)}
					{isLoading ? (
						subText !== undefined && (
							<Skeleton className={cn("mt-1 h-2.5 w-20", ink.skeleton)} />
						)
					) : (
						subText && (
							<p
								className={cn(
									"truncate text-[10px] leading-tight",
									ink.sub
								)}
							>
								{subText}
							</p>
						)
					)}
				</div>
			</Card>
		);
	}
);

StatCard.displayName = "StatCard";
