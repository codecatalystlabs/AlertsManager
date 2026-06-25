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
import { useRegionOptions } from "@/hooks/use-region-options";

interface DashboardRegionPickerProps {
	/** Selected region name, or "all" for no region filter. */
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

export const DashboardRegionPicker = memo<DashboardRegionPickerProps>(
	({ value, onChange, disabled = false }) => {
		const { regions, loading } = useRegionOptions(
			value === "all" ? "" : value
		);

		return (
			<div className="space-y-1">
				<Label htmlFor="dashboard-region" className="text-[11px]">
					Region
				</Label>
				<Select
					value={value}
					onValueChange={onChange}
					disabled={disabled || loading}
				>
					<SelectTrigger
						id="dashboard-region"
						className="h-8 w-[160px] text-xs"
					>
						<SelectValue
							placeholder={loading ? "Loading…" : "All Regions"}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Regions</SelectItem>
						{regions.map((region) => (
							<SelectItem key={region} value={region}>
								{region}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}
);

DashboardRegionPicker.displayName = "DashboardRegionPicker";
