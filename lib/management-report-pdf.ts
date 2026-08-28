/**
 * Alerts Management report → PDF.
 *
 * Renders the format-neutral block list from management-report-doc.ts with
 * jsPDF, drawing the tables directly rather than screenshotting the page: a
 * screenshot PDF is a picture of numbers — unsearchable, uncopyable, and wrong
 * the moment the viewport is a different width. jspdf-autotable is not a
 * dependency here, so the table layout is done by hand; the tables are plain
 * grids, which is exactly the case that does not need a layout engine.
 */

import type { DocBlock } from "@/lib/management-report-doc";

/** A4 landscape in mm — the deck's tables are wide, and portrait clips them. */
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

const FONT = {
	title: 20,
	subtitle: 12,
	h1: 14,
	h2: 11,
	body: 8.5,
	table: 7.5,
} as const;

const LINE = { h1: 8, h2: 6, body: 4.6, row: 4.4 } as const;

/** Hex "#RRGGBB" -> the [r,g,b] jsPDF wants. */
function rgb(hex: string): [number, number, number] {
	const h = hex.replace("#", "");
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16),
	];
}

export interface ManagementPdfInput {
	blocks: DocBlock[];
	fileName: string;
	/** Brand accent, hex with a leading "#". Same one the deck uses. */
	accent: string;
}

