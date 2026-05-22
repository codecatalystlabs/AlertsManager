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

export interface AlertsFilterState {
	status: string;
	district: string;
	source: string;
	date: string;
	verification: string;
}

interface AlertsFiltersProps {
	filters: AlertsFilterState;
	onFiltersChange: (filters: Partial<AlertsFilterState>) => void;
	uniqueDistricts: string[];
	uniqueSources: string[];
}

export const AlertsFilters = memo<AlertsFiltersProps>(
	({ filters, onFiltersChange, uniqueDistricts, uniqueSources }) => {
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
									{uniqueSources.map((source) => (
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
