/**
 * Slide geometry shared by the HTML slide renderer (deck-slide.tsx) and the
 * .pptx renderer (management-report-pptx.ts). Every box is in INCHES on the
 * slide; the HTML side multiplies by 96 px/in, pptxgenjs takes inches as-is.
 * Keeping the arithmetic here is what makes the preview a faithful picture of
 * the PowerPoint rather than a look-alike.
 */

import type { DeckConfig } from "@/lib/management-report-config";
import type { Bullet, DeckSlide, DeckStyle } from "@/lib/management-report-deck";
import { NARRATIVE_COL } from "@/lib/management-report-deck";

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export const PX_PER_IN = 96;
/** Points → CSS px at 96 px/in. */
export const ptPx = (pt: number) => (pt * PX_PER_IN) / 72;

/** Fit an image of `aspect` (w/h) inside `box`, centred. */
export function containBox(box: Box, aspect: number): Box {
	if (!(aspect > 0)) return box;
	let w = box.w;
	let h = w / aspect;
	if (h > box.h) {
		h = box.h;
		w = h * aspect;
	}
	return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/* ------------------------------------------------------------------ */
/* Chrome: title area, logo, footer                                    */
/* ------------------------------------------------------------------ */

export interface ChromeLayout {
	title: Box;
	titleFont: number;
	titleColor: "ink" | "accent" | "onAccent";
	band: Box | null;
	stripe: Box | null;
	rule: Box | null;
	hairline: Box | null;
	logo: Box | null;
	footerLine: Box;
	footerLeft: Box;
	footerCenter: Box;
	footerRight: Box;
}

export function chromeLayout(style: DeckStyle, config: DeckConfig, hasLogo: boolean): ChromeLayout {
	const g = style.geometry;
	const ts = style.design.titleStyle;
	const b = config.branding;
	const showLogo = hasLogo && b.logoOnSlides;
	const logoTop = showLogo && b.logoPosition === "top-right";
	const titleW = g.contentW - (logoTop ? 1.05 : 0);
	const logo: Box | null = showLogo
		? b.logoPosition === "top-right"
			? { x: g.w - 0.4 - 0.9, y: ts === "band" ? 0.12 : 0.14, w: 0.9, h: ts === "band" ? 0.6 : 0.56 }
			: b.logoPosition === "bottom-right"
				? { x: g.w - 0.4 - 0.75, y: g.footerY - 0.02, w: 0.75, h: g.footerH }
				: { x: g.x, y: g.footerY - 0.02, w: 0.75, h: g.footerH }
		: null;
	const leftShift = showLogo && b.logoPosition === "bottom-left" ? 0.85 : 0;
	const rightShift = showLogo && b.logoPosition === "bottom-right" ? 0.85 : 0;
	return {
		title: { x: g.x, y: g.titleY, w: titleW, h: g.titleH },
		titleFont: 20,
		titleColor: ts === "band" ? "onAccent" : ts === "minimal" ? "accent" : "ink",
		band: ts === "band" ? { x: 0, y: 0, w: g.w, h: g.contentTop - 0.18 } : null,
		stripe: ts === "sidebar" ? { x: 0, y: 0, w: 0.16, h: g.h } : null,
		rule:
			ts === "rule"
				? { x: g.x, y: g.titleY + g.titleH + 0.03, w: 1.6, h: 0.05 }
				: ts === "sidebar"
					? { x: g.x, y: g.titleY + g.titleH + 0.03, w: 0.9, h: 0.04 }
					: null,
		hairline: ts === "minimal" ? { x: g.x, y: g.titleY + g.titleH + 0.06, w: g.contentW, h: 0.012 } : null,
		logo,
		footerLine: { x: g.x, y: g.footerY - 0.04, w: g.contentW, h: 0.008 },
		footerLeft: { x: g.x + leftShift, y: g.footerY, w: g.contentW * 0.5 - leftShift, h: g.footerH },
		footerCenter: { x: g.x + g.contentW * 0.3, y: g.footerY, w: g.contentW * 0.4, h: g.footerH },
		footerRight: { x: g.x + g.contentW * 0.75, y: g.footerY, w: g.contentW * 0.25 - rightShift, h: g.footerH },
	};
}

/** The content area below the title and above the footer. */
export function contentBox(style: DeckStyle): Box {
	const g = style.geometry;
	return { x: g.x, y: g.contentTop, w: g.contentW, h: g.contentBottom - g.contentTop };
}

/* ------------------------------------------------------------------ */
/* Full-bleed slides: cover, divider, closing                          */
/* ------------------------------------------------------------------ */

export interface Decoration {
	circle: Box;
	/** 0–1 opacity of the fill. */
	opacity: number;
	color: "onAccent" | "secondary" | "accent";
}

/** Two soft circles in the corner — decoration for coloured slides. */
export function decorations(style: DeckStyle): Decoration[] {
	const g = style.geometry;
	return [
		{ circle: { x: g.w - 2.6, y: -1.4, w: 4.2, h: 4.2 }, opacity: 0.09, color: "onAccent" },
		{ circle: { x: g.w - 1.5, y: g.h - 1.9, w: 2.6, h: 2.6 }, opacity: 0.12, color: "onAccent" },
	];
}

export interface CoverLayout {
	panel: Box | null;
	logos: Box[];
	title: Box;
	titleFont: number;
	subtitle: Box;
	scope: Box;
	organization: Box;
	presenter: Box;
	date: Box;
	bottomBar: Box | null;
	verticalRule: Box | null;
	align: "center" | "left";
}

export function coverLayout(style: DeckStyle, layout: DeckConfig["cover"]["layout"], logoCount: number): CoverLayout {
	const g = style.geometry;
	if (layout === "split") {
		const pw = g.w * 0.4;
		const rx = pw + 0.55;
		const rw = g.w - rx - 0.5;
		const mid = g.h * 0.36;
		return {
			panel: { x: 0, y: 0, w: pw, h: g.h },
			logos: [
				{ x: 0.5, y: 0.5, w: 1.3, h: 1.1 },
				{ x: g.w - 0.5 - 1.1, y: g.h - 0.5 - 0.8, w: 1.1, h: 0.8 },
			].slice(0, logoCount),
			title: { x: rx, y: mid - 0.6, w: rw, h: 1.3 },
			titleFont: 30,
			subtitle: { x: rx, y: mid + 0.82, w: rw, h: 0.45 },
			scope: { x: rx, y: mid + 1.3, w: rw, h: 0.35 },
			organization: { x: 0.5, y: g.h - 1.25, w: pw - 0.9, h: 0.6 },
			presenter: { x: rx, y: g.h - 1.35, w: rw - 1.3, h: 0.35 },
			date: { x: rx, y: g.h - 0.98, w: rw - 1.3, h: 0.3 },
			bottomBar: null,
			verticalRule: { x: rx, y: mid + 0.72, w: 1.4, h: 0.06 },
			align: "left",
		};
	}
	if (layout === "minimal") {
		return {
			panel: null,
			logos: [
				{ x: 0.6, y: 0.45, w: 1.2, h: 0.85 },
				{ x: g.w - 0.6 - 1.2, y: 0.45, w: 1.2, h: 0.85 },
			].slice(0, logoCount),
			title: { x: 0.85, y: g.h * 0.3, w: g.w - 1.7, h: 1.3 },
			titleFont: 34,
			subtitle: { x: 0.85, y: g.h * 0.3 + 1.32, w: g.w - 1.7, h: 0.45 },
			scope: { x: 0.85, y: g.h * 0.3 + 1.78, w: g.w - 1.7, h: 0.35 },
			organization: { x: 0.85, y: g.h - 1.15, w: g.w - 1.7, h: 0.35 },
			presenter: { x: 0.85, y: g.h - 0.8, w: (g.w - 1.7) / 2, h: 0.3 },
			date: { x: 0.85 + (g.w - 1.7) / 2, y: g.h - 0.8, w: (g.w - 1.7) / 2, h: 0.3 },
			bottomBar: { x: 0, y: g.h - 0.1, w: g.w, h: 0.1 },
			verticalRule: { x: 0.6, y: g.h * 0.3 + 0.1, w: 0.08, h: 2.0 },
			align: "left",
		};
	}
	// centered
	const hasLogo = logoCount > 0;
	const top = hasLogo ? 1.75 : 1.35;
	const logoW = 1.15;
	const gap = 0.35;
	const totalLogoW = logoCount * logoW + Math.max(0, logoCount - 1) * gap;
	return {
		panel: null,
		logos: Array.from({ length: logoCount }, (_, i) => ({
			x: g.w / 2 - totalLogoW / 2 + i * (logoW + gap),
			y: 0.4,
			w: logoW,
			h: 1.1,
		})),
		title: { x: 0.7, y: top, w: g.w - 1.4, h: 1.2 },
		titleFont: 34,
		subtitle: { x: 0.7, y: top + 1.22, w: g.w - 1.4, h: 0.45 },
		scope: { x: 0.7, y: top + 1.68, w: g.w - 1.4, h: 0.35 },
		organization: { x: 0.7, y: g.h - 1.25, w: g.w - 1.4, h: 0.38 },
		presenter: { x: 0.7, y: g.h - 0.85, w: g.w - 1.4, h: 0.28 },
		date: { x: 0.7, y: g.h - 0.58, w: g.w - 1.4, h: 0.28 },
		bottomBar: { x: 0, y: g.h - 0.12, w: g.w, h: 0.12 },
		verticalRule: null,
		align: "center",
	};
}

/* ------------------------------------------------------------------ */
/* KPI tiles                                                           */
/* ------------------------------------------------------------------ */

export interface KpiLayout {
	tiles: Box[];
	comparison: Box | null;
	valueFont: number;
}

export function kpiLayout(style: DeckStyle, n: number, hasComparison: boolean): KpiLayout {
	const c = contentBox(style);
	const gap = 0.18;
	const cols = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2);
	const rows = n <= 4 ? 1 : 2;
	const availH = c.h - (hasComparison ? 0.32 : 0) - 0.05;
	const tileW = (c.w - gap * (cols - 1)) / cols;
	const tileH = Math.min(rows === 1 ? 2.2 : 1.9, (availH - gap * (rows - 1)) / rows);
	const gridH = tileH * rows + gap * (rows - 1);
	const y0 = c.y + 0.05 + Math.max(0, (availH - gridH) / 2);
	const tiles: Box[] = [];
	for (let i = 0; i < n; i++) {
		const r = Math.floor(i / cols);
		const col = i % cols;
		// Centre a short last row.
		const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
		const rowOffset = ((cols - inRow) * (tileW + gap)) / 2;
		tiles.push({ x: c.x + rowOffset + col * (tileW + gap), y: y0 + r * (tileH + gap), w: tileW, h: tileH });
	}
	return {
		tiles,
		comparison: hasComparison ? { x: c.x, y: c.y + c.h - 0.28, w: c.w, h: 0.26 } : null,
		valueFont: tileW < 1.9 ? 24 : tileW < 2.3 ? 28 : 32,
	};
}