/** Builds and downloads the .pdf. Returns the filename it saved under. */
export async function downloadManagementReportPdf({
	blocks,
	fileName,
	accent,
}: ManagementPdfInput): Promise<string> {
	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
	const [ar, ag, ab] = rgb(accent);

	let y = MARGIN;
	let pageNo = 1;

	const footer = () => {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7);
		doc.setTextColor(130);
		doc.text(String(pageNo), PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
		doc.setTextColor(0);
	};

	const newPage = () => {
		footer();
		doc.addPage();
		pageNo += 1;
		y = MARGIN;
	};

	/** Reserve `need` mm; start a page when it will not fit. */
	const ensure = (need: number) => {
		if (y + need > PAGE_H - MARGIN) newPage();
	};

	for (const block of blocks) {
		switch (block.kind) {
			case "title": {
				// The cover gets its own page, so the first table never shares a
				// page with the title and read as a caption for it.
				doc.setFillColor(ar, ag, ab);
				doc.rect(0, 0, PAGE_W, 42, "F");
				doc.setTextColor(255);
				doc.setFont("helvetica", "bold");
				doc.setFontSize(FONT.title);
				doc.text(block.text, MARGIN, 24);
				if (block.subtitle) {
					doc.setFont("helvetica", "normal");
					doc.setFontSize(FONT.subtitle);
					doc.text(block.subtitle, MARGIN, 34);
				}
				doc.setTextColor(0);
				y = 52;
				if (block.meta) {
					doc.setFont("helvetica", "normal");
					doc.setFontSize(FONT.subtitle);
					doc.text(block.meta, MARGIN, y);
					y += LINE.h1;
				}
				newPage();
				break;
			}

			case "heading": {
				const size = block.level === 1 ? FONT.h1 : FONT.h2;
				const lead = block.level === 1 ? LINE.h1 : LINE.h2;
				// A heading at the bottom of a page is a heading for nothing —
				// keep it with at least a couple of rows of what follows.
				ensure(lead + LINE.row * 3);
				if (block.level === 1) y += 2;
				doc.setFont("helvetica", "bold");
				doc.setFontSize(size);
				doc.setTextColor(block.level === 1 ? ar : 40, block.level === 1 ? ag : 40, block.level === 1 ? ab : 40);
				doc.text(block.text, MARGIN, y);
				doc.setTextColor(0);
				y += lead;
				break;
			}

			case "paragraph": {
				doc.setFont("helvetica", "normal");
				doc.setFontSize(FONT.body);
				if (block.muted) doc.setTextColor(110);
				const lines = doc.splitTextToSize(block.text, CONTENT_W) as string[];
				for (const line of lines) {
					ensure(LINE.body);
					doc.text(line, MARGIN, y);
					y += LINE.body;
				}
				doc.setTextColor(0);
				y += 1.5;
				break;
			}

			case "image": {
				const w = Math.min(CONTENT_W, 200);
				const h = w / (block.aspect || 1.4);
				ensure(h + LINE.body);
				try {
					// "FAST" turns on Flate compression for the bitmap. The
					// choropleth is rendered at 1500px for the slides; embedded
					// raw it alone made the PDF ~6 MB, which is a real cost for a
					// report that gets emailed every week.
					doc.addImage(block.dataUrl, "PNG", MARGIN, y, w, h, undefined, "FAST");
					y += h + 2;
				} catch {
					// A map that will not decode must not take the report down —
					// the tables under it carry the same numbers.
					doc.setFontSize(FONT.body);
					doc.setTextColor(150);
					doc.text("(map unavailable)", MARGIN, y);
					doc.setTextColor(0);
					y += LINE.body;
				}
				if (block.caption) {
					doc.setFont("helvetica", "italic");
					doc.setFontSize(FONT.body);
					doc.setTextColor(110);
					doc.text(block.caption, MARGIN, y);
					doc.setTextColor(0);
					y += LINE.body + 1;
				}
				break;
			}

			case "table": {
				drawTable(doc, block, () => {
					newPage();
					return y;
				});
				break;
			}
		}
	}

	footer();
	doc.save(fileName);
	return fileName;

	/* --- table drawing, closed over y/ensure/newPage ------------------- */
	function drawTable(
		pdf: InstanceType<typeof jsPDF>,
		block: Extract<DocBlock, { kind: "table" }>,
		_onNewPage: () => number
	) {
		const cols = block.headers.length;
		const firstNumeric = block.firstNumericColumn ?? cols;

		// Label columns take the slack; numeric columns get a fixed narrow share,
		// which is what stops a 12-column table squeezing district names to two
		// characters.
		const numericCount = cols - firstNumeric;
		const numericW = numericCount > 0 ? Math.min(22, (CONTENT_W * 0.55) / numericCount) : 0;
		const labelW = (CONTENT_W - numericW * numericCount) / Math.max(firstNumeric, 1);
		const widths = block.headers.map((_, i) =>
			i < firstNumeric ? labelW : numericW
		);

		const cellLines = (text: string, w: number): string[] =>
			pdf.splitTextToSize(text, w - 2) as string[];

		const header = () => {
			const headLines = block.headers.map((h, i) => cellLines(h, widths[i]));
			const hRows = Math.max(...headLines.map((l) => l.length));
			const hH = hRows * LINE.row + 1.5;
			ensure(hH + LINE.row);
			pdf.setFillColor(ar, ag, ab);
			pdf.rect(MARGIN, y, CONTENT_W, hH, "F");
			pdf.setFont("helvetica", "bold");
			pdf.setFontSize(FONT.table);
			pdf.setTextColor(255);
			let x = MARGIN;
			headLines.forEach((lines, i) => {
				lines.forEach((line, li) => {
					pdf.text(line, x + 1, y + 3.2 + li * LINE.row);
				});
				x += widths[i];
			});
			pdf.setTextColor(0);
			y += hH;
		};

		header();

		block.rows.forEach((row, ri) => {
			const bold = block.boldRows?.includes(ri) ?? false;
			const lines = row.map((cell, i) => cellLines(cell, widths[i]));
			const rows = Math.max(...lines.map((l) => l.length));
			const rH = rows * LINE.row + 1.2;

			if (y + rH > PAGE_H - MARGIN) {
				newPage();
				// Repeat the header on the continuation page — a table whose
				// columns are only named on page 1 is unreadable on page 2.
				header();
			}

			if (ri % 2 === 1 && !bold) {
				pdf.setFillColor(246, 246, 248);
				pdf.rect(MARGIN, y, CONTENT_W, rH, "F");
			}
			if (bold) {
				pdf.setFillColor(232, 232, 236);
				pdf.rect(MARGIN, y, CONTENT_W, rH, "F");
			}

			pdf.setFont("helvetica", bold ? "bold" : "normal");
			pdf.setFontSize(FONT.table);
			let x = MARGIN;
			lines.forEach((cellLinesArr, i) => {
				const numeric = i >= firstNumeric;
				cellLinesArr.forEach((line, li) => {
					if (numeric) {
						pdf.text(line, x + widths[i] - 1, y + 3 + li * LINE.row, {
							align: "right",
						});
					} else {
						pdf.text(line, x + 1, y + 3 + li * LINE.row);
					}
				});
				x += widths[i];
			});
			y += rH;
		});

		y += 3;
	}
}
