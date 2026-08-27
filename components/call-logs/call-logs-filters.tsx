import React, { memo, useMemo, useState } from "react";
import { ChevronUp, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
	CALL_LOGS_INITIAL_FILTERS,
	STATUS_FILTER_OPTIONS,
	sourceFilterOptions,
	VERIFICATION_FILTER_OPTIONS,
	SEX_FILTER_OPTIONS,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import {
	PRIORITY_FILTER_OPTIONS,
	TRIAGE_DECISION_FILTER_OPTIONS,
} from "@/lib/alert-triage";
import { LAYOUT } from "@/constants/layout";
import { useLocationCascade } from "@/hooks/use-location-cascade";
import {
	DateRangePresetBar,
	DateRangeInputs,
} from "@/components/filters/date-range-filter";
import { useSourceOfAlertOptions } from "@/hooks/use-lookup-options";

/** The filter grid the toggle shows/hides — referenced by aria-controls. */
const FILTER_GRID_ID = "call-logs-filter-grid";

/**
 * Fields that are set but NOT visible while the grid is collapsed — the badge
 * counts these so a filter can never narrow the register out of sight.
 * Excluded:
 *  - `stage`: comes from ?stage=, a destination rather than something this bar
 *    can set or clear.
 *  - the dates: the quick-range bar above the toggle stays visible and already
 *    reports them (an active preset, or the "Clear dates" button).
 */
const HIDDEN_FILTER_EXCLUSIONS: ReadonlySet<keyof CallLogsFilterState> = new Set(
	["stage", "fromDate", "toDate"]
);

function countHiddenFilters(filters: CallLogsFilterState): number {
	const keys = Object.keys(
		CALL_LOGS_INITIAL_FILTERS
	) as (keyof CallLogsFilterState)[];
	return keys.filter(
		(key) =>
			!HIDDEN_FILTER_EXCLUSIONS.has(key) &&
			filters[key] !== CALL_LOGS_INITIAL_FILTERS[key]
	).length;
}

interface CallLogsFiltersProps {
	filters: CallLogsFilterState;
	onFiltersChange: (filters: Partial<CallLogsFilterState>) => void;
	onClearFilters: () => void;
}

export const CallLogsFilters = memo<CallLogsFiltersProps>(
	({ filters, onFiltersChange, onClearFilters }) => {
		// Subscribes to the admin-managed source list so this re-renders when it
		// loads; sourceFilterOptions() then reads the freshly hydrated list.
		useSourceOfAlertOptions();
		// Region → District → Division cascade from the admin-units hierarchy.
		const {
			regions,
			regionsLoading,
			districts,
			districtsLoading,
			divisions,
			divisionsLoading,
			divisionsEnabled,
		} = useLocationCascade({
			region: filters.region,
			district: filters.district,
		});

		// Collapsed by default: the grid is ~17 fields tall and most visits to the
		// register are to read the list, not to re-filter it. The quick-range bar
		// and the "N active" badge stay visible, so nothing is narrowing the list
		// without saying so.
		const [showFilters, setShowFilters] = useState(false);
		const hiddenCount = useMemo(() => countHiddenFilters(filters), [filters]);

		return (
			<Card className={LAYOUT.card}>
				<CardContent className="p-3 space-y-3">
					{/* items-start, not items-center: the preset bar wraps to two
					    rows on narrow screens and the toggle should stay on the
					    first one. */}
					<div className="flex items-start justify-between gap-2">
						<DateRangePresetBar
							fromDate={filters.fromDate}
							toDate={filters.toDate}
							onChange={onFiltersChange}
						/>

						<div className="flex items-center gap-1.5 shrink-0">
							{!showFilters && hiddenCount > 0 && (
								<Badge
									variant="secondary"
									className="h-5 px-2 text-[10px] font-medium"
								>
									{hiddenCount} active
								</Badge>
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => setShowFilters((open) => !open)}
								aria-expanded={showFilters}
								aria-controls={FILTER_GRID_ID}
								title={showFilters ? "Hide filters" : "Show filters"}
								className="h-7 w-7"
							>
								{showFilters ? <ChevronUp /> : <SlidersHorizontal />}
								<span className="sr-only">
									{showFilters ? "Hide filters" : "Show filters"}
								</span>
							</Button>
						</div>
					</div>

					{/* Toggled by swapping the display utility rather than
					    unmounting: the grid stays in the DOM (so nothing remounts
					    or refetches) but display:none keeps it out of the tab
					    order while hidden. */}
					<div
						id={FILTER_GRID_ID}
						className={showFilters ? LAYOUT.filtersGrid : "hidden"}
					>
						<div className="space-y-1 min-w-0">
							<Label htmlFor="search" className="text-[11px]">
								Search
							</Label>
							<Input
								id="search"
								placeholder="Reporter, name, contact, CIF, district…"
								value={filters.search}
								onChange={(e) =>
									onFiltersChange({
										search: e.target.value,
									})
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="status-filter" className="text-[11px]">
								Status
							</Label>
							<Select
								value={filters.status}
								onValueChange={(value) =>
									onFiltersChange({ status: value })
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="verification-filter" className="text-[11px]">
								Verification
							</Label>
							<Select
								value={filters.verification}
								onValueChange={(value) =>
									onFiltersChange({ verification: value })
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{VERIFICATION_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="source-filter" className="text-[11px]">
								Source
							</Label>
							<Select
								value={filters.source}
								onValueChange={(value) =>
									onFiltersChange({ source: value })
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{sourceFilterOptions().map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="priority-filter" className="text-[11px]">
								Priority
							</Label>
							<Select
								value={filters.priority}
								onValueChange={(value) =>
									onFiltersChange({ priority: value })
								}
							>
								<SelectTrigger id="priority-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All priorities</SelectItem>
									{PRIORITY_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="triage-decision-filter" className="text-[11px]">
								Triage decision
							</Label>
							<Select
								value={filters.triageDecision}
								onValueChange={(value) =>
									onFiltersChange({ triageDecision: value })
								}
							>
								<SelectTrigger
									id="triage-decision-filter"
									className="h-8 text-xs"
								>
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All decisions</SelectItem>
									{TRIAGE_DECISION_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="region-filter" className="text-[11px]">
								Region
							</Label>
							<Select
								value={filters.region}
								onValueChange={(value) =>
									// Region scopes districts (and divisions
									// below them), so reset both on change.
									onFiltersChange({
										region: value,
										district: "all",
										division: "all",
									})
								}
								disabled={regionsLoading}
							>
								<SelectTrigger
									id="region-filter"
									className="h-8 text-xs"
								>
									<SelectValue
										placeholder={
											regionsLoading
												? "Loading…"
												: "All Regions"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Regions
									</SelectItem>
									{regions.map((region) => (
										<SelectItem
											key={region}
											value={region}
										>
											{region}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="district-filter" className="text-[11px]">
								District
							</Label>
							<Select
								value={filters.district}
								onValueChange={(value) =>
									// District scopes divisions, so reset the
									// division whenever the district changes.
									onFiltersChange({
										district: value,
										division: "all",
									})
								}
								disabled={districtsLoading}
							>
								<SelectTrigger
									id="district-filter"
									className="h-8 text-xs"
								>
									<SelectValue
										placeholder={
											districtsLoading
												? "Loading…"
												: "All Districts"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Districts
									</SelectItem>
									{districts.map((district) => (
										<SelectItem
											key={district}
											value={district}
										>
											{district}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="division-filter" className="text-[11px]">
								Division
							</Label>
							<Select
								value={filters.division}
								onValueChange={(value) =>
									onFiltersChange({ division: value })
								}
								disabled={!divisionsEnabled || divisionsLoading}
							>
								<SelectTrigger
									id="division-filter"
									className="h-8 text-xs"
								>
									<SelectValue
										placeholder={
											!divisionsEnabled
												? "Select a district"
												: divisionsLoading
												? "Loading…"
												: "All Divisions"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Divisions
									</SelectItem>
									{divisions.map((division) => (
										<SelectItem
											key={division}
											value={division}
										>
											{division}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<DateRangeInputs
							fromDate={filters.fromDate}
							toDate={filters.toDate}
							onChange={onFiltersChange}
						/>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="sex-filter" className="text-[11px]">
								Sex
							</Label>
							<Select
								value={filters.sex}
								onValueChange={(value) =>
									onFiltersChange({ sex: value })
								}
							>
								<SelectTrigger
									id="sex-filter"
									className="h-8 text-xs"
								>
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{SEX_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="age-min" className="text-[11px]">
								Min age
							</Label>
							<Input
								id="age-min"
								type="number"
								inputMode="numeric"
								min={0}
								placeholder="0"
								value={filters.ageMin}
								onChange={(e) =>
									onFiltersChange({ ageMin: e.target.value })
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="age-max" className="text-[11px]">
								Max age
							</Label>
							<Input
								id="age-max"
								type="number"
								inputMode="numeric"
								min={0}
								placeholder="120"
								value={filters.ageMax}
								onChange={(e) =>
									onFiltersChange({ ageMax: e.target.value })
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="call-taker" className="text-[11px]">
								Call taker
							</Label>
							<Input
								id="call-taker"
								placeholder="Call taker name"
								value={filters.callTaker}
								onChange={(e) =>
									onFiltersChange({ callTaker: e.target.value })
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="assigned-to" className="text-[11px]">
								Assigned to
							</Label>
							<Input
								id="assigned-to"
								placeholder="Assigned user"
								value={filters.assignedTo}
								onChange={(e) =>
									onFiltersChange({ assignedTo: e.target.value })
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="verified-by" className="text-[11px]">
								Verified by
							</Label>
							<Input
								id="verified-by"
								placeholder="Verifying user"
								value={filters.verifiedBy}
								onChange={(e) =>
									onFiltersChange({ verifiedBy: e.target.value })
								}
								className="h-8 text-xs w-full"
							/>
						</div>

						<div className="min-w-0">
							<Button
								variant="outline"
								onClick={onClearFilters}
								className="h-8 w-full text-xs"
							>
								Clear
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
);

CallLogsFilters.displayName = "CallLogsFilters";
