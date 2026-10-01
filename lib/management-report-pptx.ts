/**
 * Renders a built deck (management-report-deck.ts) to an editable .pptx with
 * pptxgenjs: native text, native tables and native charts — so the file can be
 * edited in PowerPoint — positioned with the same geometry the in-app preview
 * uses (management-report-layout.ts), so the file matches the preview.
 *
 * All numbers come from GET /reports/alerts-management, which shares its
 * outcome derivation with the dashboard, so the deck always matches the app.
 */

import { bareHex, type DeckConfig } from "@/lib/management-report-config";
import {
	crowdedLabels,
	footerParts,
	type BuiltDeck,
	type ChartSpec,
	type DeckSlide,
	type DeckStyle,
} from "@/lib/management-report-deck";
import {
	agendaLayout,
	bulletsLayout,
	chartLayout,
	chromeLayout,
	closingLayout,
	containBox,
	contentBox,
	coverLayout,
	decorations,
	dividerLayout,
	fitFont,
	imageLayout,
	kpiLayout,
	kpiTileParts,
	mapLayout,
	narrativesLayout,
	statementLayout,
	tableLayout,
	twoColumnLayout,
	type Box,
} from "@/lib/management-report-layout";

// Older import sites (regional performance, view helpers) keep working.
export {
	formatReportRange,
	MANAGEMENT_CASCADE_STAGES,
	scopeColumns,
	type ScopeColumn,
} from "@/lib/management-report-deck";
export { renderDistrictChoropleth } from "@/lib/management-report-map";

type Pptx = any;
type PptxSlide = any;

const hx = (hex: string) => bareHex(hex);

/** Natural aspect (w/h) of each distinct image, for contain-fitting. */
export async function measureImages(urls: (string | null | undefined)[]): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	const unique = Array.from(new Set(urls.filter((u): u is string => Boolean(u))));
	await Promise.all(
		unique.map(
			(url) =>
				new Promise<void>((resolve) => {
					const img = new Image();
					img.onload = () => {
						if (img.naturalWidth && img.naturalHeight) out.set(url, img.naturalWidth / img.naturalHeight);
						resolve();
					};
					img.onerror = () => resolve();
					img.src = url;
				})
		)
	);
	return out;
}

interface Ctx {
	pptx: Pptx;
	style: DeckStyle;
	config: DeckConfig;
	deck: BuiltDeck;
	aspects: Map<string, number>;
	font: string;
}

function text(
	ctx: Ctx,
	slide: PptxSlide,
	value: string | any[],
	box: Box,
	o: {
		size: number;
		color: string;
		bold?: boolean;
		italic?: boolean;
		align?: "left" | "center" | "right";
		valign?: "top" | "middle" | "bottom";
		shrink?: boolean;
	}
) {
	slide.addText(value, {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		fontFace: ctx.font,
		fontSize: o.size,
		color: hx(o.color),
		bold: o.bold ?? false,
		italic: o.italic ?? false,
		align: o.align ?? "left",
		valign: o.valign ?? "middle",
		margin: 0,
		...(o.shrink ? { fit: "shrink" } : {}),
	});
}

function rect(ctx: Ctx, slide: PptxSlide, box: Box, color: string, transparency = 0) {
	slide.addShape(ctx.pptx.ShapeType.rect, {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		fill: { color: hx(color), transparency },
		line: { type: "none" },
	});
}

