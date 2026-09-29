/**
 * Regional signal performance — the EBS funnel, one row per region.
 *
 * The column list below is the ONE definition the in-app table, the .pptx
 * slide, the PDF and the Excel file all render from, so a column cannot be
 * added to one output and missed in another, and the "(%)" column is computed
 * in exactly one place.
 */

import type {
	RegionalPerformanceReport,
	RegionalPerformanceRow,
} from "@/lib/fetch-reports";

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

export const REGIONAL_COLUMNS: RegionalColumn[] = [
	{
		key: "region",
		header: "Region",
		description:
			'Official region of the case district. "Unknown" = the district maps to no region.',
		format: (r) => r.region,
		value: (r) => r.region,
	},
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
			"Verified signals whose outcome was recorded within 24 hours of the signal's date and time (the SLA clock).",
		...count((r) => r.verifiedWithin24h),
	},
	{
		key: "pct",
		header: "(%)",
		description: "Verify <24h ÷ Signal — the share of the region's coded signals verified inside 24 hours.",
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

/** Data rows followed by the grand total — the order every output prints. */
export function regionalTableRows(
	report: RegionalPerformanceReport
): { row: RegionalPerformanceRow; total: boolean }[] {
	return [
		...report.rows.map((row) => ({ row, total: false })),
		{ row: { ...report.total, region: "Grand Total" }, total: true },
	];
}

export const REGIONAL_REPORT_TITLE = "Regional signal performance";

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
	report: Pick<RegionalPerformanceReport, "fromDate" | "toDate">,
	ext: "pptx" | "pdf" | "xlsx"
): string {
	return `regional-signal-performance_${report.fromDate}_to_${report.toDate}.${ext}`;
}
