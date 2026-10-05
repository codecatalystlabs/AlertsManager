/**
 * Signal performance — the EBS funnel, one row per region or per district.
 *
 * The column list below is the ONE definition the in-app table, the .pptx
 * slide, the PDF and the Excel file all render from, so a column cannot be
 * added to one output and missed in another, and the "(%)" column is computed
 * in exactly one place. The two tables share every funnel column; they differ
 * only in what labels a row.
 */

import type {
	PerformanceFiltersEcho,
	PerformanceLevel,
	RegionalPerformanceReport,
	RegionalPerformanceRow,
} from "@/lib/fetch-reports";
import { SIGNAL_ORIGINS } from "@/lib/signal-origin";

/**
 * Share of SIGNALS verified within 24h, 0–100, or null when the region had no
 * signals (a 0% there would read as a region that failed every signal).
 *
 * The denominator is Signals, not Verified — the question is how much of the
 * region's signal load was cleared inside the deadline, and a signal still
 * waiting is part of that load.
 */
export function verifiedWithin24hPct(row: RegionalPerformanceRow): number | null {
	if (!row.signals) return null;
	return (row.verifiedWithin24h / row.signals) * 100;
}

export function formatPct(pct: number | null): string {
	return pct == null ? "—" : `${Math.round(pct)}%`;
}

export interface RegionalColumn {
	key: string;
	/** Header as printed on the slide. */
	header: string;
	/** What the column counts — shown as the header tooltip and in the notes. */
	description: string;
	/** The cell as displayed. */
	format: (row: RegionalPerformanceRow) => string;
	/** The cell as a number, for the spreadsheet (a fraction for "(%)"). */
	value: (row: RegionalPerformanceRow) => number | string | null;
}

const count = (pick: (row: RegionalPerformanceRow) => number) => ({
	format: (row: RegionalPerformanceRow) => pick(row).toLocaleString(),
	value: pick,
});

const REGION_COLUMN: RegionalColumn = {
	key: "region",
	header: "Region",
	description:
		'Official region of the case district. "Unknown" = the district maps to no region.',
	format: (r) => r.region,
	value: (r) => r.region,
};

const DISTRICT_COLUMN: RegionalColumn = {
	key: "district",
	header: "District",
	description:
		'Case district. City and District units share a row ("Gulu" counts Gulu City and Gulu District), as every district filter does. "Unknown" = no district recorded.',
	format: (r) => r.district ?? "",
	value: (r) => r.district ?? "",
};

const FUNNEL_COLUMNS: RegionalColumn[] = [
	{
		key: "rawData",
		header: "Raw Data",
		description: "Every report logged in the period (by signal date).",
		...count((r) => r.rawData),
	},
	{
		key: "triaged",
		header: "Triaged",
		description: "Reports that have been through triage.",
		...count((r) => r.triaged),
	},
	{
		key: "signals",
		header: "Signal",
		description:
			"Triaged reports matched to an EBS signal definition (Annex I/II signal code).",
		...count((r) => r.signals),
	},
	{
		key: "verified",
		header: "Verified",
		description:
			"Signals with a verification outcome recorded. Signals escalated to the field and still awaiting a verdict are not counted.",
		...count((r) => r.verified),
	},
	{
		key: "verifiedWithin24h",
		header: "Verify <24h",
		description:
			"Verified signals whose outcome was recorded within 24 hours of the signal being triaged (timed from triage, not from the event date, so signals that reached the register late are not counted as slow).",
		...count((r) => r.verifiedWithin24h),
	},
	{
		key: "pct",
		header: "(%)",
		description: "Verify <24h ÷ Signal — the share of the row's coded signals verified within 24 hours of triage.",
		format: (r) => formatPct(verifiedWithin24hPct(r)),
		value: (r) => {
			const pct = verifiedWithin24hPct(r);
			return pct == null ? null : pct / 100;
		},
	},
	{
		key: "riskAssessed",
		header: "Risk assessed",
		description: "Verified signals that have been given a risk level.",
		...count((r) => r.riskAssessed),
	},
	{
		key: "alerts",
		header: "Alerts",
		description:
			"Risk-assessed signals that completed the pipeline — confirmed, assessed and fed back to the reporter. Only coded signals are in this funnel; alerts whose signal was never coded are counted under the table.",
		...count((r) => r.alerts),
	},
];

/** The regional table's columns. */
export const REGIONAL_COLUMNS: RegionalColumn[] = [REGION_COLUMN, ...FUNNEL_COLUMNS];

/** The district table's columns: the district, then its region, then the funnel. */
export const DISTRICT_COLUMNS: RegionalColumn[] = [
	DISTRICT_COLUMN,
	REGION_COLUMN,
	...FUNNEL_COLUMNS,
];

export function performanceColumns(level: PerformanceLevel): RegionalColumn[] {
	return level === "district" ? DISTRICT_COLUMNS : REGIONAL_COLUMNS;
}

/** The level a report was built at (an older API sends no groupBy: regions). */
export function reportLevel(report: Pick<RegionalPerformanceReport, "groupBy">): PerformanceLevel {
	return report.groupBy === "district" ? "district" : "region";
}

