import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { STATUS_OPTIONS } from "@/constants/alerts";

interface AlertsFiltersProps {
	filters: {
		status: string;
		district: string;
		source: string;
		date: string;
	};
	onFiltersChange: (filters: Partial<typeof filters>) => void;
	uniqueDistricts: string[];
	uniqueSources: string[];
}

export const AlertsFilters = memo<AlertsFiltersProps>(
	({ filters, onFiltersChange, uniqueDistricts, uniqueSources }) => {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5 text-uganda-red" />
						Advanced Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="status-filter">
								Filter by Status
							</Label>
							<Select
								value={filters.status}
								onValueChange={(value) =>
									onFiltersChange({ status: value })
								}
							>
								<SelectTrigger id="status-filter">
									<SelectValue placeholder="All Statuses" />
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

						<div className="space-y-2">
							<Label htmlFor="district-filter">
								Filter by District
							</Label>
							<Select
								value={filters.district}
								onValueChange={(value) =>
									onFiltersChange({
										district: value,
									})
								}
							>
								<SelectTrigger id="district-filter">
									<SelectValue placeholder="All Districts" />
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

						<div className="space-y-2">
							<Label htmlFor="source-filter">
								Filter by Source
							</Label>
							<Select
								value={filters.source}
								onValueChange={(value) =>
									onFiltersChange({ source: value })
								}
							>
								<SelectTrigger id="source-filter">
									<SelectValue placeholder="All Sources" />
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

						<div className="space-y-2">
							<Label htmlFor="date-filter">
								Filter by Date
							</Label>
							<Input
								id="date-filter"
								type="date"
								value={filters.date}
								onChange={(e) =>
									onFiltersChange({
										date: e.target.value,
									})
								}
								className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
);

AlertsFilters.displayName = "AlertsFilters";
