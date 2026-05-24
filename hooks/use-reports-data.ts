import { useCallback, useEffect, useState } from "react";
import {
	buildReportsQuery,
	defaultReportDateRange,
	fetchReportMatrix,
	fetchReportOptions,
	fetchReportTimeseries,
	type ReportsDateRange,
	type ReportMatrix,
	type ReportOptions,
	type ReportScope,
	type ReportTimeseries,
} from "@/lib/fetch-reports";

interface UseReportsDataReturn {
	options: ReportOptions;
	dateRange: ReportsDateRange;
	chartScope: ReportScope;
	dailyMatrix: ReportMatrix | null;
	cumulativeMatrix: ReportMatrix | null;
	timeseries: ReportTimeseries | null;
	optionsLoading: boolean;
	reportsLoading: boolean;
	error: string | null;
	setDateRange: (range: Partial<ReportsDateRange>) => void;
	setChartScope: (scope: ReportScope) => void;
	refetch: () => Promise<void>;
}

const DEFAULT_CHART_SCOPE: ReportScope = "cumulative";

function clampRange(range: ReportsDateRange): ReportsDateRange {
	let { fromDate, toDate } = range;
	if (fromDate && toDate && fromDate > toDate) {
		[fromDate, toDate] = [toDate, fromDate];
	}
	return { fromDate, toDate };
}

export function useReportsData(): UseReportsDataReturn {
	const [options, setOptions] = useState<ReportOptions>({
		metrics: [],
		districts: [],
		scopes: [
			{ value: "daily", label: "Daily" },
			{ value: "cumulative", label: "Cumulative" },
		],
	});
	const [dateRange, setDateRangeState] = useState<ReportsDateRange>(
		defaultReportDateRange
	);
	const [chartScope, setChartScope] = useState<ReportScope>(DEFAULT_CHART_SCOPE);
	const [dailyMatrix, setDailyMatrix] = useState<ReportMatrix | null>(null);
	const [cumulativeMatrix, setCumulativeMatrix] =
		useState<ReportMatrix | null>(null);
	const [timeseries, setTimeseries] = useState<ReportTimeseries | null>(null);
	const [optionsLoading, setOptionsLoading] = useState(true);
	const [reportsLoading, setReportsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadMatrices = useCallback(async () => {
		const range = clampRange(dateRange);
		if (!range.fromDate || !range.toDate) return;

		setReportsLoading(true);
		setError(null);

		try {
			const [daily, cumulative] = await Promise.all([
				fetchReportMatrix(buildReportsQuery(range, "daily")),
				fetchReportMatrix(buildReportsQuery(range, "cumulative")),
			]);

			setDailyMatrix(daily);
			setCumulativeMatrix(cumulative);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load reports";
			setError(message);
		} finally {
			setReportsLoading(false);
		}
	}, [dateRange]);

	const loadTimeseries = useCallback(async () => {
		const range = clampRange(dateRange);
		if (!range.fromDate || !range.toDate) return;

		try {
			const series = await fetchReportTimeseries(
				buildReportsQuery(range, chartScope)
			);
			setTimeseries(series);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load chart data";
			setError(message);
		}
	}, [dateRange, chartScope]);

	const refetch = useCallback(async () => {
		await Promise.all([loadMatrices(), loadTimeseries()]);
	}, [loadMatrices, loadTimeseries]);

	const setDateRange = useCallback((patch: Partial<ReportsDateRange>) => {
		setDateRangeState((prev) => clampRange({ ...prev, ...patch }));
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadOptions() {
			try {
				const opts = await fetchReportOptions();
				if (!cancelled) setOptions(opts);
			} catch {
				// Defaults are sufficient for scope select
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
		loadMatrices();
	}, [loadMatrices]);

	useEffect(() => {
		loadTimeseries();
	}, [loadTimeseries]);

	return {
		options,
		dateRange,
		chartScope,
		dailyMatrix,
		cumulativeMatrix,
		timeseries,
		optionsLoading,
		reportsLoading,
		error,
		setDateRange,
		setChartScope,
		refetch,
	};
}
