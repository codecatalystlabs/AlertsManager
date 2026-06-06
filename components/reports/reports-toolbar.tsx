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
import { LAYOUT } from "@/constants/layout";
import {
	todayIsoDate,
	type ReportsDateRange,
	type ReportOptions,
	type ReportScope,
} from "@/lib/fetch-reports";

interface ReportsToolbarProps {
	options: ReportOptions;
	dateRange: ReportsDateRange;
	chartScope: ReportScope;
	onDateRangeChange: (range: Partial<ReportsDateRange>) => void;
	onScopeChange: (scope: ReportScope) => void;
	onRefresh: () => void;
	isRefreshing?: boolean;
}

const today = todayIsoDate();

export const ReportsToolbar = memo<ReportsToolbarProps>(
	({
		options,
		dateRange,
		chartScope,
		onDateRangeChange,
		onScopeChange,
		onRefresh,
		isRefreshing,
	}) => (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0">
				<h1 className={LAYOUT.pageTitle}>Summaries / Reports</h1>
				<p className={LAYOUT.pageSubtitle}>
					Chart uses full range; daily table uses end date
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-1.5 shrink-0">
				<div className="flex items-center gap-1">
					<Label htmlFor="report-from" className="text-xs whitespace-nowrap">
						From
					</Label>
					<Input
						id="report-from"
						type="date"
						value={dateRange.fromDate}
						max={dateRange.toDate || today}
						onChange={(e) =>
							onDateRangeChange({ fromDate: e.target.value })
						}
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
				<Button
					variant="outline"
					size="sm"
					className="h-7 px-2 gap-1"
					onClick={onRefresh}
					disabled={isRefreshing}
				>
					<RefreshCw
						className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
					/>
					<span className="text-xs">Refresh</span>
				</Button>
			</div>
		</div>
	)
);

ReportsToolbar.displayName = "ReportsToolbar";
