import type {
	ManagementCount,
	ManagementDetail,
	ManagementDistrictRow,
	ManagementReport,
	ManagementScope,
} from "@/lib/fetch-reports";
import type { GeoFeature, GeoFeatureCollection } from "@/lib/fetch-geo";
import {
	bareHex,
	defaultDeckConfig,
	deriveDeckTheme,
	type DeckConfig,
} from "@/lib/management-report-config";

/**
 * Generates the "Alerts Management report" presentation (.pptx) for a date
 * range — a faithful reproduction of the weekly deck (district tables split by
 * patient status, source/disease charts, response cascades, alert narratives,
 * district choropleth map, and the signals-vs-alerts trend). All numbers come
 * from GET /reports/alerts-management, which shares its outcome derivation
 * with the dashboard, so the deck always matches the app.
 *
 * A `DeckConfig` (see lib/management-report-config) controls the accent theme,
 * which sections appear, the cover slide, and an optional disease-focus section.
 */

// The standard red choropleth ramp (hex WITH "#"), used when a caller doesn't
// pass an accent-derived ramp. All other brand colours come from the config's
// accent via paletteFromConfig (pptxgenjs wants hex WITHOUT the leading "#").
const DEFAULT_MAP_RAMP = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];

/** The bare-hex colours the deck paints, derived from the config's accent. */
interface PptxPalette {
	brand: string;
	ink: string;
	headerFill: string;
	sectionFill: string;
	totalFill: string;
	border: string;
	/** Cascade series [Alive, Dead, Unknown]. */
	series: string[];
	/** Choropleth ramp, hex WITH "#". */
	mapRamp: string[];
}

function paletteFromConfig(config: DeckConfig): PptxPalette {
	const theme = deriveDeckTheme(config.accent);
	const brand = bareHex(theme.accent);
	return {
		brand,
		ink: bareHex(theme.ink),
		headerFill: brand,
		sectionFill: bareHex(theme.accentSoft),
		totalFill: bareHex(theme.neutralFill),
		border: bareHex(theme.border),
		series: [brand, bareHex(theme.ink), "9CA3AF"],
		mapRamp: theme.mapRamp,
	};
}

type PptxSlide = any;
type Pptx = any;

/* ------------------------------------------------------------------ */
/* Date-range title formatting: "20th July 2026", "13th-19th July 2026" */
/* ------------------------------------------------------------------ */

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
	const v = n % 100;
	if (v >= 11 && v <= 13) return `${n}th`;
	switch (n % 10) {
		case 1: return `${n}st`;
		case 2: return `${n}nd`;
		case 3: return `${n}rd`;
		default: return `${n}th`;
	}
}

function parts(iso: string): { d: number; m: number; y: number } {
	const [y, m, d] = iso.split("-").map(Number);
	return { d, m: m - 1, y };
}

/** "20th July 2026" / "13th-19th July 2026" / "28th June-4th July 2026". */
export function formatReportRange(fromISO: string, toISO: string): string {
	const f = parts(fromISO);
	const t = parts(toISO);
	if (fromISO === toISO) return `${ordinal(f.d)} ${MONTHS[f.m]} ${f.y}`;
	if (f.y === t.y && f.m === t.m)
		return `${ordinal(f.d)}-${ordinal(t.d)} ${MONTHS[t.m]} ${t.y}`;
	if (f.y === t.y)
		return `${ordinal(f.d)} ${MONTHS[f.m]}-${ordinal(t.d)} ${MONTHS[t.m]} ${t.y}`;
	return `${ordinal(f.d)} ${MONTHS[f.m]} ${f.y}-${ordinal(t.d)} ${MONTHS[t.m]} ${t.y}`;
}

function shortDay(iso: string): string {
	const p = parts(iso);
	return `${p.d} ${MONTHS[p.m].slice(0, 3)}`;
}

/* ------------------------------------------------------------------ */
/* District choropleth (canvas → PNG data URL) for the map slide        */
/* ------------------------------------------------------------------ */

interface MapBins {
	color: string;
	label: string;
}

