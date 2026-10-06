"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { downloadDashboardPdf, type DashboardPdfSection } from "@/lib/charts-pdf";
import { exportAlertsToExcel } from "@/lib/alert-export";
import { fetchAlertsPage, type AlertsListParams } from "@/lib/fetch-alerts";
import {
	ErrorAlert,
	DashboardScopeBar,
	HeadlineStats,
	WeeklySignalsCard,
	IndicatorTrendCards,
	SignalFlowCard,
	ReportingUnitsCard,
} from "@/components/dashboard";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
import { can, PERM } from "@/lib/access";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { LAYOUT } from "@/constants/layout";
import { EBS_DATA_SOURCE } from "@/lib/ebs-indicators";
import type { DashboardLinkScope } from "@/lib/dashboard-scope-link";
import { cn } from "@/lib/utils";

/**
 * The dashboard: the published signal-to-alert indicators for the selected
 * scope — headline figures, where every signal is now, then
 * one card per indicator (a rate against its §11 target where the published
 * denominator really contains the numerator, a count otherwise) and the
 * reporting-unit breakdown. Each card's definition, numerator and
 * denominator are its hover hint (lib/ebs-indicators.ts).
 *
 * The overview this page used to show — workflow KPI cards, the §11
 * scorecard, per-gate KPI rows, every chart, the risk matrix and feed
 * coverage — lives on the Overview tab of Summaries / Reports.
 */
export default function DashboardPage(): React.JSX.Element {
	const scope = useDashboardScope();
	const { range, district, region, division, response, isUnbounded } = scope;
	const { summary, loading, error, refetch } = useDashboardSummary(
		range,
		district,
		region,
		response,
		division
	);
	// The scope every figure was counted over, carried by the links from them.
	const linkScope = useMemo<DashboardLinkScope>(
		() => ({
			from: range.from,
			to: range.to,
			region,
			district,
			division,
			disease: response,
		}),
		[range.from, range.to, region, district, division, response]
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
				...(division !== "all" ? { division } : {}),
				// The dashboard's own disease match (every spelling of the
				// selected disease), not the list's free-text "contains" search —
				// so the sheet holds exactly the signals the figures counted.
				...(response !== "all" ? { disease: response } : {}),
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
					division !== "all" ? division : "",
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
	}, [range.from, range.to, region, district, division, response]);

	const isLoading = loading && !summary;
	// A new scope is loading while the previous scope's figures are still on
	// screen (SWR keepPreviousData): dim them so they are never read as the
	// figures for the filters now selected.
	const isStale = loading && !!summary;

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
				// The workbook is built from the signal list, which needs signals.view.
				onDownloadExcel={can(scope.user, PERM.signalsView) ? handleDownloadExcel : undefined}
				isDownloadingExcel={isDownloadingExcel}
			/>

			{error && (
				<ErrorAlert error={error} onRetry={handleRefresh} retrying={isRefreshing} />
			)}

			<div
				ref={statsRef}
				className={cn(LAYOUT.pageGap, isStale && "opacity-50 transition-opacity")}
				aria-busy={isStale}
			>
				<HeadlineStats summary={summary} isLoading={isLoading} scope={linkScope} />
				<SignalFlowCard summary={summary} isLoading={isLoading} scope={linkScope} />
			</div>

			{/* Every graph in one two-column grid: the two timeliness indicators
			    (triaged and verified within 24h) lead, then signals by epi week,
			    then the remaining indicator cards in table order, then the
			    reporting-unit breakdown. */}
			<div
				ref={chartsRef}
				className={cn("grid grid-cols-1 gap-2.5 lg:grid-cols-2", isStale && "opacity-50 transition-opacity")}
				aria-busy={isStale}
			>
				<IndicatorTrendCards summary={summary} isLoading={isLoading} select="lead" />
				<WeeklySignalsCard summary={summary} isLoading={isLoading} />
				<IndicatorTrendCards summary={summary} isLoading={isLoading} select="rest" />
				<ReportingUnitsCard summary={summary} isLoading={isLoading} />
			</div>

			<p className="px-0.5 text-[11px] text-gray-400">
				Source: {EBS_DATA_SOURCE}. Epi weeks run Monday–Sunday (ISO weeks); the week in
				progress is drawn faded. Rates divide only by signals that could be timed or that
				contain the numerator — hover a card for its definition, numerator and denominator.
			</p>
		</div>
	);
}