function image(ctx: Ctx, slide: PptxSlide, url: string, box: Box, aspect?: number) {
	const fit = containBox(box, aspect ?? ctx.aspects.get(url) ?? box.w / box.h);
	slide.addImage({ data: url, x: fit.x, y: fit.y, w: fit.w, h: fit.h });
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function contentChrome(ctx: Ctx, slide: PptxSlide, s: DeckSlide, number: number, total: number) {
	const { style, config } = ctx;
	const t = style.theme;
	const logo = config.cover.logoDataUrl;
	const L = chromeLayout(style, config, Boolean(logo));
	slide.background = { color: hx(t.bg) };
	if (L.band) rect(ctx, slide, L.band, t.accent);
	if (L.stripe) rect(ctx, slide, L.stripe, t.accent);
	if (L.rule) rect(ctx, slide, L.rule, style.design.titleStyle === "sidebar" ? t.secondary : t.accent);
	if (L.hairline) rect(ctx, slide, L.hairline, t.border);
	text(ctx, slide, s.title, L.title, {
		size: fitFont(s.title, L.title, L.titleFont, 12),
		bold: true,
		color: L.titleColor === "onAccent" ? t.onAccent : L.titleColor === "accent" ? t.accent : t.ink,
	});
	if (L.logo && logo) image(ctx, slide, logo, L.logo);

	const f = footerParts(config, ctx.deck, number, total);
	rect(ctx, slide, L.footerLine, t.border);
	if (f.left) text(ctx, slide, f.left, L.footerLeft, { size: 8, color: t.muted });
	if (f.center)
		text(ctx, slide, f.center, L.footerCenter, {
			size: 8,
			bold: true,
			color: /CONFIDENTIAL|RESTRICTED|SECRET/.test(f.center) ? t.bad : t.accent,
			align: "center",
		});
	if (f.right) text(ctx, slide, f.right, L.footerRight, { size: 8, color: t.muted, align: "right" });
}

function decorate(ctx: Ctx, slide: PptxSlide, onColor: string) {
	for (const d of decorations(ctx.style)) {
		slide.addShape(ctx.pptx.ShapeType.ellipse, {
			x: d.circle.x,
			y: d.circle.y,
			w: d.circle.w,
			h: d.circle.h,
			fill: { color: hx(onColor), transparency: Math.round((1 - d.opacity) * 100) },
			line: { type: "none" },
		});
	}
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function addChart(ctx: Ctx, slide: PptxSlide, spec: ChartSpec, box: Box) {
	const { pptx, style } = ctx;
	const t = style.theme;
	if (spec.empty) {
		text(ctx, slide, spec.empty, box, { size: 13, italic: true, color: t.muted, align: "center" });
		return;
	}
	const plot = spec.heading
		? { x: box.x, y: box.y + 0.32, w: box.w, h: box.h - 0.32 }
		: box;
	if (spec.heading) {
		text(ctx, slide, spec.heading, { x: box.x, y: box.y, w: box.w, h: 0.3 }, {
			size: 11,
			bold: true,
			color: t.ink,
			align: "center",
		});
	}
	const data = spec.series.map((s) => ({ name: s.name, labels: spec.labels, values: s.values }));
	const common: Record<string, unknown> = {
		x: plot.x,
		y: plot.y,
		w: plot.w,
		h: plot.h,
		showLegend: spec.showLegend,
		legendPos: "b",
		legendFontSize: 10,
		legendFontFace: ctx.font,
		legendColor: hx(t.ink),
		catAxisLabelColor: hx(t.muted),
		valAxisLabelColor: hx(t.muted),
		catAxisLabelFontFace: ctx.font,
		valAxisLabelFontFace: ctx.font,
		catAxisLabelFontSize: spec.labels.length > 10 ? 8 : 9,
		valAxisLabelFontSize: 9,
		catAxisLineShow: false,
		valAxisLineShow: false,
		valGridLine: { color: hx(t.border), size: 0.5, style: "dash" },
		catGridLine: { style: "none" },
		dataLabelFontSize: 9,
		dataLabelFontFace: ctx.font,
		dataLabelColor: hx(t.ink),
	};

	if (spec.variant === "pie" || spec.variant === "doughnut") {
		const doughnut = spec.variant === "doughnut";
		slide.addChart(doughnut ? pptx.ChartType.doughnut : pptx.ChartType.pie, data, {
			...common,
			chartColors: (spec.pointColors ?? spec.series.map((s) => s.color)).map(hx),
			showLegend: true,
			legendPos: "r",
			showValue: spec.dataLabels && !doughnut,
			showPercent: spec.dataLabels,
			showLabel: false,
			dataLabelPosition: doughnut ? undefined : "bestFit",
			dataLabelColor: doughnut ? "FFFFFF" : hx(t.ink),
			holeSize: doughnut ? 55 : undefined,
			dataBorder: { pt: 1, color: hx(t.bg) },
		});
		return;
	}

	const colors = spec.series.map((s) => hx(s.color));
	if (spec.variant === "line" || spec.variant === "area") {
		slide.addChart(spec.variant === "line" ? pptx.ChartType.line : pptx.ChartType.area, data, {
			...common,
			chartColors: colors,
			chartColorsOpacity: spec.variant === "area" ? 55 : undefined,
			lineSize: spec.variant === "line" ? 2.25 : 1,
			lineDataSymbol: spec.variant === "line" && spec.labels.length <= 31 ? "circle" : "none",
			lineDataSymbolSize: 5,
			showValue: false,
			catAxisLabelRotate: spec.labels.length > 12 ? -45 : 0,
		});
		return;
	}

	const horizontal = spec.variant === "bar" || spec.orientation === "horizontal";
	const stacked = spec.variant === "stacked";
	slide.addChart(pptx.ChartType.bar, data, {
		...common,
		barDir: horizontal ? "bar" : "col",
		barGrouping: stacked ? "stacked" : "clustered",
		barGapWidthPct: 60,
		chartColors: colors,
		showValue: spec.dataLabels,
		dataLabelPosition: stacked ? "ctr" : "outEnd",
		dataLabelColor: stacked ? "FFFFFF" : hx(t.ink),
		// Horizontal bars read top-down in rank order.
		...(horizontal ? { catAxisOrientation: "maxMin" } : {}),
		catAxisLabelRotate: !horizontal && crowdedLabels(spec.labels, plot.w) ? -35 : 0,
	});
}

/* ------------------------------------------------------------------ */
/* Slide renderers                                                     */
/* ------------------------------------------------------------------ */

function renderCover(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "cover" }>) {
	const t = ctx.style.theme;
	const c = s.cover;
	const logos = [c.logo, c.partnerLogo].filter((l): l is string => Boolean(l));
	const L = coverLayout(ctx.style, c.layout, logos.length);
	const onColor = c.layout === "minimal" ? t.ink : c.layout === "split" ? t.ink : t.onAccent;

	if (c.layout === "centered") {
		slide.background = { color: hx(t.accent) };
		decorate(ctx, slide, t.onAccent);
	} else {
		slide.background = { color: hx(t.bg) };
	}
	if (L.panel) {
		rect(ctx, slide, L.panel, t.accent);
		slide.addShape(ctx.pptx.ShapeType.ellipse, {
			x: L.panel.w - 2.4, y: L.panel.h - 2.4, w: 2.0, h: 2.0,
			fill: { color: hx(t.onAccent), transparency: 90 }, line: { type: "none" },
		});
	}
	if (L.bottomBar) rect(ctx, slide, L.bottomBar, c.layout === "centered" ? t.secondary : t.accent);
	if (L.verticalRule) rect(ctx, slide, L.verticalRule, c.layout === "split" ? t.accent : t.accent);
	logos.forEach((url, i) => image(ctx, slide, url, L.logos[i]));

	const titleColor = c.layout === "centered" ? t.onAccent : t.ink;
	text(ctx, slide, c.title, L.title, {
		size: fitFont(c.title, L.title, L.titleFont, 18),
		bold: true,
		color: titleColor,
		align: L.align,
		valign: "bottom",
	});
	text(ctx, slide, c.subtitle, L.subtitle, {
		size: 17,
		color: c.layout === "centered" ? t.onAccent : t.accent,
		align: L.align,
	});
	if (c.scope)
		text(ctx, slide, c.scope, L.scope, {
			size: 13,
			bold: true,
			color: c.layout === "centered" ? t.onAccent : t.secondary,
			align: L.align,
		});
	const orgColor = c.layout === "split" ? t.onAccent : onColor;
	if (c.organization)
		text(ctx, slide, c.organization, L.organization, {
			size: 14,
			bold: true,
			color: orgColor,
			align: c.layout === "split" ? "left" : L.align,
			valign: c.layout === "split" ? "bottom" : "middle",
		});
	if (c.presenter)
		text(ctx, slide, c.presenter, L.presenter, {
			size: 12,
			color: c.layout === "centered" ? t.onAccent : t.muted,
			align: L.align,
		});
	text(ctx, slide, c.dateLine, L.date, {
		size: 11,
		italic: true,
		color: c.layout === "centered" ? t.onAccent : t.muted,
		align: c.layout === "minimal" ? "right" : L.align,
	});
}

function renderTable(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "table" }>) {
	const { style } = ctx;
	const t = style.theme;
	if (s.empty) {
		text(ctx, slide, s.empty, contentBox(style), { size: 13, italic: true, color: t.muted, align: "center" });
		return;
	}
	const L = tableLayout(style, s);
	const rows = s.rows.map((r) =>
		r.cells.map((cell, ci) => {
			const base: Record<string, unknown> = { align: ci === 0 ? "left" : "center" };
			switch (r.style) {
				case "header":
					return { text: cell, options: { ...base, bold: true, color: hx(t.onAccent), fill: { color: hx(t.accent) } } };
				case "section":
					return { text: cell, options: { ...base, bold: true, color: hx(t.ink), fill: { color: hx(t.sectionFill) } } };
				case "total":
					return { text: cell, options: { ...base, bold: true, color: hx(t.ink), fill: { color: hx(t.totalFill) } } };
				case "fold":
					return { text: cell, options: { ...base, italic: true, color: hx(t.muted), fill: { color: hx(t.surface) } } };
				default:
					return { text: cell, options: { ...base, color: hx(t.ink), fill: { color: hx(t.surface) }, ...(ci === 0 ? { margin: [0.02, 0.06, 0.02, 0.16] } : {}) } };
			}
		})
	);
	slide.addTable(rows, {
		x: L.box.x,
		y: L.box.y,
		w: L.box.w,
		colW: L.colW,
		rowH: L.rowH,
		fontFace: ctx.font,
		fontSize: style.table.font,
		border: { type: "solid", pt: 0.5, color: hx(t.border) },
		valign: "middle",
		margin: [0.02, 0.06, 0.02, 0.06],
		autoPage: false,
	});
	if (L.note && s.note) text(ctx, slide, s.note, L.note, { size: 8, italic: true, color: t.muted });
}

