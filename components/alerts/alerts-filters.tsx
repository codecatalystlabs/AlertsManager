"use client";

import React, { memo, useMemo, useState } from "react";
import { ChevronUp, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";
import { useLocationCascade } from "@/hooks/use-location-cascade";
import { useSourceOfAlertOptions } from "@/hooks/use-lookup-options";
import { SLA_FILTER_OPTIONS, SLA_DOT_CLASS } from "@/lib/alert-sla";
import {
	DateRangePresetBar,
	DateRangeInputs,
} from "@/components/filters/date-range-filter";

export interface AlertsFilterState {
	status: string;
	region: string;
	district: string;
	source: string;
	fromDate: string;
	toDate: string;
	/** SLA colour: "all" | "green" | "orange" | "red". See lib/alert-sla.ts. */
	sla: string;
}

interface AlertsFiltersProps {
	filters: AlertsFilterState;
	onFiltersChange: (filters: Partial<AlertsFilterState>) => void;
}

/** The filter grid the toggle shows/hides — referenced by aria-controls. */
const FILTER_GRID_ID = "alerts-filter-grid";

/**
 * Fields counted by the badge while the grid is collapsed. The dates are
 * excluded: the quick-range bar stays visible above the toggle and already
 * reports them, through the active preset or the "Clear dates" button.
 */
const HIDDEN_FILTER_KEYS: readonly (keyof AlertsFilterState)[] = [
	"status",
	"region",
	"district",
	"source",
	"sla",
];

/**
 * How many filters are set but out of sight, so collapsing the grid can never
 * narrow the list without saying so.
 *
 * "Unset" is tested against both "" and "all" rather than against a defaults
 * object: the hook seeds these as "" while the Selects write back "all", so a
 * field cleared by hand does not read as active.
 */
function countHiddenFilters(filters: AlertsFilterState): number {
	return HIDDEN_FILTER_KEYS.filter((key) => {
		const value = filters[key];
		return value !== "" && value !== "all";
	}).length;
}

export const AlertsFilters = memo<AlertsFiltersProps>(
	({ filters, onFiltersChange }) => {
		// Admin-managed list (Administration -> Dropdown Options).
		const sourceOptions = useSourceOfAlertOptions();
		// Region → District cascade (district scoped to the selected region),
		// from the official admin-units hierarchy.
		const { regions, districts: uniqueDistricts } = useLocationCascade({
			region: filters.region,
			district: filters.district,
		});

		// Collapsed by default, matching the Signal Register: most visits here are
		// to read the list, not to re-filter it. The quick-range bar and the
		// "N active" badge stay visible, so nothing narrows the list silently.
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
					    unmounting: the grid stays in the DOM (so the region /
					    district cascade does not remount and refetch) but
					    display:none keeps it out of the tab order while hidden. */}
					<div
						id={FILTER_GRID_ID}
						className={showFilters ? LAYOUT.filtersGrid : "hidden"}
					>
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
								<SelectTrigger id="status-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((option) => (
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
								value={filters.region || "all"}
								onValueChange={(value) =>
									// Region scopes the district list, so clear a
									// now-out-of-scope district selection.
									onFiltersChange({
										region: value,
										district: "all",
									})
								}
							>
								<SelectTrigger id="region-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
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
									onFiltersChange({
										district: value,
									})
								}
							>
								<SelectTrigger id="district-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Districts
									</SelectItem>
									{uniqueDistricts.map(
										(district) => (
											<SelectItem
												key={district}
												value={district}
											>
												{district}
											</SelectItem>
										)
									)}
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
								<SelectTrigger id="source-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Sources
									</SelectItem>
									{sourceOptions.map((source) => (
										<SelectItem
											key={source}
											value={source}
										>
											{source}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/*
						 * No Verification filter here: View Alerts is hard-locked to
						 * verified signals (a recorded verification outcome), so the
						 * control would either be a no-op or contradict the page.
						 * Signals still awaiting a decision live in Signal Logs.
						 */}

						<div className="space-y-1 min-w-0">
							<Label htmlFor="sla-filter" className="text-[11px]">
								Time in system
							</Label>
							<Select
								value={filters.sla || "all"}
								onValueChange={(value) =>
									onFiltersChange({ sla: value })
								}
							>
								<SelectTrigger id="sla-filter" className="h-8 text-xs">
									<SelectValue placeholder="All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									{SLA_FILTER_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											<span className="flex items-center gap-2">
												<span
													aria-hidden
													className={`h-2 w-2 shrink-0 rounded-full ${SLA_DOT_CLASS[option.value]}`}
												/>
												{option.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<DateRangeInputs
							fromDate={filters.fromDate}
							toDate={filters.toDate}
							onChange={onFiltersChange}
							maxDate="2100-12-31"
							inputClassName="h-8 text-xs border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
						/>
					</div>
				</CardContent>
			</Card>
		);
	}
);

AlertsFilters.displayName = "AlertsFilters";
