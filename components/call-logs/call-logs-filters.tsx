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
	VERIFICATION_FILTER_OPTIONS,
	type CallLogsFilterState,
} from "@/constants/call-logs";
import { LAYOUT } from "@/constants/layout";

interface CallLogsFiltersProps {
	filters: CallLogsFilterState;
	onFiltersChange: (filters: Partial<CallLogsFilterState>) => void;
	onClearFilters: () => void;
}

export const CallLogsFilters = memo<CallLogsFiltersProps>(
	({ filters, onFiltersChange, onClearFilters }) => {
		return (
			<Card className={LAYOUT.card}>
				<CardHeader className={LAYOUT.cardHeader}>
					<CardTitle className={`${LAYOUT.cardTitle} flex items-center gap-1.5`}>
						<Filter className="h-4 w-4" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent className={LAYOUT.cardContent}>
					<div className={LAYOUT.filtersGrid}>
						<div className="space-y-1">
							<Label htmlFor="search" className="text-xs">Search</Label>
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
							<Label htmlFor="verification-filter">Verification</Label>
							<Select
								value={filters.verification}
								onValueChange={(value) =>
									onFiltersChange({ verification: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Filter by verification" />
								</SelectTrigger>
								<SelectContent>
									{VERIFICATION_FILTER_OPTIONS.map(
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
