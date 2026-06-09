import { useCallback, useState } from "react";
import useSWR from "swr";
import {
	buildCumulativeQuery,
	buildDailyQuery,
	buildReportsQuery,
	defaultReportDateRange,
	fetchReportMatrix,
	fetchReportOptions,
	fetchReportTimeseries,
	todayIsoDate,
	type ReportsDateRange,
	type ReportMatrix,
	type ReportOptions,
	type ReportScope,
	type ReportTimeseries,
} from "@/lib/fetch-reports";

interface UseReportsDataReturn {
	options: ReportOptions;
	optionsLoading: boolean;

	// Chart tab — date range + scope.
	chartRange: ReportsDateRange;
	chartScope: ReportScope;
	timeseries: ReportTimeseries | null;
	timeseriesLoading: boolean;
	timeseriesError: string | null;
	setChartRange: (range: Partial<ReportsDateRange>) => void;
	setChartScope: (scope: ReportScope) => void;
	refetchTimeseries: () => Promise<void>;

	// Cumulative tab — single "as of" date.
	cumulativeDate: string;
	cumulativeMatrix: ReportMatrix | null;
	cumulativeLoading: boolean;
	cumulativeError: string | null;
	setCumulativeDate: (date: string) => void;
	refetchCumulative: () => Promise<void>;

	// Daily tab — single date.
	dailyDate: string;
	dailyMatrix: ReportMatrix | null;
	dailyLoading: boolean;
	dailyError: string | null;
	setDailyDate: (date: string) => void;
	refetchDaily: () => Promise<void>;
}

const DEFAULT_CHART_SCOPE: ReportScope = "cumulative";

const DEFAULT_OPTIONS: ReportOptions = {
	metrics: [],
	districts: [],
	scopes: [
		{ value: "daily", label: "Daily" },
		{ value: "cumulative", label: "Cumulative" },
	],
};

function clampRange(range: ReportsDateRange): ReportsDateRange {
	let { fromDate, toDate } = range;
	if (fromDate && toDate && fromDate > toDate) {
		[fromDate, toDate] = [toDate, fromDate];
	}
	return { fromDate, toDate };
}

function toMessage(err: unknown, fallback: string): string | null {
	if (!err) return null;
	return err instanceof Error ? err.message : fallback;
}

/**
 * Each report view (chart / cumulative / daily) owns its own filter and SWR
 * query: the chart is driven by a date range + scope, while the cumulative and
 * daily tables are each driven by a single "as of" date. SWR caches each by key,
 * so revisiting a date paints instantly and changing one tab never refetches the
 * others.
 */
export function useReportsData(): UseReportsDataReturn {
	// Chart tab.
	const [chartRange, setChartRangeState] = useState<ReportsDateRange>(() =>
		defaultReportDateRange()
	);
	const [chartScope, setChartScope] = useState<ReportScope>(DEFAULT_CHART_SCOPE);

	// Cumulative tab.
	const [cumulativeDate, setCumulativeDate] = useState<string>(() => todayIsoDate());

	// Daily tab.
	const [dailyDate, setDailyDate] = useState<string>(() => todayIsoDate());

	const optionsQuery = useSWR("report-options", fetchReportOptions, {
		fallbackData: DEFAULT_OPTIONS,
	});

	const range = clampRange(chartRange);
	const timeseriesQuery = useSWR(
		range.fromDate && range.toDate
			? ["report-timeseries", range.fromDate, range.toDate, chartScope]
			: null,
		([, fromDate, toDate, scope]) =>
			fetchReportTimeseries(
				buildReportsQuery({ fromDate, toDate }, scope as ReportScope)
			)
	);

	const cumulativeQuery = useSWR(
		cumulativeDate ? ["report-cumulative", cumulativeDate] : null,
		([, date]) => fetchReportMatrix(buildCumulativeQuery(date))
	);

	const dailyQuery = useSWR(
		dailyDate ? ["report-daily", dailyDate] : null,
		([, date]) => fetchReportMatrix(buildDailyQuery(date))
	);

	const setChartRange = useCallback((patch: Partial<ReportsDateRange>) => {
		setChartRangeState((prev) => clampRange({ ...prev, ...patch }));
	}, []);

	return {
		options: optionsQuery.data ?? DEFAULT_OPTIONS,
		optionsLoading: optionsQuery.isLoading,

		chartRange,
		chartScope,
		timeseries: timeseriesQuery.data ?? null,
		timeseriesLoading: timeseriesQuery.isLoading,
		timeseriesError: toMessage(timeseriesQuery.error, "Failed to load chart data"),
		setChartRange,
		setChartScope,
		refetchTimeseries: async () => {
			await timeseriesQuery.mutate();
		},

		cumulativeDate,
		cumulativeMatrix: cumulativeQuery.data ?? null,
		cumulativeLoading: cumulativeQuery.isLoading,
		cumulativeError: toMessage(
			cumulativeQuery.error,
			"Failed to load cumulative report"
		),
		setCumulativeDate,
		refetchCumulative: async () => {
			await cumulativeQuery.mutate();
		},

		dailyDate,
		dailyMatrix: dailyQuery.data ?? null,
		dailyLoading: dailyQuery.isLoading,
		dailyError: toMessage(dailyQuery.error, "Failed to load daily report"),
		setDailyDate,
		refetchDaily: async () => {
			await dailyQuery.mutate();
		},
	};
}
