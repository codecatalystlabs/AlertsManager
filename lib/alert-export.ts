/** Shared export helpers for alert / call-log data */

import { formatDate, formatTime } from "@/lib/format-date";
import { altCode } from "@/lib/alt-code";
import {
	deriveAlertOutcome,
	deriveDeskVerificationOutcome,
} from "./alert-outcome";
import { formatDeadline, priorityLabel } from "@/lib/alert-triage";
import {
	alertSignalTimestamp,
	computeAlertSla,
	formatSlaElapsed,
	SLA_STATUS_LABEL,
} from "@/lib/alert-sla";
import { feedbackGiven, feedbackIsDue } from "@/lib/alert-feedback";

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
	/** Comma-joined signs and symptoms as captured on the alert form. */
	symptoms?: string | null;
	isVerified?: boolean;
	callTaker?: string;
	narrative?: string;
	// Verification-outcome sources (see deriveAlertOutcome for precedence).
	caseVerificationDesk?: string | null;
	fieldVerificationDecision?: string | null;
	actions?: string | null;
	// --- Triage (EBS step 2) -------------------------------------------------
	priority?: string | null;
	triagedAt?: string | null;
	triagedBy?: string | null;
	// --- Verification (EBS step 3) + response (step 6) -----------------------
	verificationOutcome?: string | null;
	responseActions?: string | null;
	fieldVerification?: string | null;
	verificationDate?: string | null;
	verificationTime?: string | null;
	verifiedBy?: string | null;
	comments?: string | null;
	feedback?: string | null;
	labSamplesCollected?: string | null;
	labResult?: string | null;
	labResultDate?: string | null;
	// --- Risk assessment (EBS step 4) ----------------------------------------
	riskLevel?: string | null;
	riskSevere?: boolean | null;
	riskSpread?: boolean | null;
	riskControl?: boolean | null;
	riskLikelihood?: string | null;
	riskImpact?: string | null;
	riskHazardNote?: string | null;
	riskExposureNote?: string | null;
	riskContextNote?: string | null;
	riskTeamLead?: string | null;
	riskTeamMembers?: string | null;
	riskAssessedAt?: string | null;
	riskAssessedBy?: string | null;
	// --- Reporter feedback (EBS step 7) --------------------------------------
	feedbackGivenAt?: string | null;
	feedbackBy?: string | null;
	feedbackChannel?: string | null;
	// Fallback timestamps for the SLA clock on rows verified before the
	// verification timestamp was enforced.
	createdAt?: string | null;
	updatedAt?: string | null;
}

type ExportColumn = {
	header: string;
	getValue: (alert: ExportableAlert) => string | number;
};

/** Who/what/where: the signal as it was received. */
const SIGNAL_COLUMNS: ExportColumn[] = [
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
	{ header: "Symptoms", getValue: (a) => formatSymptoms(a.symptoms) },
];

/** The three verification summary columns both exports have always carried. */
const OUTCOME_SUMMARY_COLUMNS: ExportColumn[] = [
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
];

const TAIL_COLUMNS: ExportColumn[] = [
	{ header: "Call Taker", getValue: (a) => a.callTaker ?? "" },
	{ header: "Narrative", getValue: (a) => a.narrative ?? "" },
];

/**
 * Triage (EBS step 2). "Untriaged" is spelled out rather than left blank
 * because an empty priority cell reads as missing data, when in fact it is the
 * finding: nobody has screened the signal. The deadline column is the one the
 * SLA was actually scored against, so an untriaged row shows the Medium
 * fallback (see verificationDeadlineMinutes).
 */
const TRIAGE_COLUMNS: ExportColumn[] = [
	{ header: "Triage Priority", getValue: (a) => priorityLabel(a.priority) },
	{
		header: "Verification Deadline",
		getValue: (a) => formatDeadline(a.priority),
	},
	{ header: "Triaged Date", getValue: (a) => formatExportDate(a.triagedAt) },
	{ header: "Triaged Time", getValue: (a) => formatExportTime(a.triagedAt) },
	{ header: "Triaged By", getValue: (a) => a.triagedBy ?? "" },
	{ header: "Time to Triage", getValue: (a) => timeToTriage(a) },
];

/**
 * Verification (step 3), the response actions it produced (step 6) and the lab
 * follow-up. "Verification Decision" is the structured Confirmed / Discarded /
 * Escalated-to-Field field; the derived outcome columns above it stay because
 * older rows only ever carried the legacy free-text values.
 */
