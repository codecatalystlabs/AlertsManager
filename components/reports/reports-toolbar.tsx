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

const inputCls =
	"h-9 text-xs mono bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const selectCls =
	"h-9 text-xs bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus:ring-0 focus:ring-offset-0";

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
		<header className="animate-reveal">
			<div className="flex items-center gap-3 mb-5">
				<span className="h-1 w-8 bg-accent-red rounded-full" />
				<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
					Intelligence · Briefing
				</span>
			</div>
			<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
				<div className="max-w-2xl">
					<h1 className="serif text-4xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
						Summaries &amp;{" "}
						<em className="italic text-accent-red">reports</em>
					</h1>
					<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
						Chart uses the full date range; the daily table uses the end
						date.
					</p>
				</div>

				<div className="flex flex-wrap items-end gap-3 shrink-0">
					<div className="space-y-1.5">
						<Label
							htmlFor="report-from"
							className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
						>
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
							className={`${inputCls} w-[8rem]`}
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="report-to"
							className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
						>
							To
						</Label>
						<Input
							id="report-to"
							type="date"
							value={dateRange.toDate}
							min={dateRange.fromDate}
							max={today}
							onChange={(e) =>
								onDateRangeChange({ toDate: e.target.value })
							}
							className={`${inputCls} w-[8rem]`}
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="chart-scope"
							className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
						>
							Chart
						</Label>
						<Select
							value={chartScope}
							onValueChange={(v) => onScopeChange(v as ReportScope)}
						>
							<SelectTrigger
								id="chart-scope"
								className={`${selectCls} w-[7rem]`}
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
						onClick={onRefresh}
						disabled={isRefreshing}
						className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-9"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${
								isRefreshing ? "animate-spin" : ""
							}`}
							strokeWidth={1.75}
						/>
						<span className="mono uppercase tracking-widest font-bold">
							{isRefreshing ? "Refreshing" : "Refresh"}
						</span>
					</Button>
				</div>
			</div>
		</header>
	)
);

ReportsToolbar.displayName = "ReportsToolbar";
