/**
 * The Alerts Management presentation as a RESOLVED, format-neutral slide list.
 *
 * `buildDeck()` turns (report, previous-period report, map image, DeckConfig)
 * into an ordered `DeckSlide[]` with every title, number, colour, table page
 * and chart series already decided. Every output renders from that one list:
 *
 *   - the in-app slide preview + fullscreen presenter (deck-slide.tsx),
 *   - the .pptx (management-report-pptx.ts),
 *   - the slide PDF (screenshots of the preview), and
 *   - the PDF/Word documents (management-report-doc.ts).
 *
 * So a slide that is hidden, renamed, re-ordered, re-charted or re-coloured
 * changes in every format at once, and tables paginate identically on screen
 * and in PowerPoint (rows are split here, not by pptxgenjs' autoPage).
 *
 * Nothing here touches the DOM, so it is cheap to rebuild on every edit.
 */

import type {
	ManagementCount,
	ManagementDetail,
	ManagementDistrictRow,
	ManagementReport,
	ManagementScope,
	ManagementTopDistrict,
} from "@/lib/fetch-reports";
import {
	ASPECT_SIZE,
	fontCss,
	INSIGHT_ORDER,
	KPI_META,
	SLIDE_KIND_META,
	themeFromDesign,
	type ChartVariant,
	type DeckConfig,
	type DeckDesign,
	type DeckSlideItem,
	type DeckTheme,
	type InsightKey,
	type KpiKey,
	type SlideKind,
} from "@/lib/management-report-config";

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export function shortDay(iso: string): string {
	const p = parts(iso);
	return `${p.d} ${MONTHS[p.m].slice(0, 3)}`;
}

function utc(iso: string): Date {
	const p = parts(iso);
	return new Date(Date.UTC(p.y, p.m, p.d));
}

function isoOf(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Inclusive day count of a range. */
export function rangeDays(fromISO: string, toISO: string): number {
	return Math.round((utc(toISO).getTime() - utc(fromISO).getTime()) / 86_400_000) + 1;
}

/** The equal-length window immediately before [from, to]. */
export function previousPeriod(fromISO: string, toISO: string): { fromDate: string; toDate: string } {
	const days = rangeDays(fromISO, toISO);
	const to = utc(fromISO);
	to.setUTCDate(to.getUTCDate() - 1);
	const from = new Date(to);
	from.setUTCDate(from.getUTCDate() - (days - 1));
	return { fromDate: isoOf(from), toDate: isoOf(to) };
}

function longDay(iso: string): string {
	const d = utc(iso);
	const p = parts(iso);
	return `${WEEKDAYS[d.getUTCDay()]} ${p.d} ${MONTHS[p.m].slice(0, 3)}`;
}

/** Monday of the ISO week containing `iso`. */
function weekStart(iso: string): string {
	const d = utc(iso);
	const dow = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - dow);
	return isoOf(d);
}

/* ------------------------------------------------------------------ */
/* Shared table / cascade definitions                                  */
/* ------------------------------------------------------------------ */

export interface ScopeColumn {
	header: string;
	value: (r: ManagementDistrictRow) => number;
}

/**
 * The deck's fixed columns, plus EMS / SDB / Others columns only when the
 * range actually has such outcomes — the sample deck omits them because its
 * week had none, but hiding non-zero buckets would silently drop signals.
 */
export function scopeColumns(scope: ManagementScope, withAlerts: boolean): ScopeColumn[] {
	const cols: ScopeColumn[] = [
		{ header: "Signals", value: (r) => r.signals },
		{ header: "Discarded", value: (r) => r.discarded },
		{ header: "Field Case Verification", value: (r) => r.fieldCaseVerification },
		{ header: "Sample Collected", value: (r) => r.sampleCollected },
	];
	if (scope.totals.ems > 0) cols.push({ header: "EMS", value: (r) => r.ems });
	if (scope.totals.sdb > 0) cols.push({ header: "SDB", value: (r) => r.sdb });
	if (scope.totals.others > 0) cols.push({ header: "Others", value: (r) => r.others });
	cols.push({ header: "Pending verification", value: (r) => r.pending });
	// Last and apart from the outcome columns (which sum to Signals): the
	// alerts ISSUED — confirmed, risk-assessed, reporter told — the same count
	// as the Alerts page, the dashboard and the regional report.
	if (withAlerts) cols.push({ header: "Alerts issued", value: (r) => r.alerts });
	return cols;
}

/**
 * The response-cascade stages, in order. Verified and alerts nest (alerts ⊆
 * verified); the response actions are what verification recorded, so "Alerts
 * issued" closes the chart rather than sitting between stages it is not a
 * subset of.
 */
export const MANAGEMENT_CASCADE_STAGES: {
	key: keyof ManagementScope["cascade"][string];
	label: string;
}[] = [
	{ key: "signals", label: "Signals" },
	{ key: "signalsVerified", label: "Signals verified" },
	{ key: "sampleCollected", label: "Sample Collected" },
	{ key: "fieldCaseVerification", label: "Field Case Verification" },
	{ key: "sdb", label: "SDB" },
	{ key: "rrtDeployment", label: "RRT deployment" },
	{ key: "ems", label: "EMS" },
	{ key: "alerts", label: "Alerts issued" },
];

const STATUSES = ["Alive", "Dead", "Unknown"] as const;

/* ------------------------------------------------------------------ */
/* Style: theme + geometry + chart colours                             */
/* ------------------------------------------------------------------ */

export interface DeckGeometry {
	/** Slide size, inches. */
	w: number;
	h: number;
	/** Left/right content inset. */
	x: number;
	/** Content box. */
	contentTop: number;
	contentBottom: number;
	contentW: number;
	/** Title box. */
	titleY: number;
	titleH: number;
	/** Footer baseline box. */
	footerY: number;
	footerH: number;
}

export interface DeckColors {
	status: Record<string, string>;
	categorical: string[];
	other: string;
	signals: string;
	alerts: string;
	vhf: string;
	otherPhes: string;
	primary: string;
}

export interface DeckStyle {
	design: DeckDesign;
	theme: DeckTheme;
	geometry: DeckGeometry;
	colors: DeckColors;
	fontCss: string;
	/** Table typography (points) + row height (inches) for the density. */
	table: { font: number; rowH: number; headerH: number };
	narrative: { font: number };
}

// Fixed-order categorical hues (validated 8-slot theme) and semantic colours.
const SEMANTIC_CATEGORICAL = [
	"#2a78d6", "#eb6834", "#1baf7a", "#eda100",
	"#e87ba4", "#008300", "#4a3aa7", "#e34948",
];