/** Colour scale identical in spirit to the in-app map's makeScale. */
function mapScale(
	maxCount: number,
	ramp: string[]
): {
	colorFor: (count: number) => string;
	bins: MapBins[];
} {
	const max = Math.max(0, Math.floor(maxCount));
	let uppers: number[];
	if (max <= 0) {
		uppers = [];
	} else if (max <= ramp.length) {
		uppers = Array.from({ length: max }, (_, i) => i + 1);
	} else {
		const set = new Set<number>();
		for (const f of [0.1, 0.25, 0.45, 0.7]) set.add(Math.max(1, Math.ceil(max * f)));
		set.add(max);
		uppers = Array.from(set).filter((v) => v <= max).sort((a, b) => a - b);
	}
	const colorFor = (count: number): string => {
		if (count <= 0 || uppers.length === 0) return "#ffffff";
		for (let i = 0; i < uppers.length; i++) {
			if (count <= uppers[i]) return ramp[Math.min(i, ramp.length - 1)];
		}
		return ramp[Math.min(uppers.length - 1, ramp.length - 1)];
	};
	const bins: MapBins[] = [{ color: "#ffffff", label: "No alerts" }];
	let prev = 1;
	for (let i = 0; i < uppers.length; i++) {
		const hi = uppers[i];
		bins.push({
			color: ramp[Math.min(i, ramp.length - 1)],
			label: prev >= hi ? `${hi}` : `${prev} - ${hi}`,
		});
		prev = hi + 1;
	}
	return { colorFor, bins };
}

function eachRing(
	feature: GeoFeature,
	cb: (ring: number[][]) => void
): void {
	const geom = feature.geometry;
	if (!geom) return;
	if (geom.type === "Polygon") {
		for (const ring of geom.coordinates as number[][][]) cb(ring);
	} else {
		for (const poly of geom.coordinates as number[][][][]) {
			for (const ring of poly) cb(ring);
		}
	}
}

/**
 * Draws the deck's map slide: a white-background district choropleth of alert
 * counts with named districts and a binned legend. `ramp` recolours the fill
 * to the deck's accent; it defaults to the standard red ramp.
 */
export function renderDistrictChoropleth(
	districts: GeoFeatureCollection,
	ramp: string[] = DEFAULT_MAP_RAMP
): { dataUrl: string; aspect: number } | null {
	const feats = districts.features.filter((f) => f.geometry);
	if (!feats.length) return null;

	let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
	for (const f of feats) {
		const [a, b, c, d] = f.properties.bbox;
		if (a < minLng) minLng = a;
		if (b < minLat) minLat = b;
		if (c > maxLng) maxLng = c;
		if (d > maxLat) maxLat = d;
	}
	if (!Number.isFinite(minLng)) return null;

	const W = 1500;
	const pad = 24;
	const legendW = 240;
	const scalePx = (W - pad * 2 - legendW) / (maxLng - minLng);
	const H = Math.round((maxLat - minLat) * scalePx + pad * 2);
	const px = (lng: number) => pad + (lng - minLng) * scalePx;
	const py = (lat: number) => pad + (maxLat - lat) * scalePx;

	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, W, H);

	const maxCount = feats.reduce((m, f) => Math.max(m, f.properties.count), 0);
	const { colorFor, bins } = mapScale(maxCount, ramp);

	for (const f of feats) {
		ctx.beginPath();
		eachRing(f, (ring) => {
			ring.forEach(([lng, lat], i) => {
				if (i === 0) ctx.moveTo(px(lng), py(lat));
				else ctx.lineTo(px(lng), py(lat));
			});
			ctx.closePath();
		});
		ctx.fillStyle = colorFor(f.properties.count);
		ctx.fill("evenodd");
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	// District names at centroids (the deck labels every district).
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	for (const f of feats) {
		const [lng, lat] = f.properties.centroid;
		if (!lng && !lat) continue;
		const count = f.properties.count;
		ctx.font = count > 0 ? "bold 13px sans-serif" : "11px sans-serif";
		ctx.fillStyle = count > 0 ? "#111827" : "#6b7280";
		ctx.fillText(f.properties.name.toUpperCase(), px(lng), py(lat));
	}

	// Legend (right-hand side, like the deck).
	const lx = W - legendW + 10;
	let ly = Math.max(pad + 10, H * 0.55);
	ctx.textAlign = "left";
	ctx.fillStyle = "#111827";
	ctx.font = "bold 22px sans-serif";
	ctx.fillText("Legend", lx, ly);
	ly += 26;
	ctx.font = "18px sans-serif";
	for (const bin of bins) {
		ctx.fillStyle = bin.color;
		ctx.fillRect(lx, ly - 12, 30, 22);
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 1;
		ctx.strokeRect(lx, ly - 12, 30, 22);
		ctx.fillStyle = "#111827";
		ctx.fillText(bin.label, lx + 40, ly);
		ly += 30;
	}

	return { dataUrl: canvas.toDataURL("image/png"), aspect: W / H };
}

