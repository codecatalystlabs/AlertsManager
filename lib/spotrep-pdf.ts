/**
 * SPOTREP → PDF.
 *
 * The Word file is the one people edit; this is the one they send. A spot report
 * is forwarded through a chain — district to region to national, often by
 * WhatsApp — and every hop through Word is a hop where a paragraph moves. A PDF
 * arrives at the National PHEOC looking exactly as the DSFP signed it.
 *
 * Renders from the same lib/spotrep.ts row model as the .docx and the preview.
 * Built on jsPDF, lazily imported the way lib/alert-pdf.ts does it so the
 * library stays out of the initial client bundle.
 */

import {
	spotRepRows,
	toBulletLines,
	type SpotRepDraft,
} from "@/lib/spotrep";
import { dataUrlPdfFormat, type SpotRepImage } from "@/lib/spotrep-images";

/** Ministry of Health Uganda brand colours (tailwind.config.ts `uganda`). */
const UGANDA_RED: [number, number, number] = [217, 0, 0];
const UGANDA_YELLOW: [number, number, number] = [252, 220, 4];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const RULE: [number, number, number] = [200, 200, 206];
const LABEL_FILL: [number, number, number] = [242, 242, 244];

export interface SpotRepPdfInput {
	draft: SpotRepDraft;
	fileName: string;
	district?: string | null;
	crestDataUrl?: string | null;
	images?: SpotRepImage[];
}

/** One drawable piece of a section's content. */
type Item =
	| {
			kind: "line";
			text: string;
			/** Draw the bullet glyph — true only on a bullet's FIRST line. */
			bullet: boolean;
			/** Left offset in mm, so a bullet's wrapped lines hang under its text. */
			indent: number;
			height: number;
	  }
	| { kind: "gap"; height: number }
	| { kind: "image"; picture: SpotRepImage; width: number; height: number };

