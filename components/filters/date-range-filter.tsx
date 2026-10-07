"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	DATE_RANGE_PRESETS,
	describeDateRange,
	describeDateRangePreset,
	presetStep,
	rangeStepFor,
	resolveDateRangePreset,
	matchActiveDateRangePreset,
	stepDateRange,
	type DateRangePreset,
	type DateRangePresetKey,
	type RangeStep,
} from "@/lib/date-range-presets";

interface DateRange {
	fromDate: string;
	toDate: string;
}

const ROLLING = DATE_RANGE_PRESETS.filter((p) => p.group === "rolling");
const PERIODS = DATE_RANGE_PRESETS.filter((p) => p.group === "period");

/**
 * "Quick range:" — rolling windows (Today … Last 12 months), then the
 * reporting periods (epi weeks, months, quarter, year), then a ◀ ▶ stepper
 * that walks whatever range is set back or forward by its own unit: last epi
 * week to the one before, a month to the previous month, "Last 6 months" to
 * the six before. Shared by every date filter, so a preset means the same
 * dates on every page.
 */
export function DateRangePresetBar({
	fromDate,
	toDate,
	onChange,
}: {
	fromDate: string;
	toDate: string;
	onChange: (range: DateRange) => void;
}) {
	// The preset last clicked: when two presets give the same dates (This month
	// and This quarter early in a quarter), the one clicked is the one lit — and
	// its unit is what the stepper steps by.
	const [picked, setPicked] = useState<DateRangePresetKey | null>(null);
	const [stepHint, setStepHint] = useState<RangeStep | null>(null);
	const activePreset = matchActiveDateRangePreset(fromDate, toDate, picked);
	const step = rangeStepFor(fromDate, toDate, stepHint);
	const prev = step ? stepDateRange(fromDate, toDate, -1, step) : null;
	const next = step ? stepDateRange(fromDate, toDate, 1, step) : null;
	const label = describeDateRange(fromDate, toDate, step);

	const choose = (preset: DateRangePreset) => {
		setPicked(preset.key);
		setStepHint(presetStep(preset.key));
		const range = resolveDateRangePreset(preset.key);
		onChange({ fromDate: range.fromDate, toDate: range.toDate });
	};
	const go = (target: DateRange | null) => {
		if (!target || !step) return;
		setStepHint(step);
		onChange(target);
	};
	const chip = (preset: DateRangePreset) => (
		<Button
			key={preset.key}
			type="button"
			variant={activePreset === preset.key ? "default" : "outline"}
			aria-pressed={activePreset === preset.key}
			title={describeDateRangePreset(preset.key)}
			onClick={() => choose(preset)}
			className="h-7 px-2 text-[11px]"
		>
			{preset.label}
		</Button>
	);

	const clear = () => {
		setPicked(null);
		setStepHint(null);
		onChange({ fromDate: "", toDate: "" });
	};

	return (
		<div className="space-y-1.5">
			<div className="flex flex-wrap items-center gap-1.5">
				<span className="mr-1 text-[11px] text-muted-foreground">Quick range:</span>
				<div role="group" aria-label="Rolling ranges ending today" className="flex flex-wrap items-center gap-1.5">
					{ROLLING.map(chip)}
				</div>
				<span aria-hidden className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
				<div role="group" aria-label="Reporting periods" className="flex flex-wrap items-center gap-1.5">
					{PERIODS.map(chip)}
				</div>
			</div>
			{/* The range in words, steppable back and forward by its own unit. */}
			{(fromDate || toDate) && (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="mr-1 text-[11px] text-muted-foreground">Period:</span>
					<div
						role="group"
						aria-label="Step the range"
						className="inline-flex h-7 items-center rounded-md border border-input bg-background"
					>
						{label && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-r-none"
								disabled={!prev}
								aria-label="Previous period"
								title={prev ? `Previous: ${describeDateRange(prev.fromDate, prev.toDate, step)}` : undefined}
								onClick={() => go(prev)}
							>
								<ChevronLeft className="h-3.5 w-3.5" />
							</Button>
						)}
						<span
							className={cn("whitespace-nowrap px-1.5 text-[11px] font-medium tabular-nums", !label && "pl-2.5")}
							aria-live="polite"
						>
							{label || (fromDate ? `From ${fromDate}` : `Up to ${toDate}`)}
						</span>
						{label && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-none"
								disabled={!next}
								aria-label="Next period"
								title={next ? `Next: ${describeDateRange(next.fromDate, next.toDate, step)}` : "Already up to today"}
								onClick={() => go(next)}
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-l-none border-l border-input text-muted-foreground"
							aria-label="Clear dates"
							title="Clear dates"
							onClick={clear}
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Paired From/To `<input type="date">` fields (rendered as two grid cells).
 * `maxDate` caps both inputs (Alerts uses "2100-12-31"); `inputClassName`
 * overrides the input styling per feature.
 */
export function DateRangeInputs({
	fromDate,
	toDate,
	onChange,
	maxDate,
	inputClassName = "h-8 text-xs w-full",
}: {
	fromDate: string;
	toDate: string;
	onChange: (patch: Partial<DateRange>) => void;
	maxDate?: string;
	inputClassName?: string;
}) {
	return (
		<>
			<div className="space-y-1 min-w-0">
				<Label htmlFor="from-date" className="text-[11px]">
					From date
				</Label>
				<Input
					id="from-date"
					type="date"
					max={toDate || maxDate}
					value={fromDate}
					onChange={(e) => onChange({ fromDate: e.target.value })}
					className={inputClassName}
				/>
			</div>

			<div className="space-y-1 min-w-0">
				<Label htmlFor="to-date" className="text-[11px]">
					To date
				</Label>
				<Input
					id="to-date"
					type="date"
					min={fromDate || undefined}
					max={maxDate}
					value={toDate}
					onChange={(e) => onChange({ toDate: e.target.value })}
					className={inputClassName}
				/>
			</div>
		</>
	);
}
