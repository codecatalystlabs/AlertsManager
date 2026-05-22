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
				<CardContent className="p-3">
					<div className={LAYOUT.filtersGrid}>
						<div className="space-y-1 min-w-0">
							<Label htmlFor="search" className="text-[11px]">
								Search
							</Label>
							<Input
								id="search"
								placeholder="Reporter, contact, district…"
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
