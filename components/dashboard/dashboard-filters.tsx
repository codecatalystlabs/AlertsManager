"use client";

import React, { memo, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { DashboardFilters as DashboardFilterState } from "@/hooks/use-dashboard-data";
import { alertResponse } from "@/constants";

interface DashboardFiltersProps {
	filters: DashboardFilterState;
	onChange: (patch: Partial<DashboardFilterState>) => void;
	onReset: () => void;
	hasActiveFilters: boolean;
	uniqueResponses: { code: string; count: number }[];
	uniqueDistricts: string[];
	filteredCount: number;
	totalCount: number;
}

const inputCls =
	"h-9 text-xs mono bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const triggerCls =
	"h-9 text-xs bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus:ring-0 focus:ring-offset-0";

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

export const DashboardFilters = memo<DashboardFiltersProps>(
	({
		filters,
		onChange,
		onReset,
		hasActiveFilters,
		uniqueResponses,
		uniqueDistricts,
		filteredCount,
		totalCount,
	}) => {
		// Always show the official catalogue plus any extras present in the
		// data — keeps the dropdown editorial (alphabetised, full names) but
		// never hides a code the backend actually returned.
		const responseOptions = useMemo(() => {
			const catalogue = new Map(
				alertResponse.map((r) => [r.code, r.name])
			);
			const present = new Set(uniqueResponses.map((r) => r.code));
			return [
				...uniqueResponses
					.filter((r) => catalogue.has(r.code))
					.map((r) => ({
						code: r.code,
						name: catalogue.get(r.code) ?? r.code,
						count: r.count,
					})),
				...uniqueResponses
					.filter((r) => !catalogue.has(r.code))
					.map((r) => ({ code: r.code, name: r.code, count: r.count })),
				...alertResponse
					.filter((r) => !present.has(r.code))
					.map((r) => ({ code: r.code, name: r.name, count: 0 })),
			];
		}, [uniqueResponses]);

		return (
			<section className="animate-reveal [animation-delay:150ms] editorial-card p-5">
				<div className="flex items-center justify-between mb-4 pb-4 border-b border-foreground/[0.08] gap-3">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Filters
					</p>
					<div className="flex items-center gap-3">
						<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
							{filteredCount.toLocaleString()} /{" "}
							{totalCount.toLocaleString()} records
						</p>
						{hasActiveFilters && (
							<button
								type="button"
								onClick={onReset}
								className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-accent-red transition-colors"
							>
								Clear all
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
					<div className="space-y-2">
						<FilterLabel htmlFor="dash-from">From</FilterLabel>
						<Input
							id="dash-from"
							type="date"
							value={filters.fromDate}
							max={filters.toDate || undefined}
							onChange={(e) =>
								onChange({ fromDate: e.target.value })
							}
							className={inputCls}
						/>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="dash-to">To</FilterLabel>
						<Input
							id="dash-to"
							type="date"
							value={filters.toDate}
							min={filters.fromDate || undefined}
							onChange={(e) =>
								onChange({ toDate: e.target.value })
							}
							className={inputCls}
						/>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="dash-response">
							Response · Disease
						</FilterLabel>
						<Select
							value={filters.response}
							onValueChange={(value) =>
								onChange({ response: value })
							}
						>
							<SelectTrigger
								id="dash-response"
								className={triggerCls}
							>
								<SelectValue placeholder="All responses" />
							</SelectTrigger>
							<SelectContent className="max-h-72">
								<SelectItem value="all">All responses</SelectItem>
								{responseOptions.map((opt) => (
									<SelectItem
										key={opt.code}
										value={opt.code}
									>
										<span className="flex items-center justify-between gap-3 w-full">
											<span>{opt.name}</span>
											{opt.count > 0 && (
												<span className="mono text-[10px] text-muted-foreground tabular-nums">
													{opt.count}
												</span>
											)}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="dash-district">District</FilterLabel>
						<Select
							value={filters.district}
							onValueChange={(value) =>
								onChange({ district: value })
							}
						>
							<SelectTrigger
								id="dash-district"
								className={triggerCls}
							>
								<SelectValue placeholder="All districts" />
							</SelectTrigger>
							<SelectContent className="max-h-72">
								<SelectItem value="all">All districts</SelectItem>
								{uniqueDistricts.map((d) => (
									<SelectItem key={d} value={d}>
										{d}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<FilterLabel htmlFor="dash-verification">
							Verification
						</FilterLabel>
						<Select
							value={filters.verification}
							onValueChange={(value) =>
								onChange({
									verification:
										value as DashboardFilterState["verification"],
								})
							}
						>
							<SelectTrigger
								id="dash-verification"
								className={triggerCls}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="verified">Verified</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>
		);
	}
);

DashboardFilters.displayName = "DashboardFilters";
