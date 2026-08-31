"use client";

import React, { useCallback, useRef, useState } from "react";

import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import {
	ErrorAlert,
	DashboardScopeBar,
	HeadlineStats,
	WeeklySignalsCard,
	IndicatorTrendCards,
	SignalCascadeCard,
	ReportingUnitsCard,
} from "@/components/dashboard";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { LAYOUT } from "@/constants/layout";
import { EBS_DATA_SOURCE } from "@/lib/ebs-indicators";

/**
 * The dashboard: the published signal-to-alert indicators for the selected
 * scope — headline counts, signals by epi week, one trend card per indicator
 * (current value, the counts behind it, and its epi-week graph), then the
 * cascade funnel and the reporting-unit breakdown. Each card's definition,
 * numerator and denominator are its hover hint (lib/ebs-indicators.ts).
 *
 * The overview this page used to show — workflow KPI cards, the §11
 * scorecard, per-gate KPI rows, every chart, the risk matrix and feed
 * coverage — lives on the Overview tab of Summaries / Reports.
 */
export default function DashboardPage(): React.JSX.Element {
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
	const statsRef = useRef<HTMLDivElement>(null);
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
		if (!statsRef.current && !chartsRef.current) return;
		setIsDownloadingPdf(true);
		try {
			const sections: DashboardPdfSection[] = [];
			if (statsRef.current) {
				sections.push({ container: statsRef.current, splitCards: true, heading: "Key figures" });
			}
			if (chartsRef.current) {
				sections.push({ container: chartsRef.current, splitCards: true, heading: "Indicators by epi week" });
			}
			await downloadDashboardPdf(sections, {
				title: "Health Alert Dashboard",
				subtitle: isUnbounded ? "All-time data" : "Data for the selected date range",
			});
		} catch (err) {
			console.error("Failed to export dashboard to PDF:", err);
			window.alert("Could not generate the PDF. Please try again.");
		} finally {
			setIsDownloadingPdf(false);
		}
	}, [isUnbounded]);

	const isLoading = loading && !summary;

	return (
		<div className={LAYOUT.pageGap}>
			<DashboardScopeBar
				title="Dashboard"
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

			<div ref={statsRef}>
				<HeadlineStats summary={summary} isLoading={isLoading} />
			</div>

			{/* Every graph in one two-column grid: signals by epi week first, then
			    the twelve indicator cards in table order, then the cascade and the
			    reporting-unit breakdown. */}
			<div ref={chartsRef} className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
				<WeeklySignalsCard summary={summary} isLoading={isLoading} />
				<IndicatorTrendCards summary={summary} isLoading={isLoading} />
				<SignalCascadeCard summary={summary} isLoading={isLoading} />
				<ReportingUnitsCard summary={summary} isLoading={isLoading} />
			</div>

			<p className="px-0.5 text-[11px] text-gray-400">
				Source: {EBS_DATA_SOURCE}. Epi weeks run Monday–Sunday (ISO weeks). Hover a card
				for its definition, numerator and denominator.
			</p>
		</div>
	);
}
