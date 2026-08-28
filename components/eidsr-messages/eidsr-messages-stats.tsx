import React, { memo, useMemo } from "react";
import { StatCard, accentInk, type StatCardInk } from "@/components/ui/stat-card";
import { MessageSquare, CheckCircle2, Clock, Cloud, Link2, Unlink, type LucideIcon } from "lucide-react";
import {
	EIDSR_MESSAGE_STAT_LABELS,
} from "@/constants/eidsr-messages";
import { formatEidsrMessageStatLabel } from "@/lib/eidsr-message-normalize";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/constants/layout";

interface EidsrMessagesStatsProps {
	stats: Record<string, number>;
	activeFilter: "all" | "linked" | "unlinked";
	onFilterChange: (filter: "all" | "linked" | "unlinked") => void;
}

const STAT_ICONS: Record<string, LucideIcon> = {
	total: MessageSquare,
	totalMessages: MessageSquare,
	linked: Link2,
	unlinked: Unlink,
	verified: CheckCircle2,
	verifiedMessages: CheckCircle2,
	unverified: Clock,
	unverifiedMessages: Clock,
	synced: Cloud,
	syncedMessages: Cloud,
	pending: Clock,
};

const STAT_INK: Record<string, StatCardInk> = {
	total: accentInk("primary"),
	totalMessages: accentInk("primary"),
	linked: accentInk("success"),
	unlinked: accentInk("warning"),
	verified: accentInk("success"),
	verifiedMessages: accentInk("success"),
	unverified: accentInk("warning"),
	unverifiedMessages: accentInk("warning"),
	synced: accentInk("muted"),
	syncedMessages: accentInk("muted"),
	pending: accentInk("warning"),
};

function statFilterForKey(
	key: string
): "all" | "linked" | "unlinked" | null {
	const k = key.toLowerCase();
	// Check "unlinked"/"unverified" first — they contain "linked"/"verified".
	if (k.includes("unlinked") || k.includes("unverified") || k === "pending") {
		return "unlinked";
	}
	if (k.includes("linked") || k.includes("verified")) return "linked";
	return null;
}

export const EidsrMessagesStats = memo<EidsrMessagesStatsProps>(
	({ stats, activeFilter, onFilterChange }) => {
		const entries = useMemo(
			() =>
				Object.entries(stats).filter(
					([, v]) => typeof v === "number" && !Number.isNaN(v)
				),
			[stats]
		);

		if (entries.length === 0) return null;

		return (
			<div className={cn("grid gap-2", LAYOUT.statsGrid)}>
				{entries.map(([key, value]) => {
					const filter = statFilterForKey(key);
					const isActive = filter != null && activeFilter === filter;
					const title =
						EIDSR_MESSAGE_STAT_LABELS[key] ??
						formatEidsrMessageStatLabel(key);

					return (
						<StatCard
							key={key}
							title={title}
							value={value}
							icon={STAT_ICONS[key] ?? MessageSquare}
							ink={STAT_INK[key] ?? accentInk("muted")}
							isActive={isActive}
							onClick={
								filter
									? () => onFilterChange(isActive ? "all" : filter)
									: undefined
							}
						/>
					);
				})}
			</div>
		);
	}
);

EidsrMessagesStats.displayName = "EidsrMessagesStats";