/* ------------------------------------------------------------------ */
/* Table builders                                                       */
/* ------------------------------------------------------------------ */

export interface ScopeColumn {
	header: string;
	value: (r: ManagementDistrictRow) => number;
}

/**
 * The deck's fixed columns, plus EMS / SDB / Others columns only when the
 * range actually has such outcomes — the sample deck omits them because its
 * week had none, but hiding non-zero buckets would silently drop signals.
 * Shared by the .pptx tables and the in-app report view so they can't drift.
 */
export function scopeColumns(
	scope: ManagementScope,
	withAlerts: boolean
): ScopeColumn[] {
	const cols: ScopeColumn[] = [
		{ header: "Signals", value: (r) => r.signals },
		{ header: "Discarded", value: (r) => r.discarded },
	];
	// Alerts sits AFTER Discarded so the row reads as the funnel actually runs:
	// signals come in, some are discarded, and what survives is an alert.
	if (withAlerts) cols.push({ header: "Alerts", value: (r) => r.alerts });
	cols.push(
		{ header: "Field Case Verification", value: (r) => r.fieldCaseVerification },
		{ header: "Sample Collected", value: (r) => r.sampleCollected }
	);
	if (scope.totals.ems > 0) cols.push({ header: "EMS", value: (r) => r.ems });
	if (scope.totals.sdb > 0) cols.push({ header: "SDB", value: (r) => r.sdb });
	if (scope.totals.others > 0)
		cols.push({ header: "Others", value: (r) => r.others });
	cols.push({ header: "Pending verification", value: (r) => r.pending });
	return cols;
}

function scopeTableRows(
	scope: ManagementScope,
	withAlerts: boolean,
	pal: PptxPalette
): any[][] {
	const cols = scopeColumns(scope, withAlerts);
	const rows: any[][] = [];

	rows.push([
		{ text: "District", options: { bold: true, color: "FFFFFF", fill: { color: pal.headerFill } } },
		...cols.map((c) => ({
			text: c.header,
			options: { bold: true, color: "FFFFFF", fill: { color: pal.headerFill }, align: "center" },
		})),
	]);

	// `?? []` guards a backend that serialised an empty scope's sections as null.
	for (const section of scope.sections ?? []) {
		rows.push([
			{ text: section.status, options: { bold: true, fill: { color: pal.sectionFill } } },
			...cols.map((c) => ({
				text: String(c.value(section.totals)),
				options: { bold: true, fill: { color: pal.sectionFill }, align: "center" },
			})),
		]);
		for (const d of section.districts) {
			rows.push([
				{ text: d.district, options: {} },
				...cols.map((c) => ({
					text: String(c.value(d)),
					options: { align: "center" },
				})),
			]);
		}
	}

	rows.push([
		{ text: "Total", options: { bold: true, fill: { color: pal.totalFill } } },
		...cols.map((c) => ({
			text: String(c.value(scope.totals)),
			options: { bold: true, fill: { color: pal.totalFill }, align: "center" },
		})),
	]);

	return rows;
}

