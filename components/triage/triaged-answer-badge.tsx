"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	isSignalTriaged,
	triageDecisionLabel,
	normalizeTriageDecision,
	priorityLabel,
} from "@/lib/alert-triage";

/**
 * Has this signal been through the triage gate — Yes or No.
 *
 * The register's list answers the question rather than naming the exit, because
 * scanning a queue is a yes/no read: everything with a No has the same next
 * move, and triage is due within 24 hours of receipt.
 *
 * The exit itself is NOT lost — it is on the tooltip and in the details dialog.
 * That matters for the off-pipeline ones: the guideline's rule is "discard AND
 * record", and a discard nobody can find is the gap that rule exists to close.
 */
export function TriagedAnswerBadge({
	decision,
	priority,
	className,
}: {
	decision?: string | null;
	priority?: string | null;
	className?: string;
}) {
	const triaged = isSignalTriaged({ triageDecision: decision, priority });

	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap text-[10px] font-semibold",
				triaged
					? "bg-emerald-100 text-emerald-800 border-emerald-200"
					: "bg-gray-100 text-gray-600 border-gray-200",
				className
			)}
			title={triagedTitle(decision, priority, triaged)}
		>
			{triaged ? "Yes" : "No"}
		</Badge>
	);
}

/** What the Yes/No stands on, so the exit taken at the gate stays readable. */
function triagedTitle(
	decision: string | null | undefined,
	priority: string | null | undefined,
	triaged: boolean
): string {
	if (!triaged) return "Not yet through the triage gate — due within 24h of receipt";
	if (normalizeTriageDecision(decision)) {
		return `Triaged — ${triageDecisionLabel(decision)}`;
	}
	// Triaged before the decision column existed: the priority is the only
	// record of it, and a priority was only ever given to a signal that went
	// forward.
	return `Triaged — priority ${priorityLabel(priority)}, recorded before the decision was captured`;
}
