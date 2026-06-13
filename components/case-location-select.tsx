"use client";

import useSWR from "swr";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	fetchRegions,
	fetchDistrictsByRegion,
	fetchSubcountiesByDistrict,
	type AdminUnitOption,
} from "@/lib/fetch-admin-units";

export interface CaseLocationValue {
	/** Region name (stored on the alert as `region`). */
	region: string;
	/** District name (stored as `alertCaseDistrict`). */
	district: string;
	/** Subcounty/division name (stored as `subCounty`/`alertCaseSubCounty`). */
	subcounty: string;
}

export interface CaseLocationSelectProps {
	value: CaseLocationValue;
	onChange: (value: CaseLocationValue) => void;
	disabled?: boolean;
	triggerClassName?: string;
	labelClassName?: string;
	idPrefix?: string;
}

/**
 * Cascading Region → District → Division/Subcounty picker. Every option is
 * loaded from the backend admin-units API (no hardcoded lists): regions up
 * front, districts for the chosen region, subcounties for the chosen district.
 * All three are required. The component is fully controlled by `value` (names);
 * the IDs needed to fetch each level are derived from the loaded option lists,
 * so clearing `value` (e.g. on form reset) automatically resets the cascade.
 */
export function CaseLocationSelect({
	value,
	onChange,
	disabled,
	triggerClassName,
	labelClassName = "text-sm font-medium text-gray-700",
	idPrefix = "case-location",
}: CaseLocationSelectProps) {
	const {
		data: regions = [],
		isLoading: regionsLoading,
		error: regionsError,
	} = useSWR("admin-regions", fetchRegions);

	const regionId = regions.find((r) => r.name === value.region)?.id;

	const {
		data: districts = [],
		isLoading: districtsLoading,
		error: districtsError,
	} = useSWR(
		regionId ? ["admin-districts", regionId] : null,
		() => fetchDistrictsByRegion(regionId as number)
	);

	const districtId = districts.find((d) => d.name === value.district)?.id;

	const {
		data: subcounties = [],
		isLoading: subcountiesLoading,
		error: subcountiesError,
	} = useSWR(
		districtId ? ["admin-subcounties", districtId] : null,
		() => fetchSubcountiesByDistrict(districtId as number)
	);

	const errorMessage = (err: unknown) =>
		err ? (err instanceof Error ? err.message : "Failed to load options") : null;

	// Keep a pre-existing value selectable even when it isn't in the loaded list
	// (e.g. editing a legacy alert whose district/subcounty predates this API, or
	// whose region isn't set yet so the child lists haven't loaded). This never
	// adds anything in the add flow, where values are always picked from the list.
	const withCurrent = (options: AdminUnitOption[], current: string) => {
		const merged = options.map((o) => ({ key: String(o.id), name: o.name }));
		if (current && !options.some((o) => o.name === current)) {
			merged.unshift({ key: `current:${current}`, name: current });
		}
		return merged;
	};

	const regionOptions = withCurrent(regions, value.region);
	const districtOptions = withCurrent(districts, value.district);
	const subcountyOptions = withCurrent(subcounties, value.subcounty);

	return (
		<>
			{/* Region */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-region`} className={labelClassName}>
					Region *
				</Label>
				<Select
					value={value.region || undefined}
					onValueChange={(region) =>
						// Region change invalidates the district and subcounty below it.
						onChange({ region, district: "", subcounty: "" })
					}
					disabled={disabled || regionsLoading}
				>
					<SelectTrigger
						id={`${idPrefix}-region`}
						className={triggerClassName}
					>
						<SelectValue
							placeholder={
								regionsLoading ? "Loading regions..." : "Select region"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{regionOptions.map((region) => (
							<SelectItem key={region.key} value={region.name}>
								{region.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errorMessage(regionsError) ? (
					<p className="text-xs text-destructive">
						{errorMessage(regionsError)}
					</p>
				) : null}
			</div>

			{/* District */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-district`} className={labelClassName}>
					District *
				</Label>
				<Select
					value={value.district || undefined}
					onValueChange={(district) =>
						// District change invalidates the subcounty below it.
						onChange({ ...value, district, subcounty: "" })
					}
					disabled={disabled || !value.region || districtsLoading}
				>
					<SelectTrigger
						id={`${idPrefix}-district`}
						className={triggerClassName}
					>
						<SelectValue
							placeholder={
								!value.region
									? "Select a region first"
									: districtsLoading
										? "Loading districts..."
										: "Select district"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{districtOptions.map((district) => (
							<SelectItem key={district.key} value={district.name}>
								{district.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errorMessage(districtsError) ? (
					<p className="text-xs text-destructive">
						{errorMessage(districtsError)}
					</p>
				) : null}
			</div>

			{/* Division / Subcounty */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-subcounty`} className={labelClassName}>
					Division/Subcounty *
				</Label>
				<Select
					value={value.subcounty || undefined}
					onValueChange={(subcounty) => onChange({ ...value, subcounty })}
					disabled={disabled || !value.district || subcountiesLoading}
				>
					<SelectTrigger
						id={`${idPrefix}-subcounty`}
						className={triggerClassName}
					>
						<SelectValue
							placeholder={
								!value.district
									? "Select a district first"
									: subcountiesLoading
										? "Loading divisions..."
										: "Select division/subcounty"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{subcountyOptions.map((subcounty) => (
							<SelectItem key={subcounty.key} value={subcounty.name}>
								{subcounty.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errorMessage(subcountiesError) ? (
					<p className="text-xs text-destructive">
						{errorMessage(subcountiesError)}
					</p>
				) : null}
			</div>
		</>
	);
}
