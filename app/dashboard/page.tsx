"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Download, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AuthService,
	isDistrictScopedRole,
	isRegionScopedRole,
	type User,
} from "@/lib/auth";
import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import {
	ErrorAlert,
	StatsGrid,
	RecentActivityCard,
	DashboardRangePicker,
	DashboardDistrictPicker,
	DashboardRegionPicker,
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import type { AlertCounts } from "@/app/dashboard/types";
import { LAYOUT } from "@/constants/layout";
import { ChartSkeleton } from "@/components/ui/skeletons";

/** Loading placeholder mirroring the DashboardCharts grid. */
function DashboardChartsSkeleton(): React.JSX.Element {
	return (
		<div className="space-y-3">
			<ChartSkeleton height={90} bars={7} withLegend />
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				{[0, 1, 2, 3].map((i) => (
					<ChartSkeleton key={i} height={220} />
				))}
			</div>
		</div>
	);
}

const DashboardCharts = dynamic(
	() =>
		import("@/components/dashboard/dashboard-charts").then((m) => ({
			default: m.DashboardCharts,
		})),
	{
		ssr: false,
		loading: () => <DashboardChartsSkeleton />,
	}
);

const EMPTY_COUNTS: AlertCounts = {
	verified: 0,
	notVerified: 0,
	discarded: 0,
	alerts: 0,
	total: 0,
};

export default function DashboardPage(): React.JSX.Element {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);
	const [region, setRegion] = useState<string>("all");
	const [district, setDistrict] = useState<string>("all");
	const [response, setResponse] = useState<string>("all");
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district,
		region,
		response
	);
	const responseTypes = summary?.responseTypes ?? [];
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	// The overview KPI row and the charts grid are captured as separate PDF
	// sections so the export includes both the cards and every chart.
	const overviewRef = useRef<HTMLDivElement>(null);
	const chartsRef = useRef<HTMLDivElement>(null);

	// Current user (resolved after mount — localStorage is client-only). A
	// district-scoped user (e.g. District Biostat) only ever sees their district,
	// and a region-scoped user (REOC) only ever sees their region, so we surface
	// the assigned name and replace the (no-op) district picker with it.
	const [user, setUser] = useState<User | null>(null);
	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);
	const scopedToDistrict = isDistrictScopedRole(user);
	const assignedDistrict = user?.district?.trim();
	const scopedToRegion = isRegionScopedRole(user);
	const assignedRegion = user?.region?.trim();

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const isUnbounded =
		!range.from && !range.to && district === "all" && region === "all";

	const handleDownloadReport = useCallback(async () => {
		if (!overviewRef.current && !chartsRef.current) return;
		setIsDownloadingPdf(true);
		try {
			const sections: DashboardPdfSection[] = [];
			if (overviewRef.current) {
				sections.push({ container: overviewRef.current, heading: "Overview" });
			}
			if (chartsRef.current) {
				sections.push({
					container: chartsRef.current,
					splitCards: true,
					heading: "Trends & breakdowns",
				});
			}
			await downloadDashboardPdf(sections, {
				title: "Health Alert Dashboard",
				subtitle: isUnbounded
					? "All-time data"
					: "Data for the selected date range",
			});
		} catch (err) {
			console.error("Failed to export dashboard to PDF:", err);
			window.alert("Could not generate the PDF. Please try again.");
		} finally {
			setIsDownloadingPdf(false);
		}
	}, [isUnbounded]);

	// Every KPI card now comes from one server-side aggregate, scoped to the
	// selected range + district.
	const statCounts: AlertCounts = summary
		? {
				verified: summary.verified,
				notVerified: summary.notVerified,
				discarded: summary.discarded,
				alerts: summary.alerts,
				total: summary.total,
			}
		: EMPTY_COUNTS;

	return (
		<div className={LAYOUT.pageGap}>
			{/* Page-level filters — scope both the KPI cards and the charts. */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-base font-semibold text-gray-900">
						Overview
					</h2>
					<p className="text-xs text-muted-foreground">
						{scopedToDistrict && assignedDistrict
							? `Showing data for ${assignedDistrict} district only`
							: scopedToRegion && assignedRegion
								? `Showing data for ${assignedRegion} region only`
								: isUnbounded
									? "Showing all-time data"
									: "Showing data for the selected range"}
					</p>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={isRefreshing || loading}
						className="h-8 gap-2"
						aria-label="Refresh dashboard"
					>
						<RefreshCw
							className={`h-4 w-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
						/>
						<span className="hidden sm:inline">Refresh</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDownloadReport}
						disabled={!summary || isDownloadingPdf}
						className="h-8 gap-2"
						aria-label="Download dashboard report as PDF"
					>
						<Download className="h-4 w-4" />
						<span className="hidden sm:inline">
							{isDownloadingPdf ? "Preparing…" : "Download (PDF)"}
						</span>
					</Button>
					{scopedToDistrict ? (
						// District-scoped users can't change scope (enforced
						// server-side), so show their district instead of the picker.
						<div
							className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700"
							title="You can only see data for your assigned district"
						>
							<MapPin className="h-3.5 w-3.5 text-uganda-red" />
							<span>{assignedDistrict || "No district assigned"}</span>
						</div>
					) : scopedToRegion ? (
						// REOC users are locked to their region (enforced
						// server-side), so show the region instead of the picker.
						<div
							className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700"
							title="You can only see data for your assigned region"
						>
							<MapPin className="h-3.5 w-3.5 text-uganda-red" />
							<span>{assignedRegion || "No region assigned"}</span>
						</div>
					) : (
						<>
							<DashboardRegionPicker
								value={region}
								onChange={(value) => {
									// Region scopes the district list, so reset the
									// district whenever the region changes.
									setRegion(value);
									setDistrict("all");
								}}
								disabled={loading}
							/>
							<DashboardDistrictPicker
								value={district}
								onChange={setDistrict}
								disabled={loading}
								region={region}
							/>
						</>
					)}
					<DashboardRangePicker onChange={setRange} disabled={loading} />
					<Select
						value={response}
						onValueChange={setResponse}
						disabled={loading}
					>
						<SelectTrigger
							className="h-8 w-[160px] text-xs"
							aria-label="Filter by response type"
						>
							<SelectValue placeholder="All response types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All response types</SelectItem>
							{responseTypes.map((rt) => (
								<SelectItem key={rt} value={rt}>
									{rt}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<div ref={overviewRef}>
				<StatsGrid
					alertCounts={statCounts}
					kpiLoading={loading && !summary}
				/>
			</div>

			{/* Recent-activity triage snapshot — its own rolling/custom window,
			    independent of the page date range but scoped by district. */}
			<RecentActivityCard district={district} />

			<h2 className="text-base font-semibold text-gray-900">
				Trends &amp; breakdowns
			</h2>

			<div ref={chartsRef}>
				{loading && !summary ? (
					<DashboardChartsSkeleton />
				) : summary ? (
					<DashboardCharts summary={summary} />
				) : null}
			</div>
		</div>
	);
}
