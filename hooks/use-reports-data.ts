import { useCallback, useEffect, useState } from "react";
import {
	buildCumulativeQuery,
	buildDailyQuery,
	buildReportsQuery,
	defaultReportDateRange,
	fetchReportMatrix,
	fetchReportTimeseries,
	todayIsoDate,
	type ReportsDateRange,
	type ReportMatrix,
	type ReportOptions,
	type ReportScope,
	type ReportTimeseries,
} from "@/lib/fetch-reports";
import { loadReportOptions } from "@/lib/report-options-cache";

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

function clampRange(range: ReportsDateRange): ReportsDateRange {
	let { fromDate, toDate } = range;
	if (fromDate && toDate && fromDate > toDate) {
		[fromDate, toDate] = [toDate, fromDate];
	}
	return { fromDate, toDate };
}

function errorMessage(err: unknown, fallback: string): string {
	return err instanceof Error ? err.message : fallback;
}

/**
 * Each report view (chart / cumulative / daily) owns its own filter and fetch:
 * the chart is driven by a date range + scope, while the cumulative and daily
 * tables are each driven by a single "as of" date. This keeps the three tabs
 * independent — changing one tab's date never refetches the others.
 */
export function useReportsData(): UseReportsDataReturn {
	const [options, setOptions] = useState<ReportOptions>({
		metrics: [],
		districts: [],
		scopes: [
			{ value: "daily", label: "Daily" },
			{ value: "cumulative", label: "Cumulative" },
		],
	});
	const [optionsLoading, setOptionsLoading] = useState(true);

	// Chart tab.
	const [chartRange, setChartRangeState] = useState<ReportsDateRange>(() =>
		defaultReportDateRange()
	);
	const [chartScope, setChartScope] = useState<ReportScope>(DEFAULT_CHART_SCOPE);
	const [timeseries, setTimeseries] = useState<ReportTimeseries | null>(null);
	const [timeseriesLoading, setTimeseriesLoading] = useState(true);
	const [timeseriesError, setTimeseriesError] = useState<string | null>(null);

	// Cumulative tab.
	const [cumulativeDate, setCumulativeDate] = useState<string>(() => todayIsoDate());
	const [cumulativeMatrix, setCumulativeMatrix] = useState<ReportMatrix | null>(null);
	const [cumulativeLoading, setCumulativeLoading] = useState(true);
	const [cumulativeError, setCumulativeError] = useState<string | null>(null);

	// Daily tab.
	const [dailyDate, setDailyDate] = useState<string>(() => todayIsoDate());
	const [dailyMatrix, setDailyMatrix] = useState<ReportMatrix | null>(null);
	const [dailyLoading, setDailyLoading] = useState(true);
	const [dailyError, setDailyError] = useState<string | null>(null);

	const loadTimeseries = useCallback(async () => {
		const range = clampRange(chartRange);
		if (!range.fromDate || !range.toDate) return;

		setTimeseriesLoading(true);
		setTimeseriesError(null);
		try {
			const series = await fetchReportTimeseries(
				buildReportsQuery(range, chartScope)
			);
			setTimeseries(series);
		} catch (err) {
			setTimeseriesError(errorMessage(err, "Failed to load chart data"));
		} finally {
			setTimeseriesLoading(false);
		}
	}, [chartRange, chartScope]);

	const loadCumulative = useCallback(async () => {
		if (!cumulativeDate) return;

		setCumulativeLoading(true);
		setCumulativeError(null);
		try {
			const matrix = await fetchReportMatrix(
				buildCumulativeQuery(cumulativeDate)
			);
			setCumulativeMatrix(matrix);
		} catch (err) {
			setCumulativeError(
				errorMessage(err, "Failed to load cumulative report")
			);
		} finally {
			setCumulativeLoading(false);
		}
	}, [cumulativeDate]);

	const loadDaily = useCallback(async () => {
		if (!dailyDate) return;

		setDailyLoading(true);
		setDailyError(null);
		try {
			const matrix = await fetchReportMatrix(buildDailyQuery(dailyDate));
			setDailyMatrix(matrix);
		} catch (err) {
			setDailyError(errorMessage(err, "Failed to load daily report"));
		} finally {
			setDailyLoading(false);
		}
	}, [dailyDate]);

	const setChartRange = useCallback((patch: Partial<ReportsDateRange>) => {
		setChartRangeState((prev) => clampRange({ ...prev, ...patch }));
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadOptions() {
			try {
				const opts = await loadReportOptions();
				if (!cancelled) setOptions(opts);
			} catch {
				// Defaults are sufficient for the scope select.
			} finally {
				if (!cancelled) setOptionsLoading(false);
			}
		}

		loadOptions();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		loadTimeseries();
	}, [loadTimeseries]);

	useEffect(() => {
		loadCumulative();
	}, [loadCumulative]);

	useEffect(() => {
		loadDaily();
	}, [loadDaily]);

	return {
		options,
		optionsLoading,

		chartRange,
		chartScope,
		timeseries,
		timeseriesLoading,
		timeseriesError,
		setChartRange,
		setChartScope,
		refetchTimeseries: loadTimeseries,

		cumulativeDate,
		cumulativeMatrix,
		cumulativeLoading,
		cumulativeError,
		setCumulativeDate,
		refetchCumulative: loadCumulative,

		dailyDate,
		dailyMatrix,
		dailyLoading,
		dailyError,
		setDailyDate,
		refetchDaily: loadDaily,
	};
}
