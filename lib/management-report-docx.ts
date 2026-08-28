/**
 * Alerts Management report → DOCX.
 *
 * Renders the same format-neutral block list as the PDF
 * (management-report-doc.ts), so the two files cannot disagree about what the
 * report contains — only about how it looks.
 *
 * A real .docx via the `docx` package, not an HTML file with a Word extension:
 * the point of asking for Word is that someone will edit it — add a paragraph,
 * fix a district name, paste a table into a bulletin — and a renamed HTML file
 * gives them a document that fights every one of those edits.
 */

import type { DocBlock } from "@/lib/management-report-doc";

/** A4 landscape, twips (1/20 pt). The tables are wide; portrait clips them. */
const PAGE = { width: 16838, height: 11906 };
const MARGIN = 720; // 0.5"

/** "#RRGGBB" -> "RRGGBB", which is what docx wants. */
const hex = (c: string): string => c.replace("#", "").toUpperCase();

export interface ManagementDocxInput {
	blocks: DocBlock[];
	fileName: string;
	/** Brand accent, hex with a leading "#". Same one the deck uses. */
	accent: string;
}

/** Builds and downloads the .docx. Returns the filename it saved under. */
export async function downloadManagementReportDocx({
	blocks,
	fileName,
	accent,
}: ManagementDocxInput): Promise<string> {
	const {
		AlignmentType,
		Document,
		HeadingLevel,
		ImageRun,
		Packer,
		Paragraph,
		ShadingType,
		Table,
		TableCell,
		TableRow,
		TextRun,
		WidthType,
	} = await import("docx");

	const accentHex = hex(accent);
	// Paragraphs and Tables both land here; `docx` types the section body as a
	// union, so the array is widened rather than pinned to Paragraph.
	const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] =
		[];

	const para = (
		text: string,
		opts: {
			bold?: boolean;
			size?: number;
			color?: string;
			heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
			align?: (typeof AlignmentType)[keyof typeof AlignmentType];
			spacingBefore?: number;
			spacingAfter?: number;
		} = {}
	) =>
		new Paragraph({
			heading: opts.heading,
			alignment: opts.align,
			spacing: { before: opts.spacingBefore ?? 0, after: opts.spacingAfter ?? 80 },
			children: [
				new TextRun({
					text,
					bold: opts.bold,
					size: opts.size,
					color: opts.color,
				}),
			],
		});

	const cell = (
		text: string,
		opts: { head?: boolean; bold?: boolean; right?: boolean; shade?: string } = {}
	) =>
		new TableCell({
			shading: opts.shade
				? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" }
				: undefined,
			margins: { top: 40, bottom: 40, left: 80, right: 80 },
			children: [
				new Paragraph({
					alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
					spacing: { after: 0 },
					children: [
						new TextRun({
							text,
							bold: opts.head || opts.bold,
							size: 16, // 8pt — these tables are wide
							color: opts.head ? "FFFFFF" : undefined,
						}),
					],
				}),
			],
		});

	for (const block of blocks) {
		switch (block.kind) {
			case "title": {
				children.push(
					para(block.text, {
						bold: true,
						size: 44,
						color: accentHex,
						align: AlignmentType.CENTER,
						spacingBefore: 400,
						spacingAfter: 120,
					})
				);
				if (block.subtitle) {
					children.push(
						para(block.subtitle, {
							size: 24,
							align: AlignmentType.CENTER,
							spacingAfter: 80,
						})
					);
				}
				if (block.meta) {
					children.push(
						para(block.meta, {
							size: 22,
							color: "666666",
							align: AlignmentType.CENTER,
							spacingAfter: 400,
						})
					);
				}
				break;
			}

			case "heading":
				children.push(
					para(block.text, {
						heading:
							block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
						bold: true,
						size: block.level === 1 ? 30 : 24,
						color: block.level === 1 ? accentHex : "333333",
						spacingBefore: block.level === 1 ? 320 : 200,
						spacingAfter: 120,
					})
				);
				break;

			case "paragraph":
				children.push(
					para(block.text, {
						size: 20,
						color: block.muted ? "777777" : undefined,
					})
				);
				break;

			case "image": {
				try {
					// dataUrl -> bytes. docx needs the raw image, not the URL.
					const base64 = block.dataUrl.split(",")[1] ?? "";
					const binary = atob(base64);
					const bytes = new Uint8Array(binary.length);
					for (let i = 0; i < binary.length; i++) {
						bytes[i] = binary.charCodeAt(i);
					}
					const width = 640;
					children.push(
						new Paragraph({
							alignment: AlignmentType.CENTER,
							spacing: { after: 80 },
							children: [
								new ImageRun({
									type: "png",
									data: bytes,
									transformation: {
										width,
										height: Math.round(width / (block.aspect || 1.4)),
									},
								}),
							],
						})
					);
				} catch {
					// A map that will not decode must not take the document down;
					// the tables below it carry the same numbers.
					children.push(
						para("(map unavailable)", { size: 18, color: "999999" })
					);
				}
				if (block.caption) {
					children.push(
						para(block.caption, {
							size: 18,
							color: "777777",
							align: AlignmentType.CENTER,
						})
					);
				}
				break;
			}

			case "table": {
				const firstNumeric = block.firstNumericColumn ?? block.headers.length;
				children.push(
					new Table({
						width: { size: 100, type: WidthType.PERCENTAGE },
						rows: [
							new TableRow({
								// Repeat the header on every page a long table spills
								// onto — columns named only on page 1 are unreadable
								// on page 2.
								tableHeader: true,
								children: block.headers.map((h, i) =>
									cell(h, {
										head: true,
										shade: accentHex,
										right: i >= firstNumeric,
									})
								),
							}),
							...block.rows.map(
								(row, ri) =>
									new TableRow({
										children: row.map((c, i) =>
											cell(c, {
												bold: block.boldRows?.includes(ri),
												right: i >= firstNumeric,
												shade: block.boldRows?.includes(ri)
													? "E8E8EC"
													: ri % 2 === 1
														? "F6F6F8"
														: undefined,
											})
										),
									})
							),
						],
					})
				);
				// Word collapses adjacent tables into one without a separator.
				children.push(para("", { size: 12 }));
				break;
			}
		}
	}

	const doc = new Document({
		creator: "Alerts MIS",
		title: fileName,
		sections: [
			{
				properties: {
					page: {
						size: { width: PAGE.width, height: PAGE.height },
						margin: {
							top: MARGIN,
							bottom: MARGIN,
							left: MARGIN,
							right: MARGIN,
						},
					},
				},
				children: children as never,
			},
		],
	});

	const blob = await Packer.toBlob(doc);
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
	return fileName;
}
