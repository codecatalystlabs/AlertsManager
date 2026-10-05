/**
 * Signal performance (regional or district) → .pptx / .pdf / .xlsx.
 *
 * All three render the same columns over the same rows
 * (lib/regional-performance.ts), so the files cannot disagree with each other
 * or with the table on screen. The libraries are imported lazily — they are
 * large and only needed at the moment someone downloads.
 *
 * The regional table is one slide / one page, as on the weekly deck. The
 * district table runs to a hundred-odd rows, so it is split across slides and
 * pages with the header repeated, and the grand total closes the last one.
 */

import type PptxGenJSType from "pptxgenjs";
import type { RegionalPerformanceReport } from "@/lib/fetch-reports";
import { formatReportRange } from "@/lib/management-report-pptx";
import { SIGNAL_ORIGINS } from "@/lib/signal-origin";
import {
	REGIONAL_REPORT_COLORS as C,
	formatPerformanceScope,
	performanceColumns,
	performanceReportTitle,
	regionalReportFileName,
	regionalTableRows,
	reportLevel,
	type RegionalColumn,
} from "@/lib/regional-performance";

/** "Column — what it counts" lines, for slide notes, PDF footnotes and the
 * spreadsheet's Notes sheet. */
function definitionLines(columns: RegionalColumn[]): string[] {
	return columns.map((c) => `${c.header} — ${c.description}`);
}

/** The line under the title: the period, then any filters it was cut by. */
function subtitle(report: RegionalPerformanceReport): string {
	const scope = formatPerformanceScope(report.filters);
	const range = formatReportRange(report.fromDate, report.toDate);
	return scope ? `${range}  ·  ${scope}` : range;
}

/** Splits rows into pages of at most `size`; one page when size is Infinity. */
function paginate<T>(rows: T[], size: number): T[][] {
	if (!Number.isFinite(size) || rows.length <= size) return [rows];
	const pages: T[][] = [];
	for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
	return pages;
}

/** Width of each label column; the funnel columns share what is left. */
function columnWidths(columns: RegionalColumn[], total: number, labelW: number): number[] {
	const labels = columns.filter((c) => c.key === "region" || c.key === "district").length;
	const otherW = (total - labelW * labels) / (columns.length - labels);
	return columns.map((c) => (c.key === "region" || c.key === "district" ? labelW : otherW));
}

/* ------------------------------------------------------------------ */
/* PowerPoint — 16:9 slides laid out like the weekly deck's page        */
/* ------------------------------------------------------------------ */

type TableCell = PptxGenJSType.TableCell;

const SLIDE_W = 10;
const SLIDE_MARGIN = 0.35;
/** District rows per slide — readable at 10pt with the header and title. */
const DISTRICT_ROWS_PER_SLIDE = 15;