const VERIFICATION_DETAIL_COLUMNS: ExportColumn[] = [
	{
		header: "Verification Decision",
		getValue: (a) => a.verificationOutcome ?? "",
	},
	{
		header: "Desk Verification Actions",
		getValue: (a) => a.caseVerificationDesk ?? "",
	},
	{ header: "Response Actions", getValue: (a) => a.responseActions ?? "" },
	{
		header: "Field Verification Decision",
		getValue: (a) => a.fieldVerificationDecision ?? "",
	},
	{
		header: "Field Verification Notes",
		getValue: (a) => a.fieldVerification ?? "",
	},
	{
		header: "Verification Date",
		getValue: (a) => formatExportDate(a.verificationTime ?? a.verificationDate),
	},
	{
		header: "Verification Time",
		getValue: (a) => formatExportTime(a.verificationTime),
	},
	{ header: "Verified By", getValue: (a) => a.verifiedBy ?? "" },
	{ header: "Time to Verify", getValue: (a) => timeToVerify(a) },
	{ header: "SLA Status", getValue: (a) => slaStatus(a) },
	{ header: "Verification Comments", getValue: (a) => a.comments ?? "" },
	{ header: "Verification Feedback", getValue: (a) => a.feedback ?? "" },
	{
		header: "Lab Samples Collected",
		getValue: (a) => a.labSamplesCollected ?? "",
	},
	{ header: "Lab Result", getValue: (a) => a.labResult ?? "" },
	{
		header: "Lab Result Date",
		getValue: (a) => formatExportDate(a.labResultDate),
	},
];

/** Risk assessment (step 4): the algorithm answers, the matrix axes and the RRT. */
const RISK_COLUMNS: ExportColumn[] = [
	{ header: "Risk Level", getValue: (a) => a.riskLevel ?? "" },
	{
		header: "Risk: Severe Illness/Death",
		getValue: (a) => yesNo(a.riskSevere),
	},
	{ header: "Risk: Likely to Spread", getValue: (a) => yesNo(a.riskSpread) },
	{
		header: "Risk: Control Measures Available",
		getValue: (a) => yesNo(a.riskControl),
	},
	{ header: "Risk Likelihood", getValue: (a) => a.riskLikelihood ?? "" },
	{ header: "Risk Impact", getValue: (a) => a.riskImpact ?? "" },
	{ header: "Risk Hazard Notes", getValue: (a) => a.riskHazardNote ?? "" },
	{ header: "Risk Exposure Notes", getValue: (a) => a.riskExposureNote ?? "" },
	{ header: "Risk Context Notes", getValue: (a) => a.riskContextNote ?? "" },
	{ header: "RRT Lead", getValue: (a) => a.riskTeamLead ?? "" },
	{ header: "RRT Members", getValue: (a) => a.riskTeamMembers ?? "" },
	{
		header: "Risk Assessed Date",
		getValue: (a) => formatExportDate(a.riskAssessedAt),
	},
	{
		header: "Risk Assessed Time",
		getValue: (a) => formatExportTime(a.riskAssessedAt),
	},
	{ header: "Risk Assessed By", getValue: (a) => a.riskAssessedBy ?? "" },
];

/** Reporter feedback (step 7) — given / still owed / not due yet. */
const FEEDBACK_COLUMNS: ExportColumn[] = [
	{ header: "Reporter Feedback", getValue: (a) => feedbackStatus(a) },
	{
		header: "Feedback Date",
		getValue: (a) => formatExportDate(a.feedbackGivenAt),
	},
	{
		header: "Feedback Time",
		getValue: (a) => formatExportTime(a.feedbackGivenAt),
	},
	{ header: "Feedback By", getValue: (a) => a.feedbackBy ?? "" },
	{ header: "Feedback Channel", getValue: (a) => a.feedbackChannel ?? "" },
];

/**
 * CSV stays the compact summary — it is the quick-glance/scripting format, so
 * it carries the signal and its outcome rather than every pipeline stage. Note
 * that anything added to SIGNAL_COLUMNS lands here too, shifting the columns
 * after it: a positional parser downstream has to be updated in step.
 */
const EXPORT_COLUMNS: ExportColumn[] = [
	...SIGNAL_COLUMNS,
	...OUTCOME_SUMMARY_COLUMNS,
	...TAIL_COLUMNS,
];

