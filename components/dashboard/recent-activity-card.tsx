"use client";

import React, { memo, useState } from "react";
import { Clock, ShieldCheck, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import type { RecentActivityWindow } from "@/lib/fetch-recent-activity";

const WINDOW_PRESETS: { id: RecentActivityWindow; label: string }[] = [
	{ id: "24h", label: "Last 24 hours" },
	{ id: "7d", label: "Last 7 days" },
	{ id: "30d", label: "Last 30 days" },
	{ id: "custom", label: "Custom range" },
];

interface RecentActivityCardProps {
	/** District filter from the page; "all" or omitted = every district. */
	district?: string;
	className?: string;
}

/**
 * Windowed triage snapshot. A self-contained card with its own time-window
 * dropdown (last 24h / 7d / 30d / custom range) that shows, for signals logged in
 * the selected window, how many are still pending verification vs already
 * verified. Honours the page's district filter but not its date range.
 */
export const RecentActivityCard = memo<RecentActivityCardProps>(
	({ district = "all", className }) => {
		const [window, setWindow] = useState<RecentActivityWindow>("24h");
		const [fromDate, setFromDate] = useState("");
		const [toDate, setToDate] = useState("");

		const { activity, loading, error } = useRecentActivity({
			window,
			fromDate,
			toDate,
			district,
		});

		const isCustom = window === "custom";
		const awaitingCustom = isCustom && (!fromDate || !toDate);
		const showSkeleton = loading && !activity;

		const subtitle =
			activity && !showSkeleton && !awaitingCustom
				? `${activity.total.toLocaleString()} signal${
						activity.total === 1 ? "" : "s"
					} logged in the selected window`
				: "Signals logged in the selected window";

		return (
			<Card className={cn("border border-gray-200 bg-white", className)}>
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 p-3 pb-2">
					<div className="min-w-0">
						<p className="text-sm font-semibold text-gray-900">
							Recent activity
						</p>
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{subtitle}
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Select
							value={window}
							onValueChange={(v) => setWindow(v as RecentActivityWindow)}
						>
							<SelectTrigger
								className="h-8 w-[150px] text-xs"
								aria-label="Time window"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WINDOW_PRESETS.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{isCustom && (
							<>
								<Input
									type="date"
									max={toDate || undefined}
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									className="h-8 w-[140px] text-xs"
									aria-label="From date"
								/>
								<Input
									type="date"
									min={fromDate || undefined}
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									className="h-8 w-[140px] text-xs"
									aria-label="To date"
								/>
							</>
						)}
					</div>
				</CardHeader>

				<CardContent className="p-3 pt-0">
					{awaitingCustom ? (
						<p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-center text-xs text-muted-foreground">
							Choose a start and end date to see recent activity.
						</p>
					) : error ? (
						<p className="text-xs text-destructive">{error}</p>
					) : (
						<div className="grid grid-cols-2 gap-2.5">
							<Metric
								label="Pending verification"
								value={activity?.pending}
								caption="Awaiting triage"
								icon={Clock}
								tint={{ bg: "bg-warning/15", text: "text-warning" }}
								loading={showSkeleton}
							/>
							<Metric
								label="Verified"
								value={activity?.verified}
								caption="Outcome recorded"
								icon={ShieldCheck}
								tint={{ bg: "bg-success/15", text: "text-success" }}
								loading={showSkeleton}
							/>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}
);

RecentActivityCard.displayName = "RecentActivityCard";

interface MetricProps {
	label: string;
	value: number | undefined;
	caption: string;
	icon: LucideIcon;
	tint: { bg: string; text: string };
	loading?: boolean;
}

function Metric({
	label,
	value,
	caption,
	icon: Icon,
	tint,
	loading,
}: MetricProps): React.JSX.Element {
	return (
		<div className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
			<div className="min-w-0">
				<p className="text-xs font-medium text-gray-500">{label}</p>
				{loading ? (
					<Skeleton className="mt-1 h-6 w-12" />
				) : (
					<p className="mt-0.5 text-xl font-bold text-gray-900">
						{(value ?? 0).toLocaleString()}
					</p>
				)}
				{!loading && (
					<p className="mt-0.5 text-[11px] text-gray-400">{caption}</p>
				)}
			</div>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
					tint.bg
				)}
			>
				<Icon className={cn("h-4 w-4", tint.text)} />
			</div>
		</div>
	);
}