export async function downloadRegionalPerformancePptx(
	report: RegionalPerformanceReport
): Promise<string> {
	const { default: PptxGenJS } = await import("pptxgenjs");
	const level = reportLevel(report);
	const columns = performanceColumns(level);
	const title = performanceReportTitle(level);
	const pptx = new PptxGenJS();
	pptx.layout = "LAYOUT_16x9";
	pptx.author = "Alerts MIS";
	pptx.title = title;

	const contentW = SLIDE_W - SLIDE_MARGIN * 2;
	// The regional page is a single table, and splitting it would separate
	// regions from the total, so its rows shrink to fit one slide instead.
	const pages = paginate(
		regionalTableRows(report),
		level === "district" ? DISTRICT_ROWS_PER_SLIDE : Infinity
	);
	const widths = columnWidths(columns, contentW, level === "district" ? 1.3 : 1.5);

	pages.forEach((lines, page) => {
		const slide = pptx.addSlide();
		const pageTitle = pages.length > 1 ? `${title} (${page + 1}/${pages.length})` : title;
		slide.addText(pageTitle, {
			x: SLIDE_MARGIN, y: 0.12, w: contentW - 0.8, h: 0.5,
			fontSize: 24, bold: true, color: C.navy, fontFace: "Arial",
		});
		slide.addText(String(page + 1).padStart(2, "0"), {
			x: SLIDE_W - SLIDE_MARGIN - 0.6, y: 0.14, w: 0.6, h: 0.3,
			fontSize: 11, bold: true, color: C.green, align: "right", fontFace: "Arial",
		});
		slide.addText(subtitle(report), {
			x: SLIDE_MARGIN, y: 0.6, w: contentW, h: 0.28,
			fontSize: 11, bold: true, color: C.ink, fontFace: "Arial",
		});
		slide.addShape("line", {
			x: SLIDE_MARGIN, y: 0.95, w: contentW, h: 0,
			line: { color: C.green, width: 2 },
		});

		const top = 1.1;
		const headerH = 0.55;
		const rowH = Math.min(0.38, (5.45 - top - headerH) / lines.length);
		const fontSize = rowH >= 0.33 ? 12 : rowH >= 0.24 ? 10 : 8;

		const header: TableCell[] = columns.map((c) => ({
			text: c.header,
			options: {
				bold: true, color: "FFFFFF", fill: { color: C.navy },
				align: "center", fontSize: fontSize + 1,
			},
		}));
		const body: TableCell[][] = lines.map(({ row, total }) =>
			columns.map((c) => ({
				text: c.format(row),
				options: total
					? { bold: true, align: "center", fill: { color: C.totalFill } }
					: { align: "center" },
			}))
		);

		slide.addTable([header, ...body], {
			x: SLIDE_MARGIN, y: top, w: contentW,
			colW: widths,
			rowH: [headerH, ...Array(lines.length).fill(rowH)],
			fontSize, color: C.ink, fontFace: "Arial", valign: "middle",
			border: { type: "solid", pt: 0.75, color: C.border },
		});

		// The definitions ride along as speaker notes: the slide stays the clean
		// table, and whoever presents it can still say what "Signal" means.
		slide.addNotes(definitionLines(columns).join("\n"));
	});

	const fileName = regionalReportFileName(report, "pptx");
	await pptx.writeFile({ fileName });
	return fileName;
}

/* ------------------------------------------------------------------ */
/* PDF — A4 landscape, the table drawn directly (searchable, copyable)  */
/* ------------------------------------------------------------------ */

function rgb(hex: string): [number, number, number] {
	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
	];
}

/** District rows per A4 page under the title and header. */
const DISTRICT_ROWS_PER_PAGE = 22;

export async function downloadRegionalPerformancePdf(
	report: RegionalPerformanceReport
): Promise<string> {
	const { jsPDF } = await import("jspdf");
	const level = reportLevel(report);
	const columns = performanceColumns(level);
	const title = performanceReportTitle(level);
	const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
	const PAGE_W = 297;
	const PAGE_H = 210;
	const M = 12;
	const W = PAGE_W - M * 2;

	const widths = columnWidths(columns, W, level === "district" ? 36 : 42);
	const headerH = 12;
	const pages = paginate(
		regionalTableRows(report),
		level === "district" ? DISTRICT_ROWS_PER_PAGE : Infinity
	);

	let y = 0;
	pages.forEach((lines, page) => {
		if (page > 0) doc.addPage();
		const last = page === pages.length - 1;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(20);
		doc.setTextColor(...rgb(C.navy));
		doc.text(pages.length > 1 ? `${title} (${page + 1}/${pages.length})` : title, M, 18);
		doc.setFontSize(10);
		doc.setTextColor(...rgb(C.ink));
		doc.text(doc.splitTextToSize(subtitle(report), W)[0] as string, M, 25);
		doc.setDrawColor(...rgb(C.green));
		doc.setLineWidth(0.8);
		doc.line(M, 29, PAGE_W - M, 29);

		// The footnotes follow the last page's table, so only it leaves room.
		const footnoteRoom = last ? 42 : 8;
		const rowH = Math.min(7, (PAGE_H - 34 - headerH - footnoteRoom) / lines.length);
		const fontSize = rowH >= 6.5 ? 10 : 8.5;

		y = 34;
		doc.setLineWidth(0.2);
		doc.setDrawColor(...rgb(C.border));

		// Header — navy, white, centred; two-word headers wrap onto two lines.
		doc.setFillColor(...rgb(C.navy));
		doc.rect(M, y, W, headerH, "F");
		doc.setFont("helvetica", "bold");
		doc.setFontSize(fontSize + 0.5);
		doc.setTextColor(255);
		let x = M;
		columns.forEach((c, i) => {
			const text = doc.splitTextToSize(c.header, widths[i] - 2) as string[];
			const lineH = 4.2;
			const startY = y + headerH / 2 - ((text.length - 1) * lineH) / 2 + 1.3;
			text.forEach((t, li) =>
				doc.text(t, x + widths[i] / 2, startY + li * lineH, { align: "center" })
			);
			x += widths[i];
		});
		y += headerH;

		doc.setTextColor(...rgb(C.ink));
		for (const { row, total } of lines) {
			if (total) {
				doc.setFillColor(...rgb(C.totalFill));
				doc.rect(M, y, W, rowH, "F");
			}
			doc.setFont("helvetica", total ? "bold" : "normal");
			doc.setFontSize(fontSize);
			x = M;
			columns.forEach((c, i) => {
				doc.rect(x, y, widths[i], rowH, "S");
				const cell = doc.splitTextToSize(c.format(row), widths[i] - 2)[0] as string;
				doc.text(cell ?? "", x + widths[i] / 2, y + rowH / 2 + 1.2, {
					align: "center",
				});
				x += widths[i];
			});
			y += rowH;
		}
	});

	// What each column counts — without it "Signal" and "Alerts" are ambiguous.
	y += 6;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(7.5);
	doc.setTextColor(100);
	for (const line of definitionLines(columns)) {
		for (const part of doc.splitTextToSize(line, W) as string[]) {
			if (y > PAGE_H - 8) {
				doc.addPage();
				y = M + 4;
			}
			doc.text(part, M, y);
			y += 3.6;
		}
	}

	const fileName = regionalReportFileName(report, "pdf");
	doc.save(fileName);
	return fileName;
}

