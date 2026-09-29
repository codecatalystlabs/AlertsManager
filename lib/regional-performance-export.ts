/**
 * Regional signal performance → .pptx / .pdf / .xlsx.
 *
 * All three render the same REGIONAL_COLUMNS over the same rows
 * (lib/regional-performance.ts), so the files cannot disagree with each other
 * or with the table on screen. The libraries are imported lazily — they are
 * large and only needed at the moment someone downloads.
 */

import type PptxGenJSType from "pptxgenjs";
import type { RegionalPerformanceReport } from "@/lib/fetch-reports";
import { formatReportRange } from "@/lib/management-report-pptx";
import {
	REGIONAL_COLUMNS,
	REGIONAL_REPORT_COLORS as C,
	REGIONAL_REPORT_TITLE,
	regionalReportFileName,
	regionalTableRows,
} from "@/lib/regional-performance";

/** "Column — what it counts" lines, for slide notes, PDF footnotes and the
 * spreadsheet's Notes sheet. */
function definitionLines(): string[] {
	return REGIONAL_COLUMNS.map((c) => `${c.header} — ${c.description}`);
}

/* ------------------------------------------------------------------ */
/* PowerPoint — one 16:9 slide laid out like the weekly deck's page     */
/* ------------------------------------------------------------------ */

type TableCell = PptxGenJSType.TableCell;

const SLIDE_W = 10;
const SLIDE_MARGIN = 0.35;

