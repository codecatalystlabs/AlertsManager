"use client";

import { memo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	ECHIS_INITIAL_LOCAL_FILTERS,
	echisLocalFiltersToParams,
	type EchisLocalFilters,
} from "@/constants/echis-alerts";

interface EchisAlertsFiltersProps {
	/** Receives backend query params (district, county, verificationStatus, from_date, to_date). */
	onApply: (params: Record<string, string>) => void;
	onClear: () => void;
	isLoading?: boolean;
}

/**
 * Compact inline filters over the locally synced eCHIS rows. Distinct from the
 * advanced "Filters" sheet, which re-queries the live NDW API.
 */
export const EchisAlertsFilters = memo<EchisAlertsFiltersProps>(
	({ onApply, onClear, isLoading = false }) => {
		const [fields, setFields] = useState<EchisLocalFilters>(
			ECHIS_INITIAL_LOCAL_FILTERS
		);

		const patch = (p: Partial<EchisLocalFilters>) =>
			setFields((f) => ({ ...f, ...p }));

		const apply = () => onApply(echisLocalFiltersToParams(fields));
		const clear = () => {
			setFields(ECHIS_INITIAL_LOCAL_FILTERS);
			onClear();
		};
		const onEnter = (e: KeyboardEvent) => e.key === "Enter" && apply();

		return (
			<div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-2">
				<span className="text-[11px] font-medium text-muted-foreground shrink-0">
					Filter synced:
				</span>
				<Input
					aria-label="District"
					placeholder="District"
					value={fields.district}
					onChange={(e) => patch({ district: e.target.value })}
					onKeyDown={onEnter}
					className="h-8 w-[130px] text-xs"
				/>
				<Input
					aria-label="County"
					placeholder="County"
					value={fields.county}
					onChange={(e) => patch({ county: e.target.value })}
					onKeyDown={onEnter}
					className="h-8 w-[120px] text-xs"
				/>
				<Input
					aria-label="Verification status"
					placeholder="Verification"
					value={fields.verificationStatus}
					onChange={(e) => patch({ verificationStatus: e.target.value })}
					onKeyDown={onEnter}
					className="h-8 w-[130px] text-xs"
				/>
				<label className="flex items-center gap-1 text-[11px] text-muted-foreground">
					From
					<Input
						aria-label="Event from"
						type="date"
						value={fields.fromDate}
						onChange={(e) => patch({ fromDate: e.target.value })}
						className="h-8 w-[140px] text-xs"
					/>
				</label>
				<label className="flex items-center gap-1 text-[11px] text-muted-foreground">
					To
					<Input
						aria-label="Event to"
						type="date"
						value={fields.toDate}
						onChange={(e) => patch({ toDate: e.target.value })}
						className="h-8 w-[140px] text-xs"
					/>
				</label>
				<div className="flex items-center gap-1.5 ml-auto">
					<Button
						size="sm"
						className="h-8 bg-uganda-red hover:bg-uganda-red/90"
						onClick={apply}
						disabled={isLoading}
					>
						Apply
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-8"
						onClick={clear}
						disabled={isLoading}
					>
						Clear
					</Button>
				</div>
			</div>
		);
	}
);

EchisAlertsFilters.displayName = "EchisAlertsFilters";
