"use client";

import React, { memo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface DashboardRangeValue {
	/** YYYY-MM-DD; "" means unbounded. */
	from: string;
	/** YYYY-MM-DD; "" means unbounded. */
	to: string;
}

// Last 90 days by default: a dashboard should open on recent activity, and an
// all-time default forced the chart fetch to page through up to CHART_MAX_PAGES
// (20k rows) on every load — the main cause of slow dashboard loads. Users can
// still pick "All time" to scope both the cards and the charts to the full set.
export const DEFAULT_RANGE_PRESET = "90d";

const PRESETS = [
	{ id: "30d", label: "Last 30 days" },
	{ id: "90d", label: "Last 90 days" },
	{ id: "6m", label: "Last 6 months" },
	{ id: "12m", label: "Last 12 months" },
	{ id: "all", label: "All time" },
	{ id: "custom", label: "Custom range" },
] as const;

/** Local-time YYYY-MM-DD (avoids UTC off-by-one near midnight). */
function toYmd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** Resolve a preset id (and optional custom dates) to a concrete window. */
export function resolveDashboardRange(
	preset: string,
	customFrom = "",
	customTo = ""
): DashboardRangeValue {
	if (preset === "all") return { from: "", to: "" };
	if (preset === "custom") return { from: customFrom, to: customTo };

	const to = new Date();
	const from = new Date();
	switch (preset) {
		case "30d":
			from.setDate(from.getDate() - 29);
			break;
		case "90d":
			from.setDate(from.getDate() - 89);
			break;
		case "6m":
			from.setMonth(from.getMonth() - 6);
			break;
		case "12m":
		default:
			from.setMonth(from.getMonth() - 12);
			break;
	}
	return { from: toYmd(from), to: toYmd(to) };
}

interface DashboardRangePickerProps {
	onChange: (value: DashboardRangeValue) => void;
	disabled?: boolean;
}

export const DashboardRangePicker = memo<DashboardRangePickerProps>(
	({ onChange, disabled = false }) => {
		const [preset, setPreset] = useState<string>(DEFAULT_RANGE_PRESET);
		const [from, setFrom] = useState("");
		const [to, setTo] = useState("");

		const handlePreset = (value: string) => {
			setPreset(value);
			// Custom waits for the user to enter dates; presets apply immediately.
			if (value !== "custom") {
				onChange(resolveDashboardRange(value));
			} else if (from || to) {
				onChange(resolveDashboardRange("custom", from, to));
			}
		};

		const handleFrom = (value: string) => {
			setFrom(value);
			onChange(resolveDashboardRange("custom", value, to));
		};

		const handleTo = (value: string) => {
			setTo(value);
			onChange(resolveDashboardRange("custom", from, value));
		};

		return (
			<div className="flex flex-wrap items-end gap-2">
				<div className="space-y-1">
					<Label htmlFor="dashboard-range" className="text-[11px]">
						Chart date range
					</Label>
					<Select
						value={preset}
						onValueChange={handlePreset}
						disabled={disabled}
					>
						<SelectTrigger
							id="dashboard-range"
							className="h-8 w-[160px] text-xs"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PRESETS.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{preset === "custom" && (
					<>
						<div className="space-y-1">
							<Label
								htmlFor="dashboard-from"
								className="text-[11px]"
							>
								From
							</Label>
							<Input
								id="dashboard-from"
								type="date"
								max={to || undefined}
								value={from}
								onChange={(e) => handleFrom(e.target.value)}
								disabled={disabled}
								className="h-8 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="dashboard-to" className="text-[11px]">
								To
							</Label>
							<Input
								id="dashboard-to"
								type="date"
								min={from || undefined}
								value={to}
								onChange={(e) => handleTo(e.target.value)}
								disabled={disabled}
								className="h-8 text-xs"
							/>
						</div>
					</>
				)}
			</div>
		);
	}
);

DashboardRangePicker.displayName = "DashboardRangePicker";
