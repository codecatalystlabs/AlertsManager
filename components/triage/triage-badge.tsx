"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	TRIAGE_DECISION_BADGE_CLASS,
	TRIAGE_DISCARDED,
	TRIAGE_FORWARDED,
	TRIAGE_LOGGED,
	normalizeTriageDecision,
	triageDecisionLabel,
} from "@/lib/alert-triage";

const TITLE: Record<string, string> = {
	[TRIAGE_FORWARDED]:
		"Passed triage — forwarded for verification against its priority deadline",
	[TRIAGE_LOGGED]:
		"Triage found no plausible public-health threat — logged and monitored, off the EBS pipeline but on the register",
	[TRIAGE_DISCARDED]:
		"Triage discarded this as already reported and under investigation — recorded, not deleted",
	untriaged: "Not yet through the triage gate",
};

/**
 * Which exit a signal took at the triage gate.
 *
 * Off-pipeline exits are styled as settled rather than alarming: a recorded
 * discard is a decision that was taken, not a failure. What must never happen
 * is that it renders as nothing at all — an invisible discard is exactly the
 * gap the guideline's "discard AND record" exists to close.
 */
export function TriageBadge({
	decision,
	className,
}: {
	decision?: string | null;
	className?: string;
}) {
	const normalized = normalizeTriageDecision(decision);
	const key = normalized ?? "untriaged";

	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap text-[10px] font-semibold",
				TRIAGE_DECISION_BADGE_CLASS[key],
				className
			)}
			title={TITLE[key]}
		>
			{triageDecisionLabel(decision)}
		</Badge>
	);
}