export function resolveDeckStyle(config: DeckConfig): DeckStyle {
	const design = config.design;
	const theme = themeFromDesign(design);
	const size = ASPECT_SIZE[design.aspect];
	const x = design.titleStyle === "sidebar" ? 0.5 : 0.4;
	const band = design.titleStyle === "band";
	const titleY = band ? 0.14 : 0.18;
	const titleH = band ? 0.52 : 0.48;
	const contentTop = band ? 1.0 : 0.88;
	const footerH = 0.3;
	const footerY = size.h - footerH - 0.06;
	const geometry: DeckGeometry = {
		w: size.w,
		h: size.h,
		x,
		contentTop,
		contentBottom: footerY - 0.08,
		contentW: size.w - x - 0.4,
		titleY,
		titleH,
		footerY,
		footerH,
	};

	const themed = design.chartPalette === "theme";
	const categorical = themed
		? themedCategorical(theme)
		: SEMANTIC_CATEGORICAL;
	const colors: DeckColors = themed
		? {
				status: {
					Alive: theme.accent,
					Dead: theme.secondary,
					Unknown: theme.dark ? "#64748b" : "#9ca3af",
				},
				categorical,
				other: theme.dark ? "#64748b" : "#9ca3af",
				signals: theme.accent,
				alerts: theme.secondary,
				vhf: theme.accent,
				otherPhes: theme.secondary,
				primary: theme.accent,
			}
		: {
				// Status series — the dashboard's Alive/Dead hues; Unknown a violet
				// that stays separable from both. The red↔green pair is carried by
				// the direct value labels, not by hue alone.
				status: { Alive: "#16a34a", Dead: "#D90000", Unknown: "#4a3aa7" },
				categorical,
				other: "#9ca3af",
				signals: "#2563eb",
				alerts: "#ca8a04",
				vhf: "#2a78d6",
				otherPhes: "#eb6834",
				primary: theme.accent,
			};

	const compact = design.density === "compact";
	return {
		design,
		theme,
		geometry,
		colors,
		fontCss: fontCss(design.font),
		table: compact
			? { font: 8, rowH: 0.19, headerH: 0.3 }
			: { font: 10, rowH: 0.245, headerH: 0.36 },
		narrative: { font: compact ? 8 : 9 },
	};
}

/** Eight distinguishable hues built around the accent + secondary. */
function themedCategorical(theme: DeckTheme): string[] {
	const tint = (hex: string, t: number) => mixHex(hex, theme.dark ? "#0b1220" : "#ffffff", t);
	const shade = (hex: string, t: number) => mixHex(hex, "#000000", t);
	return [
		theme.accent,
		theme.secondary,
		tint(theme.accent, 0.45),
		tint(theme.secondary, 0.45),
		shade(theme.accent, 0.35),
		shade(theme.secondary, 0.35),
		tint(theme.accent, 0.7),
		tint(theme.secondary, 0.7),
	];
}

function mixHex(a: string, b: string, t: number): string {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return `#${pa
		.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
		.join("")}`;
}

/* ------------------------------------------------------------------ */
/* Slide model                                                         */
/* ------------------------------------------------------------------ */

export interface ChartSeries {
	name: string;
	color: string;
	values: number[];
}

export interface ChartSpec {
	variant: ChartVariant;
	/** Forces bar direction (the top-districts chart is horizontal + stacked). */
	orientation?: "vertical" | "horizontal";
	labels: string[];
	series: ChartSeries[];
	/** Per-point colours (pie/doughnut slices, single-series categorical bars). */
	pointColors?: string[];
	dataLabels: boolean;
	showLegend: boolean;
	/** Optional heading drawn above the plot. */
	heading?: string;
	/** Shown instead of the chart when every value is zero / there is no data. */
	empty?: string;
}

export interface KpiTile {
	key: KpiKey;
	label: string;
	value: string;
	hint: string;
	delta: {
		text: string;
		direction: "up" | "down" | "flat";
		tone: "good" | "bad" | "neutral";
		previous: string;
	} | null;
}

export interface Bullet {
	text: string;
	tone: "good" | "bad" | "neutral" | "info";
	/** Short tag drawn in the marker (e.g. "↑", "!", "i"). */
	mark: string;
}

export type TableRowStyle = "header" | "section" | "body" | "total" | "fold";

export interface TableRow {
	cells: string[];
	style: TableRowStyle;
}

interface SlideBase {
	/** Unique per rendered slide (an item can produce several pages). */
	key: string;
	/** The DeckSlideItem this slide came from. */
	itemId: string;
	kind: SlideKind;
	title: string;
	/** Agenda section. */
	section: string;
	notes: string;
	/** Continuation pages of a multi-page slide (tables, narratives). */
	page?: { index: number; count: number };
	/** "full" slides paint their own background and skip the title/footer chrome. */
	chrome: "content" | "full";
}

export type DeckSlide =
	| (SlideBase & {
			type: "cover";
			cover: {
				title: string;
				subtitle: string;
				organization: string;
				presenter: string;
				dateLine: string;
				logo: string | null;
				partnerLogo: string | null;
				layout: DeckConfig["cover"]["layout"];
				scope: string;
			};
	  })
	| (SlideBase & { type: "agenda"; items: string[] })
	| (SlideBase & { type: "kpis"; tiles: KpiTile[]; comparison: string | null })
	| (SlideBase & { type: "bullets"; bullets: Bullet[]; empty?: string })
	| (SlideBase & { type: "twoColumn"; left: string[]; right: string[] })
	| (SlideBase & { type: "statement"; text: string; attribution: string })
	| (SlideBase & {
			type: "table";
			/** Width share of the first (label) column, the rest share equally. */
			firstColShare: number;
			rows: TableRow[];
			note?: string;
			empty?: string;
	  })
	| (SlideBase & {
			type: "narratives";
			rows: ManagementDetail[];
			/** Per-row heights (inches) the paginator assumed. */
			rowHeights: number[];
			note?: string;
			empty?: string;
	  })
	| (SlideBase & { type: "chart"; chart: ChartSpec })
	| (SlideBase & {
			type: "map";
			map: { dataUrl: string; aspect: number } | null;
			top: ChartSpec | null;
	  })
	| (SlideBase & {
			type: "divider";
			heading: string;
			subheading: string;
			tone: "accent" | "secondary";
	  })
	| (SlideBase & { type: "image"; image: string | null; caption: string })
	| (SlideBase & { type: "closing"; heading: string; message: string; contact: string[] });

