"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	DATE_RANGE_PRESETS,
	resolveDateRangePreset,
	matchActiveDateRangePreset,
} from "@/lib/date-range-presets";

interface DateRange {
	fromDate: string;
	toDate: string;
}

/**
 * "Quick range:" preset button row (Today / 7d / 30d / … + Clear dates). Was
 * byte-identical in the Alerts and Call-Logs filters; this is the one copy.
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
	const activePreset = matchActiveDateRangePreset(fromDate, toDate);
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="text-[11px] text-muted-foreground mr-1">Quick range:</span>
			{DATE_RANGE_PRESETS.map((preset) => (
				<Button
					key={preset.key}
					type="button"
					variant={activePreset === preset.key ? "default" : "outline"}
					onClick={() => {
						const range = resolveDateRangePreset(preset.key);
						onChange({ fromDate: range.fromDate, toDate: range.toDate });
					}}
					className="h-7 px-2 text-[11px]"
				>
					{preset.label}
				</Button>
			))}
			{(fromDate || toDate) && (
				<Button
					type="button"
					variant="ghost"
					onClick={() => onChange({ fromDate: "", toDate: "" })}
					className="h-7 px-2 text-[11px]"
				>
					Clear dates
				</Button>
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
