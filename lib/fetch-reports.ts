import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";
import { canonicalDistrictName } from "@/lib/district-name";

class ReportsFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "ReportsFetchError";
	}
}

export type ReportScope = "daily" | "cumulative";

export interface ReportMatrixRow {
	label: string;
	values: number[];
}

export interface ReportMatrix {
	title: string;
	scope: ReportScope;
	asOf?: string;
	columns: string[];
	rows: ReportMatrixRow[];
}

export interface ReportTimeseriesPoint {
	date: string;
	signals: number;
	alerts: number;
	discarded: number;
}

export interface ReportTimeseries {
	title: string;
	scope?: ReportScope;
	points: ReportTimeseriesPoint[];
}

export interface ReportOptions {
	metrics: string[];
	districts: string[];
	scopes: { value: ReportScope; label: string }[];
}

export interface ReportsDateRange {
	fromDate: string;
	toDate: string;
}

export interface ReportsQueryParams {
	/** As-of / end date YYYY-MM-DD */
	date?: string;
	from_date?: string;
	to_date?: string;
	scope?: ReportScope;
}

export function todayIsoDate(): string {
	return new Date().toISOString().split("T")[0];
}

/** Default 6-day window ending today (matches API timeseries default). */
export function defaultReportDateRange(): ReportsDateRange {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 5);
	return {
		fromDate: from.toISOString().split("T")[0],
		toDate: to.toISOString().split("T")[0],
	};
}

export function buildReportsQuery(
	range: ReportsDateRange,
	scope: ReportScope
): ReportsQueryParams {
	return {
		date: range.toDate,
		from_date: range.fromDate,
		to_date: range.toDate,
		scope,
	};
}

/** Daily snapshot for a single day (the "Daily" tab). */
export function buildDailyQuery(date: string): ReportsQueryParams {
	return { date, from_date: date, to_date: date, scope: "daily" };
}

/**
 * Cumulative totals through an as-of date (the "Cumulative" tab). No lower
 * bound is sent so totals accumulate from the beginning up to `asOf`.
 */
export function buildCumulativeQuery(asOf: string): ReportsQueryParams {
	return { date: asOf, to_date: asOf, scope: "cumulative" };
}