export async function downloadSpotRepPdf({
	draft,
	fileName,
	district,
	crestDataUrl,
	images = [],
}: SpotRepPdfInput): Promise<string> {
	if (typeof window === "undefined") {
		throw new Error("PDF export is only available in the browser");
	}

	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "mm", format: "a4" });

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	const contentWidth = pageWidth - margin * 2;
	const labelWidth = 38;
	// Padded on BOTH sides. Wrapping to the full remaining width put every long
	// line hard against the table's right border, which reads as clipped text.
	const valuePad = 3;
	const valueX = margin + labelWidth + valuePad;
	const valueWidth = contentWidth - labelWidth - valuePad * 2;
	const bottomLimit = pageHeight - 20;

	// Where the two-column rule runs on each page. Collected as the content is
	// laid out and stroked at the end, because a page's last row is not known
	// until the page is full.
	const columnRules: { page: number; top: number; bottom: number }[] = [];
	let ruleTop = 0;

	/* ---- Letterhead ------------------------------------------------------ */

	const drawHeader = (): number => {
		doc.setFillColor(...UGANDA_RED);
		doc.rect(0, 0, pageWidth, 24, "F");
		doc.setFillColor(...UGANDA_YELLOW);
		doc.rect(0, 24, pageWidth, 1.6, "F");

		let textLeft = margin;
		if (crestDataUrl) {
			try {
				doc.addImage(crestDataUrl, dataUrlPdfFormat(crestDataUrl), margin, 4, 16, 16);
				textLeft = margin + 20;
			} catch {
				// A crest that will not decode must not take the report down.
			}
		}

		doc.setTextColor(255, 255, 255);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(12);
		doc.text("OFFICE OF THE DISTRICT HEALTH OFFICER", textLeft, 11);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8.5);
		doc.text(
			district
				? `${district.toUpperCase()} DISTRICT · Ministry of Health Uganda`
				: "Ministry of Health Uganda",
			textLeft,
			16.5
		);
		doc.text("DISTRICT SPOT REPORT", textLeft, 21);
		return 34;
	};

	let y = drawHeader();

	// The report title, in its own band.
	doc.setFillColor(...UGANDA_RED);
	const titleLines = (() => {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11.5);
		return doc.splitTextToSize(draft.title, contentWidth - 8) as string[];
	})();
	const titleHeight = 6 + titleLines.length * 5.4;
	doc.rect(margin, y, contentWidth, titleHeight, "F");
	doc.setTextColor(255, 255, 255);
	doc.text(titleLines, pageWidth / 2, y + 7.6, { align: "center" });
	y += titleHeight;
	ruleTop = y;

	const newPage = () => {
		columnRules.push({ page: doc.getNumberOfPages(), top: ruleTop, bottom: y });
		doc.addPage();
		y = drawHeader();
		ruleTop = y;
	};

	/* ---- Sections -------------------------------------------------------- */

	const LINE = 4.5;
	/** How far a bullet's text sits from the glyph. */
	const BULLET_INDENT = 4;

	const wrap = (text: string, width: number, size: number): string[] => {
		doc.setFontSize(size);
		return doc.splitTextToSize(text, width) as string[];
	};

	const layoutSection = (value: string, bullets: boolean): Item[] => {
		const items: Item[] = [];
		if (bullets) {
			doc.setFont("helvetica", "normal");
			for (const bullet of toBulletLines(value)) {
				const lines = wrap(bullet, valueWidth - BULLET_INDENT, 9.5);
				// Every line of a bullet is indented; only the first gets the glyph.
				// Without this the second line of a long challenge hangs back under
				// the dot and reads as a separate item.
				lines.forEach((line, i) =>
					items.push({
						kind: "line",
						text: line,
						bullet: i === 0,
						indent: BULLET_INDENT,
						height: LINE,
					})
				);
				items.push({ kind: "gap", height: 1 });
			}
			return items;
		}
		doc.setFont("helvetica", "normal");
		const paragraphs = value.split(/\n{2,}/);
		paragraphs.forEach((block, index) => {
			const flat = block.replace(/\n/g, " ").trim();
			if (!flat) return;
			for (const line of wrap(flat, valueWidth, 9.5)) {
				items.push({ kind: "line", text: line, bullet: false, indent: 0, height: LINE });
			}
			if (index < paragraphs.length - 1) items.push({ kind: "gap", height: 2 });
		});
		return items;
	};

	const drawSection = (label: string, items: Item[]) => {
		const padTop = 2.5;
		const padBottom = 2.5;
		let first = true;
		let index = 0;

		// A section is drawn as one or more SEGMENTS — one per page it occupies.
		// A long narrative genuinely does not fit on a page, and refusing to
		// split it would either overflow the footer or drop the text.
		while (index < items.length || first) {
			// Never strand a label above a page break with nothing under it.
			if (y + padTop + LINE * 2 > bottomLimit) newPage();

			const segmentTop = y;
			let cursor = y + padTop;

			doc.setFont("helvetica", "bold");
			doc.setFontSize(8.5);
			doc.setTextColor(...INK);
			const labelLines = wrap(first ? label : `${label} (cont.)`, labelWidth - 4, 8.5);

			let drewAny = false;
			while (index < items.length) {
				const item = items[index];
				if (cursor + item.height > bottomLimit - padBottom) break;
				if (item.kind === "line") {
					doc.setFont("helvetica", "normal");
					doc.setFontSize(9.5);
					doc.setTextColor(...INK);
					if (item.bullet) doc.text("•", valueX, cursor + 3.2);
					doc.text(item.text, valueX + item.indent, cursor + 3.2);
				} else if (item.kind === "image") {
					try {
						doc.addImage(
							item.picture.dataUrl,
							dataUrlPdfFormat(item.picture.dataUrl),
							valueX,
							cursor,
							item.width,
							item.height
						);
					} catch {
						doc.setFont("helvetica", "italic");
						doc.setFontSize(8);
						doc.setTextColor(...MUTED);
						doc.text("(image unavailable)", valueX, cursor + 3.2);
					}
				}
				cursor += item.height;
				index += 1;
				drewAny = true;
			}

			// An item taller than a whole page would otherwise spin here forever.
			if (!drewAny && index < items.length) {
				const item = items[index];
				if (item.kind === "image") {
					const available = bottomLimit - padBottom - cursor;
					const scale = available / item.height;
					try {
						doc.addImage(
							item.picture.dataUrl,
							dataUrlPdfFormat(item.picture.dataUrl),
							valueX,
							cursor,
							item.width * scale,
							item.height * scale
						);
					} catch {
						/* skip */
					}
					cursor += available;
				}
				index += 1;
			}

			const segmentBottom = Math.max(
				cursor + padBottom,
				segmentTop + padTop + labelLines.length * 4 + padBottom
			);
			// The label column keeps its tint on every page the section spans, so a
			// continued row still reads as part of the table. Set immediately
			// before the fill: jsPDF's setTextColor also moves the fill colour, so
			// a tint set before the content loop comes back out as whatever the
			// last line of text was painted in.
			doc.setFillColor(...LABEL_FILL);
			doc.rect(margin, segmentTop, labelWidth, segmentBottom - segmentTop, "F");
			doc.setFont("helvetica", "bold");
			doc.setFontSize(8.5);
			doc.setTextColor(...INK);
			doc.text(labelLines, margin + 2, segmentTop + padTop + 3.2);

			y = segmentBottom;
			doc.setDrawColor(...RULE);
			doc.setLineWidth(0.2);
			doc.line(margin, y, margin + contentWidth, y);

			first = false;
			if (index >= items.length) break;
			newPage();
		}
	};

	for (const section of spotRepRows(draft)) {
		drawSection(section.label, layoutSection(section.value, Boolean(section.bullets)));
	}

	if (images.length > 0) {
		const items: Item[] = [];
		for (const picture of images) {
			const width = Math.min(valueWidth, 110);
			const height = width * (picture.height / picture.width);
			items.push({ kind: "image", picture, width, height });
			if (picture.caption.trim()) {
				for (const line of wrap(picture.caption.trim(), valueWidth, 8)) {
					items.push({ kind: "line", text: line, bullet: false, indent: 0, height: 4 });
				}
			}
			items.push({ kind: "gap", height: 3 });
		}
		drawSection("Pictorials", items);
	}

	columnRules.push({ page: doc.getNumberOfPages(), top: ruleTop, bottom: y });

	/* ---- Rules, box and footer ------------------------------------------- */

	const pageCount = doc.getNumberOfPages();
	for (const rule of columnRules) {
		doc.setPage(rule.page);
		doc.setDrawColor(...RULE);
		doc.setLineWidth(0.2);
		// The column divider and the outer box, drawn per page now that the
		// page's last row is known.
		doc.line(margin + labelWidth, rule.top, margin + labelWidth, rule.bottom);
		doc.rect(margin, rule.top, contentWidth, rule.bottom - rule.top);
	}

	for (let page = 1; page <= pageCount; page++) {
		doc.setPage(page);
		doc.setDrawColor(...MUTED);
		doc.setLineWidth(0.2);
		doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...MUTED);
		doc.text(
			"Uganda Health Alert System · EBS step 5: Alert · Handle in confidence",
			margin,
			pageHeight - 9
		);
		doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 9, {
			align: "right",
		});
	}

	doc.save(fileName);
	return fileName;
}
