"use client";

import React, { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import { toLocalISODate } from "@/lib/date-range-presets";
import { ErrorAlert, RiskMatrixCard, DashboardScopeBar } from "@/components/dashboard";
import { DataCompletenessPanel } from "@/components/reports/admin-overview-charts";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { LAYOUT } from "@/constants/layout";
import { ChartSkeleton } from "@/components/ui/skeletons";

/** Loading placeholder mirroring the AdminOverviewCharts grid. */
function OverviewChartsSkeleton(): React.JSX.Element {
	return (
		<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<div className="lg:col-span-2">
				<ChartSkeleton height={220} bars={12} withLegend />
			</div>
			{[0, 1, 2, 3].map((i) => (
				<ChartSkeleton key={i} height={200} />
			))}
		</div>
	);
}

// Recharts is client-only and heavy; load the grid on demand like the
// dashboard does.
const AdminOverviewCharts = dynamic(
	() =>
		import("@/components/reports/admin-overview-charts").then((m) => ({
			default: m.AdminOverviewCharts,
		})),
	{ ssr: false, loading: () => <OverviewChartsSkeleton /> }
);

/**
 * The Overview tab of Summaries / Reports: how complete the record is, then
 * the breakdowns — when, what, where, who reported, how each gate closed, the
 * case profile — and the §6 risk-matrix heatmap, all scoped by the dashboard
 * scope bar and exportable to PDF.
 *
 * The pipeline figures (headline tiles, weekly volume, where every signal is
 * now) live on the dashboard only; this tab used to repeat them.
 */
export function SignalOverviewPanel(): React.JSX.Element {
	const scope = useDashboardScope();
	const { range, district, region, division, response, isUnbounded } = scope;
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district,
		region,
		response,
		division
	);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	// The KPI row and the charts grid are captured as separate PDF sections so
	// the export carries both the tiles and every chart.
	const cardsRef = useRef<HTMLDivElement>(null);
	const chartsRef = useRef<HTMLDivElement>(null);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleDownloadReport = useCallback(async () => {
		if (!cardsRef.current && !chartsRef.current) return;
		setIsDownloadingPdf(true);
		try {
			const sections: DashboardPdfSection[] = [];
			if (cardsRef.current) {
				sections.push({
					container: cardsRef.current,
					splitCards: true,
					heading: "Data completeness",
				});
			}
			if (chartsRef.current) {
				sections.push({
					container: chartsRef.current,
					splitCards: true,
					heading: "Charts",
				});
			}
			await downloadDashboardPdf(sections, {
				title: "Health Alert Overview",
				subtitle: isUnbounded ? "All-time data" : "Data for the selected date range",
				// Not dashboard-<date>.pdf: the two exports would overwrite each other.
				filename: `overview-${toLocalISODate(new Date())}.pdf`,
			});
		} catch (err) {
			console.error("Failed to export overview to PDF:", err);
			window.alert("Could not generate the PDF. Please try again.");
		} finally {
			setIsDownloadingPdf(false);
		}
	}, [isUnbounded]);

	const isInitialLoading = loading && !summary;

	return (
		<div className={LAYOUT.pageGap}>
			<DashboardScopeBar
				title="Overview"
				scope={scope}
				loading={loading}
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing}
				onDownload={handleDownloadReport}
				isDownloading={isDownloadingPdf}
				downloadDisabled={!summary}
			/>

			{error && (
				<ErrorAlert error={error} onRetry={handleRefresh} retrying={isRefreshing} />
			)}

			<div ref={cardsRef}>
				<DataCompletenessPanel summary={summary} isLoading={isInitialLoading} />
			</div>

			<div ref={chartsRef} className={LAYOUT.pageGap}>
				<AdminOverviewCharts summary={summary} isLoading={isInitialLoading} />

				{/* EBS §6 risk matrix — the one heatmap: confirmed events plotted by
				    their recorded likelihood × impact, coloured by algorithm level. */}
				<RiskMatrixCard
					matrix={summary?.riskMatrix}
					isLoading={isInitialLoading}
					scope={{
						fromDate: range.from || undefined,
						toDate: range.to || undefined,
						district,
						region,
					}}
				/>
			</div>
		</div>
	);
}
