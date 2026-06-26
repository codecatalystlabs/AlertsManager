import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CheckCircle2, Clock, Cloud, Link2, Unlink } from "lucide-react";
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

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

const STAT_COLORS: Record<string, { border: string; text: string; icon: string }> = {
	total: { border: "border-l-primary", text: "text-primary", icon: "text-primary" },
	totalMessages: { border: "border-l-primary", text: "text-primary", icon: "text-primary" },
	linked: { border: "border-l-success", text: "text-success", icon: "text-success" },
	unlinked: { border: "border-l-warning", text: "text-warning", icon: "text-warning" },
	verified: { border: "border-l-success", text: "text-success", icon: "text-success" },
	verifiedMessages: { border: "border-l-success", text: "text-success", icon: "text-success" },
	unverified: { border: "border-l-warning", text: "text-warning", icon: "text-warning" },
	unverifiedMessages: { border: "border-l-warning", text: "text-warning", icon: "text-warning" },
	synced: { border: "border-l-muted-foreground", text: "text-muted-foreground", icon: "text-muted-foreground" },
	syncedMessages: { border: "border-l-muted-foreground", text: "text-muted-foreground", icon: "text-muted-foreground" },
	pending: { border: "border-l-warning", text: "text-warning", icon: "text-warning" },
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
					const colors = STAT_COLORS[key] ?? {
						border: "border-l-gray-400",
						text: "text-gray-700",
						icon: "text-gray-500",
					};
					const Icon = STAT_ICONS[key] ?? MessageSquare;
					const title =
						EIDSR_MESSAGE_STAT_LABELS[key] ??
						formatEidsrMessageStatLabel(key);

					return (
						<Card
							key={key}
							role={filter ? "button" : undefined}
							tabIndex={filter ? 0 : undefined}
							onClick={
								filter
									? () => onFilterChange(isActive ? "all" : filter)
									: undefined
							}
							onKeyDown={
								filter
									? (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onFilterChange(isActive ? "all" : filter);
											}
										}
									: undefined
							}
							className={cn(
								"min-w-0 border-l-4",
								colors.border,
								filter && "cursor-pointer hover:shadow-md transition-all",
								isActive && "ring-2 ring-uganda-red shadow-md bg-muted/30"
							)}
						>
							<CardContent className="p-2">
								<div className="flex items-center gap-2 min-w-0">
									<Icon className={cn("h-5 w-5 shrink-0", colors.icon)} />
									<div className="min-w-0">
										<p className="text-[11px] font-medium text-gray-600 truncate">
											{title}
										</p>
										<p
											className={cn(
												"text-lg font-bold leading-tight",
												colors.text
											)}
										>
											{value.toLocaleString()}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		);
	}
);

EidsrMessagesStats.displayName = "EidsrMessagesStats";
