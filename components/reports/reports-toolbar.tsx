"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import {
	todayIsoDate,
	type ReportsDateRange,
	type ReportOptions,
	type ReportScope,
} from "@/lib/fetch-reports";

const today = todayIsoDate();

const FILTER_BAR =
	"flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-2";

function RefreshButton({
	onRefresh,
	isRefreshing,
}: {
	onRefresh: () => void;
	isRefreshing?: boolean;
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			className="h-7 px-2 gap-1"
			onClick={onRefresh}
			disabled={isRefreshing}
		>
			<RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
			<span className="text-xs">Refresh</span>
		</Button>
	);
}

interface ReportsChartFiltersProps {
	options: ReportOptions;
	dateRange: ReportsDateRange;
	chartScope: ReportScope;
	onDateRangeChange: (range: Partial<ReportsDateRange>) => void;
	onScopeChange: (scope: ReportScope) => void;
	onRefresh: () => void;
	isRefreshing?: boolean;
}

/** Date-range + scope filter — drives the timeseries chart. */
export const ReportsChartFilters = memo<ReportsChartFiltersProps>(
	({
		options,
		dateRange,
		chartScope,
		onDateRangeChange,
		onScopeChange,
		onRefresh,
		isRefreshing,
	}) => (
		<div className={FILTER_BAR}>
			<div className="flex items-center gap-1">
				<Label htmlFor="report-from" className="text-xs whitespace-nowrap">
					From
				</Label>
				<Input
					id="report-from"
					type="date"
					value={dateRange.fromDate}
					max={dateRange.toDate || today}
					onChange={(e) => onDateRangeChange({ fromDate: e.target.value })}
					className="h-7 w-[7.5rem] px-2 text-xs"
				/>
			</div>
			<div className="flex items-center gap-1">
				<Label htmlFor="report-to" className="text-xs whitespace-nowrap">
					To
				</Label>
				<Input
					id="report-to"
					type="date"
					value={dateRange.toDate}
					min={dateRange.fromDate}
					max={today}
					onChange={(e) => onDateRangeChange({ toDate: e.target.value })}
					className="h-7 w-[7.5rem] px-2 text-xs"
				/>
			</div>
			<div className="flex items-center gap-1">
				<Label htmlFor="chart-scope" className="text-xs whitespace-nowrap">
					Chart
				</Label>
				<Select
					value={chartScope}
					onValueChange={(v) => onScopeChange(v as ReportScope)}
				>
					<SelectTrigger
						id="chart-scope"
						className="h-7 w-[6.5rem] px-2 text-xs"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{options.scopes.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
		</div>
	)
);

ReportsChartFilters.displayName = "ReportsChartFilters";

interface ReportsDateFilterProps {
	/** Field label, e.g. "As of" (cumulative) or "Date" (daily). */
	label: string;
	inputId: string;
	date: string;
	onDateChange: (date: string) => void;
	onRefresh: () => void;
	isRefreshing?: boolean;
}

/** Single "as of" date filter — drives the cumulative / daily matrix tables. */
export const ReportsDateFilter = memo<ReportsDateFilterProps>(
	({ label, inputId, date, onDateChange, onRefresh, isRefreshing }) => (
		<div className={FILTER_BAR}>
			<div className="flex items-center gap-1">
				<Label htmlFor={inputId} className="text-xs whitespace-nowrap">
					{label}
				</Label>
				<Input
					id={inputId}
					type="date"
					value={date}
					max={today}
					onChange={(e) => onDateChange(e.target.value)}
					className="h-7 w-[7.5rem] px-2 text-xs"
				/>
			</div>
			<RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
		</div>
	)
);

ReportsDateFilter.displayName = "ReportsDateFilter";