/** Boxes inside one KPI tile. */
export function kpiTileParts(tile: Box) {
	const pad = 0.14;
	return {
		strip: { x: tile.x, y: tile.y, w: tile.w, h: 0.06 },
		label: { x: tile.x + pad, y: tile.y + 0.16, w: tile.w - pad * 2, h: 0.3 },
		value: { x: tile.x + pad, y: tile.y + 0.46, w: tile.w - pad * 2, h: Math.max(0.5, tile.h * 0.36) },
		delta: { x: tile.x + pad, y: tile.y + tile.h - 0.62, w: tile.w - pad * 2, h: 0.26 },
		hint: { x: tile.x + pad, y: tile.y + tile.h - 0.34, w: tile.w - pad * 2, h: 0.24 },
	};
}

/* ------------------------------------------------------------------ */
/* Bullets / agenda / two columns / statement                          */
/* ------------------------------------------------------------------ */

function linesFor(text: string, widthIn: number, font: number): number {
	const cpl = Math.max(12, Math.floor((widthIn * 72) / (font * 0.5)));
	return Math.max(1, Math.ceil(text.length / cpl));
}

export interface BulletRowLayout {
	marker: Box;
	text: Box;
}

export interface BulletsLayout {
	font: number;
	markerFont: number;
	rows: BulletRowLayout[];
}