export async function downloadRegionalPerformancePptx(
	report: RegionalPerformanceReport
): Promise<string> {
	const { default: PptxGenJS } = await import("pptxgenjs");
	const pptx = new PptxGenJS();
	pptx.layout = "LAYOUT_16x9";
	pptx.author = "Alerts MIS";
	pptx.title = REGIONAL_REPORT_TITLE;

	const slide = pptx.addSlide();
	const contentW = SLIDE_W - SLIDE_MARGIN * 2;

	slide.addText(REGIONAL_REPORT_TITLE, {
		x: SLIDE_MARGIN, y: 0.12, w: contentW - 0.8, h: 0.5,
		fontSize: 24, bold: true, color: C.navy, fontFace: "Arial",
	});
	slide.addText("01", {
		x: SLIDE_W - SLIDE_MARGIN - 0.6, y: 0.14, w: 0.6, h: 0.3,
		fontSize: 11, bold: true, color: C.green, align: "right", fontFace: "Arial",
	});
	slide.addText(formatReportRange(report.fromDate, report.toDate), {
		x: SLIDE_MARGIN, y: 0.6, w: contentW, h: 0.28,
		fontSize: 11, bold: true, color: C.ink, fontFace: "Arial",
	});
	slide.addShape("line", {
		x: SLIDE_MARGIN, y: 0.95, w: contentW, h: 0,
		line: { color: C.green, width: 2 },
	});

	// Rows shrink to fit, so every region stays on the one slide — the page is
	// a single table, and splitting it would separate regions from the total.
	const lines = regionalTableRows(report);
	const top = 1.1;
	const headerH = 0.55;
	const rowH = Math.min(0.38, (5.45 - top - headerH) / lines.length);
	const fontSize = rowH >= 0.33 ? 12 : rowH >= 0.26 ? 10 : 8;

	const header: TableCell[] = REGIONAL_COLUMNS.map((c) => ({
		text: c.header,
		options: {
			bold: true, color: "FFFFFF", fill: { color: C.navy },
			align: "center", fontSize: fontSize + 1,
		},
	}));
	const body: TableCell[][] = lines.map(({ row, total }) =>
		REGIONAL_COLUMNS.map((c) => ({
			text: c.format(row),
			options: total
				? { bold: true, align: "center", fill: { color: C.totalFill } }
				: { align: "center" },
		}))
	);

	const regionW = 1.5;
	const otherW = (contentW - regionW) / (REGIONAL_COLUMNS.length - 1);
	slide.addTable([header, ...body], {
		x: SLIDE_MARGIN, y: top, w: contentW,
		colW: [regionW, ...Array(REGIONAL_COLUMNS.length - 1).fill(otherW)],
		rowH: [headerH, ...Array(lines.length).fill(rowH)],
		fontSize, color: C.ink, fontFace: "Arial", valign: "middle",
		border: { type: "solid", pt: 0.75, color: C.border },
	});

	// The definitions ride along as speaker notes: the slide stays the clean
	// table, and whoever presents it can still say what "Signal" means.
	slide.addNotes(definitionLines().join("\n"));

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

export async function downloadRegionalPerformancePdf(
	report: RegionalPerformanceReport
): Promise<string> {
	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
	const PAGE_W = 297;
	const PAGE_H = 210;
	const M = 12;
	const W = PAGE_W - M * 2;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(20);
	doc.setTextColor(...rgb(C.navy));
	doc.text(REGIONAL_REPORT_TITLE, M, 18);
	doc.setFontSize(10);
	doc.setTextColor(...rgb(C.ink));
	doc.text(formatReportRange(report.fromDate, report.toDate), M, 25);
	doc.setDrawColor(...rgb(C.green));
	doc.setLineWidth(0.8);
	doc.line(M, 29, PAGE_W - M, 29);

	const lines = regionalTableRows(report);
	const regionW = 42;
	const otherW = (W - regionW) / (REGIONAL_COLUMNS.length - 1);
	const widths = REGIONAL_COLUMNS.map((_, i) => (i === 0 ? regionW : otherW));
	const headerH = 12;
	const footnoteRoom = 42;
	const rowH = Math.min(8, (PAGE_H - 34 - headerH - footnoteRoom) / lines.length);
	const fontSize = rowH >= 7 ? 10 : 8.5;

	let y = 34;
	doc.setLineWidth(0.2);
	doc.setDrawColor(...rgb(C.border));

	// Header — navy, white, centred; two-word headers wrap onto two lines.
	doc.setFillColor(...rgb(C.navy));
	doc.rect(M, y, W, headerH, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(fontSize + 0.5);
	doc.setTextColor(255);
	let x = M;
	REGIONAL_COLUMNS.forEach((c, i) => {
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
		REGIONAL_COLUMNS.forEach((c, i) => {
			doc.rect(x, y, widths[i], rowH, "S");
			doc.text(c.format(row), x + widths[i] / 2, y + rowH / 2 + 1.2, {
				align: "center",
			});
			x += widths[i];
		});
		y += rowH;
	}

	// What each column counts — without it "Signal" and "Alerts" are ambiguous.
	y += 6;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(7.5);
	doc.setTextColor(100);
	for (const line of definitionLines()) {
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
	const lines = regionalTableRows(report);

	const aoa = [
		REGIONAL_COLUMNS.map((c) => c.header),
		...lines.map(({ row }) => REGIONAL_COLUMNS.map((c) => c.value(row))),
	];
	const sheet = XLSX.utils.aoa_to_sheet(aoa);
	sheet["!cols"] = REGIONAL_COLUMNS.map((_, i) => ({ wch: i === 0 ? 18 : 13 }));

	// "(%)" is stored as a real fraction formatted as a percentage, so it sums
	// and charts like a number instead of sitting in the sheet as text.
	const pctCol = REGIONAL_COLUMNS.findIndex((c) => c.key === "pct");
	for (let r = 1; r < aoa.length; r++) {
		const cell = sheet[XLSX.utils.encode_cell({ r, c: pctCol })];
		if (cell && typeof cell.v === "number") cell.z = "0%";
	}

	const notes = XLSX.utils.aoa_to_sheet([
		[REGIONAL_REPORT_TITLE],
		["Period", formatReportRange(report.fromDate, report.toDate)],
		["From", report.fromDate],
		["To", report.toDate],
		[],
		["Column", "What it counts"],
		...REGIONAL_COLUMNS.map((c) => [c.header, c.description]),
	]);
	notes["!cols"] = [{ wch: 16 }, { wch: 110 }];

	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(book, sheet, "Regional performance");
	XLSX.utils.book_append_sheet(book, notes, "Notes");

	const fileName = regionalReportFileName(report, "xlsx");
	XLSX.writeFile(book, fileName);
	return fileName;
}