/* ------------------------------------------------------------------ */
/* Slide helpers                                                        */
/* ------------------------------------------------------------------ */

const PAGE_W = 10; // LAYOUT_16x9 inches
const PAGE_H = 5.625;
const MARGIN = 0.35;

function addTitle(slide: PptxSlide, text: string, pal: PptxPalette): void {
	slide.addText(text, {
		x: MARGIN,
		y: 0.16,
		w: PAGE_W - MARGIN * 2,
		h: 0.42,
		fontSize: 18,
		bold: true,
		color: pal.ink,
	});
	slide.addShape("rect", {
		x: MARGIN,
		y: 0.6,
		w: 2.2,
		h: 0.045,
		fill: { color: pal.brand },
		line: { type: "none" },
	});
}

function addScopeTableSlide(
	pptx: Pptx,
	title: string,
	scope: ManagementScope,
	withAlerts: boolean,
	pal: PptxPalette
): void {
	const slide = pptx.addSlide();
	addTitle(slide, title, pal);
	const rows = scopeTableRows(scope, withAlerts, pal);
	const cols = rows[0].length;
	const tableW = PAGE_W - MARGIN * 2;
	const firstColW = 1.9;
	const otherW = (tableW - firstColW) / (cols - 1);
	slide.addTable(rows, {
		x: MARGIN,
		y: 0.78,
		w: tableW,
		colW: [firstColW, ...Array(cols - 1).fill(otherW)],
		fontSize: rows.length > 22 ? 8 : 10,
		color: pal.ink,
		border: { pt: 0.5, color: pal.border },
		valign: "middle",
		autoPage: true,
		autoPageRepeatHeader: true,
		autoPageSlideStartY: 0.78,
	});
}

function barCascadeSlide(
	pptx: Pptx,
	title: string,
	heading: string,
	scope: ManagementScope,
	pal: PptxPalette
): void {
	const slide = pptx.addSlide();
	addTitle(slide, title, pal);
	const labels = [
		"Signals",
		"Signals verified",
		"Alerts",
		"Sample Collected",
		"Field Case Verification",
		"SDB",
		"RRT deployment",
		"EMS",
	];
	const data = ["Alive", "Dead", "Unknown"]
		.filter((s) => scope.cascade?.[s] && scope.cascade[s].signals > 0)
		.map((s) => {
			const c = scope.cascade[s];
			return {
				name: s,
				labels,
				values: [
					c.signals,
					c.signalsVerified,
					c.alerts,
					c.sampleCollected,
					c.fieldCaseVerification,
					c.sdb,
					c.rrtDeployment,
					c.ems,
				],
			};
		});
	if (!data.length) data.push({ name: "Alive", labels, values: labels.map(() => 0) });
	slide.addChart((pptx as any).ChartType.bar, data, {
		x: MARGIN,
		y: 0.8,
		w: PAGE_W - MARGIN * 2,
		h: PAGE_H - 1.15,
		barDir: "col",
		chartColors: pal.series.slice(0, data.length),
		showTitle: true,
		title: heading,
		titleFontSize: 13,
		showLegend: true,
		legendPos: "b",
		showValue: true,
		dataLabelFontSize: 9,
		catAxisLabelFontSize: 9,
		valAxisLabelFontSize: 9,
	});
}

function countBarSlide(
	pptx: Pptx,
	title: string,
	heading: string,
	counts: ManagementCount[],
	pal: PptxPalette
): void {
	const slide = pptx.addSlide();
	addTitle(slide, title, pal);
	const data = [
		{
			name: "Count",
			labels: counts.map((c) => c.label),
			values: counts.map((c) => c.count),
		},
	];
	slide.addChart((pptx as any).ChartType.bar, data, {
		x: MARGIN,
		y: 0.8,
		w: PAGE_W - MARGIN * 2,
		h: PAGE_H - 1.15,
		barDir: "col",
		chartColors: [pal.brand],
		chartColorsOpacity: 100,
		showTitle: true,
		title: heading,
		titleFontSize: 13,
		showLegend: false,
		showValue: true,
		dataLabelFontSize: 9,
		catAxisLabelFontSize: 9,
		valAxisLabelFontSize: 9,
	});
}

