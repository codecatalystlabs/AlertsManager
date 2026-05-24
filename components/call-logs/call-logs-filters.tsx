import React, { memo } from "react";
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

interface CallLogsFiltersProps {
	filters: CallLogsFilterState;
	onFiltersChange: (filters: Partial<CallLogsFilterState>) => void;
	onClearFilters: () => void;
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

const inputCls =
	"h-9 text-xs bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";

export const CallLogsFilters = memo<CallLogsFiltersProps>(
	({ filters, onFiltersChange, onClearFilters }) => {
		return (
			<section className="animate-reveal [animation-delay:150ms] editorial-card p-5">
				<div className="flex items-center justify-between mb-4 pb-4 border-b border-foreground/[0.08]">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Filters
					</p>
					<button
						type="button"
						onClick={onClearFilters}
						className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-accent-red transition-colors"
					>
						Clear all
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
					<div className="space-y-2">
						<FilterLabel htmlFor="search">Search</FilterLabel>
						<Input
							id="search"
							placeholder="Reporter, contact, district…"
							value={filters.search}
							onChange={(e) =>
								onFiltersChange({ search: e.target.value })
							}
							className={inputCls}
						/>
					</div>

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

					<div>
						<Button
							variant="ghost"
							onClick={onClearFilters}
							className="h-9 w-full text-xs mono uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm border border-foreground/10"
						>
							Reset filters
						</Button>
					</div>
				</div>
			</section>
		);
	}
);

CallLogsFilters.displayName = "CallLogsFilters";
