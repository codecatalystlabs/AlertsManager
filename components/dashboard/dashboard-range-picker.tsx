"use client";

import React, { memo, useState } from "react";
import {
	DATE_RANGE_PRESETS,
	describeDateRange,
	resolveDateRangePreset,
	type DateRangePresetKey,
} from "@/lib/date-range-presets";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface DashboardRangeValue {
	/** YYYY-MM-DD; "" means unbounded. */
	from: string;
	/** YYYY-MM-DD; "" means unbounded. */
	to: string;
}

// "This month" by default (programme decision 2026-10-06, replacing the
// all-time default of 2026-06-16): every summary tab — this dashboard, the
// Overview, Regional/District performance, the EVD trend and the Presentation —
// now opens on the same period, so two tabs showing different numbers are
// showing different periods only when someone chose that. "All time" is still
// one click away.
export const DEFAULT_RANGE_PRESET = "month";

// The app-wide quick ranges (lib/date-range-presets.ts), so "Last 6 months"
// here is the same dates as on the register, the reports and the deck.
const ROLLING = DATE_RANGE_PRESETS.filter((p) => p.group === "rolling" && p.key !== "today");
const PERIODS = DATE_RANGE_PRESETS.filter((p) => p.group === "period");
const isPresetKey = (v: string): v is DateRangePresetKey => DATE_RANGE_PRESETS.some((p) => p.key === v);

/** Resolve a preset id (and optional custom dates) to a concrete window. */
export function resolveDashboardRange(
	preset: string,
	customFrom = "",
	customTo = ""
): DashboardRangeValue {
	if (preset === "all") return { from: "", to: "" };
	if (preset === "custom") return { from: customFrom, to: customTo };
	const { fromDate, toDate } = resolveDateRangePreset(isPresetKey(preset) ? preset : "12m");
	return { from: fromDate, to: toDate };
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
			<div className="relative z-10 flex flex-wrap items-end gap-2">
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
							className="h-8 w-[160px] text-xs "
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
									Rolling
								</SelectLabel>
								{ROLLING.map((p) => (
									<SelectItem key={p.key} value={p.key}>
										{p.label}
									</SelectItem>
								))}
							</SelectGroup>
							<SelectSeparator />
							<SelectGroup>
								<SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
									Reporting periods
								</SelectLabel>
								{PERIODS.map((p) => (
									<SelectItem key={p.key} value={p.key}>
										{p.label}
									</SelectItem>
								))}
							</SelectGroup>
							<SelectSeparator />
							<SelectItem value="all">All time</SelectItem>
							<SelectItem value="custom">Custom range</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* The dates a preset stands for today, in a report's words. */}
				{isPresetKey(preset) && (
					<span className="pb-2 text-[11px] text-muted-foreground">
						{(() => {
							const r = resolveDashboardRange(preset);
							return describeDateRange(r.from, r.to);
						})()}
					</span>
				)}

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
