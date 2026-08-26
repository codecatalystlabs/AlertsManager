"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	SIGNAL_STATE_BADGE_CLASS,
	SIGNAL_STATE_HINT,
	SIGNAL_STATE_LABEL,
	signalState,
	type StatefulSignal,
} from "@/lib/signal-state";

/**
 * What this record IS, in the guideline's own vocabulary — signal, event, or
 * discarded. Sits beside the identifier, because the name of the thing is the
 * first fact about it, not a detail buried in a status column.
 */
export function SignalStateBadge({
	record,
	className,
}: {
	record: StatefulSignal;
	className?: string;
}) {
	const state = signalState(record);
	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap text-[10px] font-semibold",
				SIGNAL_STATE_BADGE_CLASS[state],
				className
			)}
			title={SIGNAL_STATE_HINT[state]}
		>
			{SIGNAL_STATE_LABEL[state]}
		</Badge>
	);
}
