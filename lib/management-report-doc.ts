/**
 * The Alerts Management report as a FORMAT-NEUTRAL document (PDF + Word).
 *
 * Built from the SAME resolved slide list as the deck and the in-app preview
 * (management-report-deck.ts), in the same order, honouring the same hidden /
 * renamed / custom slides — so the Word file can never disagree with the
 * slides about what "Alerts" means or which sections were included.
 *
 * Charts do not survive the translation (a pie is a picture, and a document
 * that drew its own would be a second implementation of the same numbers), so
 * their series are emitted as tables. Multi-page slide tables are stitched
 * back into one table, since a document paginates by itself.
 */

import type { BuiltDeck, ChartSpec, DeckSlide } from "@/lib/management-report-deck";

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
			/** Columns from this index are numeric (right-aligned). */
			firstNumericColumn?: number;
	  }
	| { kind: "image"; dataUrl: string; aspect: number; caption?: string };

const num = (n: number): string => n.toLocaleString("en-US");

/** Strip a "(2/3)" page suffix so continuation pages share one heading. */
const baseTitle = (s: DeckSlide) => (s.page ? s.title.replace(/\s*\(\d+\/\d+\)$/, "") : s.title);

function chartTable(spec: ChartSpec, labelHeader: string): DocBlock[] {
	if (spec.empty || spec.labels.length === 0) {
		return [{ kind: "paragraph", text: spec.empty ?? "No data.", muted: true }];
	}
	if (spec.series.length === 1) {
		const s = spec.series[0];
		const total = s.values.reduce((a, b) => a + b, 0);
		const rows = spec.labels.map((l, i) => [
			l,
			num(s.values[i]),
			total > 0 ? `${Math.round((s.values[i] / total) * 100)}%` : "—",
		]);
		rows.push(["Total", num(total), total > 0 ? "100%" : "—"]);
		return [
			{
				kind: "table",
				headers: [labelHeader, s.name, "Share"],
				rows,
				boldRows: [rows.length - 1],
				firstNumericColumn: 1,
			},
		];
	}
	return [
		{
			kind: "table",
			headers: [labelHeader, ...spec.series.map((s) => s.name)],
			rows: spec.labels.map((l, i) => [l, ...spec.series.map((s) => num(s.values[i]))]),
			firstNumericColumn: 1,
		},
	];
}

export interface ManagementDocInput {
	deck: BuiltDeck;
	/** Natural aspect ratios of uploaded images (from the panel), by data URL. */
	aspects?: Map<string, number>;
}