function renderNarratives(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "narratives" }>) {
	const { style } = ctx;
	const t = style.theme;
	if (s.empty) {
		text(ctx, slide, s.empty, contentBox(style), { size: 13, italic: true, color: t.muted, align: "center" });
		return;
	}
	const L = narrativesLayout(style, s);
	const head = (v: string) => ({ text: v, options: { bold: true, color: hx(t.onAccent), fill: { color: hx(t.accent) }, valign: "middle" } });
	const body = (v: string) => ({ text: v, options: { color: hx(t.ink), fill: { color: hx(t.surface) } } });
	slide.addTable(
		[[head("Source"), head("District"), head("Narrative")], ...s.rows.map((d) => [body(d.source), body(d.district), body(d.narrative)])],
		{
			x: L.box.x,
			y: L.box.y,
			w: L.box.w,
			colW: L.colW,
			rowH: L.rowH,
			fontFace: ctx.font,
			fontSize: style.narrative.font,
			border: { type: "solid", pt: 0.5, color: hx(t.border) },
			valign: "top",
			margin: [0.03, 0.06, 0.03, 0.06],
			autoPage: false,
		}
	);
	if (L.note && s.note) text(ctx, slide, s.note, L.note, { size: 8.5, italic: true, color: t.muted });
}

function renderKpis(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "kpis" }>) {
	const { style } = ctx;
	const t = style.theme;
	const L = kpiLayout(style, s.tiles.length, Boolean(s.comparison));
	s.tiles.forEach((tile, i) => {
		const box = L.tiles[i];
		const p = kpiTileParts(box);
		slide.addShape(ctx.pptx.ShapeType.rect, {
			x: box.x, y: box.y, w: box.w, h: box.h,
			fill: { color: hx(t.surface) },
			line: { color: hx(t.border), width: 0.75 },
		});
		rect(ctx, slide, p.strip, i % 2 === 0 ? t.accent : t.secondary);
		text(ctx, slide, tile.label.toUpperCase(), p.label, { size: 9.5, bold: true, color: t.muted });
		text(ctx, slide, tile.value, p.value, { size: fitFont(tile.value, p.value, L.valueFont, 14), bold: true, color: t.ink });
		if (tile.delta) {
			const arrow = tile.delta.direction === "up" ? "▲" : tile.delta.direction === "down" ? "▼" : "■";
			const color = tile.delta.tone === "good" ? t.good : tile.delta.tone === "bad" ? t.bad : t.muted;
			text(
				ctx,
				slide,
				[
					{ text: `${arrow} ${tile.delta.text}`, options: { bold: true, color: hx(color) } },
					{ text: `  prev ${tile.delta.previous}`, options: { color: hx(t.muted) } },
				],
				p.delta,
				{ size: 9.5, color: color }
			);
		}
		text(ctx, slide, tile.hint, p.hint, { size: 8, italic: true, color: t.muted });
	});
	if (L.comparison && s.comparison)
		text(ctx, slide, `Change ${s.comparison}.`, L.comparison, { size: 9, italic: true, color: t.muted });
}

