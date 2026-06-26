"use client";

import { memo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	POE_INITIAL_LOCAL_FILTERS,
	POE_RISK_LEVEL_OPTIONS,
	poeLocalFiltersToParams,
	type PoeLocalFilters,
} from "@/constants/poe-alerts";

interface PoeAlertsFiltersProps {
	/** Receives backend query params (port, nation, risk, from_date, to_date). */
	onApply: (params: Record<string, string>) => void;
	onClear: () => void;
	isLoading?: boolean;
}

const ANY_RISK = "any";

/**
 * Compact inline filters over the locally synced POE rows. Distinct from the
 * advanced "Filters" sheet, which re-queries the live NDW API.
 */
export const PoeAlertsFilters = memo<PoeAlertsFiltersProps>(
	({ onApply, onClear, isLoading = false }) => {
		const [fields, setFields] = useState<PoeLocalFilters>(
			POE_INITIAL_LOCAL_FILTERS
		);

		const patch = (p: Partial<PoeLocalFilters>) =>
			setFields((f) => ({ ...f, ...p }));

		const apply = () => onApply(poeLocalFiltersToParams(fields));
		const clear = () => {
			setFields(POE_INITIAL_LOCAL_FILTERS);
			onClear();
		};
		const onEnter = (e: KeyboardEvent) => e.key === "Enter" && apply();

		return (
			<div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-2">
				<span className="text-[11px] font-medium text-muted-foreground shrink-0">
					Filter synced:
				</span>
				<Input
					aria-label="Port of entry"
					placeholder="Port of entry"
					value={fields.port}
					onChange={(e) => patch({ port: e.target.value })}
					onKeyDown={onEnter}
					className="h-8 w-[140px] text-xs"
				/>
				<Input
					aria-label="Nationality"
					placeholder="Nationality"
					value={fields.nation}
					onChange={(e) => patch({ nation: e.target.value })}
					onKeyDown={onEnter}
					className="h-8 w-[130px] text-xs"
				/>
				<Select
					value={fields.risk === "" ? ANY_RISK : fields.risk}
					onValueChange={(v) => patch({ risk: v === ANY_RISK ? "" : v })}
				>
					<SelectTrigger
						aria-label="Risk level"
						className="h-8 w-[110px] text-xs"
					>
						<SelectValue placeholder="Any risk" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ANY_RISK}>Any risk</SelectItem>
						{POE_RISK_LEVEL_OPTIONS.map((r) => (
							<SelectItem key={r} value={r} className="capitalize">
								{r}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<label className="flex items-center gap-1 text-[11px] text-muted-foreground">
					From
					<Input
						aria-label="Created from"
						type="date"
						value={fields.fromDate}
						onChange={(e) => patch({ fromDate: e.target.value })}
						className="h-8 w-[140px] text-xs"
					/>
				</label>
				<label className="flex items-center gap-1 text-[11px] text-muted-foreground">
					To
					<Input
						aria-label="Created to"
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

PoeAlertsFilters.displayName = "PoeAlertsFilters";