const METRIC_LABELS: Record<string, string> = {
	signal: "Signals",
	signals: "Signals",
	alert: "Alerts",
	alerts: "Alerts",
	discarded: "Discarded",
	discarded_alerts: "Discarded",
	discarded_signals: "Discarded",
	evacuated: "Evacuated",
	sdb: "SDB",
	pending_verification: "Pending verification",
	samples_taken: "Samples taken",
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function normalizeScope(value: unknown): ReportScope {
	const raw = String(value ?? "cumulative").toLowerCase();
	return raw === "daily" ? "daily" : "cumulative";
}

function formatMetricLabel(key: string): string {
	const normalized = key.toLowerCase();
	if (METRIC_LABELS[normalized]) return METRIC_LABELS[normalized];

	const compact = normalizeMetricKey(key);
	const labelMatch = Object.entries(METRIC_LABELS).find(
		([metricKey]) => normalizeMetricKey(metricKey) === compact
	);
	if (labelMatch) return labelMatch[1];

	return key.replace(/_/g, " ");
}

function normalizeMetricKey(key: string): string {
	return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readMetricValue(
	metrics: Record<string, number> | undefined,
	aliases: string[]
): number | null {
	if (!metrics) return null;

	const byKey = new Map<string, number>();
	for (const [key, value] of Object.entries(metrics)) {
		const numeric = Number(value);
		if (Number.isFinite(numeric)) {
			byKey.set(normalizeMetricKey(key), numeric);
		}
	}

	for (const alias of aliases) {
		const value = byKey.get(normalizeMetricKey(alias));
		if (value !== undefined) return value;
	}

	return null;
}

/**
 * Merge rows whose district resolves to the same canonical name (e.g. "Amuru"
 * and "Amuru District") by summing their metric values column-by-column. The
 * backend returns these as separate rows, which both duplicates the district
 * and splits its counts across the two rows.
 */
function mergeMatrixRowsByDistrict(rows: ReportMatrixRow[]): ReportMatrixRow[] {
	const byKey = new Map<string, ReportMatrixRow>();

	for (const row of rows) {
		const label = canonicalDistrictName(row.label);
		const key = label.toLowerCase();
		const existing = byKey.get(key);

		if (!existing) {
			byKey.set(key, { label, values: [...row.values] });
		} else {
			existing.values = existing.values.map(
				(value, index) => value + (row.values[index] ?? 0)
			);
			// Absorb any extra columns the first row didn't have.
			for (let i = existing.values.length; i < row.values.length; i++) {
				existing.values.push(row.values[i]);
			}
		}
	}

	return Array.from(byKey.values()).sort((a, b) =>
		a.label.localeCompare(b.label)
	);
}

function formatChartDate(isoDate: string): string {
	const iso = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		return `${iso[3]}/${iso[2]}/${iso[1]}`;
	}
	return isoDate;
}

async function requestReport<T>(path: string, params?: ReportsQueryParams): Promise<T> {
	const apiBase = getClientApiBaseUrl();
	const searchParams = new URLSearchParams();
	if (params?.date) searchParams.set("date", params.date);
	if (params?.from_date) searchParams.set("from_date", params.from_date);
	if (params?.to_date) searchParams.set("to_date", params.to_date);
	if (params?.scope) searchParams.set("scope", params.scope);
	const query = searchParams.toString();
	const url = query
		? `${apiBase}/reports/${path}?${query}`
		: `${apiBase}/reports/${path}`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new ReportsFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new ReportsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	return response.json() as Promise<T>;
}

/** Backend: districts as rows, metrics in a map per district. */
export function parseMatrixResponse(json: unknown): ReportMatrix | null {
	const body = asRecord(json);
	if (!body) return null;

	const districtRows = body.rows as
		| { district: string; metrics: Record<string, number> }[]
		| undefined;
	const metricKeys = (body.metricKeys ?? body.metrics) as string[] | undefined;

	if (!Array.isArray(districtRows) || !Array.isArray(metricKeys)) {
		return null;
	}

	const columns = metricKeys.map((key) => formatMetricLabel(key));
	const rawRows: ReportMatrixRow[] = districtRows.map((d) => ({
		label: String(d.district ?? ""),
		values: metricKeys.map((key) => Number(d.metrics?.[key] ?? 0)),
	}));
	const rows = mergeMatrixRowsByDistrict(rawRows);

	return {
		title: String(body.title ?? ""),
		scope: normalizeScope(body.scope),
		asOf: body.asOfDate
			? String(body.asOfDate)
			: body.as_of
				? String(body.as_of)
				: undefined,
		columns,
		rows,
	};
}

/** Backend: series[].metrics with keys signals, alerts, etc. */
export function parseTimeseriesResponse(json: unknown): ReportTimeseries {
	const body = asRecord(json);
	if (!body) return { title: "Signals & Alerts", points: [] };

	const series = body.series as
		| { date: string; metrics: Record<string, number> }[]
		| undefined;

	const points: ReportTimeseriesPoint[] = Array.isArray(series)
		? series.map((point) => {
				const rawDate = String(point.date ?? "");
				const alerts =
					readMetricValue(point.metrics, ["alerts", "alert"]) ?? 0;
				const discarded =
					readMetricValue(point.metrics, [
						"discarded",
						"discarded_alerts",
						"discardedAlerts",
						"discarded_signals",
						"discardedSignals",
					]) ?? 0;
				const explicitSignals =
					readMetricValue(point.metrics, [
						"signals",
						"signal",
						"total_signals",
						"totalSignals",
						"evd_signals",
						"evdSignals",
					]) ?? 0;
				const derivedSignals = alerts + discarded;

				return {
					date: formatChartDate(rawDate),
					signals: Math.max(explicitSignals, derivedSignals),
					alerts,
					discarded,
				};
			})
		: [];

	return {
		title: String(body.title ?? "Signals & Alerts"),
		scope: body.scope ? normalizeScope(body.scope) : undefined,
		points,
	};
}

export function parseOptionsResponse(json: unknown): ReportOptions {
	const body = asRecord(json);
	const defaults: ReportOptions = {
		metrics: [],
		districts: [],
		scopes: [
			{ value: "daily", label: "Daily" },
			{ value: "cumulative", label: "Cumulative" },
		],
	};

	if (!body) return defaults;

	const metrics = body.metrics as string[] | undefined;
	const districts = body.districts as string[] | undefined;
	const scopesRaw = body.scopes as string[] | undefined;

	let scopes = defaults.scopes;
	if (Array.isArray(scopesRaw) && scopesRaw.length > 0) {
		scopes = scopesRaw.map((s) => ({
			value: normalizeScope(s),
			label: s.charAt(0).toUpperCase() + s.slice(1),
		}));
	}

	return {
		metrics: Array.isArray(metrics) ? metrics.map(String) : [],
		districts: Array.isArray(districts) ? districts.map(String) : [],
		scopes,
	};
}

export async function fetchReportOptions(): Promise<ReportOptions> {
	const json = await requestReport<unknown>("options");
	return parseOptionsResponse(json);
}

export async function fetchReportMatrix(
	params: ReportsQueryParams
): Promise<ReportMatrix | null> {
	const json = await requestReport<unknown>("matrix", params);
	return parseMatrixResponse(json);
}

export async function fetchReportTimeseries(
	params: ReportsQueryParams
): Promise<ReportTimeseries> {
	const json = await requestReport<unknown>("timeseries", params);
	return parseTimeseriesResponse(json);
}
