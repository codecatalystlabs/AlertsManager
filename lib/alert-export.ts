/** Shared export helpers for alert / call-log data */

import { formatDate, formatTime } from "@/lib/format-date";
import { altCode } from "@/lib/alt-code";
import {
	deriveAlertOutcome,
	deriveDeskVerificationOutcome,
} from "./alert-outcome";

export interface ExportableAlert {
	id?: number;
	status: string;
	date: string;
	time: string;
	personReporting: string;
	contactNumber: string;
	sourceOfAlert: string;
	region?: string;
	alertCaseDistrict?: string;
	subCounty?: string;
	alertCaseName?: string;
	alertCaseAge?: number;
	alertCaseSex?: string;
	response?: string;
	isVerified?: boolean;
	callTaker?: string;
	narrative?: string;
	// Verification-outcome sources (see deriveAlertOutcome for precedence).
	caseVerificationDesk?: string | null;
	fieldVerificationDecision?: string | null;
	actions?: string | null;
}

type ExportColumn = {
	header: string;
	getValue: (alert: ExportableAlert) => string | number;
};

const EXPORT_COLUMNS: ExportColumn[] = [
	{
		header: "Alert ID",
		getValue: (a) =>
			a.id != null ? `${altCode(a.id)}` : "",
	},
	{ header: "Status", getValue: (a) => a.status ?? "" },
	{ header: "Date", getValue: (a) => formatExportDate(a.date) },
	{ header: "Time", getValue: (a) => formatExportTime(a.time) },
	{ header: "Reporter", getValue: (a) => a.personReporting ?? "" },
	{ header: "Contact Number", getValue: (a) => a.contactNumber ?? "" },
	{ header: "Source", getValue: (a) => a.sourceOfAlert ?? "" },
	{ header: "Region", getValue: (a) => a.region ?? "" },
	{ header: "District", getValue: (a) => a.alertCaseDistrict ?? "" },
	{ header: "Case Name", getValue: (a) => a.alertCaseName ?? "" },
	{ header: "Age", getValue: (a) => a.alertCaseAge ?? "" },
	{ header: "Sex", getValue: (a) => a.alertCaseSex ?? "" },
	{ header: "Response", getValue: (a) => a.response ?? "" },
	{
		header: "Verified",
		getValue: (a) => (a.isVerified ? "Yes" : "Pending"),
	},
	{
		header: "Desk Verification Outcome",
		getValue: (a) => deriveDeskVerificationOutcome(a),
	},
	{
		header: "Verification Outcome",
		getValue: (a) => deriveAlertOutcome(a),
	},
	{ header: "Call Taker", getValue: (a) => a.callTaker ?? "" },
	{ header: "Narrative", getValue: (a) => a.narrative ?? "" },
];

const EXCEL_COLUMNS: ExportColumn[] = [
	// Columns 0-8 run Alert ID … Source, Region, District; Subcounty slots in
	// right after District, then the remaining columns (Case Name onward).
	...EXPORT_COLUMNS.slice(0, 9),
	{ header: "Subcounty", getValue: (a) => a.subCounty ?? "" },
	...EXPORT_COLUMNS.slice(9),
];

export interface ExportRange {
	from?: string;
	to?: string;
}

/** Filename descriptor: a date range plus human-readable active-filter tokens. */
export interface ExportNameOptions {
	range?: ExportRange;
	/** Active filter labels woven into the name, e.g. ["Kampala", "verified"]. */
	tokens?: string[];
}

function dateStamp(): string {
	return new Date().toISOString().split("T")[0];
}

/** Make a token filesystem-safe: keep alphanumerics, collapse the rest to "-". */
function sanitizeToken(value: string): string {
	return value
		.trim()
		.replace(/[^A-Za-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function buildExportFilename(
	prefix: string,
	extension: string,
	options?: ExportNameOptions
): string {
	const tokens = (options?.tokens ?? []).map(sanitizeToken).filter(Boolean);

	const from = options?.range?.from?.trim();
	const to = options?.range?.to?.trim();

	let rangePart: string;
	if (from && to) rangePart = `${from}_to_${to}`;
	else if (from) rangePart = `from_${from}`;
	else if (to) rangePart = `through_${to}`;
	else rangePart = dateStamp(); // no range selected → timestamp the export

	const parts = [prefix, ...tokens, rangePart];
	let name = parts.join("_");
	// Guard against unwieldy names when many filters are active.
	if (name.length > 180) name = name.slice(0, 180).replace(/_+$/, "");

	return `${name}.${extension}`;
}

function formatExportDate(dateStr: string): string {
	return formatDate(dateStr, "");
}

function formatExportTime(timeStr: string): string {
	return formatTime(timeStr, "");
}

function escapeCsvCell(value: unknown): string {
	const str = value == null ? "" : String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	window.URL.revokeObjectURL(url);
}

function rowsFromAlerts(alerts: ExportableAlert[]): string[][] {
	return alerts.map((alert) =>
		EXPORT_COLUMNS.map((col) => String(col.getValue(alert) ?? ""))
	);
}

export function exportAlertsToCsv(
	alerts: ExportableAlert[],
	filenamePrefix: string,
	options?: ExportNameOptions
): boolean {
	if (alerts.length === 0) return false;

	const headers = EXPORT_COLUMNS.map((col) => col.header);
	const rows = rowsFromAlerts(alerts).map((row) =>
		row.map(escapeCsvCell).join(",")
	);
	const csv = [headers.join(","), ...rows].join("\n");
	const blob = new Blob(["\ufeff" + csv], {
		type: "text/csv;charset=utf-8;",
	});

	downloadBlob(blob, buildExportFilename(filenamePrefix, "csv", options));
	return true;
}

function sanitizeSheetName(name: string): string {
	const cleaned = name.replace(/[\\/?*[\]:]/g, "").trim();
	return (cleaned || "Alerts").slice(0, 31);
}

function cellValue(value: string | number): string | number {
	if (value == null || value === "") return "";
	if (typeof value === "number") return value;
	return value.length > 32767 ? value.slice(0, 32767) : value;
}

export async function exportAlertsToExcel(
	alerts: ExportableAlert[],
	filenamePrefix: string,
	sheetName = "Alerts",
	options?: ExportNameOptions
): Promise<boolean> {
	if (alerts.length === 0) return false;
	if (typeof window === "undefined") {
		throw new Error("Excel export is only available in the browser");
	}

	const XLSX = await import("xlsx");
	const sheetData = alerts.map((alert) => {
		const row: Record<string, string | number> = {};
		for (const col of EXCEL_COLUMNS) {
			row[col.header] = cellValue(col.getValue(alert));
		}
		return row;
	});

	const worksheet = XLSX.utils.json_to_sheet(sheetData);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		workbook,
		worksheet,
		sanitizeSheetName(sheetName)
	);

	// writeFile uses Node fs and fails in Next.js client bundles — use Blob download
	const buffer = XLSX.write(workbook, {
		bookType: "xlsx",
		type: "array",
	}) as ArrayBuffer;

	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	downloadBlob(blob, buildExportFilename(filenamePrefix, "xlsx", options));
	return true;
}
