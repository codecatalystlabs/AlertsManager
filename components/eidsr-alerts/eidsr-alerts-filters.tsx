import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
	EIDSR_STATUS_FILTER_OPTIONS,
	type EidsrAlertsFilterState,
} from "@/constants/eidsr-alerts";
import { LAYOUT } from "@/constants/layout";

interface EidsrAlertsFiltersProps {
	filters: EidsrAlertsFilterState;
	onFiltersChange: (patch: Partial<EidsrAlertsFilterState>) => void;
	onApply: () => void;
	onClear: () => void;
	isLoading?: boolean;
}

export const EidsrAlertsFilters = memo<EidsrAlertsFiltersProps>(
	({ filters, onFiltersChange, onApply, onClear, isLoading = false }) => {
		const localIdActive = filters.localId.trim().length > 0;

		return (
			<Card className={LAYOUT.card}>
				<CardContent className="p-3">
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-end">
						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-local-id" className="text-[11px]">
								Local ID
							</Label>
							<Input
								id="eidsr-local-id"
								type="number"
								min={1}
								placeholder="e.g. 1"
								value={filters.localId}
								onChange={(e) =>
									onFiltersChange({ localId: e.target.value })
								}
								className="h-8 text-xs"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-status" className="text-[11px]">
								Status
							</Label>
							<Select
								value={filters.status}
								onValueChange={(value) =>
									onFiltersChange({ status: value })
								}
								disabled={localIdActive}
							>
								<SelectTrigger id="eidsr-status" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{EIDSR_STATUS_FILTER_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-from-date" className="text-[11px]">
								Event from
							</Label>
							<Input
								id="eidsr-from-date"
								type="date"
								value={filters.fromDate}
								onChange={(e) =>
									onFiltersChange({ fromDate: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-to-date" className="text-[11px]">
								Event to
							</Label>
							<Input
								id="eidsr-to-date"
								type="date"
								value={filters.toDate}
								onChange={(e) =>
									onFiltersChange({ toDate: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-updated-after" className="text-[11px]">
								Updated after
							</Label>
							<Input
								id="eidsr-updated-after"
								type="date"
								value={filters.updatedAfter}
								onChange={(e) =>
									onFiltersChange({ updatedAfter: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex gap-1.5">
							<Button
								size="sm"
								className="h-8 flex-1 bg-uganda-red hover:bg-uganda-red/90"
								onClick={onApply}
								disabled={isLoading}
							>
								Apply
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="h-8"
								onClick={onClear}
								disabled={isLoading}
							>
								Clear
							</Button>
						</div>
					</div>
					{localIdActive && (
						<p className="text-[11px] text-muted-foreground mt-2">
							Local ID set — loads a single event via{" "}
							<code className="text-xs">/eidsr/local/events/:id</code>.
							Other filters are ignored.
						</p>
					)}
				</CardContent>
			</Card>
		);
	}
);

EidsrAlertsFilters.displayName = "EidsrAlertsFilters";
