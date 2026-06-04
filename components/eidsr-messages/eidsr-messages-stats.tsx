import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CheckCircle2, Clock, Cloud } from "lucide-react";
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
	verified: CheckCircle2,
	verifiedMessages: CheckCircle2,
	unverified: Clock,
	unverifiedMessages: Clock,
	synced: Cloud,
	syncedMessages: Cloud,
	pending: Clock,
};

const STAT_COLORS: Record<string, { border: string; text: string; icon: string }> = {
	total: { border: "border-l-blue-500", text: "text-blue-700", icon: "text-blue-500" },
	totalMessages: { border: "border-l-blue-500", text: "text-blue-700", icon: "text-blue-500" },
	verified: { border: "border-l-green-500", text: "text-green-700", icon: "text-green-500" },
	verifiedMessages: { border: "border-l-green-500", text: "text-green-700", icon: "text-green-500" },
	unverified: { border: "border-l-amber-500", text: "text-amber-700", icon: "text-amber-500" },
	unverifiedMessages: { border: "border-l-amber-500", text: "text-amber-700", icon: "text-amber-500" },
	synced: { border: "border-l-purple-500", text: "text-purple-700", icon: "text-purple-500" },
	syncedMessages: { border: "border-l-purple-500", text: "text-purple-700", icon: "text-purple-500" },
	pending: { border: "border-l-amber-500", text: "text-amber-700", icon: "text-amber-500" },
};

function statFilterForKey(
	key: string
): "all" | "linked" | "unlinked" | null {
	const k = key.toLowerCase();
	if (k.includes("unverified") || k === "pending" || k.includes("unlinked")) {
		return "unlinked";
	}
	if (k.includes("verified") && !k.includes("unverified")) return "linked";
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
