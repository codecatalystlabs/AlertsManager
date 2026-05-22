import type { ReportMatrix, ReportTimeseries } from "@/lib/fetch-reports";

function dateStamp(): string {
	return new Date().toISOString().split("T")[0];
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

function sanitizeFilenamePart(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 40);
}

function sanitizeSheetName(name: string): string {
	const cleaned = name.replace(/[\\/?*[\]:]/g, "").trim();
	return (cleaned || "Report").slice(0, 31);
}

function matrixToSheetRows(matrix: ReportMatrix): string[][] {
	const headers = ["District", ...matrix.columns];
	const rows = matrix.rows.map((row) => [
		row.label,
		...matrix.columns.map((_, i) => String(row.values[i] ?? 0)),
	]);
	return [headers, ...rows];
}

export function exportReportMatrixToCsv(
	matrix: ReportMatrix | null,
	filenamePrefix: string
): boolean {
	if (!matrix?.rows?.length) return false;

	const [headers, ...rows] = matrixToSheetRows(matrix);
	const csv = [headers, ...rows]
		.map((row) => row.map(escapeCsvCell).join(","))
		.join("\n");
	const blob = new Blob(["\ufeff" + csv], {
		type: "text/csv;charset=utf-8;",
	});
	const slug = sanitizeFilenamePart(filenamePrefix);
	downloadBlob(blob, `${slug}_${dateStamp()}.csv`);
	return true;
}

export async function exportReportMatrixToExcel(
	matrix: ReportMatrix | null,
	filenamePrefix: string,
	sheetName?: string
): Promise<boolean> {
	if (!matrix?.rows?.length) return false;
	if (typeof window === "undefined") {
		throw new Error("Excel export is only available in the browser");
	}

	const XLSX = await import("xlsx");
	const sheetData = matrix.rows.map((row) => {
		const record: Record<string, string | number> = {
			District: row.label,
		};
		matrix.columns.forEach((col, i) => {
			record[col] = row.values[i] ?? 0;
		});
		return record;
	});

	const worksheet = XLSX.utils.json_to_sheet(sheetData);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		workbook,
		worksheet,
		sanitizeSheetName(sheetName ?? filenamePrefix)
	);

	const buffer = XLSX.write(workbook, {
		bookType: "xlsx",
		type: "array",
	}) as ArrayBuffer;

	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	const slug = sanitizeFilenamePart(filenamePrefix);
	downloadBlob(blob, `${slug}_${dateStamp()}.xlsx`);
	return true;
}

export function exportTimeseriesToCsv(
	timeseries: ReportTimeseries | null,
	filenamePrefix: string
): boolean {
	if (!timeseries?.points?.length) return false;

	const headers = ["Date", "Signals", "Alerts"];
	const rows = timeseries.points.map((p) => [
		p.date,
		String(p.signals),
		String(p.alerts),
	]);
	const csv = [headers, ...rows]
		.map((row) => row.map(escapeCsvCell).join(","))
		.join("\n");
	const blob = new Blob(["\ufeff" + csv], {
		type: "text/csv;charset=utf-8;",
	});
	const slug = sanitizeFilenamePart(filenamePrefix);
	downloadBlob(blob, `${slug}_${dateStamp()}.csv`);
	return true;
}

export async function exportTimeseriesToExcel(
	timeseries: ReportTimeseries | null,
	filenamePrefix: string,
	sheetName = "Timeseries"
): Promise<boolean> {
	if (!timeseries?.points?.length) return false;
	if (typeof window === "undefined") {
		throw new Error("Excel export is only available in the browser");
	}

	const XLSX = await import("xlsx");
	const sheetData = timeseries.points.map((p) => ({
		Date: p.date,
		Signals: p.signals,
		Alerts: p.alerts,
	}));

	const worksheet = XLSX.utils.json_to_sheet(sheetData);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));

	const buffer = XLSX.write(workbook, {
		bookType: "xlsx",
		type: "array",
	}) as ArrayBuffer;

	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	const slug = sanitizeFilenamePart(filenamePrefix);
	downloadBlob(blob, `${slug}_${dateStamp()}.xlsx`);
	return true;
}

export function notifyExportEmpty(): void {
	window.alert("No data to export for this table.");
}
