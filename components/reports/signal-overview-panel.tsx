"use client";

import React, { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import {
	ErrorAlert,
	StatsGrid,
	TriageKpiCards,
	VerificationKpiCards,
	RiskKpiCards,
	FeedbackKpiCards,
	KpiScorecard,
	RecentActivityCard,
	SignalCoverageCard,
	RiskMatrixCard,
	DashboardScopeBar,
} from "@/components/dashboard";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
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
	triaged: 0,
	discarded: 0,
	alerts: 0,
	total: 0,
};

/**
 * The signal overview — the workflow KPI cards, the §11 national KPI
 * scorecard, the per-gate KPI rows, the recent-activity snapshot, every
 * trend/breakdown chart, the risk matrix and the feed-coverage caveat.
 *
 * This used to BE the dashboard page. The dashboard now reports the EBS
 * indicator table (app/dashboard/page.tsx); everything it used to show lives
 * here, on the Overview tab of Summaries / Reports, unchanged and under the
 * same scope bar, so the two pages reconcile.
 */
export function SignalOverviewPanel(): React.JSX.Element {
	const scope = useDashboardScope();
	const { range, district, region, response, isUnbounded } = scope;
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district,
		region,
		response
	);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	// The overview KPI block and the charts grid are captured as separate PDF
	// sections so the export includes both the cards and every chart.
	const overviewRef = useRef<HTMLDivElement>(null);
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
		if (!overviewRef.current && !chartsRef.current) return;
		setIsDownloadingPdf(true);
		try {
			const sections: DashboardPdfSection[] = [];
			if (overviewRef.current) {
				sections.push({
					container: overviewRef.current,
					splitCards: true,
					heading: "Overview & national KPIs",
				});
			}
			if (chartsRef.current) {
				sections.push({
					container: chartsRef.current,
					splitCards: true,
					heading: "Trends & breakdowns",
				});
			}
			await downloadDashboardPdf(sections, {
				title: "Health Alert Overview",
				subtitle: isUnbounded ? "All-time data" : "Data for the selected date range",
			});
		} catch (err) {
			console.error("Failed to export overview to PDF:", err);
			window.alert("Could not generate the PDF. Please try again.");
		} finally {
			setIsDownloadingPdf(false);
		}
	}, [isUnbounded]);

	// Every KPI card comes from one server-side aggregate, scoped to the
	// selected range + geography + response type.
	const statCounts: AlertCounts = summary
		? {
				verified: summary.verified,
				notVerified: summary.notVerified,
				triaged: summary.triaged,
				discarded: summary.discarded,
				alerts: summary.alerts,
				total: summary.total,
			}
		: EMPTY_COUNTS;

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

			{/* Inside overviewRef so the PDF export carries the scorecard and the
			    per-gate KPI rows: §11 sets a monthly reporting cadence, and a
			    downloaded report that omits the indicators is not the report. */}
			<div ref={overviewRef} className={LAYOUT.pageGap}>
				<StatsGrid alertCounts={statCounts} kpiLoading={loading && !summary} />

				{/* The ten §11 indicators on one card, including the three that
				    are not measurable from what the system captures. */}
				<KpiScorecard summary={summary} isLoading={loading && !summary} />

				{/* Each pipeline gate that carries a national KPI, in EBS step
				    order: triage, verification, risk assessment, feedback. */}
				<TriageKpiCards summary={summary} isLoading={loading && !summary} />
				<VerificationKpiCards summary={summary} isLoading={loading && !summary} />
				<RiskKpiCards summary={summary} isLoading={loading && !summary} />
				<FeedbackKpiCards summary={summary} isLoading={loading && !summary} />
			</div>

			{/* Recent-activity triage snapshot — its own rolling/custom window,
			    independent of the page date range but scoped by district. */}
			<RecentActivityCard district={district} />

			<h2 className="text-base font-semibold text-gray-900">Trends &amp; breakdowns</h2>

			<div ref={chartsRef}>
				{loading && !summary ? (
					<DashboardChartsSkeleton />
				) : summary ? (
					<DashboardCharts summary={summary} />
				) : null}
			</div>

			{/* EBS §6 risk matrix — confirmed events plotted by their recorded
			    likelihood × impact, coloured by the algorithm level. */}
			<RiskMatrixCard
				matrix={summary?.riskMatrix}
				isLoading={loading && !summary}
				scope={{
					fromDate: range.from || undefined,
					toDate: range.to || undefined,
					district,
					region,
				}}
			/>

			{/* What everything above does NOT count: signals still sitting in the
			    6767 / eCHIS / POE feeds, which never entered triage or
			    verification. Placed last so it reads as the caveat it is. */}
			<SignalCoverageCard />
		</div>
	);
}