function toneColor(style: DeckStyle, tone: "good" | "bad" | "neutral" | "info"): string {
	const t = style.theme;
	return tone === "good" ? t.good : tone === "bad" ? t.bad : tone === "info" ? t.secondary : t.muted;
}

function renderBullets(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "bullets" }>) {
	const { style } = ctx;
	const t = style.theme;
	if (s.bullets.length === 0) {
		if (s.empty) text(ctx, slide, s.empty, contentBox(style), { size: 13, italic: true, color: t.muted, align: "center" });
		return;
	}
	const L = bulletsLayout(style, s.bullets);
	s.bullets.forEach((b, i) => {
		const row = L.rows[i];
		const fill = toneColor(style, b.tone);
		slide.addShape(ctx.pptx.ShapeType.ellipse, {
			x: row.marker.x, y: row.marker.y, w: row.marker.w, h: row.marker.h,
			fill: { color: hx(fill) }, line: { type: "none" },
		});
		text(ctx, slide, b.mark, row.marker, { size: L.markerFont, bold: true, color: "#ffffff", align: "center" });
		text(ctx, slide, b.text, row.text, { size: L.font, color: t.ink, valign: "top" });
	});
}

function renderAgenda(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "agenda" }>) {
	const t = ctx.style.theme;
	const L = agendaLayout(ctx.style, s.items.length);
	s.items.forEach((label, i) => {
		const row = L.rows[i];
		slide.addShape(ctx.pptx.ShapeType.ellipse, {
			x: row.marker.x, y: row.marker.y, w: row.marker.w, h: row.marker.h,
			fill: { color: hx(i % 2 === 0 ? t.accent : t.secondary) }, line: { type: "none" },
		});
		text(ctx, slide, String(i + 1), row.marker, {
			size: 12, bold: true, color: i % 2 === 0 ? t.onAccent : t.onSecondary, align: "center",
		});
		text(ctx, slide, label, row.text, { size: L.font, color: t.ink });
	});
}