/** The "Alert details" narrative table slide (auto-pages onto continuations). */
function narrativesSlide(
	pptx: Pptx,
	title: string,
	details: ManagementDetail[],
	detailsTotal: number,
	emptyLabel: string,
	pal: PptxPalette
): void {
	const slide = pptx.addSlide();
	addTitle(slide, title, pal);
	const rows: any[][] = [
		[
			{ text: "Source", options: { bold: true, color: "FFFFFF", fill: { color: pal.headerFill } } },
			{ text: "District", options: { bold: true, color: "FFFFFF", fill: { color: pal.headerFill } } },
			{ text: "Narrative", options: { bold: true, color: "FFFFFF", fill: { color: pal.headerFill } } },
		],
		...details.map((d) => [
			{ text: d.source, options: {} },
			{ text: d.district, options: {} },
			{ text: d.narrative, options: {} },
		]),
	];
	if (detailsTotal > details.length) {
		rows.push([
			{
				text: `… ${detailsTotal - details.length} more alert(s) in this range not shown`,
				options: { colspan: 3, italic: true, color: "6B7280" },
			},
		]);
	}
	if (details.length === 0) {
		rows.push([
			{ text: emptyLabel, options: { colspan: 3, italic: true, color: "6B7280" } },
		]);
	}
	slide.addTable(rows, {
		x: MARGIN,
		y: 0.78,
		w: PAGE_W - MARGIN * 2,
		colW: [0.9, 1.35, PAGE_W - MARGIN * 2 - 2.25],
		fontSize: 9,
		color: pal.ink,
		border: { pt: 0.5, color: pal.border },
		valign: "top",
		autoPage: true,
		autoPageRepeatHeader: true,
		autoPageSlideStartY: 0.78,
	});
}

/** The optional cover / title slide. */
function addCoverSlide(
	pptx: Pptx,
	config: DeckConfig,
	range: string,
	pal: PptxPalette
): void {
	const slide = pptx.addSlide();
	slide.background = { color: pal.brand };

	if (config.cover.logoDataUrl) {
		slide.addImage({
			data: config.cover.logoDataUrl,
			x: PAGE_W / 2 - 0.6,
			y: 0.55,
			w: 1.2,
			h: 1.2,
			sizing: { type: "contain", w: 1.2, h: 1.2 },
		});
	}

	slide.addText(config.cover.title.trim() || "Alerts Management Report", {
		x: 0.6,
		y: config.cover.logoDataUrl ? 2.0 : 1.6,
		w: PAGE_W - 1.2,
		h: 0.9,
		fontSize: 32,
		bold: true,
		color: "FFFFFF",
		align: "center",
	});

	const subtitle = config.cover.subtitle.trim() || range;
	slide.addText(subtitle, {
		x: 0.6,
		y: config.cover.logoDataUrl ? 2.95 : 2.55,
		w: PAGE_W - 1.2,
		h: 0.5,
		fontSize: 16,
		color: "FFFFFF",
		align: "center",
	});

	if (config.cover.organization.trim()) {
		slide.addText(config.cover.organization.trim(), {
			x: 0.6,
			y: PAGE_H - 0.8,
			w: PAGE_W - 1.2,
			h: 0.4,
			fontSize: 13,
			italic: true,
			color: "FFFFFF",
			align: "center",
		});
	}
}

/* ------------------------------------------------------------------ */
/* The deck                                                             */
/* ------------------------------------------------------------------ */

export interface ManagementDeckInput {
	report: ManagementReport;
	/** District-level FeatureCollection with alert counts (for the map slide). */
	districtGeo: GeoFeatureCollection | null;
	/** Theme / sections / focus / cover configuration. Defaults applied if omitted. */
	config?: DeckConfig;
}