/** Data rows followed by the grand total — the order every output prints.
 * The label "Grand Total" goes in whichever column labels a row. */
export function regionalTableRows(
	report: RegionalPerformanceReport
): { row: RegionalPerformanceRow; total: boolean }[] {
	const total: RegionalPerformanceRow =
		reportLevel(report) === "district"
			? { ...report.total, district: "Grand Total", region: "" }
			: { ...report.total, region: "Grand Total" };
	return [
		...report.rows.map((row) => ({ row, total: false })),
		{ row: total, total: true },
	];
}

export type PerformanceSort = { key: string; dir: "asc" | "desc" } | null;

/**
 * Rows ordered by one column, for ranking ("which districts verify slowest?").
 * null keeps the server's lookup order (region, then district). Empty "(%)"
 * cells — no signals to score — sink to the bottom either way, and Unknown
 * stays last on a label sort.
 */
export function sortPerformanceRows(
	rows: RegionalPerformanceRow[],
	level: PerformanceLevel,
	sort: PerformanceSort
): RegionalPerformanceRow[] {
	if (!sort) return rows;
	const column = performanceColumns(level).find((c) => c.key === sort.key);
	if (!column) return rows;
	const sign = sort.dir === "asc" ? 1 : -1;
	return [...rows].sort((a, b) => {
		const va = column.value(a);
		const vb = column.value(b);
		if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
		if (typeof va === "string" || typeof vb === "string") {
			const sa = String(va);
			const sb = String(vb);
			if ((sa === "Unknown") !== (sb === "Unknown")) return sa === "Unknown" ? 1 : -1;
			return sign * sa.localeCompare(sb);
		}
		return sign * (va - vb);
	});
}

export const REGIONAL_REPORT_TITLE = "Regional signal performance";
export const DISTRICT_REPORT_TITLE = "District signal performance";

export function performanceReportTitle(level: PerformanceLevel): string {
	return level === "district" ? DISTRICT_REPORT_TITLE : REGIONAL_REPORT_TITLE;
}

/**
 * The filters a table was counted under, as one line for a downloaded file —
 * "Bugisu · Mbale · Came in via 6767 SMS" — or "" when it covers everything
 * the viewer can see. Read from the server's echo, so a REOC user's file names
 * their region even though they never picked it.
 */
export function formatPerformanceScope(filters: PerformanceFiltersEcho | undefined): string {
	if (!filters) return "";
	const parts: string[] = [];
	// A long pick list is summarised, so the line still fits under a title.
	const list = (label: string, names: string[]) =>
		names.length <= 3 ? names.join(", ") : `${names.length} ${label}`;
	if (filters.regions.length) parts.push(list("regions", filters.regions));
	if (filters.districts.length) parts.push(list("districts", filters.districts));
	if (filters.division) parts.push(filters.division);
	const origin = SIGNAL_ORIGINS.find((o) => o.value === filters.origin);
	if (origin) parts.push(`Came in via ${origin.label}`);
	return parts.join(" · ");
}

/**
 * The slide's colours (bare hex, as pptxgenjs and jsPDF take them): navy
 * header and title, the green rule and page number, the pale-green grand total.
 */
export const REGIONAL_REPORT_COLORS = {
	navy: "1F2D4D",
	green: "1E7B45",
	totalFill: "C6EFCE",
	border: "A6A6A6",
	ink: "1F1F1F",
} as const;

export function regionalReportFileName(
	report: Pick<RegionalPerformanceReport, "fromDate" | "toDate" | "groupBy">,
	ext: "pptx" | "pdf" | "xlsx"
): string {
	const what = reportLevel(report) === "district" ? "district" : "regional";
	return `${what}-signal-performance_${report.fromDate}_to_${report.toDate}.${ext}`;
}

/**
 * A district as the performance tables name it: "Gulu City" and "Gulu
 * District" are both "Gulu", the one row that counts them (mirrors Go
 * services.districtDisplayName). Unlike lib/district-name, " City" IS
 * stripped — the server's district filter and grouping are canonical.
 */
export function performanceDistrictName(name: string): string {
	return name.trim().replace(/\s+(district|city)$/i, "").trim();
}

interface DistrictUnit {
	name: string;
	regionId?: number;
}
interface RegionUnit {
	id: number;
	name: string;
}

/**
 * District picker options for the performance filters: official districts,
 * City and District units merged under one name, limited to the given regions
 * (none = every district). Each option carries its region so a region change
 * can drop picks that fall outside it.
 */
export function performanceDistrictOptions(
	districts: DistrictUnit[],
	regions: RegionUnit[],
	inRegions: string[]
): { name: string; region: string }[] {
	const regionById = new Map(regions.map((r) => [r.id, r.name]));
	const wanted = new Set(inRegions.map((r) => r.trim().toLowerCase()));
	const byName = new Map<string, { name: string; region: string }>();
	for (const d of districts) {
		const region = (d.regionId != null && regionById.get(d.regionId)) || "";
		if (wanted.size > 0 && !wanted.has(region.toLowerCase())) continue;
		const name = performanceDistrictName(d.name);
		if (name && !byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), { name, region });
	}
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
