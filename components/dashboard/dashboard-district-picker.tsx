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
import { useDistrictOptions } from "@/hooks/use-district-options";

interface DashboardDistrictPickerProps {
	/** Selected district name, or "all" for no district filter. */
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

export const DashboardDistrictPicker = memo<DashboardDistrictPickerProps>(
	({ value, onChange, disabled = false }) => {
		const { districts, loading } = useDistrictOptions(
			value === "all" ? "" : value
		);

		return (
			<div className="space-y-1">
				<Label htmlFor="dashboard-district" className="text-[11px]">
					District
				</Label>
				<Select
					value={value}
					onValueChange={onChange}
					disabled={disabled || loading}
				>
					<SelectTrigger
						id="dashboard-district"
						className="h-8 w-[160px] text-xs"
					>
						<SelectValue
							placeholder={loading ? "Loading…" : "All Districts"}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Districts</SelectItem>
						{districts.map((district) => (
							<SelectItem key={district} value={district}>
								{district}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}
);

DashboardDistrictPicker.displayName = "DashboardDistrictPicker";
