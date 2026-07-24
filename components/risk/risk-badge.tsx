"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	RISK_ACTION,
	RISK_BADGE_CLASS,
	isRiskAssessed,
	normalizeRiskLevel,
	riskLabel,
} from "@/lib/alert-risk";

/**
 * An event's assessed risk level. Very High is the only level that reads as an
 * emergency, because it is the only one the guidelines say must be responded to
 * outside normal working hours — the styling should not blur that line.
 */
export function RiskBadge({
	level,
	className,
}: {
	level?: string | null;
	className?: string;
}) {
	const normalized = normalizeRiskLevel(level);
	const key = isRiskAssessed(level) ? (normalized as string) : "unassessed";

	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap text-[10px] font-semibold",
				RISK_BADGE_CLASS[key],
				className
			)}
			title={
				normalized
					? `Risk ${normalized} — ${RISK_ACTION[normalized]}`
					: "Not yet risk-assessed (due within 24h of verification)"
			}
		>
			{riskLabel(level)}
		</Badge>
	);
}
