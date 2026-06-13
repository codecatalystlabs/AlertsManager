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
	STATUS_FILTER_OPTIONS,
	SOURCE_FILTER_OPTIONS,
	VERIFICATION_FILTER_OPTIONS,
	SEX_FILTER_OPTIONS,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import { LAYOUT } from "@/constants/layout";
import { useDistrictOptions } from "@/hooks/use-district-options";
import { useRegionOptions } from "@/hooks/use-region-options";
import { useDivisionOptions } from "@/hooks/use-division-options";
import {
	DATE_RANGE_PRESETS,
	resolveDateRangePreset,
	matchActiveDateRangePreset,
} from "@/lib/date-range-presets";

interface CallLogsFiltersProps {
	filters: CallLogsFilterState;
	onFiltersChange: (filters: Partial<CallLogsFilterState>) => void;
	onClearFilters: () => void;
}

export const CallLogsFilters = memo<CallLogsFiltersProps>(
	({ filters, onFiltersChange, onClearFilters }) => {
		const { regions, regionOptions, loading: regionsLoading } =
			useRegionOptions(filters.region === "all" ? "" : filters.region);

		// Resolve the selected region name → id so the District list can be
		// scoped to it (Region → District cascade), from the admin-units API.
		const selectedRegionId =
			filters.region !== "all"
				? regionOptions.find((r) => r.name === filters.region)?.id
				: undefined;

		const { districts, loading: districtsLoading } = useDistrictOptions(
			filters.district === "all" ? "" : filters.district,
			selectedRegionId
		);
		const {
			divisions,
			loading: divisionsLoading,
			enabled: divisionsEnabled,
		} = useDivisionOptions(
			filters.district === "all" ? "" : filters.district
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
									{SOURCE_FILTER_OPTIONS.map((option) => (
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

						<div className="space-y-1 min-w-0">
							<Label htmlFor="from-date" className="text-[11px]">
								From date
							</Label>
							<Input
								id="from-date"
								type="date"
								max={filters.toDate || undefined}
								value={filters.fromDate}
								onChange={(e) =>
									onFiltersChange({
										fromDate: e.target.value,
									})
								}
								className="h-8 text-xs w-full"
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
								value={filters.toDate}
								onChange={(e) =>
									onFiltersChange({
										toDate: e.target.value,
									})
								}
								className="h-8 text-xs w-full"
							/>
						</div>

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
