/**
 * The Alerts Management report as a FORMAT-NEUTRAL document.
 *
 * The deck already existed as .pptx (management-report-pptx.ts). Adding PDF and
 * DOCX by writing each one against the raw `ManagementReport` would have given
 * three exporters free to drift — three places to add a column, three places to
 * honour a section toggle, three chances for the Word file to disagree with the
 * slides about what "Alerts" means.
 *
 * So both new formats render from this one block list instead. It carries the
 * same section toggles and the same `scopeColumns()` the deck and the in-app
 * view use, which is what keeps every output reconciling with the app.
 *
 * Charts are the one thing that does NOT survive the translation: a pie is a
 * picture, and a document that draws its own would be a second implementation of
 * the same numbers. Their underlying counts are emitted as tables instead — the
 * data is all there, and the map (already rendered to a PNG for the deck) is
 * carried through as an image.
 */

import type {
	ManagementCount,
	ManagementDetail,
	ManagementReport,
	ManagementScope,
	ManagementTopDistrict,
} from "@/lib/fetch-reports";
import type { DeckConfig } from "@/lib/management-report-config";
import { defaultDeckConfig } from "@/lib/management-report-config";
import { formatReportRange, scopeColumns } from "@/lib/management-report-pptx";

/** One renderable piece of the document. */
export type DocBlock =
	| { kind: "title"; text: string; subtitle?: string; meta?: string }
	| { kind: "heading"; text: string; level: 1 | 2 }
	| { kind: "paragraph"; text: string; muted?: boolean }
	| {
			kind: "table";
			headers: string[];
			rows: string[][];
			/** Rendered bold — section subtotals and grand totals. */
			boldRows?: number[];
			/** Columns after this index are numeric (right-aligned). */
			firstNumericColumn?: number;
	  }
	| { kind: "image"; dataUrl: string; aspect: number; caption?: string };

const num = (n: number): string => n.toLocaleString();

/**
 * A scope's district tables, one per patient status, plus the grand total.
 * Columns come from the SAME scopeColumns() the slides use, so a column that
 * appears in the deck cannot be missing from the Word file.
 */
function scopeTables(
	scope: ManagementScope,
	withAlerts: boolean,
	heading: string
): DocBlock[] {
	const cols = scopeColumns(scope, withAlerts);
	const blocks: DocBlock[] = [{ kind: "heading", text: heading, level: 2 }];

	for (const section of scope.sections) {
		const rows = section.districts.map((d) => [
			d.district,
			...cols.map((c) => num(c.value(d))),
		]);
		rows.push([
			`${section.status} total`,
			...cols.map((c) => num(c.value(section.totals))),
		]);
		blocks.push(
			{ kind: "heading", text: section.status, level: 2 },
			{
				kind: "table",
				headers: ["District", ...cols.map((c) => c.header)],
				rows,
				boldRows: [rows.length - 1],
				firstNumericColumn: 1,
			}
		);
	}

	blocks.push({
		kind: "table",
		headers: ["Grand total", ...cols.map((c) => c.header)],
		rows: [["All statuses", ...cols.map((c) => num(c.value(scope.totals)))]],
		boldRows: [0],
		firstNumericColumn: 1,
	});
	return blocks;
}

/** The response cascade as a table — the numbers behind the deck's bar chart. */
function cascadeTable(scope: ManagementScope, heading: string): DocBlock[] {
	const statuses = Object.keys(scope.cascade);
	if (statuses.length === 0) return [];

	const metrics: { label: string; key: keyof ManagementScope["cascade"][string] }[] =
		[
			{ label: "Signals", key: "signals" },
			{ label: "Signals verified", key: "signalsVerified" },
			{ label: "Alerts", key: "alerts" },
			{ label: "Sample collected", key: "sampleCollected" },
			{ label: "Field case verification", key: "fieldCaseVerification" },
			{ label: "SDB", key: "sdb" },
			{ label: "RRT deployment", key: "rrtDeployment" },
			{ label: "EMS", key: "ems" },
		];

	return [
		{ kind: "heading", text: heading, level: 2 },
		{
			kind: "table",
			headers: ["Stage", ...statuses],
			rows: metrics.map((m) => [
				m.label,
				...statuses.map((s) => num(scope.cascade[s][m.key])),
			]),
			firstNumericColumn: 1,
		},
	];
}

function countTable(
	items: ManagementCount[],
	heading: string,
	labelHeader: string
): DocBlock[] {
	if (items.length === 0) return [];
	const total = items.reduce((s, i) => s + i.count, 0);
	const rows = items.map((i) => [i.label, num(i.count)]);
	rows.push(["Total", num(total)]);
	return [
		{ kind: "heading", text: `${heading} (n=${num(total)})`, level: 2 },
		{
			kind: "table",
			headers: [labelHeader, "Count"],
			rows,
			boldRows: [rows.length - 1],
			firstNumericColumn: 1,
		},
	];
}

