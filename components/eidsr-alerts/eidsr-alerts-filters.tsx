import React, { memo, useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiltersToggle } from "@/components/filters/filters-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	EIDSR_FORWARD_VERIFICATION_FILTER_OPTIONS,
	EIDSR_INITIAL_FILTERS,
	EIDSR_SEX_FILTER_OPTIONS,
	EIDSR_STATUS_FILTER_OPTIONS,
	type EidsrAlertsFilterState,
} from "@/constants/eidsr-alerts";
import { useSourceOfAlertOptions } from "@/hooks/use-lookup-options";
import { LAYOUT } from "@/constants/layout";

/** The filter grid the toggle shows/hides — referenced by aria-controls. */
const FILTER_GRID_ID = "eidsr-filter-grid";

/**
 * How many fields are narrowing the list while the grid is collapsed.
 *
 * Nothing is excluded here, unlike the register's bar: every field on this card
 * lives inside the grid, so every field set is a field the reader cannot see
 * once it closes. The badge is what keeps a filter from quietly hiding rows.
 */
function countActiveFilters(filters: EidsrAlertsFilterState): number {
	const keys = Object.keys(
		EIDSR_INITIAL_FILTERS
	) as (keyof EidsrAlertsFilterState)[];
	return keys.filter((key) => filters[key] !== EIDSR_INITIAL_FILTERS[key])
		.length;
}

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
		// Admin-managed list (Administration -> Dropdown Options).
		const sourceOptions = useSourceOfAlertOptions();

		// Collapsed by default, matching the Signal Register and the Alerts page:
		// eleven fields is most of a screen, and most visits here are to read the
		// list or to sync it, not to re-filter it.
		const [showFilters, setShowFilters] = useState(false);
		const toggleFilters = useCallback(
			() => setShowFilters((open) => !open),
			[]
		);
		const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

		return (
			<Card className={LAYOUT.card}>
				<CardContent>
					{/* The card carries no always-visible control of its own — no
					    quick-range bar as on the register — so once it closes it is a
					    bare strip; the toggle's own "Show filters" label names it. */}
					<div className="flex items-center justify-end gap-2">
						<FiltersToggle
							open={showFilters}
							onToggle={toggleFilters}
							controls={FILTER_GRID_ID}
							activeCount={activeCount}
						/>
					</div>

					{/* Toggled by swapping the display utility rather than
					    unmounting: the fields stay in the DOM, so a half-typed search
					    survives closing the panel and the source lookup does not
					    remount, but display:none keeps them out of the tab order. */}
					<div
						id={FILTER_GRID_ID}
						className={
							showFilters
								? "mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 items-end"
								: "hidden"
						}
					>
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
									{sourceOptions.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label
								htmlFor="eidsr-forward-verification"
								className="text-[11px]"
							>
								Forwarding
							</Label>
							<Select
								value={filters.forwardVerification}
								onValueChange={(value) =>
									onFiltersChange({ forwardVerification: value })
								}
								disabled={localIdActive}
							>
								<SelectTrigger
									id="eidsr-forward-verification"
									className="h-8 text-xs"
								>
									<SelectValue placeholder="Any forwarding" />
								</SelectTrigger>
								<SelectContent>
									{EIDSR_FORWARD_VERIFICATION_FILTER_OPTIONS.map(
										(option) => (
											<SelectItem
												key={option.value}
												value={option.value}
											>
												{option.label}
											</SelectItem>
										)
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Hidden with the grid: Apply and Clear act on fields nobody can
					    see while it is closed. The badge above reports what is set. */}
					<div
						className={
							showFilters ? "flex justify-end gap-1.5 mt-3" : "hidden"
						}
					>
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
					{/* Stays visible when the grid is closed: it is the reason the
					    list is showing one row, and hiding the explanation with the
					    field leaves that looking like a fault. */}
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
