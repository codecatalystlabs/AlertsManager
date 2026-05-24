import React, { memo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	STATUS_OPTIONS,
	VERIFICATION_FILTER_OPTIONS,
} from "@/constants/alerts";

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

function FilterLabel({
	htmlFor,
	children,
}: {
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<Label
			htmlFor={htmlFor}
			className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
		>
			{children}
		</Label>
	);
}

const triggerCls =
	"h-9 text-xs bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus:ring-0 focus:ring-offset-0";

export const AlertsFilters = memo<AlertsFiltersProps>(
	({ filters, onFiltersChange, uniqueDistricts, uniqueSources }) => {
		return (
			<section className="animate-reveal [animation-delay:150ms] editorial-card p-5">
				<div className="flex items-center justify-between mb-4 pb-4 border-b border-foreground/[0.08]">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Filters
					</p>
					<p className="mono text-[10px] uppercase tracking-tight text-muted-foreground">
						Narrow the register
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
					<div className="space-y-2">
						<FilterLabel htmlFor="status-filter">Status</FilterLabel>
						<Select
							value={filters.status}
							onValueChange={(value) =>
								onFiltersChange({ status: value })
							}
						>
							<SelectTrigger id="status-filter" className={triggerCls}>
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

					<div className="space-y-2">
						<FilterLabel htmlFor="district-filter">District</FilterLabel>
						<Select
							value={filters.district}
							onValueChange={(value) =>
								onFiltersChange({ district: value })
							}
						>
							<SelectTrigger
								id="district-filter"
								className={triggerCls}
							>
								<SelectValue placeholder="All" />
							</SelectTrigger>
							<SelectContent className="max-h-64">
								<SelectItem value="all">All Districts</SelectItem>
								{uniqueDistricts.map((district) => (
									<SelectItem key={district} value={district}>
										{district}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="source-filter">Source</FilterLabel>
						<Select
							value={filters.source}
							onValueChange={(value) =>
								onFiltersChange({ source: value })
							}
						>
							<SelectTrigger id="source-filter" className={triggerCls}>
								<SelectValue placeholder="All" />
							</SelectTrigger>
							<SelectContent className="max-h-64">
								<SelectItem value="all">All Sources</SelectItem>
								{uniqueSources.map((source) => (
									<SelectItem key={source} value={source}>
										{source}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="verification-filter">
							Verification
						</FilterLabel>
						<Select
							value={filters.verification}
							onValueChange={(value) =>
								onFiltersChange({ verification: value })
							}
						>
							<SelectTrigger
								id="verification-filter"
								className={triggerCls}
							>
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

					<div className="space-y-2">
						<FilterLabel htmlFor="date-filter">Date</FilterLabel>
						<Input
							id="date-filter"
							type="date"
							max="2100-12-31"
							value={filters.date}
							onChange={(e) =>
								onFiltersChange({ date: e.target.value })
							}
							className="h-9 text-xs mono bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
						/>
					</div>
				</div>
			</section>
		);
	}
);

AlertsFilters.displayName = "AlertsFilters";