function topDistrictsTable(items: ManagementTopDistrict[]): DocBlock[] {
	if (items.length === 0) return [];
	return [
		{ kind: "heading", text: "Top districts", level: 2 },
		{
			kind: "table",
			headers: ["District", "VHF", "Other PHEs"],
			rows: items.map((d) => [d.district, num(d.vhf), num(d.other)]),
			firstNumericColumn: 1,
		},
	];
}

function narrativesTable(
	details: ManagementDetail[],
	total: number,
	emptyText: string
): DocBlock[] {
	const blocks: DocBlock[] = [
		{ kind: "heading", text: "Alert details", level: 2 },
	];
	if (details.length === 0) {
		blocks.push({ kind: "paragraph", text: emptyText, muted: true });
		return blocks;
	}
	blocks.push({
		kind: "table",
		headers: ["Source", "District", "Narrative"],
		rows: details.map((d) => [d.source, d.district, d.narrative]),
	});
	// Say when the table is a subset, so a missing alert reads as "truncated",
	// not "not reported".
	if (total > details.length) {
		blocks.push({
			kind: "paragraph",
			text: `Showing ${num(details.length)} of ${num(total)} alert details.`,
			muted: true,
		});
	}
	return blocks;
}

export interface ManagementDocInput {
	report: ManagementReport;
	config?: DeckConfig;
	/** The district choropleth, already rendered to a PNG for the deck. */
	map?: { dataUrl: string; aspect: number } | null;
}

/**
 * Build the document. Honours the same `config.slides` toggles as the deck, so
 * turning a section off turns it off in every format.
 */
export function buildManagementReportDoc({
	report,
	config = defaultDeckConfig(),
	map = null,
}: ManagementDocInput): DocBlock[] {
	const range = formatReportRange(report.fromDate, report.toDate);
	const slides = config.slides;
	const blocks: DocBlock[] = [];

	const title = config.cover.title.trim() || "Alerts Management report";
	blocks.push({
		kind: "title",
		text: title,
		subtitle: config.cover.subtitle?.trim() || undefined,
		meta: range,
	});

	if (slides.districtTables) {
		blocks.push({ kind: "heading", text: "All PHEs", level: 1 });
		blocks.push(...scopeTables(report.allPhes, false, "District summary"));
		blocks.push({ kind: "heading", text: "VHFs", level: 1 });
		blocks.push(...scopeTables(report.vhf, true, "District summary"));
	}

	if (slides.cascade) {
		blocks.push({ kind: "heading", text: "Response cascade", level: 1 });
		blocks.push(...cascadeTable(report.allPhes, "All PHEs"));
		blocks.push(...cascadeTable(report.vhf, "VHFs"));
	}

	if (slides.sources) {
		blocks.push({ kind: "heading", text: "Signal sources", level: 1 });
		blocks.push(...countTable(report.sources, "Signal sources", "Source"));
	}

	if (slides.diseaseBar) {
		blocks.push(
			...countTable(report.otherPhes, "Other PHEs reported", "Condition")
		);
	}

	if (slides.map) {
		blocks.push({ kind: "heading", text: "Geographic distribution", level: 1 });
		if (map) {
			blocks.push({
				kind: "image",
				dataUrl: map.dataUrl,
				aspect: map.aspect,
				caption: `Alerts by district (${range})`,
			});
		}
		blocks.push(...topDistrictsTable(report.topDistricts));
	}

	if (slides.trend && report.trend.length > 0) {
		blocks.push({ kind: "heading", text: "Signals vs alerts trend", level: 1 });
		blocks.push({
			kind: "table",
			headers: ["Date", "Signals", "Alerts"],
			rows: report.trend.map((p) => [p.date, num(p.signals), num(p.alerts)]),
			firstNumericColumn: 1,
		});
	}

	if (slides.narratives) {
		blocks.push({ kind: "heading", text: "Alert details", level: 1 });
		blocks.push(
			...narrativesTable(
				report.details,
				report.detailsTotal,
				"No VHF alerts in this range."
			)
		);
	}

	// The disease-focus block sits ALONGSIDE the full report, never replacing
	// it — same rule as the deck.
	if (slides.focus && report.focus) {
		const focus = report.focus;
		blocks.push({
			kind: "heading",
			text: `Disease focus: ${focus.diseases.join(", ")}`,
			level: 1,
		});
		blocks.push(...scopeTables(focus.scope, true, "District summary"));
		blocks.push(...countTable(focus.sources, "Signal sources", "Source"));
		blocks.push(...topDistrictsTable(focus.topDistricts));
		blocks.push(
			...narrativesTable(
				focus.details,
				focus.detailsTotal,
				"No alerts for the focus diseases in this range."
			)
		);
	}

	return blocks;
}

/** Shared filename, so the three formats differ only by extension. */
export function managementReportFileName(
	report: ManagementReport,
	config: DeckConfig,
	extension: string
): string {
	const base = (config.cover.title.trim() || "Alerts Management report")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
	return `${base}-${report.fromDate}-to-${report.toDate}.${extension}`;
}