/** Builds and downloads the .pptx. Returns the filename it saved under. */
export async function downloadManagementReportPptx({
	report,
	districtGeo,
	config = defaultDeckConfig(),
}: ManagementDeckInput): Promise<string> {
	const pal = paletteFromConfig(config);
	const slides = config.slides;

	const { default: PptxGenJS } = await import("pptxgenjs");
	const pptx: Pptx = new PptxGenJS();
	pptx.layout = "LAYOUT_16x9";
	pptx.author = "Alerts MIS";
	pptx.title = config.cover.title.trim() || "Alerts Management report";

	const range = formatReportRange(report.fromDate, report.toDate);
	const rangeTitle = `Alerts Management report (${range})`;

	// 0. Optional cover slide.
	if (config.cover.enabled) {
		addCoverSlide(pptx, config, range, pal);
	}

	// 1–2. District tables split by patient status.
	if (slides.districtTables) {
		addScopeTableSlide(pptx, `${rangeTitle} — All PHEs`, report.allPhes, false, pal);
		addScopeTableSlide(pptx, `${rangeTitle} — VHFs`, report.vhf, true, pal);
	}

	// 3. Signal sources pie.
	if (slides.sources) {
		const slide = pptx.addSlide();
		addTitle(slide, `${rangeTitle} — Signals sources`, pal);
		const data = [
			{
				name: "Count of Source",
				labels: report.sources.map((s) => s.label),
				values: report.sources.map((s) => s.count),
			},
		];
		slide.addChart((pptx as any).ChartType.pie, data, {
			x: 1.6,
			y: 0.8,
			w: PAGE_W - 3.2,
			h: PAGE_H - 1.2,
			showLegend: true,
			legendPos: "r",
			showValue: true,
			showPercent: true,
			dataLabelFontSize: 10,
		});
	}

	// 4. Alert details narratives (auto-pages onto continuation slides).
	if (slides.narratives) {
		narrativesSlide(
			pptx,
			`Alerts Management report: Alert details (${range})`,
			report.details,
			report.detailsTotal,
			"No VHF alerts in this range.",
			pal
		);
	}

	// 5–6. Response cascades (Alive vs Dead), All PHEs then VHFs only.
	if (slides.cascade) {
		barCascadeSlide(pptx, rangeTitle, "All PHEs", report.allPhes, pal);
		barCascadeSlide(pptx, rangeTitle, "VHFs", report.vhf, pal);
	}

	// 7. Signal sources bar with n=total signals.
	if (slides.sources) {
		const totalSignals = report.sources.reduce((s, c) => s + c.count, 0);
		countBarSlide(
			pptx,
			rangeTitle,
			`Signal Sources (n=${totalSignals})`,
			report.sources,
			pal
		);
	}

	// 8. Alerts by disease/PHE (VHF variants folded into one bar).
	if (slides.diseaseBar) {
		countBarSlide(
			pptx,
			rangeTitle,
			"Other PHEs reported: Alerts",
			report.otherPhes,
			pal
		);
	}

	// 9. Map + top-10 districts.
	if (slides.map) {
		const slide = pptx.addSlide();
		const totalAlerts = report.allPhes.totals.alerts;
		addTitle(
			slide,
			`Map showing distribution of alerts, N=${totalAlerts}: All PHEs (${range})`,
			pal
		);
		const map = districtGeo ? renderDistrictChoropleth(districtGeo, pal.mapRamp) : null;
		if (map) {
			const availH = PAGE_H - 1.0;
			const mapW = Math.min(5.6, availH * map.aspect);
			slide.addImage({
				data: map.dataUrl,
				x: MARGIN,
				y: 0.75,
				w: mapW,
				h: mapW / map.aspect,
			});
		} else {
			slide.addText("Map unavailable (no boundary data).", {
				x: MARGIN,
				y: 2.4,
				w: 5,
				h: 0.5,
				fontSize: 12,
				italic: true,
				color: "6B7280",
			});
		}
		const top = report.topDistricts;
		const chartData = [
			{
				name: "VHFs",
				labels: top.map((t) => t.district.toUpperCase()),
				values: top.map((t) => t.vhf),
			},
			{
				name: "Other PHEs",
				labels: top.map((t) => t.district.toUpperCase()),
				values: top.map((t) => t.other),
			},
		];
		slide.addChart((pptx as any).ChartType.bar, chartData, {
			x: 6.15,
			y: 0.8,
			w: PAGE_W - 6.15 - MARGIN,
			h: PAGE_H - 1.2,
			barDir: "bar",
			barGrouping: "stacked",
			chartColors: [pal.brand, pal.ink],
			showTitle: true,
			title: "Top 10 districts registering alerts",
			titleFontSize: 11,
			showLegend: true,
			legendPos: "b",
			showValue: false,
			catAxisLabelFontSize: 8,
			valAxisLabelFontSize: 8,
		});
	}

	// 10. Trend of signals vs alerts.
	if (slides.trend) {
		const slide = pptx.addSlide();
		const trendTitle = `Trend of signals vs alerts reported (${formatReportRange(
			report.trendFrom,
			report.toDate
		)})`;
		addTitle(slide, trendTitle, pal);
		const data = [
			{
				name: "Signals",
				labels: report.trend.map((p) => shortDay(p.date)),
				values: report.trend.map((p) => p.signals),
			},
			{
				name: "Alerts",
				labels: report.trend.map((p) => shortDay(p.date)),
				values: report.trend.map((p) => p.alerts),
			},
		];
		slide.addChart((pptx as any).ChartType.line, data, {
			x: MARGIN,
			y: 0.8,
			w: PAGE_W - MARGIN * 2,
			h: PAGE_H - 1.15,
			chartColors: [pal.brand, pal.ink],
			lineSize: 2,
			lineSmooth: false,
			showLegend: true,
			legendPos: "b",
			catAxisLabelFontSize: 8,
			valAxisLabelFontSize: 9,
		});
	}

	// 11+. Disease-focus section — added alongside the full deck.
	if (slides.focus && report.focus && report.focus.diseases.length > 0) {
		addFocusSection(pptx, report, range, pal);
	}

	const fileName = focusFilename(report, config);
	await pptx.writeFile({ fileName });
	return fileName;
}