/* ------------------------------------------------------------------ */
/* Excel — the table as numbers, definitions on a second sheet          */
/* ------------------------------------------------------------------ */

export async function downloadRegionalPerformanceXlsx(
	report: RegionalPerformanceReport
): Promise<string> {
	const XLSX = await import("xlsx");
	const level = reportLevel(report);
	const columns = performanceColumns(level);
	const title = performanceReportTitle(level);
	const lines = regionalTableRows(report);

	const aoa = [
		columns.map((c) => c.header),
		...lines.map(({ row }) => columns.map((c) => c.value(row))),
	];
	const sheet = XLSX.utils.aoa_to_sheet(aoa);
	sheet["!cols"] = columns.map((c) => ({
		wch: c.key === "region" || c.key === "district" ? 18 : 13,
	}));

	// "(%)" is stored as a real fraction formatted as a percentage, so it sums
	// and charts like a number instead of sitting in the sheet as text.
	const pctCol = columns.findIndex((c) => c.key === "pct");
	for (let r = 1; r < aoa.length; r++) {
		const cell = sheet[XLSX.utils.encode_cell({ r, c: pctCol })];
		if (cell && typeof cell.v === "number") cell.z = "0%";
	}

	// The sheet has room for the filters in full; the slide line summarises.
	const f = report.filters;
	const origin = SIGNAL_ORIGINS.find((o) => o.value === f?.origin)?.label;
	const notes = XLSX.utils.aoa_to_sheet([
		[title],
		["Period", formatReportRange(report.fromDate, report.toDate)],
		["From", report.fromDate],
		["To", report.toDate],
		["Regions", f?.regions.length ? f.regions.join(", ") : "All"],
		["Districts", f?.districts.length ? f.districts.join(", ") : "All"],
		["Division", f?.division || "All"],
		["Came in via", origin ?? "Any"],
		[],
		["Column", "What it counts"],
		...columns.map((c) => [c.header, c.description]),
	]);
	notes["!cols"] = [{ wch: 16 }, { wch: 110 }];

	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		book,
		sheet,
		level === "district" ? "District performance" : "Regional performance"
	);
	XLSX.utils.book_append_sheet(book, notes, "Notes");

	const fileName = regionalReportFileName(report, "xlsx");
	XLSX.writeFile(book, fileName);
	return fileName;
}
