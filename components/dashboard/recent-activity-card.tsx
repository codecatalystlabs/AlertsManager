"use client";

import React, { memo, useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatCard, accentInk } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import type { RecentActivityWindow } from "@/lib/fetch-recent-activity";

/**
 * Dropdown selection. Most map straight to a `RecentActivityWindow`; "hours" is a
 * UI-only sentinel that pairs with the free-form hours input, and "custom" opens
 * the calendar-day range pickers.
 */
type WindowPreset =
	| "1h"
	| "3h"
	| "10h"
	| "24h"
	| "7d"
	| "30d"
	| "hours"
	| "custom";

const WINDOW_PRESETS: { id: WindowPreset; label: string }[] = [
	{ id: "1h", label: "Last 1 hour" },
	{ id: "3h", label: "Last 3 hours" },
	{ id: "10h", label: "Last 10 hours" },
	{ id: "24h", label: "Last 24 hours" },
	{ id: "7d", label: "Last 7 days" },
	{ id: "30d", label: "Last 30 days" },
	{ id: "hours", label: "Custom hours" },
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
		const [preset, setPreset] = useState<WindowPreset>("24h");
		const [customHours, setCustomHours] = useState("");
		const [fromDate, setFromDate] = useState("");
		const [toDate, setToDate] = useState("");

		const isCustomRange = preset === "custom";
		const isCustomHours = preset === "hours";

		// The free-form hours input must be a whole number ≥ 1 before we query.
		const hoursNum = Number(customHours);
		const hoursValid =
			customHours.trim() !== "" &&
			Number.isInteger(hoursNum) &&
			hoursNum >= 1;

		// The effective window string sent to the API: the custom-hours input
		// becomes `${N}h`; the day/hour presets are already valid window values.
		const window: RecentActivityWindow = isCustomRange
			? "custom"
			: isCustomHours
				? (`${hoursValid ? hoursNum : 24}h` as RecentActivityWindow)
				: (preset as RecentActivityWindow);

		// Idle while the custom-hours input is empty/invalid (the hook also gates
		// the custom range on both dates being set).
		const enabled = !isCustomHours || hoursValid;

		const { activity, loading, error } = useRecentActivity({
			window,
			fromDate,
			toDate,
			district,
			enabled,
		});

		const awaitingCustom =
			(isCustomRange && (!fromDate || !toDate)) ||
			(isCustomHours && !hoursValid);
		const showSkeleton = loading && !activity;

		const subtitle =
			activity && !showSkeleton && !awaitingCustom
				? `${activity.total.toLocaleString()} signal${
						activity.total === 1 ? "" : "s"
					} logged in the selected window`
				: "Signals logged in the selected window";

		return (
			<Card className={cn("border border-gray-200 bg-white", className)}>
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
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
							value={preset}
							onValueChange={(v) => setPreset(v as WindowPreset)}
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
						{isCustomHours && (
							<div className="flex items-center gap-1.5">
								<Input
									type="number"
									min={1}
									step={1}
									inputMode="numeric"
									value={customHours}
									onChange={(e) => setCustomHours(e.target.value)}
									placeholder="6"
									className="h-8 w-[70px] text-xs"
									aria-label="Number of hours"
								/>
								<span className="text-xs text-muted-foreground">
									hours
								</span>
							</div>
						)}
						{isCustomRange && (
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

				<CardContent>
					{awaitingCustom ? (
						<p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-center text-xs text-muted-foreground">
							{isCustomHours
								? "Enter a whole number of hours to see recent activity."
								: "Choose a start and end date to see recent activity."}
						</p>
					) : error ? (
						<p className="text-xs text-destructive">{error}</p>
					) : (
						<div className="grid grid-cols-2 gap-2">
							<StatCard
								title="Pending verification"
								value={activity?.pending ?? 0}
								subText="Awaiting triage"
								icon={Clock}
								ink={accentInk("warning")}
								isLoading={showSkeleton}
							/>
							<StatCard
								title="Verified"
								value={activity?.verified ?? 0}
								subText="Outcome recorded"
								icon={ShieldCheck}
								ink={accentInk("success")}
								isLoading={showSkeleton}
							/>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}
);

RecentActivityCard.displayName = "RecentActivityCard";
