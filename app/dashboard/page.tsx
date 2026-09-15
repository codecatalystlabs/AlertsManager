"use client";

import React, { useCallback, useRef, useState } from "react";

import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import { exportAlertsToExcel } from "@/lib/alert-export";
import { fetchAlertsPage, type AlertsListParams } from "@/lib/fetch-alerts";
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
 * (count in scope and its epi-week bar graph — counts, not percentages), then
 * the cascade funnel and the reporting-unit breakdown. Each card's definition,
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
	const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
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

	/**
	 * The signals behind the figures, as a sheet: one row per signal with the
	 * stage it reached (triaged / verified / risk assessed) and every column of
	 * the case record. Scoped exactly like the charts above it — same dates,
	 * region, district and response type — so the sheet and the page agree.
	 *
	 * Paged rather than fetched in one request: the API caps page size, and a
	 * single large `limit` silently truncates the export.
	 */
	const handleDownloadExcel = useCallback(async () => {
		setIsDownloadingExcel(true);
		try {
			const EXPORT_PAGE_LIMIT = 500;
			const MAX_EXPORT_PAGES = 200; // safety cap → up to 100k rows
			const scopeParams: AlertsListParams = {
				...(range.from ? { from_date: range.from } : {}),
				...(range.to ? { to_date: range.to } : {}),
				...(region !== "all" ? { region } : {}),
				...(district !== "all" ? { district } : {}),
				...(response !== "all" ? { response } : {}),
			};

			const first = await fetchAlertsPage({
				...scopeParams,
				page: 1,
				limit: EXPORT_PAGE_LIMIT,
			});
			const rows = [...first.data];
			const lastPage = Math.min(
				Math.max(first.totalPages ?? 1, 1),
				MAX_EXPORT_PAGES
			);
			if (lastPage > 1) {
				const rest = await Promise.all(
					Array.from({ length: lastPage - 1 }, (_, index) =>
						fetchAlertsPage({
							...scopeParams,
							page: index + 2,
							limit: EXPORT_PAGE_LIMIT,
						})
					)
				);
				for (const page of rest) rows.push(...page.data);
			}

			const exported = await exportAlertsToExcel(rows, "signals", "Signals", {
				range: { from: range.from, to: range.to },
				tokens: [
					region !== "all" ? region : "",
					district !== "all" ? district : "",
					response !== "all" ? response : "",
				].filter(Boolean),
			});
			if (!exported) {
				window.alert("No signals in the current scope to export.");
			}
		} catch (err) {
			console.error("Failed to export signals to Excel:", err);
			window.alert("Could not generate the Excel sheet. Please try again.");
		} finally {
			setIsDownloadingExcel(false);
		}
	}, [range.from, range.to, region, district, response]);

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
				onDownloadExcel={handleDownloadExcel}
				isDownloadingExcel={isDownloadingExcel}
			/>

			{error && (
				<ErrorAlert error={error} onRetry={handleRefresh} retrying={isRefreshing} />
			)}

			<div ref={statsRef}>
				<HeadlineStats summary={summary} isLoading={isLoading} />
			</div>

			{/* Every graph in one two-column grid: the two timeliness indicators
			    (triaged and verified within 24h) lead, then signals by epi week,
			    then the remaining indicator cards in table order, then the cascade
			    and the reporting-unit breakdown. */}
			<div ref={chartsRef} className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
				<IndicatorTrendCards summary={summary} isLoading={isLoading} select="lead" />
				<WeeklySignalsCard summary={summary} isLoading={isLoading} />
				<IndicatorTrendCards summary={summary} isLoading={isLoading} select="rest" />
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