export interface DeckBuildInput {
	report: ManagementReport;
	/** The equal-length preceding window (for deltas), or null. */
	previous: ManagementReport | null;
	/** District choropleth rendered for the deck's theme, or null. */
	map: { dataUrl: string; aspect: number } | null;
	config: DeckConfig;
	/** Override "today" (tests / reproducible files). */
	now?: Date;
}

export interface BuiltDeck {
	slides: DeckSlide[];
	style: DeckStyle;
	range: string;
	/** "" (national) or " — Acholi, Lango". */
	scopeSuffix: string;
	scopeLabel: string;
	title: string;
	generatedOn: string;
	comparisonLabel: string | null;
}

/* ------------------------------------------------------------------ */
/* Number formatting                                                   */
/* ------------------------------------------------------------------ */

const fmt = (n: number): string => n.toLocaleString("en-US");
const pct = (n: number, d: number): string => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/* ------------------------------------------------------------------ */
/* KPIs                                                                */
/* ------------------------------------------------------------------ */

function verifiedCount(scope: ManagementScope): number {
	return Object.values(scope.cascade ?? {}).reduce((s, c) => s + (c?.signalsVerified ?? 0), 0);
}

function rrtCount(scope: ManagementScope): number {
	return Object.values(scope.cascade ?? {}).reduce((s, c) => s + (c?.rrtDeployment ?? 0), 0);
}

function deathsOf(scope: ManagementScope): number {
	return (scope.sections ?? []).find((s) => s.status === "Dead")?.totals.signals ?? 0;
}

/** One row per district across the status sections (summed). */
export function mergedDistricts(scope: ManagementScope): ManagementDistrictRow[] {
	const by = new Map<string, ManagementDistrictRow>();
	for (const section of scope.sections ?? []) {
		for (const d of section.districts ?? []) {
			const cur = by.get(d.district);
			if (!cur) {
				by.set(d.district, { ...d });
				continue;
			}
			cur.signals += d.signals;
			cur.alerts += d.alerts;
			cur.discarded += d.discarded;
			cur.fieldCaseVerification += d.fieldCaseVerification;
			cur.sampleCollected += d.sampleCollected;
			cur.ems += d.ems;
			cur.sdb += d.sdb;
			cur.others += d.others;
			cur.pending += d.pending;
		}
	}
	return Array.from(by.values());
}

function kpiValue(key: KpiKey, r: ManagementReport): number {
	const all = r.allPhes;
	switch (key) {
		case "signals": return all.totals.signals;
		case "verified": return verifiedCount(all);
		case "verificationRate":
			return all.totals.signals > 0 ? verifiedCount(all) / all.totals.signals : 0;
		case "alerts": return all.totals.alerts;
		case "discarded": return all.totals.discarded;
		case "pending": return all.totals.pending;
		case "deaths": return deathsOf(all);
		case "districts":
			return mergedDistricts(all).filter((d) => d.signals > 0 && !isUnknownDistrict(d.district)).length;
		case "vhfSignals": return r.vhf.totals.signals;
		case "vhfAlerts": return r.vhf.totals.alerts;
		case "sampleCollected": return all.totals.sampleCollected;
		case "fieldVerification": return all.totals.fieldCaseVerification;
		case "ems": return all.totals.ems;
		case "rrt": return rrtCount(all);
	}
}

function isUnknownDistrict(name: string): boolean {
	const l = name.trim().toLowerCase();
	return l === "" || l === "unknown" || l.includes("not recorded") || l.includes("unmatched");
}

function formatKpi(key: KpiKey, v: number): string {
	return KPI_META[key].format === "percent" ? `${Math.round(v * 100)}%` : fmt(v);
}

function kpiDelta(key: KpiKey, cur: number, prev: number): KpiTile["delta"] {
	const meta = KPI_META[key];
	let text: string;
	let direction: "up" | "down" | "flat";
	if (meta.format === "percent") {
		const pts = Math.round((cur - prev) * 100);
		direction = pts > 0 ? "up" : pts < 0 ? "down" : "flat";
		text = pts === 0 ? "no change" : `${pts > 0 ? "+" : ""}${pts} pts`;
	} else if (prev === 0) {
		direction = cur > 0 ? "up" : "flat";
		text = cur > 0 ? `+${fmt(cur)} (new)` : "no change";
	} else {
		const change = Math.round(((cur - prev) / prev) * 100);
		direction = cur > prev ? "up" : cur < prev ? "down" : "flat";
		text = cur === prev ? "no change" : `${change > 0 ? "+" : ""}${change}%`;
	}
	const tone: "good" | "bad" | "neutral" =
		direction === "flat" || meta.polarity === "neutral"
			? "neutral"
			: (direction === "up") === (meta.polarity === "up")
				? "good"
				: "bad";
	return { text, direction, tone, previous: formatKpi(key, prev) };
}

export function computeKpis(
	report: ManagementReport,
	previous: ManagementReport | null,
	keys: KpiKey[]
): KpiTile[] {
	return keys.slice(0, 8).map((key) => {
		const cur = kpiValue(key, report);
		return {
			key,
			label: KPI_META[key].label,
			hint: KPI_META[key].hint,
			value: formatKpi(key, cur),
			delta: previous ? kpiDelta(key, cur, kpiValue(key, previous)) : null,
		};
	});
}

/* ------------------------------------------------------------------ */
/* Key messages (auto insights)                                        */
/* ------------------------------------------------------------------ */

function changePhrase(cur: number, prev: number | null, noun: string): string {
	if (prev === null) return "";
	if (prev === 0) return cur > 0 ? `, up from none in the previous ${noun}` : "";
	if (cur === prev) return `, unchanged from the previous ${noun}`;
	const change = Math.round(((cur - prev) / prev) * 100);
	return `, ${change > 0 ? "up" : "down"} ${Math.abs(change)}% from ${fmt(prev)} in the previous ${noun}`;
}

/** Labels that are placeholders, not findings ("Routine" is what intake writes when no disease was given). */
const PLACEHOLDER_LABELS = new Set(["other", "routine", "unknown", "not recorded", "none", ""]);

function topCount(items: ManagementCount[]): ManagementCount | null {
	const named = items.filter(
		(c) => c.count > 0 && !PLACEHOLDER_LABELS.has(c.label.trim().toLowerCase()) && !isUnknownDistrict(c.label)
	);
	if (named.length === 0) return null;
	return named.reduce((a, b) => (b.count > a.count ? b : a));
}

function trendWindow(report: ManagementReport) {
	return report.trend.filter((p) => p.date >= report.fromDate && p.date <= report.toDate);
}