export function bulletsLayout(style: DeckStyle, bullets: Bullet[]): BulletsLayout {
	const c = contentBox(style);
	const markerD = 0.34;
	const textX = c.x + markerD + 0.18;
	const textW = c.x + c.w - textX;
	const gap = 0.14;
	for (const font of [17, 15, 13, 12, 11]) {
		const lineH = (font * 1.25) / 72;
		const heights = bullets.map((b) => Math.max(markerD, linesFor(b.text, textW, font) * lineH));
		const total = heights.reduce((s, h) => s + h, 0) + gap * Math.max(0, bullets.length - 1);
		if (total <= c.h - 0.1 || font === 11) {
			let y = c.y + 0.1 + Math.max(0, Math.min(0.25, (c.h - 0.1 - total) / 4));
			const rows = heights.map((h) => {
				const row = {
					marker: { x: c.x, y: y + (Math.min(h, (font * 1.25) / 72) - markerD) / 2 + 0.01, w: markerD, h: markerD },
					text: { x: textX, y, w: textW, h },
				};
				y += h + gap;
				return row;
			});
			return { font, markerFont: bullets.some((b) => b.mark.length > 1) ? 7 : 10, rows };
		}
	}
	return { font: 11, markerFont: 9, rows: [] };
}

export function agendaLayout(style: DeckStyle, n: number): { font: number; rows: BulletRowLayout[] } {
	const c = contentBox(style);
	const twoCols = n > 6;
	const perCol = twoCols ? Math.ceil(n / 2) : n;
	const rowH = Math.min(0.6, (c.h - 0.2) / Math.max(1, perCol));
	const colW = twoCols ? (c.w - 0.4) / 2 : c.w;
	const d = Math.min(0.42, rowH - 0.1);
	const rows: BulletRowLayout[] = [];
	for (let i = 0; i < n; i++) {
		const col = twoCols ? Math.floor(i / perCol) : 0;
		const r = twoCols ? i % perCol : i;
		const x = c.x + col * (colW + 0.4);
		const y = c.y + 0.15 + r * rowH;
		rows.push({
			marker: { x, y: y + (rowH - d) / 2 - 0.05, w: d, h: d },
			text: { x: x + d + 0.22, y: y - 0.05, w: colW - d - 0.22, h: rowH },
		});
	}
	return { font: rowH < 0.45 ? 14 : 18, rows };
}

