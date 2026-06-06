/** Export helpers for 6767 EIDSR SMS messages (CSV / Excel). */

import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";

type ExportColumn = {
	header: string;
	getValue: (message: EidsrMessage) => string | number;
};

const EXPORT_COLUMNS: ExportColumn[] = [
	{ header: "ID", getValue: (m) => m.id ?? "" },
	{ header: "Message ID", getValue: (m) => m.messageId ?? "" },
	{ header: "Reporter", getValue: (m) => m.personReporting ?? "" },
	{ header: "Phone", getValue: (m) => m.contactNumber ?? "" },
	{ header: "District", getValue: (m) => m.alertCaseDistrict ?? "" },
	{ header: "Village", getValue: (m) => m.village ?? "" },
	{ header: "Sub County", getValue: (m) => m.subCounty ?? "" },
	{ header: "Case Name", getValue: (m) => m.alertCaseName ?? "" },
	{ header: "Age", getValue: (m) => m.alertCaseAge ?? "" },
	{ header: "Sex", getValue: (m) => m.alertCaseSex ?? "" },
	{ header: "Disease / Response", getValue: (m) => m.response ?? "" },
	{ header: "Source", getValue: (m) => m.sourceOfAlert ?? "" },
	{ header: "Symptoms", getValue: (m) => m.symptoms ?? "" },
	{ header: "Message", getValue: (m) => m.messageText ?? "" },
	{ header: "Status", getValue: (m) => m.status ?? "" },
	{
		header: "Linked Alert",
		getValue: (m) =>
			m.linkedAlertId != null
				? `ALT${String(m.linkedAlertId).padStart(3, "0")}`
				: "",
	},
	{
		header: "Verified",
		getValue: (m) => (isEidsr6767Verified(m) ? "Yes" : "Pending"),
	},
	{ header: "Received", getValue: (m) => m.receivedAt || m.createdAt || "" },
];

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

export function exportEidsrMessagesToCsv(
	messages: EidsrMessage[],
	filenamePrefix: string
): boolean {
	if (messages.length === 0) return false;

	const headers = EXPORT_COLUMNS.map((col) => col.header);
	const rows = messages.map((message) =>
		EXPORT_COLUMNS.map((col) => escapeCsvCell(col.getValue(message))).join(",")
	);
	const csv = [headers.join(","), ...rows].join("\n");
	const blob = new Blob(["\ufeff" + csv], {
		type: "text/csv;charset=utf-8;",
	});

	downloadBlob(blob, `${filenamePrefix}_${dateStamp()}.csv`);
	return true;
}

function sanitizeSheetName(name: string): string {
	const cleaned = name.replace(/[\\/?*[\]:]/g, "").trim();
	return (cleaned || "Messages").slice(0, 31);
}

function cellValue(value: string | number): string | number {
	if (value == null || value === "") return "";
	if (typeof value === "number") return value;
	return value.length > 32767 ? value.slice(0, 32767) : value;
}

export async function exportEidsrMessagesToExcel(
	messages: EidsrMessage[],
	filenamePrefix: string,
	sheetName = "Messages"
): Promise<boolean> {
	if (messages.length === 0) return false;
	if (typeof window === "undefined") {
		throw new Error("Excel export is only available in the browser");
	}

	const XLSX = await import("xlsx");
	const sheetData = messages.map((message) => {
		const row: Record<string, string | number> = {};
		for (const col of EXPORT_COLUMNS) {
			row[col.header] = cellValue(col.getValue(message));
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

	downloadBlob(blob, `${filenamePrefix}_${dateStamp()}.xlsx`);
	return true;
}
