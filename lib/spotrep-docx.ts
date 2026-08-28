/**
 * SPOTREP → .docx.
 *
 * A real Word file via the `docx` package, laid out as the district's own
 * template: a letterhead, then a single bordered table with the label on the
 * left and the content on the right, one row per section.
 *
 * Word is the format that matters most here, and for one reason: a spot report
 * gets edited after it is generated. The DHO adds a line, the RPHEOC corrects a
 * village name, someone pastes the table into the weekly bulletin. A PDF fights
 * every one of those, and an HTML file renamed .docx fights them harder.
 *
 * Renders from lib/spotrep.ts's row model, the same one the preview and the PDF
 * consume, so the three cannot disagree about what the report contains.
 */

import {
	spotRepRows,
	toBulletLines,
	type SpotRepDraft,
} from "@/lib/spotrep";
import {
	dataUrlDocxType,
	dataUrlToBytes,
	saveBlob,
	type SpotRepImage,
} from "@/lib/spotrep-images";

/** A4 portrait, twips (1/20 pt) — the template's own page. */
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 851; // ~1.5cm

/** Ministry of Health Uganda brand colours (tailwind.config.ts `uganda`). */
const RED = "D90000";
const LABEL_FILL = "F2F2F4";
const RULE = "C8C8CE";

export interface SpotRepDocxInput {
	draft: SpotRepDraft;
	fileName: string;
	/** District, for the letterhead's second line. */
	district?: string | null;
	/** Ministry crest as a data URL; the letterhead degrades to text without it. */
	crestDataUrl?: string | null;
	images?: SpotRepImage[];
}