export function twoColumnLayout(style: DeckStyle): { left: Box; right: Box; divider: Box } {
	const c = contentBox(style);
	const colW = (c.w - 0.5) / 2;
	return {
		left: { x: c.x, y: c.y + 0.1, w: colW, h: c.h - 0.1 },
		right: { x: c.x + colW + 0.5, y: c.y + 0.1, w: colW, h: c.h - 0.1 },
		divider: { x: c.x + colW + 0.24, y: c.y + 0.2, w: 0.015, h: c.h - 0.4 },
	};
}

export function statementLayout(style: DeckStyle, text: string): { quote: Box; text: Box; font: number; attribution: Box } {
	const c = contentBox(style);
	const font = text.length > 220 ? 18 : text.length > 120 ? 22 : 28;
	return {
		quote: { x: c.x + 0.2, y: c.y, w: 1.2, h: 1.1 },
		text: { x: c.x + 0.9, y: c.y + 0.35, w: c.w - 1.8, h: c.h - 1.0 },
		font,
		attribution: { x: c.x + 0.9, y: c.y + c.h - 0.6, w: c.w - 1.8, h: 0.4 },
	};
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export function tableLayout(
	style: DeckStyle,
	slide: Extract<DeckSlide, { type: "table" }>
): { box: Box; colW: number[]; rowH: number[]; note: Box | null } {
	const c = contentBox(style);
	const cols = slide.rows[0]?.cells.length ?? 1;
	const first = Math.max(1.5, c.w * slide.firstColShare);
	const other = cols > 1 ? (c.w - first) / (cols - 1) : 0;
	const rowH = slide.rows.map((r) => (r.style === "header" ? style.table.headerH : style.table.rowH));
	const tableH = rowH.reduce((s, h) => s + h, 0);
	return {
		box: { x: c.x, y: c.y, w: c.w, h: tableH },
		colW: [first, ...Array(Math.max(0, cols - 1)).fill(other)],
		rowH,
		note: slide.note ? { x: c.x, y: Math.min(c.y + c.h - 0.24, c.y + tableH + 0.06), w: c.w, h: 0.24 } : null,
	};
}

export function narrativesLayout(
	style: DeckStyle,
	slide: Extract<DeckSlide, { type: "narratives" }>
): { box: Box; colW: number[]; rowH: number[]; note: Box | null } {
	const c = contentBox(style);
	const rowH = [0.3, ...slide.rowHeights];
	const tableH = rowH.reduce((s, h) => s + h, 0);
	return {
		box: { x: c.x, y: c.y, w: c.w, h: tableH },
		colW: [NARRATIVE_COL.source, NARRATIVE_COL.district, c.w - NARRATIVE_COL.source - NARRATIVE_COL.district],
		rowH,
		note: slide.note ? { x: c.x, y: Math.min(c.y + c.h - 0.26, c.y + tableH + 0.04), w: c.w, h: 0.26 } : null,
	};
}

/* ------------------------------------------------------------------ */
/* Charts, map, image                                                  */
/* ------------------------------------------------------------------ */

export function chartLayout(style: DeckStyle, hasHeading: boolean): { heading: Box | null; plot: Box } {
	const c = contentBox(style);
	return hasHeading
		? { heading: { x: c.x, y: c.y, w: c.w, h: 0.3 }, plot: { x: c.x, y: c.y + 0.32, w: c.w, h: c.h - 0.32 } }
		: { heading: null, plot: { x: c.x, y: c.y + 0.02, w: c.w, h: c.h - 0.02 } };
}

export function mapLayout(style: DeckStyle, hasTop: boolean): { map: Box; top: Box | null } {
	const c = contentBox(style);
	if (!hasTop) return { map: c, top: null };
	const mapW = c.w * 0.56;
	return {
		map: { x: c.x, y: c.y, w: mapW, h: c.h },
		top: { x: c.x + mapW + 0.2, y: c.y, w: c.w - mapW - 0.2, h: c.h },
	};
}

export function imageLayout(style: DeckStyle, hasCaption: boolean): { image: Box; caption: Box | null } {
	const c = contentBox(style);
	return {
		image: { x: c.x, y: c.y, w: c.w, h: c.h - (hasCaption ? 0.4 : 0) },
		caption: hasCaption ? { x: c.x, y: c.y + c.h - 0.34, w: c.w, h: 0.32 } : null,
	};
}

export function dividerLayout(style: DeckStyle): { heading: Box; rule: Box; subheading: Box } {
	const g = style.geometry;
	const y = g.h * 0.36;
	return {
		heading: { x: 0.8, y, w: g.w - 1.6, h: 1.0 },
		rule: { x: 0.8, y: y + 1.04, w: 1.6, h: 0.06 },
		subheading: { x: 0.8, y: y + 1.2, w: g.w - 1.6, h: 0.5 },
	};
}

export function closingLayout(style: DeckStyle, hasLogo: boolean): {
	logo: Box | null;
	heading: Box;
	message: Box;
	contact: Box;
} {
	const g = style.geometry;
	return {
		logo: hasLogo ? { x: g.w / 2 - 0.55, y: 0.45, w: 1.1, h: 1.0 } : null,
		heading: { x: 0.7, y: g.h * 0.34, w: g.w - 1.4, h: 1.0 },
		message: { x: 0.7, y: g.h * 0.34 + 1.02, w: g.w - 1.4, h: 0.5 },
		contact: { x: 0.7, y: g.h - 1.45, w: g.w - 1.4, h: 1.0 },
	};
}

/**
 * The largest font (pt, ≤ maxPt) at which `text` is estimated to fit `box`.
 * Both renderers use it, so a long title shrinks identically on screen and in
 * the file instead of relying on PowerPoint's autofit (applied only on edit).
 */
export function fitFont(text: string, box: Box, maxPt: number, minPt = Math.max(8, maxPt * 0.5)): number {
	const words = text.split(/\s+/).filter(Boolean);
	for (let pt = maxPt; pt > minPt; pt -= 1) {
		const lineH = (pt * 1.2) / 72;
		const maxLines = Math.max(1, Math.floor(box.h / lineH + 0.05));
		const cpl = Math.max(4, Math.floor((box.w * 72) / (pt * 0.53)));
		let lines = 1;
		let used = 0;
		for (const w of words) {
			const len = w.length + (used > 0 ? 1 : 0);
			if (used + len > cpl && used > 0) {
				lines += 1;
				used = w.length;
			} else {
				used += len;
			}
		}
		if (lines <= maxLines) return pt;
	}
	return minPt;
}
