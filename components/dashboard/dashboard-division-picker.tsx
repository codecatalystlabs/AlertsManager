"use client";

import React, { memo } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDivisionOptions } from "@/hooks/use-division-options";

interface DashboardDivisionPickerProps {
	/** Selected division name, or "all" for no division filter. */
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	/**
	 * District whose divisions are listed ("all"/undefined = none). Divisions
	 * only make sense inside one district, so the picker stays disabled until a
	 * district is chosen (District → Division cascade).
	 */
	district?: string;
}

export const DashboardDivisionPicker = memo<DashboardDivisionPickerProps>(
	({ value, onChange, disabled = false, district }) => {
		const { divisions, loading, enabled } = useDivisionOptions(district);

		return (
			<div className="space-y-1">
				<Label htmlFor="dashboard-division" className="text-[11px]">
					Division
				</Label>
				<Select
					value={value}
					onValueChange={onChange}
					disabled={disabled || loading || !enabled}
				>
					<SelectTrigger
						id="dashboard-division"
						className="h-8 w-[160px] text-xs"
						title={enabled ? undefined : "Choose a district first"}
					>
						<SelectValue
							placeholder={loading ? "Loading…" : "All Divisions"}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Divisions</SelectItem>
						{divisions.map((division) => (
							<SelectItem key={division} value={division}>
								{division}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}
);

DashboardDivisionPicker.displayName = "DashboardDivisionPicker";