export function buildInsights(
	report: ManagementReport,
	previous: ManagementReport | null,
	enabled: InsightKey[],
	granularity: "day" | "week"
): Bullet[] {
	const on = new Set(enabled);
	const out: Bullet[] = [];
	const all = report.allPhes;
	const signals = all.totals.signals;
	const days = rangeDays(report.fromDate, report.toDate);
	const periodNoun = `${days} ${plural(days, "day")}`;

	for (const key of INSIGHT_ORDER) {
		if (!on.has(key)) continue;
		switch (key) {
			case "volume": {
				const prev = previous ? previous.allPhes.totals.signals : null;
				const up = prev !== null && signals > prev;
				out.push({
					text: `${fmt(signals)} ${plural(signals, "signal")} recorded${changePhrase(signals, prev, periodNoun)}.`,
					tone: prev === null || prev === signals ? "neutral" : "info",
					mark: prev === null ? "#" : up ? "↑" : signals < prev ? "↓" : "=",
				});
				break;
			}
			case "verification": {
				if (signals === 0) break;
				const v = verifiedCount(all);
				const rate = v / signals;
				out.push({
					text: `${fmt(v)} of ${fmt(signals)} signals (${pct(v, signals)}) have been verified.`,
					tone: rate >= 0.9 ? "good" : rate < 0.7 ? "bad" : "neutral",
					mark: "✓",
				});
				break;
			}
			case "pending": {
				const p = all.totals.pending;
				out.push(
					p === 0
						? { text: "No signals are pending verification.", tone: "good", mark: "✓" }
						: {
								text: `${fmt(p)} ${plural(p, "signal")} (${pct(p, signals)}) still pending verification — follow up with the districts.`,
								tone: "bad",
								mark: "!",
							}
				);
				break;
			}
			case "alerts": {
				const a = all.totals.alerts;
				const prev = previous ? previous.allPhes.totals.alerts : null;
				out.push({
					text: `${fmt(a)} ${plural(a, "alert")} issued${changePhrase(a, prev, periodNoun)}.`,
					tone: "info",
					mark: "▲",
				});
				break;
			}
			case "vhf": {
				const vs = report.vhf.totals.signals;
				const va = report.vhf.totals.alerts;
				const vd = deathsOf(report.vhf);
				out.push(
					vs === 0
						? { text: "No viral haemorrhagic fever (VHF) signals were recorded.", tone: "good", mark: "✓" }
						: {
								text: `VHFs: ${fmt(vs)} ${plural(vs, "signal")}, ${fmt(va)} ${plural(va, "alert")} issued${vd > 0 ? `, ${fmt(vd)} ${plural(vd, "death")}` : ""}.`,
								tone: va > 0 || vd > 0 ? "bad" : "neutral",
								mark: "VHF",
							}
				);
				break;
			}
			case "deaths": {
				const d = deathsOf(all);
				const districts = (all.sections ?? []).find((s) => s.status === "Dead")?.districts.filter((x) => x.signals > 0).length ?? 0;
				out.push(
					d === 0
						? { text: "No deaths were reported among the signals.", tone: "good", mark: "✓" }
						: {
								text: `${fmt(d)} ${plural(d, "signal")} reported a death (patient status Dead) across ${fmt(districts)} ${plural(districts, "district")}.`,
								tone: "bad",
								mark: "†",
							}
				);
				break;
			}
			case "topDistrict": {
				const top = topCount(mergedDistricts(all).map((d) => ({ label: d.district, count: d.signals })));
				if (top)
					out.push({
						text: `${top.label} reported the most signals: ${fmt(top.count)} (${pct(top.count, signals)} of all).`,
						tone: "info",
						mark: "⌖",
					});
				break;
			}
			case "topSource": {
				const top = topCount(report.sources);
				const total = report.sources.reduce((s, c) => s + c.count, 0);
				if (top)
					out.push({
						text: `${top.label} was the leading source of signals (${fmt(top.count)}, ${pct(top.count, total)}).`,
						tone: "info",
						mark: "◉",
					});
				break;
			}
			case "topCondition": {
				const top = topCount(report.otherPhes);
				if (top)
					out.push({
						text: `${top.label} accounted for the most alerts issued (${fmt(top.count)}).`,
						tone: "info",
						mark: "✚",
					});
				break;
			}
			case "busiestDay": {
				const series = trendSeries(trendWindow(report), granularity);
				if (series.length === 0) break;
				let best = 0;
				for (let i = 1; i < series.length; i++) if (series[i].signals > series[best].signals) best = i;
				if (series[best].signals === 0) break;
				out.push({
					text:
						granularity === "week"
							? `The busiest week was the week of ${series[best].label}, with ${fmt(series[best].signals)} signals.`
							: `The busiest day was ${longDay(series[best].start)}, with ${fmt(series[best].signals)} signals.`,
					tone: "neutral",
					mark: "◷",
				});
				break;
			}
			case "focus": {
				const f = report.focus;
				if (!f || f.diseases.length === 0) break;
				const s = f.scope.totals.signals;
				const a = f.scope.totals.alerts;
				const d = deathsOf(f.scope);
				out.push({
					text: `Focus — ${f.diseases.join(", ")}: ${fmt(s)} ${plural(s, "signal")}, ${fmt(a)} ${plural(a, "alert")} issued${d > 0 ? `, ${fmt(d)} ${plural(d, "death")}` : ""}.`,
					tone: a > 0 || d > 0 ? "bad" : "neutral",
					mark: "◎",
				});
				break;
			}
		}
	}
	return out;
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */

interface TrendBucket {
	start: string;
	label: string;
	signals: number;
	alerts: number;
}

function trendSeries(points: ManagementReport["trend"], granularity: "day" | "week"): TrendBucket[] {
	if (granularity === "day") {
		return points.map((p) => ({ start: p.date, label: shortDay(p.date), signals: p.signals, alerts: p.alerts }));
	}
	const by = new Map<string, TrendBucket>();
	for (const p of points) {
		const wk = weekStart(p.date);
		const b = by.get(wk) ?? { start: wk, label: `Wk ${shortDay(wk)}`, signals: 0, alerts: 0 };
		b.signals += p.signals;
		b.alerts += p.alerts;
		by.set(wk, b);
	}
	return Array.from(by.values()).sort((a, b) => a.start.localeCompare(b.start));
}

/* ------------------------------------------------------------------ */
/* District tables (paginated)                                         */
/* ------------------------------------------------------------------ */

function sortRows(rows: ManagementDistrictRow[], sort: DeckConfig["content"]["districtSort"]) {
	const copy = [...rows];
	copy.sort((a, b) => {
		switch (sort) {
			case "name": return a.district.localeCompare(b.district);
			case "alerts": return b.alerts - a.alerts || b.signals - a.signals || a.district.localeCompare(b.district);
			case "pending": return b.pending - a.pending || b.signals - a.signals || a.district.localeCompare(b.district);
			default: return b.signals - a.signals || a.district.localeCompare(b.district);
		}
	});
	return copy;
}

function foldRows(rows: ManagementDistrictRow[], limit: number): { kept: ManagementDistrictRow[]; folded: ManagementDistrictRow | null } {
	if (limit <= 0 || rows.length <= limit) return { kept: rows, folded: null };
	const kept = rows.slice(0, limit);
	const rest = rows.slice(limit);
	const folded: ManagementDistrictRow = {
		district: `Other districts (${rest.length})`,
		signals: 0, alerts: 0, discarded: 0, fieldCaseVerification: 0,
		sampleCollected: 0, ems: 0, sdb: 0, others: 0, pending: 0,
	};
	for (const r of rest) {
		folded.signals += r.signals;
		folded.alerts += r.alerts;
		folded.discarded += r.discarded;
		folded.fieldCaseVerification += r.fieldCaseVerification;
		folded.sampleCollected += r.sampleCollected;
		folded.ems += r.ems;
		folded.sdb += r.sdb;
		folded.others += r.others;
		folded.pending += r.pending;
	}
	return { kept, folded };
}

/** Rows (excluding the header) of a scope's district table. */
function scopeTableRows(
	scope: ManagementScope,
	withAlerts: boolean,
	content: DeckConfig["content"]
): { header: TableRow; rows: TableRow[] } {
	const cols = scopeColumns(scope, withAlerts);
	const line = (label: string, r: ManagementDistrictRow, style: TableRowStyle): TableRow => ({
		cells: [label, ...cols.map((c) => fmt(c.value(r)))],
		style,
	});
	const header: TableRow = { cells: ["District", ...cols.map((c) => c.header)], style: "header" };
	const rows: TableRow[] = [];
	if (content.districtLayout === "flat") {
		const { kept, folded } = foldRows(sortRows(mergedDistricts(scope), content.districtSort), content.districtLimit);
		for (const d of kept) rows.push(line(d.district, d, "body"));
		if (folded) rows.push(line(folded.district, folded, "fold"));
	} else {
		for (const section of scope.sections ?? []) {
			rows.push(line(section.status, section.totals, "section"));
			const { kept, folded } = foldRows(sortRows(section.districts ?? [], content.districtSort), content.districtLimit);
			for (const d of kept) rows.push(line(d.district, d, "body"));
			if (folded) rows.push(line(folded.district, folded, "fold"));
		}
	}
	rows.push(line("Total", scope.totals, "total"));
	return { header, rows };
}

/**
 * Split table rows into pages of balanced length (52 rows over a 17-row slide
 * become 13+13+13+13, not 17+17+17+1 with a lonely Total), never leaving a
 * section row orphaned at the bottom of a page.
 */
function paginateTable(header: TableRow, rows: TableRow[], perPage: number): TableRow[][] {
	const max = Math.max(3, perPage);
	const capacity = Math.min(max, Math.ceil(rows.length / Math.ceil(rows.length / max)) + 1);
	const pages: TableRow[][] = [];
	let cur: TableRow[] = [];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const isLastSlot = cur.length === capacity - 1;
		if (cur.length >= capacity || (isLastSlot && row.style === "section" && i < rows.length - 1)) {
			pages.push(cur);
			cur = [];
		}
		cur.push(row);
	}
	if (cur.length) pages.push(cur);
	return pages.map((p) => [header, ...p]);
}

