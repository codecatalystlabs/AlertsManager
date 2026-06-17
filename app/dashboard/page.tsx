"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthService, isDistrictScopedRole, type User } from "@/lib/auth";
import { downloadChartsAsPdf } from "@/lib/charts-pdf";
import {
	WelcomeSection,
	ErrorAlert,
	StatsGrid,
	RecentActivityCard,
	DashboardRangePicker,
	DashboardDistrictPicker,
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
		<div className="space-y-6">
			<ChartSkeleton height={90} bars={7} withLegend />
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{[0, 1, 2, 3].map((i) => (
					<ChartSkeleton key={i} height={300} />
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
	const [district, setDistrict] = useState<string>("all");
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district
	);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	const chartsRef = useRef<HTMLDivElement>(null);

	// Current user (resolved after mount — localStorage is client-only). A
	// district-scoped user (e.g. District Biostat) only ever sees their district,
	// so we surface its name and replace the (no-op) district picker with it.
	const [user, setUser] = useState<User | null>(null);
	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);
	const scopedToDistrict = isDistrictScopedRole(user);
	const assignedDistrict = user?.district?.trim();

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const isUnbounded = !range.from && !range.to && district === "all";

	const handleDownloadCharts = useCallback(async () => {
		if (!chartsRef.current) return;
		setIsDownloadingPdf(true);
		try {
			await downloadChartsAsPdf(chartsRef.current, {
				title: "Health Alert Dashboard — Charts",
				subtitle: isUnbounded
					? "All-time data"
					: "Data for the selected date range",
			});
		} catch (err) {
			console.error("Failed to export charts to PDF:", err);
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
			<WelcomeSection
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing || loading}
			/>

			{/* Page-level filters — scope both the KPI cards and the charts. */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-base font-semibold text-gray-900">
						Overview
					</h2>
					<p className="text-xs text-muted-foreground">
						{scopedToDistrict && assignedDistrict
							? `Showing data for ${assignedDistrict} district only`
							: isUnbounded
								? "Showing all-time data"
								: "Showing data for the selected range"}
					</p>
				</div>
				<div className="flex flex-wrap items-end gap-2">
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
					) : (
						<DashboardDistrictPicker
							value={district}
							onChange={setDistrict}
							disabled={loading}
						/>
					)}
					<DashboardRangePicker onChange={setRange} disabled={loading} />
				</div>
			</div>

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<StatsGrid
				alertCounts={statCounts}
				kpiLoading={loading && !summary}
			/>

			{/* Recent-activity triage snapshot — its own rolling/custom window,
			    independent of the page date range but scoped by district. */}
			<RecentActivityCard district={district} />

			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-base font-semibold text-gray-900">
					Trends &amp; breakdowns
				</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={handleDownloadCharts}
					disabled={!summary || isDownloadingPdf}
					className="gap-2"
				>
					<Download className="h-4 w-4" />
					{isDownloadingPdf ? "Preparing PDF..." : "Download charts (PDF)"}
				</Button>
			</div>

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