function bulletRuns(lines: string[], color: string) {
	return lines.map((l, i) => ({
		text: l,
		options: { bullet: { indent: 16 }, color: hx(color), breakLine: i < lines.length - 1, paraSpaceAfter: 8 },
	}));
}

function renderTwoColumn(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "twoColumn" }>) {
	const t = ctx.style.theme;
	const L = twoColumnLayout(ctx.style);
	rect(ctx, slide, L.divider, t.border);
	if (s.left.length) text(ctx, slide, bulletRuns(s.left, t.ink), L.left, { size: 15, color: t.ink, valign: "top" });
	if (s.right.length) text(ctx, slide, bulletRuns(s.right, t.ink), L.right, { size: 15, color: t.ink, valign: "top" });
}

function renderStatement(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "statement" }>) {
	const t = ctx.style.theme;
	const L = statementLayout(ctx.style, s.text);
	text(ctx, slide, "“", L.quote, { size: 96, bold: true, color: t.accentSoft, valign: "top" });
	text(ctx, slide, s.text, L.text, { size: L.font, italic: true, color: t.accent, valign: "middle" });
	if (s.attribution) text(ctx, slide, `— ${s.attribution}`, L.attribution, { size: 13, color: t.muted, align: "right" });
}

function renderMap(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "map" }>) {
	const t = ctx.style.theme;
	const L = mapLayout(ctx.style, Boolean(s.top));
	if (s.map) image(ctx, slide, s.map.dataUrl, L.map, s.map.aspect);
	else text(ctx, slide, "Map unavailable (no boundary data).", L.map, { size: 12, italic: true, color: t.muted, align: "center" });
	if (s.top && L.top) addChart(ctx, slide, s.top, L.top);
}

function renderImage(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "image" }>) {
	const t = ctx.style.theme;
	const L = imageLayout(ctx.style, Boolean(s.caption));
	if (s.image) image(ctx, slide, s.image, L.image);
	else text(ctx, slide, "No image chosen.", L.image, { size: 13, italic: true, color: t.muted, align: "center" });
	if (L.caption && s.caption) text(ctx, slide, s.caption, L.caption, { size: 11, italic: true, color: t.muted, align: "center" });
}

