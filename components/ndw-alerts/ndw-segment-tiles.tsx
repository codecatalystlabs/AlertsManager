"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { StatCard, type StatCardInk } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

export interface NdwSegment {
	/** Value sent as the feed's segment param; "" is "all". */
	key: string;
	label: string;
	/** undefined while facets load. */
	count?: number;
	caption?: string;
	icon: LucideIcon;
	ink?: StatCardInk;
	/** Tooltip: exactly what the tile counts. */
	hint?: string;
}

interface NdwSegmentTilesProps {
	segments: NdwSegment[];
	active: string;
	onSelect: (key: string) => void;
	isLoading?: boolean;
	/** Live NDW results are not the synced mirror, so the tiles cannot filter them. */
	disabled?: boolean;
	/** Grid columns, e.g. "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5". */
	className?: string;
}

/**
 * The segment row at the top of an NDW feed screen: each tile is a count and a
 * one-click filter. Clicking the selected tile again goes back to "all", so a
 * tile never traps the user in a view.
 */
export const NdwSegmentTiles = memo<NdwSegmentTilesProps>(
	({ segments, active, onSelect, isLoading, disabled, className }) => (
		<div
			className={cn("grid min-w-0 gap-2", disabled && "opacity-60", className)}
			aria-label="Segments"
		>
			{segments.map((s) => (
				<StatCard
					key={s.key || "all"}
					title={s.label}
					value={s.count ?? "—"}
					icon={s.icon}
					ink={s.ink}
					subText={s.caption}
					hint={s.hint}
					isLoading={isLoading && s.count === undefined}
					isActive={!disabled && active === s.key}
					onClick={
						disabled
							? undefined
							: () => onSelect(active === s.key && s.key !== "" ? "" : s.key)
					}
				/>
			))}
		</div>
	)
);
NdwSegmentTiles.displayName = "NdwSegmentTiles";
