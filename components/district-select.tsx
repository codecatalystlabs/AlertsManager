"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDistrictOptions } from "@/hooks/use-district-options";

export interface DistrictSelectProps {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	triggerClassName?: string;
}

export function DistrictSelect({
	id,
	value,
	onValueChange,
	placeholder = "Select District",
	disabled,
	triggerClassName,
}: DistrictSelectProps) {
	const { districts, loading, error } = useDistrictOptions(value);

	return (
		<div className="space-y-1">
			<Select
				value={value || undefined}
				onValueChange={onValueChange}
				disabled={disabled || loading}
			>
				<SelectTrigger id={id} className={triggerClassName}>
					<SelectValue
						placeholder={
							loading ? "Loading districts..." : placeholder
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{districts.map((district) => (
						<SelectItem key={district} value={district}>
							{district}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error ? (
				<p className="text-xs text-destructive">{error}</p>
			) : null}
		</div>
	);
}
