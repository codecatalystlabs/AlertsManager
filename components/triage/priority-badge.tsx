"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	PRIORITY_BADGE_CLASS,
	formatDeadline,
	isTriaged,
	priorityLabel,
} from "@/lib/alert-triage";

/**
 * A signal's triage priority. "Untriaged" is rendered deliberately plainly —
 * it is a gap to be closed, not an alarm, and painting it red would drown out
 * the genuinely High-priority signals it sits beside.
 */
export function PriorityBadge({
	priority,
	className,
	showDeadline = false,
}: {
	priority?: string | null;
	className?: string;
	showDeadline?: boolean;
}) {
	const triaged = isTriaged(priority);
	const label = priorityLabel(priority);
	const key = triaged ? label : "untriaged";

	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap text-[10px] font-semibold",
				PRIORITY_BADGE_CLASS[key],
				className
			)}
			title={
				triaged
					? `Priority ${label} — verify within ${formatDeadline(priority)}`
					: "Not yet triaged — measured against the 24h (Medium) deadline"
			}
		>
			{label}
			{showDeadline && triaged && (
				<span className="ml-1 font-normal opacity-75">
					{formatDeadline(priority)}
				</span>
			)}
		</Badge>
	);
}