/** Build the document from the resolved slides. */
export function buildManagementReportDoc({ deck, aspects }: ManagementDocInput): DocBlock[] {
	const blocks: DocBlock[] = [];
	const slides = deck.slides;
	// The renderers draw the title as page one, so it always leads — even when
	// the cover slide was moved, or hidden.
	const cover = slides.find((s): s is Extract<DeckSlide, { type: "cover" }> => s.type === "cover");
	blocks.push(
		cover
			? {
					kind: "title",
					text: cover.cover.title,
					subtitle: [cover.cover.subtitle, cover.cover.scope].filter(Boolean).join(" — ") || undefined,
					meta: [cover.cover.organization, cover.cover.presenter, cover.cover.dateLine].filter(Boolean).join(" · "),
				}
			: { kind: "title", text: deck.title, meta: `${deck.range}${deck.scopeSuffix}` }
	);

	for (let i = 0; i < slides.length; i++) {
		const s = slides[i];
		// Continuation pages are folded into the first page's table below.
		if (s.page && s.page.index > 0) continue;
		const pages = s.page
			? slides.filter((x) => x.itemId === s.itemId && x.page && x.key.replace(/-\d+$/, "") === s.key.replace(/-\d+$/, ""))
			: [s];

		switch (s.type) {
			case "cover":
				break; // already emitted as the title page
			case "agenda":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				s.items.forEach((item, n) => blocks.push({ kind: "paragraph", text: `${n + 1}. ${item}` }));
				break;
			case "kpis":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				blocks.push({
					kind: "table",
					headers: s.comparison ? ["Indicator", "Value", "Previous period", "Change"] : ["Indicator", "Value"],
					rows: s.tiles.map((t) =>
						s.comparison
							? [t.label, t.value, t.delta?.previous ?? "—", t.delta?.text ?? "—"]
							: [t.label, t.value]
					),
					firstNumericColumn: 1,
				});
				if (s.comparison) blocks.push({ kind: "paragraph", text: `Change ${s.comparison}.`, muted: true });
				break;
			case "bullets":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				if (s.bullets.length === 0 && s.empty) blocks.push({ kind: "paragraph", text: s.empty, muted: true });
				for (const b of s.bullets) blocks.push({ kind: "paragraph", text: `•  ${b.text}` });
				break;
			case "twoColumn":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				for (const l of [...s.left, ...s.right]) blocks.push({ kind: "paragraph", text: `•  ${l}` });
				break;
			case "statement":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				blocks.push({ kind: "paragraph", text: `“${s.text}”${s.attribution ? ` — ${s.attribution}` : ""}` });
				break;
			case "table": {
				blocks.push({ kind: "heading", text: baseTitle(s), level: 1 });
				if (s.empty) {
					blocks.push({ kind: "paragraph", text: s.empty, muted: true });
					break;
				}
				const header = s.rows[0];
				const body = pages.flatMap((p) => (p.type === "table" ? p.rows.slice(1) : []));
				const boldRows = body
					.map((r, idx) => (r.style === "section" || r.style === "total" ? idx : -1))
					.filter((idx) => idx >= 0);
				blocks.push({
					kind: "table",
					headers: header.cells,
					rows: body.map((r) => (r.style === "body" ? [`  ${r.cells[0]}`, ...r.cells.slice(1)] : r.cells)),
					boldRows,
					firstNumericColumn: 1,
				});
				const note = pages.map((p) => (p.type === "table" ? p.note : undefined)).find(Boolean);
				if (note) blocks.push({ kind: "paragraph", text: note, muted: true });
				break;
			}
			case "narratives": {
				blocks.push({ kind: "heading", text: baseTitle(s), level: 1 });
				if (s.empty) {
					blocks.push({ kind: "paragraph", text: s.empty, muted: true });
					break;
				}
				const rows = pages.flatMap((p) => (p.type === "narratives" ? p.rows : []));
				blocks.push({
					kind: "table",
					headers: ["Source", "District", "Narrative"],
					rows: rows.map((d) => [d.source, d.district, d.narrative]),
				});
				const note = pages.map((p) => (p.type === "narratives" ? p.note : undefined)).find(Boolean);
				if (note) blocks.push({ kind: "paragraph", text: note, muted: true });
				break;
			}
			case "chart": {
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				const labelHeader =
					s.kind === "cascadeAll" || s.kind === "cascadeVhf" || s.key === "focus-cascade"
						? "Stage"
						: s.kind === "trend"
							? "Period"
							: s.kind === "diseaseBar"
								? "Condition"
								: "Source";
				blocks.push(...chartTable(s.chart, labelHeader));
				break;
			}
			case "map":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				if (s.map) blocks.push({ kind: "image", dataUrl: s.map.dataUrl, aspect: s.map.aspect, caption: `Alerts issued by district (${deck.range})` });
				if (s.top && !s.top.empty) {
					blocks.push({ kind: "heading", text: s.top.heading ?? "Top districts", level: 2 });
					blocks.push(...chartTable(s.top, "District"));
				}
				break;
			case "divider":
				blocks.push({ kind: "heading", text: s.heading, level: 1 });
				if (s.subheading) blocks.push({ kind: "paragraph", text: s.subheading, muted: true });
				break;
			case "image":
				blocks.push({ kind: "heading", text: s.title, level: 1 });
				if (s.image)
					blocks.push({ kind: "image", dataUrl: s.image, aspect: aspects?.get(s.image) ?? 1.5, caption: s.caption || undefined });
				break;
			case "closing":
				blocks.push({ kind: "heading", text: s.heading, level: 1 });
				if (s.message) blocks.push({ kind: "paragraph", text: s.message });
				for (const c of s.contact) blocks.push({ kind: "paragraph", text: c, muted: true });
				break;
		}
	}
	return blocks;
}
