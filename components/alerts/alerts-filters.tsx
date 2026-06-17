"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS, VERIFICATION_FILTER_OPTIONS } from "@/constants/alerts";
import { LAYOUT } from "@/constants/layout";
import { useRegionOptions } from "@/hooks/use-region-options";
import { useDistrictOptions } from "@/hooks/use-district-options";
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";

export interface AlertsFilterState {
	status: string;
	region: string;
	district: string;
	source: string;
	date: string;
	verification: string;
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

		return (
			<Card className={LAYOUT.card}>
				<CardContent className="p-3">
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
								<SelectTrigger id="verification-filter" className="h-8 text-xs">
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
							<Label htmlFor="date-filter" className="text-[11px]">
								Date
							</Label>
							<Input
								id="date-filter"
								type="date"
								max="2100-12-31"
								value={filters.date}
								onChange={(e) =>
									onFiltersChange({
										date: e.target.value,
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