/** Builds and downloads the .docx. Returns the filename it saved under. */
export async function downloadSpotRepDocx({
	draft,
	fileName,
	district,
	crestDataUrl,
	images = [],
}: SpotRepDocxInput): Promise<string> {
	const {
		AlignmentType,
		BorderStyle,
		Document,
		ImageRun,
		Packer,
		Paragraph,
		ShadingType,
		Table,
		TableCell,
		TableRow,
		TextRun,
		VerticalAlign,
		WidthType,
	} = await import("docx");

	type Child = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
	const children: Child[] = [];

	const text = (
		value: string,
		opts: {
			bold?: boolean;
			size?: number;
			color?: string;
			align?: (typeof AlignmentType)[keyof typeof AlignmentType];
			after?: number;
			before?: number;
			allCaps?: boolean;
		} = {}
	) =>
		new Paragraph({
			alignment: opts.align,
			spacing: { before: opts.before ?? 0, after: opts.after ?? 60 },
			children: [
				new TextRun({
					text: value,
					bold: opts.bold,
					size: opts.size ?? 20, // half-points; 20 = 10pt
					color: opts.color,
					allCaps: opts.allCaps,
				}),
			],
		});

	/* ---- Letterhead ------------------------------------------------------ */

	if (crestDataUrl) {
		try {
			children.push(
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 40 },
					children: [
						new ImageRun({
							type: dataUrlDocxType(crestDataUrl),
							data: dataUrlToBytes(crestDataUrl),
							transformation: { width: 58, height: 58 },
						}),
					],
				})
			);
		} catch {
			// A crest that will not decode must not take the report down.
		}
	}

	children.push(
		text("REPUBLIC OF UGANDA — MINISTRY OF HEALTH", {
			bold: true,
			size: 18,
			color: "555555",
			align: AlignmentType.CENTER,
			after: 20,
		}),
		text(
			district
				? `OFFICE OF THE DISTRICT HEALTH OFFICER — ${district.toUpperCase()} DISTRICT`
				: "OFFICE OF THE DISTRICT HEALTH OFFICER",
			{
				bold: true,
				size: 24,
				color: RED,
				align: AlignmentType.CENTER,
				after: 40,
			}
		),
		text("DISTRICT SPOT REPORT", {
			bold: true,
			size: 18,
			color: "555555",
			align: AlignmentType.CENTER,
			after: 200,
		})
	);

	/* ---- The report table ------------------------------------------------ */

	const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
	const cellBorders = {
		top: border,
		bottom: border,
		left: border,
		right: border,
	};

	/** One label/content row. Content is a paragraph list, so bullets work. */
	const row = (label: string, content: Child[]): InstanceType<typeof TableRow> =>
		new TableRow({
			children: [
				new TableCell({
					width: { size: 26, type: WidthType.PERCENTAGE },
					shading: { type: ShadingType.CLEAR, fill: LABEL_FILL, color: "auto" },
					borders: cellBorders,
					verticalAlign: VerticalAlign.TOP,
					margins: { top: 80, bottom: 80, left: 120, right: 120 },
					children: [text(label, { bold: true, size: 19 })],
				}),
				new TableCell({
					width: { size: 74, type: WidthType.PERCENTAGE },
					borders: cellBorders,
					verticalAlign: VerticalAlign.TOP,
					margins: { top: 80, bottom: 80, left: 120, right: 120 },
					// Word renders an empty cell with no height at all, so a blank
					// row would collapse to a line. An empty paragraph keeps the row
					// visible — a spot report with a visibly empty section still says
					// something true.
					children: content.length > 0 ? content : [text("")],
				}),
			],
		});

	const rows: InstanceType<typeof TableRow>[] = [
		// The report's own title, spanning both columns, inside the table so it
		// travels with it when someone copies the table into a bulletin.
		new TableRow({
			children: [
				new TableCell({
					columnSpan: 2,
					shading: { type: ShadingType.CLEAR, fill: RED, color: "auto" },
					borders: cellBorders,
					margins: { top: 120, bottom: 120, left: 120, right: 120 },
					children: [
						text(draft.title, {
							bold: true,
							size: 24,
							color: "FFFFFF",
							align: AlignmentType.CENTER,
							after: 0,
						}),
					],
				}),
			],
		}),
	];

	for (const section of spotRepRows(draft)) {
		const content: Child[] = section.bullets
			? toBulletLines(section.value).map(
					(line) =>
						new Paragraph({
							bullet: { level: 0 },
							spacing: { after: 40 },
							children: [new TextRun({ text: line, size: 20 })],
						})
			  )
			: section.value
					.split(/\n{2,}/)
					.map((block) => block.replace(/\n/g, " ").trim())
					.filter(Boolean)
					.map((block) => text(block, { after: 80 }));
		rows.push(row(section.label, content));
	}

	/* ---- Pictorials ------------------------------------------------------ */

	if (images.length > 0) {
		const pictures: Child[] = [];
		for (const picture of images) {
			try {
				// 420pt across the content column at most, at the picture's own
				// aspect — a stretched photo of a line list is unreadable.
				const width = Math.min(420, picture.width);
				const height = Math.round(width * (picture.height / picture.width));
				pictures.push(
					new Paragraph({
						spacing: { after: 40 },
						children: [
							new ImageRun({
								type: dataUrlDocxType(picture.dataUrl),
								data: dataUrlToBytes(picture.dataUrl),
								transformation: { width, height },
							}),
						],
					})
				);
				if (picture.caption.trim()) {
					pictures.push(
						text(picture.caption.trim(), { size: 17, color: "666666", after: 120 })
					);
				}
			} catch {
				pictures.push(text("(image unavailable)", { size: 17, color: "999999" }));
			}
		}
		rows.push(row("Pictorials", pictures));
	}

	children.push(
		new Table({
			width: { size: 100, type: WidthType.PERCENTAGE },
			rows,
		})
	);

	children.push(
		text(
			"Generated from the Uganda Health Alert System (alerts.health.go.ug) — EBS step 5: Alert.",
			{ size: 16, color: "888888", align: AlignmentType.CENTER, before: 200 }
		)
	);

	const doc = new Document({
		creator: "Uganda Health Alert System",
		title: draft.title,
		description: "District Spot Report",
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

	saveBlob(await Packer.toBlob(doc), fileName);
	return fileName;
}
