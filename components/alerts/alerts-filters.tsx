"use client";

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
import { STATUS_OPTIONS } from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";
import { useRegionOptions } from "@/hooks/use-region-options";
import { useDistrictOptions } from "@/hooks/use-district-options";
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";
import { SLA_FILTER_OPTIONS, SLA_DOT_CLASS } from "@/lib/alert-sla";
import {
	DATE_RANGE_PRESETS,
	resolveDateRangePreset,
	matchActiveDateRangePreset,
} from "@/lib/date-range-presets";

export interface AlertsFilterState {
	status: string;
	region: string;
	district: string;
	source: string;
	fromDate: string;
	toDate: string;
	/** SLA colour: "all" | "green" | "yellow" | "red". See lib/alert-sla.ts. */
	sla: string;
}

interface AlertsFiltersProps {
	filters: AlertsFilterState;
	onFiltersChange: (filters: Partial<AlertsFilterState>) => void;
}

export const AlertsFilters = memo<AlertsFiltersProps>(
	({ filters, onFiltersChange }) => {
		// Region/District come from the official admin-units hierarchy
		// (GET /admin-units/...). District is scoped to the selected region by
		// resolving its id (Region → District cascade).
		const { regions, regionOptions } = useRegionOptions(
			filters.region === "all" ? "" : filters.region
		);
		const selectedRegionId =
			filters.region && filters.region !== "all"
				? regionOptions.find((r) => r.name === filters.region)?.id
				: undefined;
		const { districts: uniqueDistricts } = useDistrictOptions(
			filters.district === "all" ? "" : filters.district,
			selectedRegionId
		);

		const activePreset = matchActiveDateRangePreset(
			filters.fromDate,
			filters.toDate
		);

		return (
			<Card className={LAYOUT.card}>
				<CardContent className="p-3 space-y-3">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground mr-1">
							Quick range:
						</span>
						{DATE_RANGE_PRESETS.map((preset) => (
							<Button
								key={preset.key}
								type="button"
								variant={
									activePreset === preset.key
										? "default"
										: "outline"
								}
								onClick={() => {
									const range = resolveDateRangePreset(
										preset.key
									);
									onFiltersChange({
										fromDate: range.fromDate,
										toDate: range.toDate,
									});
								}}
								className="h-7 px-2 text-[11px]"
							>
								{preset.label}
							</Button>
						))}
						{(filters.fromDate || filters.toDate) && (
							<Button
								type="button"
								variant="ghost"
								onClick={() =>
									onFiltersChange({
										fromDate: "",
										toDate: "",
									})
								}
								className="h-7 px-2 text-[11px]"
							>
								Clear dates
							</Button>
						)}
					</div>

					<div className={LAYOUT.filtersGrid}>
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
									{SOURCE_OF_ALERT_OPTIONS.map((source) => (
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
						 * Signals still awaiting a decision live in Call Logs.
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

						<div className="space-y-1 min-w-0">
							<Label htmlFor="from-date" className="text-[11px]">
								From date
							</Label>
							<Input
								id="from-date"
								type="date"
								max={filters.toDate || "2100-12-31"}
								value={filters.fromDate}
								onChange={(e) =>
									onFiltersChange({
										fromDate: e.target.value,
									})
								}
								className="h-8 text-xs border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<Label htmlFor="to-date" className="text-[11px]">
								To date
							</Label>
							<Input
								id="to-date"
								type="date"
								min={filters.fromDate || undefined}
								max="2100-12-31"
								value={filters.toDate}
								onChange={(e) =>
									onFiltersChange({
										toDate: e.target.value,
									})
								}
								className="h-8 text-xs border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
);

AlertsFilters.displayName = "AlertsFilters";