/* ------------------------------------------------------------------ */
/* Narratives (paginated by estimated height)                          */
/* ------------------------------------------------------------------ */

export const NARRATIVE_COL = { source: 0.95, district: 1.35 };

function narrativeRowHeight(text: string, colW: number, font: number): number {
	const charsPerLine = Math.max(20, Math.floor((colW * 72) / (font * 0.53)));
	// Respect explicit breaks, then wrap each paragraph.
	const lines = text
		.split(/\n/)
		.reduce((s, para) => s + Math.max(1, Math.ceil(para.length / charsPerLine)), 0);
	const lineH = (font * 1.22) / 72;
	return lines * lineH + 0.09;
}

function paginateNarratives(
	details: ManagementDetail[],
	style: DeckStyle,
	reserveBottom: number
): { rows: ManagementDetail[]; heights: number[] }[] {
	const g = style.geometry;
	const font = style.narrative.font;
	const colW = g.contentW - NARRATIVE_COL.source - NARRATIVE_COL.district;
	const headerH = 0.3;
	const avail = g.contentBottom - g.contentTop - headerH;
	const pages: { rows: ManagementDetail[]; heights: number[] }[] = [];
	let cur = { rows: [] as ManagementDetail[], heights: [] as number[] };
	let used = 0;
	details.forEach((d, i) => {
		const h = narrativeRowHeight(d.narrative, colW, font);
		const isLast = i === details.length - 1;
		const need = h + (isLast ? reserveBottom : 0);
		if (cur.rows.length > 0 && used + need > avail) {
			pages.push(cur);
			cur = { rows: [], heights: [] };
			used = 0;
		}
		cur.rows.push(d);
		cur.heights.push(h);
		used += h;
	});
	if (cur.rows.length) pages.push(cur);
	return pages.length ? pages : [{ rows: [], heights: [] }];
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

/** Category labels too long to sit side by side under a column chart `widthIn` wide. */
export function crowdedLabels(labels: string[], widthIn: number): boolean {
	if (labels.length > 8) return true;
	const slot = (widthIn * 72) / Math.max(1, labels.length); // points per category
	return labels.some((l) => l.length * 5.6 > slot * 0.92);
}

/** Fold beyond `max` categories into one "Other" bucket (merging a real "Other"). */
function foldCounts(counts: ManagementCount[], max: number): ManagementCount[] {
	const named = counts.filter((c) => c.label !== "Other" && c.count > 0);
	const realOther = counts.filter((c) => c.label === "Other").reduce((s, c) => s + c.count, 0);
	if (named.length + (realOther > 0 ? 1 : 0) <= max) {
		return realOther > 0 ? [...named, { label: "Other", count: realOther }] : named;
	}
	const kept = named.slice(0, max - 1);
	const other = named.slice(max - 1).reduce((s, c) => s + c.count, 0) + realOther;
	return [...kept, { label: "Other", count: other }];
}

function countChart(
	counts: ManagementCount[],
	variant: ChartVariant,
	seriesName: string,
	style: DeckStyle,
	content: DeckConfig["content"],
	empty: string
): ChartSpec {
	const round = variant === "pie" || variant === "doughnut";
	const items = foldCounts([...counts].sort((a, b) => b.count - a.count), round ? 8 : 14);
	const pointColors = items.map((c, i) =>
		c.label === "Other" ? style.colors.other : style.colors.categorical[i % style.colors.categorical.length]
	);
	return {
		variant,
		labels: items.map((c) => c.label),
		series: [{ name: seriesName, color: style.colors.primary, values: items.map((c) => c.count) }],
		pointColors: round ? pointColors : undefined,
		dataLabels: content.dataLabels,
		showLegend: round,
		empty: items.length === 0 ? empty : undefined,
	};
}

function cascadeChart(scope: ManagementScope, variant: ChartVariant, style: DeckStyle, content: DeckConfig["content"]): ChartSpec {
	const statuses = STATUSES.filter((s) => scope.cascade?.[s] && scope.cascade[s].signals > 0);
	return {
		variant,
		labels: MANAGEMENT_CASCADE_STAGES.map((s) => s.label),
		series: statuses.map((s) => ({
			name: s,
			color: style.colors.status[s],
			values: MANAGEMENT_CASCADE_STAGES.map((st) => scope.cascade[s][st.key]),
		})),
		dataLabels: content.dataLabels,
		showLegend: true,
		empty: statuses.length === 0 ? "No signals in this range." : undefined,
	};
}

function topDistrictsChart(top: ManagementTopDistrict[], n: number, style: DeckStyle, heading: string): ChartSpec {
	const items = top.slice(0, n);
	return {
		variant: "stacked",
		orientation: "horizontal",
		labels: items.map((t) => t.district.toUpperCase()),
		series: [
			{ name: "VHFs", color: style.colors.vhf, values: items.map((t) => t.vhf) },
			{ name: "Other PHEs", color: style.colors.otherPhes, values: items.map((t) => t.other) },
		],
		dataLabels: false,
		showLegend: true,
		heading,
		empty: items.length === 0 ? "No alerts issued in this range." : undefined,
	};
}

/* ------------------------------------------------------------------ */
/* Auto speaker notes                                                  */
/* ------------------------------------------------------------------ */

function scopeNote(label: string, scope: ManagementScope): string {
	const t = scope.totals;
	const districts = mergedDistricts(scope).filter((d) => d.signals > 0).length;
	return `${label}: ${fmt(t.signals)} signals from ${fmt(districts)} districts; ${fmt(t.discarded)} discarded, ${fmt(t.pending)} pending verification, ${fmt(t.alerts)} alerts issued. Deaths: ${fmt(deathsOf(scope))}.`;
}

function chartNote(spec: ChartSpec): string {
	if (spec.series.length === 0 || spec.labels.length === 0) return "";
	if (spec.series.length === 1) {
		const s = spec.series[0];
		const total = s.values.reduce((a, b) => a + b, 0);
		const ranked = spec.labels
			.map((l, i) => ({ l, v: s.values[i] }))
			.sort((a, b) => b.v - a.v)
			.slice(0, 3)
			.map((x) => `${x.l} ${fmt(x.v)} (${pct(x.v, total)})`);
		return `Total ${fmt(total)}. Leading: ${ranked.join("; ")}.`;
	}
	return spec.series
		.map((s) => `${s.name}: ${spec.labels.map((l, i) => `${l} ${fmt(s.values[i])}`).join(", ")}`)
		.join(". ") + ".";
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export function deckScopeLabel(regions: string[]): string {
	if (regions.length === 0) return "National";
	return regions.length <= 3 ? regions.join(", ") : `${regions.length} regions`;
}

export function buildDeck(input: DeckBuildInput): BuiltDeck {
	const { report, previous, map, config } = input;
	const now = input.now ?? new Date();
	const style = resolveDeckStyle(config);
	const content = config.content;
	const range = formatReportRange(report.fromDate, report.toDate);
	const scopeLabel = deckScopeLabel(content.regions);
	const scopeSuffix = content.regions.length ? ` — ${scopeLabel}` : "";
	const reportTitle = `Alerts Management report${scopeSuffix}`;
	const deckTitle = config.cover.title.trim() || "Alerts Management Report";
	const generatedOn = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
	const prevRange = previousPeriod(report.fromDate, report.toDate);
	const comparisonLabel = previous
		? `vs previous ${rangeDays(report.fromDate, report.toDate)} days (${formatReportRange(prevRange.fromDate, prevRange.toDate)})`
		: null;
	const auto = content.autoNotes;
	const g = style.geometry;

	const tableRowsPerPage = Math.floor(
		(g.contentBottom - g.contentTop - style.table.headerH) / style.table.rowH
	);

	const out: DeckSlide[] = [];
	const notesFor = (item: DeckSlideItem, autoText: string) =>
		[auto ? autoText : "", item.notes.trim()].filter(Boolean).join("\n\n");

	const titleFor = (item: DeckSlideItem, fallback: string) => item.title.trim() || fallback;

	const pushTable = (
		item: DeckSlideItem,
		keyBase: string,
		title: string,
		scope: ManagementScope,
		withAlerts: boolean,
		section: string,
		notes: string
	) => {
		const { header, rows } = scopeTableRows(scope, withAlerts, content);
		const hasData = (scope.sections ?? []).length > 0 || scope.totals.signals > 0;
		const pages = paginateTable(header, rows, tableRowsPerPage);
		pages.forEach((pageRows, i) => {
			out.push({
				key: `${keyBase}-${i}`,
				itemId: item.id,
				kind: item.kind,
				type: "table",
				title: pages.length > 1 ? `${title} (${i + 1}/${pages.length})` : title,
				section,
				notes: i === 0 ? notes : "",
				page: pages.length > 1 ? { index: i, count: pages.length } : undefined,
				chrome: "content",
				firstColShare: 0.2,
				rows: pageRows,
				empty: hasData ? undefined : "No signals in this range.",
				note:
					i === pages.length - 1 && content.districtLimit > 0
						? `Top ${content.districtLimit} districts per ${content.districtLayout === "flat" ? "table" : "status"}; the rest are folded into "Other districts". Totals include every district.`
						: undefined,
			});
		});
	};

	const pushNarratives = (
		item: DeckSlideItem,
		keyBase: string,
		title: string,
		details: ManagementDetail[],
		total: number,
		emptyLabel: string,
		section: string,
		notes: string
	) => {
		const more = total - details.length;
		const note = more > 0 ? `… ${fmt(more)} more ${plural(more, "alert")} in this range not shown (showing ${fmt(details.length)} of ${fmt(total)}).` : undefined;
		const pages = paginateNarratives(details, style, note ? 0.3 : 0);
		pages.forEach((p, i) => {
			out.push({
				key: `${keyBase}-${i}`,
				itemId: item.id,
				kind: item.kind,
				type: "narratives",
				title: pages.length > 1 ? `${title} (${i + 1}/${pages.length})` : title,
				section,
				notes: i === 0 ? notes : "",
				page: pages.length > 1 ? { index: i, count: pages.length } : undefined,
				chrome: "content",
				rows: p.rows,
				rowHeights: p.heights,
				note: i === pages.length - 1 ? note : undefined,
				empty: details.length === 0 ? emptyLabel : undefined,
			});
		});
	};

	const totalSignals = report.sources.reduce((s, c) => s + c.count, 0);

	for (const item of config.slides) {
		if (!item.enabled) continue;
		const meta = SLIDE_KIND_META[item.kind];
		const base = {
			key: item.id,
			itemId: item.id,
			kind: item.kind,
			section: meta.section || item.title.trim() || meta.label,
		};
		const chart = (item.chart ?? meta.charts?.[0] ?? "column") as ChartVariant;

		switch (item.kind) {
			case "cover": {
				out.push({
					...base,
					type: "cover",
					title: deckTitle,
					notes: notesFor(item, `${deckTitle} — ${range}${scopeSuffix}.`),
					chrome: "full",
					cover: {
						title: titleFor(item, deckTitle),
						subtitle: config.cover.subtitle.trim() || range,
						organization: config.cover.organization.trim(),
						presenter: config.cover.presenter.trim(),
						dateLine: config.cover.dateLine.trim() || `Presented ${generatedOn}`,
						logo: config.cover.logoDataUrl,
						partnerLogo: config.cover.partnerLogoDataUrl,
						layout: config.cover.layout,
						scope: content.regions.length ? `${scopeLabel}` : "",
					},
				});
				break;
			}
			case "agenda": {
				// Filled in after the loop, once every enabled section is known.
				out.push({ ...base, type: "agenda", title: titleFor(item, "Agenda"), notes: item.notes.trim(), chrome: "content", items: [] });
				break;
			}
			case "summary": {
				const tiles = computeKpis(report, previous, content.kpis);
				out.push({
					...base,
					type: "kpis",
					title: titleFor(item, `Executive summary (${range})`),
					notes: notesFor(
						item,
						tiles.map((t) => `${t.label}: ${t.value}${t.delta ? ` (${t.delta.text}; previously ${t.delta.previous})` : ""}`).join(". ") + "."
					),
					chrome: "content",
					tiles,
					comparison: comparisonLabel,
				});
				break;
			}
			case "highlights": {
				const bullets = buildInsights(report, previous, content.insights, content.trendGranularity);
				for (const line of content.customHighlights.split("\n")) {
					const t = line.trim().replace(/^[-•*]\s*/, "");
					if (t) bullets.push({ text: t, tone: "info", mark: "★" });
				}
				out.push({
					...base,
					type: "bullets",
					title: titleFor(item, "Key messages"),
					notes: notesFor(item, bullets.map((b) => b.text).join(" ")),
					chrome: "content",
					bullets: bullets.slice(0, 9),
					empty: "Pick some key messages in the Content tab.",
				});
				break;
			}
			case "tableAll":
				pushTable(item, item.id, titleFor(item, `${reportTitle} (${range}) — All PHEs`), report.allPhes, false, base.section,
					notesFor(item, scopeNote("All PHEs", report.allPhes)));
				break;
			case "tableVhf":
				pushTable(item, item.id, titleFor(item, `${reportTitle} (${range}) — VHFs`), report.vhf, true, base.section,
					notesFor(item, scopeNote("VHFs", report.vhf)));
				break;
			case "sourcesPie":
			case "sourcesBar": {
				const spec = countChart(report.sources, chart, "Signals", style, content, "No signals in this range.");
				out.push({
					...base,
					type: "chart",
					title: titleFor(
						item,
						item.kind === "sourcesPie"
							? `Signal sources (${range})`
							: `Signal sources (n=${fmt(totalSignals)})`
					),
					notes: notesFor(item, `Signal sources. ${chartNote(spec)}`),
					chrome: "content",
					chart: spec,
				});
				break;
			}
			case "narratives":
				pushNarratives(item, item.id, titleFor(item, `Alert details (${range})`), report.details, report.detailsTotal,
					"No VHF alerts issued in this range.", base.section,
					notesFor(item, `${fmt(report.detailsTotal)} VHF ${plural(report.detailsTotal, "alert")} issued in the range.`));
				break;
			case "cascadeAll":
			case "cascadeVhf": {
				const scope = item.kind === "cascadeAll" ? report.allPhes : report.vhf;
				const label = item.kind === "cascadeAll" ? "All PHEs" : "VHFs";
				const spec = cascadeChart(scope, chart, style, content);
				out.push({
					...base,
					type: "chart",
					title: titleFor(item, `Response cascade — ${label} (${range})`),
					notes: notesFor(item, `Response cascade, ${label}. ${chartNote(spec)}`),
					chrome: "content",
					chart: spec,
				});
				break;
			}
			case "diseaseBar": {
				const spec = countChart(report.otherPhes, chart, "Alerts issued", style, content, "No alerts issued in this range.");
				out.push({
					...base,
					type: "chart",
					title: titleFor(item, "Other PHEs reported: Alerts issued"),
					notes: notesFor(item, `Alerts issued by condition. ${chartNote(spec)}`),
					chrome: "content",
					chart: spec,
				});
				break;
			}
			case "map": {
				const n = Math.min(content.topDistricts, report.topDistricts.length || content.topDistricts);
				const top = content.mapShowTop
					? topDistrictsChart(report.topDistricts, content.topDistricts, style, `Top ${n} districts registering alerts`)
					: null;
				out.push({
					...base,
					type: "map",
					title: titleFor(item, `Distribution of alerts issued, N=${fmt(report.allPhes.totals.alerts)}${scopeSuffix} (${range})`),
					notes: notesFor(
						item,
						report.topDistricts.length
							? `Top districts by alerts issued: ${report.topDistricts.slice(0, 5).map((t) => `${t.district} ${fmt(t.vhf + t.other)}`).join(", ")}.`
							: "No alerts issued in this range."
					),
					chrome: "content",
					map,
					top,
				});
				break;
			}
			case "trend": {
				const buckets = trendSeries(report.trend, content.trendGranularity);
				const spec: ChartSpec = {
					variant: chart,
					labels: buckets.map((b) => b.label),
					series: [
						{ name: "Signals", color: style.colors.signals, values: buckets.map((b) => b.signals) },
						{ name: "Alerts issued", color: style.colors.alerts, values: buckets.map((b) => b.alerts) },
					],
					dataLabels: content.dataLabels && chart === "column" && buckets.length <= 16,
					showLegend: true,
					empty: buckets.length === 0 ? "No trend data for this range." : undefined,
				};
				out.push({
					...base,
					type: "chart",
					title: titleFor(
						item,
						`Trend of signals vs alerts issued, ${content.trendGranularity === "week" ? "weekly" : "daily"} (${formatReportRange(report.trendFrom, report.toDate)})`
					),
					notes: notesFor(
						item,
						`From ${formatReportRange(report.trendFrom, report.toDate)}: ${fmt(buckets.reduce((s, b) => s + b.signals, 0))} signals and ${fmt(buckets.reduce((s, b) => s + b.alerts, 0))} alerts issued.`
					),
					chrome: "content",
					chart: spec,
				});
				break;
			}
			case "focus": {
				const f = report.focus;
				if (!f || f.diseases.length === 0) break;
				const label = f.diseases.join(", ");
				const ft = `Disease focus (${label})`;
				const section = "Disease focus";
				out.push({
					...base,
					key: "focus-divider",
					section,
					type: "divider",
					title: titleFor(item, "Disease focus"),
					notes: notesFor(item, scopeNote(label, f.scope)),
					chrome: "full",
					heading: titleFor(item, "Disease focus"),
					subheading: `${label} — ${range}`,
					tone: "accent",
				});
				pushTable(item, "focus-table", `${ft} — district table`, f.scope, true, section, "");
				const cascade = cascadeChart(f.scope, chart, style, content);
				out.push({
					...base,
					key: "focus-cascade",
					section,
					type: "chart",
					title: `${ft} — response cascade`,
					notes: auto ? chartNote(cascade) : "",
					chrome: "content",
					chart: cascade,
				});
				if (f.sources.length > 0) {
					const src = countChart(f.sources, "column", "Signals", style, content, "No signals.");
					out.push({
						...base,
						key: "focus-sources",
						section,
						type: "chart",
						title: `${ft} — signal sources`,
						notes: auto ? chartNote(src) : "",
						chrome: "content",
						chart: src,
					});
				}
				pushNarratives(item, "focus-narratives", `${ft} — alert details`, f.details, f.detailsTotal,
					"No alerts issued for the focus diseases in this range.", section, "");
				break;
			}
			case "closing": {
				out.push({
					...base,
					type: "closing",
					title: titleFor(item, config.closing.title.trim() || "Thank you"),
					notes: item.notes.trim(),
					chrome: "full",
					heading: titleFor(item, config.closing.title.trim() || "Thank you"),
					message: config.closing.message.trim(),
					contact: config.closing.contact.split("\n").map((l) => l.trim()).filter(Boolean),
				});
				break;
			}
			case "text": {
				const lines = (item.body ?? "").split("\n").map((l) => l.trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
				const title = item.title.trim() || "Notes";
				const common = { ...base, section: title, title, notes: item.notes.trim(), chrome: "content" as const };
				if (item.layout === "statement") {
					const [text, ...rest] = (item.body ?? "").split("\n");
					out.push({ ...common, type: "statement", text: text.trim(), attribution: rest.join(" ").trim() });
				} else if (item.layout === "two-column") {
					// "---" on its own line splits the columns; otherwise halve the list.
					const raw = (item.body ?? "").split("\n").map((l) => l.trim());
					const sep = raw.findIndex((l) => l === "---");
					const clean = (xs: string[]) => xs.map((l) => l.replace(/^[-•*]\s*/, "")).filter((l) => l && l !== "---");
					const left = sep >= 0 ? clean(raw.slice(0, sep)) : lines.slice(0, Math.ceil(lines.length / 2));
					const right = sep >= 0 ? clean(raw.slice(sep + 1)) : lines.slice(Math.ceil(lines.length / 2));
					out.push({ ...common, type: "twoColumn", left, right });
				} else {
					out.push({
						...common,
						type: "bullets",
						bullets: lines.map((t) => ({ text: t, tone: "info" as const, mark: "•" })),
						empty: "Add some text to this slide.",
					});
				}
				break;
			}
			case "divider": {
				const heading = item.title.trim() || "Section";
				out.push({
					...base,
					section: heading,
					type: "divider",
					title: heading,
					notes: item.notes.trim(),
					chrome: "full",
					heading,
					subheading: (item.subtitle ?? "").trim(),
					tone: "secondary",
				});
				break;
			}
			case "image": {
				const title = item.title.trim() || "Image";
				out.push({
					...base,
					section: title,
					type: "image",
					title,
					notes: item.notes.trim(),
					chrome: "content",
					image: item.imageDataUrl ?? null,
					caption: (item.subtitle ?? "").trim(),
				});
				break;
			}
		}
	}

	// Agenda: the distinct sections that follow it, in order.
	const agendaIdx = out.findIndex((s) => s.type === "agenda");
	if (agendaIdx >= 0) {
		const seen = new Set<string>();
		const items: string[] = [];
		for (const s of out.slice(agendaIdx + 1)) {
			if (s.kind === "closing" || s.kind === "cover") continue;
			if (seen.has(s.section)) continue;
			seen.add(s.section);
			items.push(s.section);
		}
		const agenda = out[agendaIdx] as Extract<DeckSlide, { type: "agenda" }>;
		agenda.items = items;
		if (!agenda.notes && auto) agenda.notes = `Today: ${items.join(", ")}.`;
	}

	return {
		slides: out,
		style,
		range,
		scopeSuffix,
		scopeLabel,
		title: deckTitle,
		generatedOn,
		comparisonLabel,
	};
}

/** Footer strings for a content slide. */
export function footerParts(
	config: DeckConfig,
	deck: BuiltDeck,
	number: number,
	total: number
): { left: string; center: string; right: string } {
	const b = config.branding;
	const left = [b.footerText.trim(), b.showGeneratedDate ? `Generated ${deck.generatedOn}` : ""]
		.filter(Boolean)
		.join("  ·  ");
	return {
		left,
		center: b.classification.trim().toUpperCase(),
		right: b.showSlideNumbers ? `${number} / ${total}` : "",
	};
}

/** Download filename stem, without extension. */
export function deckFileStem(config: DeckConfig, report: ManagementReport): string {
	const raw =
		config.branding.fileName.trim() ||
		`${config.cover.title.trim() || "Alerts Management report"}${config.content.regions.length ? ` ${deckScopeLabel(config.content.regions)}` : ""}`;
	const stem = raw
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.slice(0, 80) || "alerts-management-report";
	return `${stem}_${report.fromDate}_to_${report.toDate}`;
}