/**
 * Excel is the full case record: every stage of the EBS pipeline the row has
 * been through, with the date, the actor and the detail for each. Blocks run in
 * pipeline order (signal → triage → verification/response → risk → feedback) so
 * a reader scans left to right through the signal's life.
 */
const EXCEL_COLUMNS: ExportColumn[] = [
	// Subcounty slots in right after District (index 9 of the signal block).
	...SIGNAL_COLUMNS.slice(0, 9),
	{ header: "Subcounty", getValue: (a) => a.subCounty ?? "" },
	...SIGNAL_COLUMNS.slice(9),
	...TRIAGE_COLUMNS,
	...OUTCOME_SUMMARY_COLUMNS,
	...VERIFICATION_DETAIL_COLUMNS,
	...RISK_COLUMNS,
	...FEEDBACK_COLUMNS,
	...TAIL_COLUMNS,
];

/** Header row of the Excel sheet, in order. Exported for tests. */
export const EXCEL_EXPORT_HEADERS: string[] = EXCEL_COLUMNS.map(
	(col) => col.header
);

/** One Excel row keyed by header. Exported for tests. */
export function buildExcelRow(
	alert: ExportableAlert
): Record<string, string | number> {
	const row: Record<string, string | number> = {};
	for (const col of EXCEL_COLUMNS) {
		row[col.header] = cellValue(col.getValue(alert));
	}
	return row;
}

/**
 * Symptoms are stored as one comma-joined string whose spacing depends on which
 * form wrote it ("Fever,Cough" from the intake form, "Fever, Cough" from the
 * NDW mappers). Re-join them uniformly so the column sorts and reads the same
 * way for every row, and so a trailing comma doesn't render as an empty item.
 */
function formatSymptoms(value?: string | null): string {
	if (!value) return "";
	return value
		.split(",")
		.map((symptom) => symptom.trim())
		.filter(Boolean)
		.join(", ");
}

/** "Yes" / "No", or blank when the question was never answered. */
function yesNo(value?: boolean | null): string {
	if (value == null) return "";
	return value ? "Yes" : "No";
}

function parseTimestamp(value?: string | null): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** How long the signal waited to be triaged (KPI #3 is a 24h deadline). */
function timeToTriage(alert: ExportableAlert): string {
	const start = alertSignalTimestamp(alert);
	const triaged = parseTimestamp(alert.triagedAt);
	if (!start || !triaged) return "";
	return formatSlaElapsed(
		Math.max(0, Math.floor((triaged.getTime() - start.getTime()) / 60_000))
	);
}

/**
 * How long the signal took to verify. Blank while the clock is still running —
 * an unverified alert has no verification duration, and printing its current
 * age in that column would read as one. Its lateness shows in "SLA Status".
 */
function timeToVerify(alert: ExportableAlert): string {
	const sla = computeAlertSla(alert);
	if (!sla || sla.running) return "";
	return formatSlaElapsed(sla.elapsedMinutes);
}

function slaStatus(alert: ExportableAlert): string {
	const sla = computeAlertSla(alert);
	return sla ? SLA_STATUS_LABEL[sla.color] : "";
}

function feedbackStatus(alert: ExportableAlert): string {
	if (feedbackGiven(alert.feedbackGivenAt)) return "Given";
	return feedbackIsDue(alert.verificationOutcome) ? "Pending" : "Not due";
}

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

function formatExportDate(dateStr?: string | null): string {
	return formatDate(dateStr, "");
}

function formatExportTime(timeStr?: string | null): string {
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

/**
 * Width each column opens at. With the full case record now running to dozens
 * of columns, the default width leaves every date and outcome truncated to
 * "#####" until the reader widens them by hand. Sized to the longest value,
 * capped so a long narrative doesn't push a single column off the screen.
 */
function columnWidths(
	rows: Record<string, string | number>[]
): { wch: number }[] {
	return EXCEL_EXPORT_HEADERS.map((header) => {
		let longest = header.length;
		for (const row of rows) {
			const length = String(row[header] ?? "").length;
			if (length > longest) longest = length;
		}
		return { wch: Math.min(Math.max(longest + 2, 10), 45) };
	});
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
	const sheetData = alerts.map(buildExcelRow);

	// Pass the headers explicitly: json_to_sheet otherwise infers them from the
	// first row's keys, which would silently reorder (or drop) columns.
	const worksheet = XLSX.utils.json_to_sheet(sheetData, {
		header: EXCEL_EXPORT_HEADERS,
	});
	worksheet["!cols"] = columnWidths(sheetData);
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
