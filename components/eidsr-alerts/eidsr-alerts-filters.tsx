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
	EIDSR_SEX_FILTER_OPTIONS,
	EIDSR_STATUS_FILTER_OPTIONS,
	type EidsrAlertsFilterState,
} from "@/constants/eidsr-alerts";
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";
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
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 items-end">
						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-search" className="text-[11px]">
								Search
							</Label>
							<Input
								id="eidsr-search"
								placeholder="Reporter, phone, message, location…"
								value={filters.search}
								onChange={(e) =>
									onFiltersChange({ search: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

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

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-disease" className="text-[11px]">
								Disease / syndrome
							</Label>
							<Input
								id="eidsr-disease"
								placeholder="e.g. Measles, Cholera"
								value={filters.disease}
								onChange={(e) =>
									onFiltersChange({ disease: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-district" className="text-[11px]">
								District / location
							</Label>
							<Input
								id="eidsr-district"
								placeholder="e.g. Kampala"
								value={filters.district}
								onChange={(e) =>
									onFiltersChange({ district: e.target.value })
								}
								disabled={localIdActive}
								className="h-8 text-xs"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-sex" className="text-[11px]">
								Sex
							</Label>
							<Select
								value={filters.sex}
								onValueChange={(value) => onFiltersChange({ sex: value })}
								disabled={localIdActive}
							>
								<SelectTrigger id="eidsr-sex" className="h-8 text-xs">
									<SelectValue placeholder="Any sex" />
								</SelectTrigger>
								<SelectContent>
									{EIDSR_SEX_FILTER_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="eidsr-source" className="text-[11px]">
								Source of alert
							</Label>
							<Select
								value={filters.source}
								onValueChange={(value) =>
									onFiltersChange({ source: value })
								}
								disabled={localIdActive}
							>
								<SelectTrigger id="eidsr-source" className="h-8 text-xs">
									<SelectValue placeholder="Any source" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Any source</SelectItem>
									{SOURCE_OF_ALERT_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex justify-end gap-1.5 mt-3">
						<Button
							size="sm"
							className="h-8 bg-uganda-red hover:bg-uganda-red/90"
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
					{localIdActive && (
						<p className="text-[11px] text-muted-foreground mt-2">
							Local ID set — loads a single SMS message. Other filters are
							ignored.
						</p>
					)}
				</CardContent>
			</Card>
		);
	}
);

EidsrAlertsFilters.displayName = "EidsrAlertsFilters";
