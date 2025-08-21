import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Filter } from "lucide-react";
import {
	STATUS_FILTER_OPTIONS,
	SOURCE_FILTER_OPTIONS,
} from "@/constants/call-logs";

interface CallLogsFiltersProps {
	filters: {
		status: string;
		source: string;
		search: string;
	};
	onFiltersChange: (filters: Partial<typeof filters>) => void;
	onClearFilters: () => void;
}

export const CallLogsFilters = memo<CallLogsFiltersProps>(
	({ filters, onFiltersChange, onClearFilters }) => {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters & Search
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="search">Search</Label>
							<Input
								id="search"
								placeholder="Search by reporter, contact, district..."
								value={filters.search}
								onChange={(e) =>
									onFiltersChange({
										search: e.target.value,
									})
								}
								className="w-full"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="status-filter">Status</Label>
							<Select
								value={filters.status}
								onValueChange={(value) =>
									onFiltersChange({ status: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_FILTER_OPTIONS.map(
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

						<div className="space-y-2">
							<Label htmlFor="source-filter">Source</Label>
							<Select
								value={filters.source}
								onValueChange={(value) =>
									onFiltersChange({ source: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Filter by source" />
								</SelectTrigger>
								<SelectContent>
									{SOURCE_FILTER_OPTIONS.map(
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

						<div className="flex items-end">
							<Button
								variant="outline"
								onClick={onClearFilters}
								className="w-full"
							>
								Clear Filters
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
);

CallLogsFilters.displayName = "CallLogsFilters";