/** The highlighted disease-focus slides (divider, table, cascade, sources, narratives). */
function addFocusSection(
	pptx: Pptx,
	report: ManagementReport,
	range: string,
	pal: PptxPalette
): void {
	const focus = report.focus!;
	const label = focus.diseases.join(", ");

	// Divider slide.
	const divider = pptx.addSlide();
	divider.background = { color: pal.brand };
	divider.addText("Disease focus", {
		x: 0.6,
		y: 1.9,
		w: PAGE_W - 1.2,
		h: 0.7,
		fontSize: 30,
		bold: true,
		color: "FFFFFF",
		align: "center",
	});
	divider.addText(`${label} — ${range}`, {
		x: 0.6,
		y: 2.7,
		w: PAGE_W - 1.2,
		h: 0.6,
		fontSize: 16,
		color: "FFFFFF",
		align: "center",
	});

	const focusTitle = `Disease focus (${label})`;
	addScopeTableSlide(pptx, `${focusTitle} — district table`, focus.scope, true, pal);
	barCascadeSlide(pptx, focusTitle, "Response cascade", focus.scope, pal);
	if (focus.sources.length > 0) {
		countBarSlide(pptx, focusTitle, "Signal sources", focus.sources, pal);
	}
	narrativesSlide(
		pptx,
		`${focusTitle}: Alert details`,
		focus.details,
		focus.detailsTotal,
		"No alerts for the focus diseases in this range.",
		pal
	);
}

/** Filename, with a short focus token when a disease focus is active. */
function focusFilename(report: ManagementReport, config: DeckConfig): string {
	let token = "";
	if (config.slides.focus && report.focus && report.focus.diseases.length > 0) {
		const slug = report.focus.diseases
			.join("-")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40);
		if (slug) token = `_${slug}`;
	}
	return `alerts-management-report${token}_${report.fromDate}_to_${report.toDate}.pptx`;
}
