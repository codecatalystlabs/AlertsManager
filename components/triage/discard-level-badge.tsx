"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { discardLevel, type DiscardableSignal } from "@/lib/discard-level";

/**
 * WHICH gate discarded this signal, and on what ground.
 *
 * Two lines, not one, because they answer two different questions and a reader
 * scanning the discard pile needs the first at a glance and the second only when
 * a row surprises them: the badge is the LEVEL (Triage or Verification), and the
 * line under it is the REASON that level gives.
 *
 * Renders nothing for a signal that was not discarded — the column only appears
 * on the Discarded list, but a row that slipped in some other way should read as
 * blank rather than claim a decision nobody took.
 */
export function DiscardLevelBadge({
	signal,
	className,
}: {
	signal: DiscardableSignal;
	className?: string;
}) {
	const discard = discardLevel(signal);
	if (!discard) return null;

	return (
		<div className={cn("flex flex-col gap-0.5", className)} title={discard.hint}>
			<Badge
				variant="outline"
				className={cn(
					"w-fit whitespace-nowrap text-[10px] font-semibold",
					discard.badgeClass
				)}
			>
				{discard.label}
			</Badge>
			<span className="whitespace-nowrap text-[10px] text-muted-foreground">
				{discard.reason}
			</span>
		</div>
	);
}