function renderDivider(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "divider" }>) {
	const t = ctx.style.theme;
	const fill = s.tone === "accent" ? t.accent : t.secondary;
	const on = s.tone === "accent" ? t.onAccent : t.onSecondary;
	slide.background = { color: hx(fill) };
	decorate(ctx, slide, on);
	const L = dividerLayout(ctx.style);
	text(ctx, slide, s.heading, L.heading, { size: fitFont(s.heading, L.heading, 36, 20), bold: true, color: on, valign: "bottom" });
	rect(ctx, slide, L.rule, s.tone === "accent" ? t.secondary : t.accent);
	if (s.subheading) text(ctx, slide, s.subheading, L.subheading, { size: 16, color: on, valign: "top" });
}

function renderClosing(ctx: Ctx, slide: PptxSlide, s: Extract<DeckSlide, { type: "closing" }>) {
	const t = ctx.style.theme;
	const logo = ctx.config.cover.logoDataUrl;
	slide.background = { color: hx(t.accent) };
	decorate(ctx, slide, t.onAccent);
	const L = closingLayout(ctx.style, Boolean(logo));
	if (L.logo && logo) image(ctx, slide, logo, L.logo);
	text(ctx, slide, s.heading, L.heading, { size: fitFont(s.heading, L.heading, 40, 20), bold: true, color: t.onAccent, align: "center" });
	if (s.message) text(ctx, slide, s.message, L.message, { size: 18, color: t.onAccent, align: "center" });
	if (s.contact.length)
		text(ctx, slide, s.contact.join("\n"), L.contact, { size: 12, color: t.onAccent, align: "center", valign: "bottom" });
}

/* ------------------------------------------------------------------ */
/* The deck                                                            */
/* ------------------------------------------------------------------ */

export interface ManagementDeckInput {
	deck: BuiltDeck;
	config: DeckConfig;
	/** File name WITHOUT extension. */
	fileStem: string;
}

/** Builds and downloads the .pptx. Returns the filename it saved under. */
export async function downloadManagementReportPptx({ deck, config, fileStem }: ManagementDeckInput): Promise<string> {
	const style = deck.style;
	const { default: PptxGenJS } = await import("pptxgenjs");
	const pptx: Pptx = new PptxGenJS();
	pptx.layout = { "16x9": "LAYOUT_16x9", "16x10": "LAYOUT_16x10", "4x3": "LAYOUT_4x3" }[style.design.aspect];
	pptx.author = config.cover.presenter.trim() || "Alerts MIS";
	pptx.company = config.cover.organization.trim() || "Ministry of Health, Uganda";
	pptx.subject = `Alerts Management report ${deck.range}${deck.scopeSuffix}`;
	pptx.title = deck.title;
	pptx.theme = { headFontFace: style.design.font, bodyFontFace: style.design.font };

	const aspects = await measureImages([
		config.cover.logoDataUrl,
		config.cover.partnerLogoDataUrl,
		...deck.slides.map((s) => (s.type === "image" ? s.image : null)),
	]);
	const ctx: Ctx = { pptx, style, config, deck, aspects, font: style.design.font };

	const total = deck.slides.length;
	deck.slides.forEach((s, i) => {
		const slide = pptx.addSlide();
		if (s.chrome === "content") contentChrome(ctx, slide, s, i + 1, total);
		switch (s.type) {
			case "cover": renderCover(ctx, slide, s); break;
			case "agenda": renderAgenda(ctx, slide, s); break;
			case "kpis": renderKpis(ctx, slide, s); break;
			case "bullets": renderBullets(ctx, slide, s); break;
			case "twoColumn": renderTwoColumn(ctx, slide, s); break;
			case "statement": renderStatement(ctx, slide, s); break;
			case "table": renderTable(ctx, slide, s); break;
			case "narratives": renderNarratives(ctx, slide, s); break;
			case "chart": addChart(ctx, slide, s.chart, chartLayout(style, false).plot); break;
			case "map": renderMap(ctx, slide, s); break;
			case "divider": renderDivider(ctx, slide, s); break;
			case "image": renderImage(ctx, slide, s); break;
			case "closing": renderClosing(ctx, slide, s); break;
		}
		if (s.notes) slide.addNotes(s.notes);
	});

	if (total === 0) {
		const slide = pptx.addSlide();
		slide.addText("No slides enabled.", { x: 1, y: 2, w: 8, h: 1, fontSize: 18, align: "center" });
	}

	const fileName = `${fileStem}.pptx`;
	// Table cells are ~1.6 KB of repetitive XML each; DEFLATE takes a 48-slide
	// deck from ~3.3 MB (pptxgenjs stores uncompressed by default) to a fraction.
	await pptx.writeFile({ fileName, compression: true });
	return fileName;
}
