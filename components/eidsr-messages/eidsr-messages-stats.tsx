import React, { memo, useMemo } from "react";
import { StatCard, accentInk, type StatCardInk } from "@/components/ui/stat-card";
import { MessageSquare, CheckCircle2, Clock, Cloud, Link2, Unlink, type LucideIcon } from "lucide-react";
import {
	EIDSR_MESSAGE_STAT_LABELS,
} from "@/constants/eidsr-messages";
import { formatEidsrMessageStatLabel } from "@/lib/eidsr-message-normalize";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/constants/layout";

type EidsrStatFilter = "all" | "moved" | "not_moved";

interface EidsrMessagesStatsProps {
	stats: Record<string, number>;
	/**
	 * The cards drive the SAME split as the tab strip below them — a card is the
	 * tab's headline number, so clicking one has to land on that tab rather than
	 * setting a second, competing filter.
	 */
	activeFilter: EidsrStatFilter;
	onFilterChange: (filter: EidsrStatFilter) => void;
}

const STAT_ICONS: Record<string, LucideIcon> = {
	total: MessageSquare,
	totalMessages: MessageSquare,
	inRegister: Link2,
	notInRegister: Unlink,
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
	inRegister: accentInk("success"),
	notInRegister: accentInk("warning"),
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

function statFilterForKey(key: string): EidsrStatFilter | null {
	const k = key.toLowerCase();
	// Check the negatives first — "notinregister" contains "inregister", and
	// "unlinked"/"unverified" contain "linked"/"verified".
	if (
		k.includes("notinregister") ||
		k.includes("unlinked") ||
		k.includes("unverified") ||
		k === "pending"
	) {
		return "not_moved";
	}
	if (k.includes("inregister") || k.includes("linked") || k.includes("verified")) {
		return "moved";
	}
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
