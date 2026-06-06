/** Shared export helpers for alert / call-log data */

export interface ExportableAlert {
	id?: number;
	status: string;
	date: string;
	time: string;
	personReporting: string;
	contactNumber: string;
	sourceOfAlert: string;
	alertCaseDistrict?: string;
	alertCaseName?: string;
	alertCaseAge?: number;
	alertCaseSex?: string;
	response?: string;
	isVerified?: boolean;
	callTaker?: string;
	narrative?: string;
}

type ExportColumn = {
	header: string;
	getValue: (alert: ExportableAlert) => string | number;
};

const EXPORT_COLUMNS: ExportColumn[] = [
	{
		header: "Alert ID",
		getValue: (a) =>
			a.id != null ? `ALT${String(a.id).padStart(3, "0")}` : "",
	},
	{ header: "Status", getValue: (a) => a.status ?? "" },
	{ header: "Date", getValue: (a) => formatExportDate(a.date) },
	{ header: "Time", getValue: (a) => formatExportTime(a.time) },
	{ header: "Reporter", getValue: (a) => a.personReporting ?? "" },
	{ header: "Contact Number", getValue: (a) => a.contactNumber ?? "" },
	{ header: "Source", getValue: (a) => a.sourceOfAlert ?? "" },
	{ header: "District", getValue: (a) => a.alertCaseDistrict ?? "" },
	{ header: "Case Name", getValue: (a) => a.alertCaseName ?? "" },
	{ header: "Age", getValue: (a) => a.alertCaseAge ?? "" },
	{ header: "Sex", getValue: (a) => a.alertCaseSex ?? "" },
	{ header: "Response", getValue: (a) => a.response ?? "" },
	{
		header: "Verified",
		getValue: (a) => (a.isVerified ? "Yes" : "Pending"),
	},
	{ header: "Call Taker", getValue: (a) => a.callTaker ?? "" },
	{ header: "Narrative", getValue: (a) => a.narrative ?? "" },
];

/** Date window an export covers; either bound may be empty/omitted. */
export interface ExportRange {
	/** Inclusive start, YYYY-MM-DD. */
	from?: string;
	/** Inclusive end, YYYY-MM-DD. */
	to?: string;
}

function dateStamp(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * Build the download filename, encoding the selected date range so an exported
 * file is self-describing (e.g. call_logs_export_2026-01-01_to_2026-03-31.csv).
 * Falls back to today's stamp when no range is selected (full/all-time export).
 */
function buildExportFilename(
	prefix: string,
	extension: string,
	range?: ExportRange
): string {
	const from = range?.from?.trim();
	const to = range?.to?.trim();

	let suffix: string;
	if (from && to) suffix = `${from}_to_${to}`;
	else if (from) suffix = `from_${from}`;
	else if (to) suffix = `through_${to}`;
	else suffix = dateStamp(); // no range selected → today's stamp (unchanged)

	return `${prefix}_${suffix}.${extension}`;
}

function formatExportDate(dateStr: string): string {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

function formatExportTime(timeStr: string): string {
	if (!timeStr) return "";
	const d = new Date(timeStr);
	return Number.isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString();
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
	range?: ExportRange
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

	downloadBlob(blob, buildExportFilename(filenamePrefix, "csv", range));
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
	range?: ExportRange
): Promise<boolean> {
	if (alerts.length === 0) return false;
	if (typeof window === "undefined") {
		throw new Error("Excel export is only available in the browser");
	}

	const XLSX = await import("xlsx");
	const sheetData = alerts.map((alert) => {
		const row: Record<string, string | number> = {};
		for (const col of EXPORT_COLUMNS) {
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

	downloadBlob(blob, buildExportFilename(filenamePrefix, "xlsx", range));
	return true;
}
