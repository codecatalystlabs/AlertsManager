/**
 * Configuration for the Alerts Management presentation ("Presentation Studio").
 *
 * One `DeckConfig` drives EVERY output — the in-app slide preview, the
 * fullscreen presenter, the .pptx, the slide PDF, and the PDF/Word documents —
 * so what you preview is exactly what the files contain. It carries:
 *
 *   - `slides`   — the ORDERED slide list: built-in data slides (each can be
 *                  hidden, renamed, given notes, or drawn as a different chart)
 *                  plus any number of custom text / divider / image slides.
 *   - `content`  — what the data slides show: geographic scope, comparison with
 *                  the previous period, which KPIs and auto-insights, district
 *                  table layout/sort/limit, narrative + top-N caps, trend
 *                  granularity, data labels, auto speaker notes, map labels.
 *   - `design`   — accent + secondary colour, font, title style, background,
 *                  slide size, chart palette, table density.
 *   - `cover` / `branding` / `closing` — title slide, footer/classification/
 *                  slide numbers/logo on every slide, and the closing slide.
 *
 * Colours are stored as two hexes. `deriveDeckTheme` expands them into the
 * handful of tokens the slides paint. Semantic hues (Alive/Dead/Unknown status,
 * categorical sources, signals-vs-alerts) stay semantic unless the user picks
 * the "theme" chart palette — they carry meaning and are tuned for
 * colour-vision accessibility, so recolouring them is opt-in.
 */

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

export type SlideKind =
	| "cover"
	| "agenda"
	| "summary"
	| "highlights"
	| "tableAll"
	| "tableVhf"
	| "sourcesPie"
	| "narratives"
	| "cascadeAll"
	| "cascadeVhf"
	| "sourcesBar"
	| "diseaseBar"
	| "map"
	| "trend"
	| "focus"
	| "closing"
	// Custom (user-added, repeatable, deletable):
	| "text"
	| "divider"
	| "image";

export type ChartVariant =
	| "column"
	| "bar"
	| "stacked"
	| "pie"
	| "doughnut"
	| "line"
	| "area";

export type TextLayout = "bullets" | "two-column" | "statement";

export interface DeckSlideItem {
	/** Stable id: the kind for built-ins, `<kind>-<random>` for custom slides. */
	id: string;
	kind: SlideKind;
	enabled: boolean;
	/** Title override; "" = the automatic title. */
	title: string;
	/** Speaker notes (appended after the auto notes when those are on). */
	notes: string;
	/** Chart drawing for chart-capable slides. */
	chart?: ChartVariant;
	/** Custom slides: body text (one bullet per line for text slides). */
	body?: string;
	/** Text slides: layout. */
	layout?: TextLayout;
	/** Divider slides: the line under the heading. Image slides: the caption. */
	subtitle?: string;
	/** Image slides: the picture (downscaled data URL). */
	imageDataUrl?: string | null;
}

export interface SlideKindMeta {
	label: string;
	description: string;
	/** Agenda section the slide belongs to. */
	section: string;
	custom?: boolean;
	/** Chart drawings the slide supports (first = default). */
	charts?: ChartVariant[];
	/** Only rendered when the data has something for it. */
	needs?: "focus";
}

export const SLIDE_KIND_META: Record<SlideKind, SlideKindMeta> = {
	cover: {
		label: "Cover",
		description: "Title slide with logos, organisation, presenter and date.",
		section: "Opening",
	},
	agenda: {
		label: "Agenda",
		description: "Contents list built automatically from the enabled sections.",
		section: "Opening",
	},
	summary: {
		label: "Executive summary",
		description: "Headline KPI tiles, with the change against the previous period.",
		section: "Overview",
	},
	highlights: {
		label: "Key messages",
		description: "Findings written from the data, plus your own bullets.",
		section: "Overview",
	},
	tableAll: {
		label: "District table — All PHEs",
		description: "Signals and outcomes per district, split by patient status.",
		section: "District situation",
	},
	tableVhf: {
		label: "District table — VHFs",
		description: "The same table for viral haemorrhagic fevers, with alerts issued.",
		section: "District situation",
	},
	sourcesPie: {
		label: "Signal sources (share)",
		description: "Where signals came from, as shares.",
		section: "Signal sources",
		charts: ["pie", "doughnut", "bar", "column"],
	},
	narratives: {
		label: "Alert details",
		description: "One narrative line per VHF alert issued.",
		section: "Alert details",
	},
	cascadeAll: {
		label: "Response cascade — All PHEs",
		description: "Signals → verified → response actions → alerts, by patient status.",
		section: "Response",
		charts: ["column", "bar", "stacked"],
	},
	cascadeVhf: {
		label: "Response cascade — VHFs",
		description: "The response cascade for VHF signals only.",
		section: "Response",
		charts: ["column", "bar", "stacked"],
	},
	sourcesBar: {
		label: "Signal sources (counts)",
		description: "Signal counts per source, with n = total.",
		section: "Signal sources",
		charts: ["column", "bar", "pie", "doughnut"],
	},
	diseaseBar: {
		label: "Alerts by condition",
		description: "Issued alerts per disease / PHE (VHF variants folded).",
		section: "Conditions",
		charts: ["column", "bar", "pie", "doughnut"],
	},
	map: {
		label: "District map + top districts",
		description: "Choropleth of issued alerts with the top-districts chart.",
		section: "Geography",
	},
	trend: {
		label: "Signals vs alerts trend",
		description: "Daily or weekly signals against alerts issued.",
		section: "Trend",
		charts: ["line", "area", "column"],
	},
	focus: {
		label: "Disease-focus section",
		description: "Divider, table, cascade, sources and narratives for the focus diseases.",
		section: "Disease focus",
		charts: ["column", "bar", "stacked"],
		needs: "focus",
	},
	closing: {
		label: "Closing",
		description: "Thank-you slide with a message and contacts.",
		section: "Closing",
	},
	text: {
		label: "Text slide",
		description: "Your own bullets, two columns, or a big statement.",
		section: "",
		custom: true,
	},
	divider: {
		label: "Section divider",
		description: "A full-bleed heading between parts of the deck.",
		section: "",
		custom: true,
	},
	image: {
		label: "Image slide",
		description: "A photo, scanned form or chart from elsewhere, with a caption.",
		section: "",
		custom: true,
	},
};

/** Built-in kinds in the standard deck order (each appears exactly once). */
export const BUILT_IN_SLIDE_ORDER: SlideKind[] = [
	"cover",
	"agenda",
	"summary",
	"highlights",
	"tableAll",
	"tableVhf",
	"sourcesPie",
	"narratives",
	"cascadeAll",
	"cascadeVhf",
	"sourcesBar",
	"diseaseBar",
	"map",
	"trend",
	"focus",
	"closing",
];

export const CHART_VARIANT_LABEL: Record<ChartVariant, string> = {
	column: "Columns",
	bar: "Horizontal bars",
	stacked: "Stacked",
	pie: "Pie",
	doughnut: "Doughnut",
	line: "Line",
	area: "Area",
};

export const TEXT_LAYOUT_LABEL: Record<TextLayout, string> = {
	bullets: "Bullets",
	"two-column": "Two columns",
	statement: "Big statement",
};

function builtInSlide(kind: SlideKind, enabled: boolean): DeckSlideItem {
	const meta = SLIDE_KIND_META[kind];
	return {
		id: kind,
		kind,
		enabled,
		title: "",
		notes: "",
		...(meta.charts ? { chart: meta.charts[0] } : {}),
	};
}

function randomId(): string {
	return Math.random().toString(36).slice(2, 9);
}

/** A fresh custom slide of the given kind, ready to insert. */
export function newCustomSlide(kind: "text" | "divider" | "image"): DeckSlideItem {
	const base: DeckSlideItem = {
		id: `${kind}-${randomId()}`,
		kind,
		enabled: true,
		title: "",
		notes: "",
	};
	if (kind === "text")
		return {
			...base,
			title: "Recommendations",
			body: "Strengthen verification within 24 hours of a signal\nFollow up pending signals with district surveillance focal persons\nShare feedback with reporters",
			layout: "bullets",
		};
	if (kind === "divider")
		return { ...base, title: "Next section", subtitle: "" };
	return { ...base, title: "Image", subtitle: "", imageDataUrl: null };
}

/** Ordered slide list with every built-in kind (those not listed come disabled). */
export function slidesFromKinds(enabledKinds: SlideKind[]): DeckSlideItem[] {
	// normalizeSlides slots each missing built-in (disabled) in after its nearest
	// standard-order predecessor, so hidden slides sit where you'd expect them.
	return normalizeSlides(
		enabledKinds
			.filter((k) => !SLIDE_KIND_META[k].custom)
			.map((k) => builtInSlide(k, true))
	);
}

/**
 * Repair a slide list: every built-in exactly once (missing ones re-added,
 * disabled), unknown kinds dropped, ids unique, fields defaulted.
 */
export function normalizeSlides(input: unknown): DeckSlideItem[] {
	if (!Array.isArray(input)) return defaultSlides();
	const out: DeckSlideItem[] = [];
	const seenIds = new Set<string>();
	const seenBuiltIns = new Set<SlideKind>();
	for (const raw of input) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw as Partial<DeckSlideItem>;
		const kind = r.kind as SlideKind;
		const meta = SLIDE_KIND_META[kind];
		if (!meta) continue;
		if (!meta.custom) {
			if (seenBuiltIns.has(kind)) continue;
			seenBuiltIns.add(kind);
		}
		let id = typeof r.id === "string" && r.id ? r.id : meta.custom ? `${kind}-${randomId()}` : kind;
		if (!meta.custom) id = kind;
		while (seenIds.has(id)) id = `${kind}-${randomId()}`;
		seenIds.add(id);
		const chart =
			meta.charts && r.chart && meta.charts.includes(r.chart)
				? r.chart
				: meta.charts?.[0];
		out.push({
			id,
			kind,
			enabled: r.enabled !== false,
			title: typeof r.title === "string" ? r.title : "",
			notes: typeof r.notes === "string" ? r.notes : "",
			...(chart ? { chart } : {}),
			...(meta.custom
				? {
						body: typeof r.body === "string" ? r.body : "",
						layout:
							r.layout === "two-column" || r.layout === "statement"
								? r.layout
								: "bullets",
						subtitle: typeof r.subtitle === "string" ? r.subtitle : "",
						imageDataUrl:
							typeof r.imageDataUrl === "string" ? r.imageDataUrl : null,
					}
				: {}),
		});
	}
	for (const kind of BUILT_IN_SLIDE_ORDER) {
		if (seenBuiltIns.has(kind)) continue;
		// Insert after the nearest preceding built-in in standard order.
		const stdIdx = BUILT_IN_SLIDE_ORDER.indexOf(kind);
		let at = out.length;
		for (let i = stdIdx - 1; i >= 0; i--) {
			const pos = out.findIndex((s) => s.kind === BUILT_IN_SLIDE_ORDER[i]);
			if (pos >= 0) {
				at = pos + 1;
				break;
			}
		}
		if (stdIdx === 0) at = 0;
		out.splice(at, 0, builtInSlide(kind, false));
	}
	return out;
}

/* ------------------------------------------------------------------ */
/* Content options                                                     */
/* ------------------------------------------------------------------ */

export type KpiKey =
	| "signals"
	| "verified"
	| "verificationRate"
	| "alerts"
	| "discarded"
	| "pending"
	| "deaths"
	| "districts"
	| "vhfSignals"
	| "vhfAlerts"
	| "sampleCollected"
	| "fieldVerification"
	| "ems"
	| "rrt";

export interface KpiMeta {
	label: string;
	hint: string;
	/** Which direction of change is good ("neutral" = colour it grey). */
	polarity: "up" | "down" | "neutral";
	format: "count" | "percent";
}

export const KPI_META: Record<KpiKey, KpiMeta> = {
	signals: { label: "Signals", hint: "All signals recorded", polarity: "neutral", format: "count" },
	verified: { label: "Signals verified", hint: "Verification recorded", polarity: "up", format: "count" },
	verificationRate: { label: "Verification rate", hint: "Verified ÷ signals", polarity: "up", format: "percent" },
	alerts: { label: "Alerts issued", hint: "Confirmed, assessed, fed back", polarity: "neutral", format: "count" },
	discarded: { label: "Discarded", hint: "Signals discarded", polarity: "neutral", format: "count" },
	pending: { label: "Pending verification", hint: "Still awaiting verification", polarity: "down", format: "count" },
	deaths: { label: "Deaths", hint: "Signals with patient status Dead", polarity: "down", format: "count" },
	districts: { label: "Districts reporting", hint: "Districts with ≥1 signal", polarity: "neutral", format: "count" },
	vhfSignals: { label: "VHF signals", hint: "Viral haemorrhagic fevers", polarity: "neutral", format: "count" },
	vhfAlerts: { label: "VHF alerts", hint: "VHF alerts issued", polarity: "neutral", format: "count" },
	sampleCollected: { label: "Samples collected", hint: "Outcome: sample collected", polarity: "up", format: "count" },
	fieldVerification: { label: "Field verifications", hint: "Field case verification", polarity: "up", format: "count" },
	ems: { label: "EMS evacuations", hint: "Outcome: EMS", polarity: "neutral", format: "count" },
	rrt: { label: "RRT deployments", hint: "RRT mentioned in verification", polarity: "neutral", format: "count" },
};

export const KPI_ORDER = Object.keys(KPI_META) as KpiKey[];

export type InsightKey =
	| "volume"
	| "verification"
	| "pending"
	| "alerts"
	| "vhf"
	| "deaths"
	| "topDistrict"
	| "topSource"
	| "topCondition"
	| "busiestDay"
	| "focus";

export const INSIGHT_META: Record<InsightKey, { label: string }> = {
	volume: { label: "Signal volume (and change)" },
	verification: { label: "Verification rate" },
	pending: { label: "Signals still pending" },
	alerts: { label: "Alerts issued (and change)" },
	vhf: { label: "VHF signals & alerts" },
	deaths: { label: "Deaths reported" },
	topDistrict: { label: "Top reporting district" },
	topSource: { label: "Leading signal source" },
	topCondition: { label: "Leading condition among alerts" },
	busiestDay: { label: "Busiest day / week" },
	focus: { label: "Disease-focus summary" },
};

export const INSIGHT_ORDER = Object.keys(INSIGHT_META) as InsightKey[];

export type DistrictSort = "signals" | "alerts" | "pending" | "name";

export interface DeckContentOptions {
	/** Region names (admin sub-regions) to scope the whole deck; [] = national. */
	regions: string[];
	/** Fetch the equal-length preceding window and show the change. */
	compareWithPrevious: boolean;
	/** KPI tiles on the executive summary, in order (max 8 shown). */
	kpis: KpiKey[];
	/** Auto-generated key messages to include. */
	insights: InsightKey[];
	/** Your own key messages, one per line, after the generated ones. */
	customHighlights: string;
	/** "status": Alive/Dead/Unknown sections (classic); "flat": one row per district. */
	districtLayout: "status" | "flat";
	districtSort: DistrictSort;
	/** Districts per table section (0 = all; the rest fold into "Other districts"). */
	districtLimit: number;
	/** Rows in each alert-details table (server cap). */
	narrativesLimit: number;
	/** Bars in the top-districts chart. */
	topDistricts: number;
	trendGranularity: "day" | "week";
	/** Value labels on bars / slices. */
	dataLabels: boolean;
	/** Write speaker notes from the data for every slide. */
	autoNotes: boolean;
	/** District names on the map. */
	mapLabels: "all" | "affected" | "none";
	/** Show the top-districts chart beside the map. */
	mapShowTop: boolean;
}

export const DEFAULT_KPIS: KpiKey[] = [
	"signals",
	"verificationRate",
	"alerts",
	"pending",
	"deaths",
	"districts",
	"vhfSignals",
	"sampleCollected",
];

export const DEFAULT_INSIGHTS: InsightKey[] = [
	"volume",
	"verification",
	"alerts",
	"vhf",
	"deaths",
	"topDistrict",
	"topSource",
	"focus",
];

export function defaultContentOptions(): DeckContentOptions {
	return {
		regions: [],
		compareWithPrevious: true,
		kpis: [...DEFAULT_KPIS],
		insights: [...DEFAULT_INSIGHTS],
		customHighlights: "",
		districtLayout: "status",
		districtSort: "signals",
		districtLimit: 0,
		narrativesLimit: 60,
		topDistricts: 10,
		trendGranularity: "day",
		dataLabels: true,
		autoNotes: true,
		mapLabels: "all",
		mapShowTop: true,
	};
}

/* ------------------------------------------------------------------ */
/* Design                                                              */
/* ------------------------------------------------------------------ */

export type DeckFont =
	| "Calibri"
	| "Arial"
	| "Segoe UI"
	| "Helvetica"
	| "Verdana"
	| "Trebuchet MS"
	| "Century Gothic"
	| "Georgia"
	| "Times New Roman";

export const DECK_FONTS: { value: DeckFont; label: string; css: string }[] = [
	{ value: "Calibri", label: "Calibri", css: "Calibri, Carlito, 'Segoe UI', sans-serif" },
	{ value: "Arial", label: "Arial", css: "Arial, Helvetica, sans-serif" },
	{ value: "Segoe UI", label: "Segoe UI", css: "'Segoe UI', system-ui, sans-serif" },
	{ value: "Helvetica", label: "Helvetica", css: "Helvetica, Arial, sans-serif" },
	{ value: "Verdana", label: "Verdana", css: "Verdana, Geneva, sans-serif" },
	{ value: "Trebuchet MS", label: "Trebuchet MS", css: "'Trebuchet MS', sans-serif" },
	{ value: "Century Gothic", label: "Century Gothic", css: "'Century Gothic', 'URW Gothic', sans-serif" },
	{ value: "Georgia", label: "Georgia (serif)", css: "Georgia, 'Times New Roman', serif" },
	{ value: "Times New Roman", label: "Times New Roman", css: "'Times New Roman', Times, serif" },
];

export function fontCss(font: DeckFont): string {
	return DECK_FONTS.find((f) => f.value === font)?.css ?? "sans-serif";
}

export type TitleStyle = "rule" | "band" | "minimal" | "sidebar";
export type BackgroundStyle = "white" | "tint" | "dark";
export type DeckAspect = "16x9" | "16x10" | "4x3";
export type ChartPalette = "semantic" | "theme";
export type Density = "compact" | "comfortable";

export const TITLE_STYLE_LABEL: Record<TitleStyle, string> = {
	rule: "Accent rule",
	band: "Colour band",
	minimal: "Minimal",
	sidebar: "Side stripe",
};
export const BACKGROUND_LABEL: Record<BackgroundStyle, string> = {
	white: "White",
	tint: "Soft tint",
	dark: "Dark (projector)",
};
export const ASPECT_LABEL: Record<DeckAspect, string> = {
	"16x9": "Widescreen 16:9",
	"16x10": "16:10",
	"4x3": "Standard 4:3",
};

/** Slide size in inches (pptxgenjs' built-in layouts). */
export const ASPECT_SIZE: Record<DeckAspect, { w: number; h: number; layout: string }> = {
	"16x9": { w: 10, h: 5.625, layout: "LAYOUT_16x9" },
	"16x10": { w: 10, h: 6.25, layout: "LAYOUT_16x10" },
	"4x3": { w: 10, h: 7.5, layout: "LAYOUT_4x3" },
};

export interface DeckDesign {
	/** Preset id, or "custom" when the colours were hand-picked. */
	themeKey: string;
	/** Accent / brand colour, hex WITH a leading "#". */
	accent: string;
	/** Secondary colour: dividers, second series in the theme palette. */
	secondary: string;
	font: DeckFont;
	titleStyle: TitleStyle;
	background: BackgroundStyle;
	aspect: DeckAspect;
	chartPalette: ChartPalette;
	density: Density;
}

export interface DeckThemePreset {
	key: string;
	label: string;
	accent: string;
	secondary: string;
}

/** Ready-made colour pairs; "Custom" is offered separately via the pickers. */
export const DECK_THEME_PRESETS: DeckThemePreset[] = [
	{ key: "crimson", label: "MoH Crimson", accent: "#C1272D", secondary: "#1F2937" },
	{ key: "flag", label: "Flag (red & gold)", accent: "#D90000", secondary: "#B98900" },
	{ key: "blue", label: "Ocean Blue", accent: "#1D4ED8", secondary: "#0891B2" },
	{ key: "green", label: "Forest Green", accent: "#15803D", secondary: "#A16207" },
	{ key: "purple", label: "Royal Purple", accent: "#6D28D9", secondary: "#DB2777" },
	{ key: "teal", label: "Deep Teal", accent: "#0F766E", secondary: "#D97706" },
	{ key: "navy", label: "Midnight Navy", accent: "#1E3A8A", secondary: "#EA580C" },
	{ key: "contrast", label: "High Contrast", accent: "#111827", secondary: "#DC2626" },
];

export const DEFAULT_DECK_ACCENT = "#C1272D"; // uganda-red / --primary

export function defaultDesign(): DeckDesign {
	return {
		themeKey: "crimson",
		accent: DEFAULT_DECK_ACCENT,
		secondary: "#1F2937",
		font: "Calibri",
		titleStyle: "rule",
		background: "white",
		aspect: "16x9",
		chartPalette: "semantic",
		density: "comfortable",
	};
}

/* ------------------------------------------------------------------ */
/* Cover, branding, closing                                            */
/* ------------------------------------------------------------------ */

export type CoverLayout = "centered" | "split" | "minimal";
export const COVER_LAYOUT_LABEL: Record<CoverLayout, string> = {
	centered: "Centred on colour",
	split: "Split panel",
	minimal: "Minimal white",
};

export interface DeckCover {
	title: string;
	/** "" = the date range. */
	subtitle: string;
	organization: string;
	presenter: string;
	/** "" = "Presented <today>". */
	dateLine: string;
	/** Data URL for the main logo, or null. Also used on content slides. */
	logoDataUrl: string | null;
	/** Optional second (partner) logo on the cover. */
	partnerLogoDataUrl: string | null;
	layout: CoverLayout;
}

export type LogoPosition = "top-right" | "bottom-right" | "bottom-left";

export interface DeckBranding {
	/** Left footer text on content slides. */
	footerText: string;
	/** Classification marking (e.g. "OFFICIAL"), shown in the footer; "" = none. */
	classification: string;
	showSlideNumbers: boolean;
	/** "Generated <date>" in the footer. */
	showGeneratedDate: boolean;
	/** Small logo on every content slide. */
	logoOnSlides: boolean;
	logoPosition: LogoPosition;
	/** File name stem for downloads; "" = derived from the title. */
	fileName: string;
}

export interface DeckClosing {
	title: string;
	message: string;
	/** Contact lines, one per line. */
	contact: string;
}

export const CLASSIFICATION_PRESETS = ["", "OFFICIAL", "RESTRICTED", "CONFIDENTIAL", "DRAFT", "FOR INTERNAL USE"];

/* ------------------------------------------------------------------ */
/* The whole config                                                    */
/* ------------------------------------------------------------------ */

export interface DeckConfig {
	version: 2;
	/** Disease codes (alertResponse.code) to focus on; [] = no focus block. */
	focusDiseases: string[];
	slides: DeckSlideItem[];
	content: DeckContentOptions;
	design: DeckDesign;
	cover: DeckCover;
	branding: DeckBranding;
	closing: DeckClosing;
	/** The template last applied (display only); null once edited freely. */
	templateId: string | null;
}

export function defaultSlides(): DeckSlideItem[] {
	return slidesFromKinds([
		"cover",
		"summary",
		"highlights",
		"tableAll",
		"tableVhf",
		"sourcesPie",
		"narratives",
		"cascadeAll",
		"cascadeVhf",
		"sourcesBar",
		"diseaseBar",
		"map",
		"trend",
		"focus",
	]);
}

export function defaultDeckConfig(): DeckConfig {
	return {
		version: 2,
		focusDiseases: [],
		slides: defaultSlides(),
		content: defaultContentOptions(),
		design: defaultDesign(),
		cover: {
			title: "",
			subtitle: "",
			organization: "Ministry of Health, Uganda",
			presenter: "",
			dateLine: "",
			logoDataUrl: null,
			partnerLogoDataUrl: null,
			layout: "centered",
		},
		branding: {
			footerText: "Alerts Management — Public Health Emergency Operations",
			classification: "",
			showSlideNumbers: true,
			showGeneratedDate: false,
			logoOnSlides: true,
			logoPosition: "top-right",
			fileName: "",
		},
		closing: {
			title: "Thank you",
			message: "Questions & discussion",
			contact: "",
		},
		templateId: "weekly",
	};
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export interface DeckTemplate {
	id: string;
	name: string;
	description: string;
	builtIn: boolean;
	/**
	 * Built-in templates restyle STRUCTURE + DESIGN only, keeping the user's
	 * branding (logos, titles, footer) and disease focus. Saved templates
	 * restore everything they captured.
	 */
	config: DeckConfig;
}

function withPatch(
	patch: (c: DeckConfig) => void
): DeckConfig {
	const c = defaultDeckConfig();
	patch(c);
	return c;
}

export function builtInTemplates(): DeckTemplate[] {
	return [
		{
			id: "weekly",
			name: "Weekly management",
			description: "The standard weekly deck: KPIs, key messages, district tables, cascades, map and trend.",
			builtIn: true,
			config: defaultDeckConfig(),
		},
		{
			id: "executive",
			name: "Executive brief",
			description: "Seven slides for leadership: headline numbers, messages, cascade, map, trend.",
			builtIn: true,
			config: withPatch((c) => {
				c.templateId = "executive";
				c.slides = slidesFromKinds([
					"cover",
					"summary",
					"highlights",
					"cascadeAll",
					"map",
					"trend",
					"closing",
				]);
				c.slides = c.slides.map((s) =>
					s.kind === "trend" ? { ...s, chart: "area" } : s.kind === "cascadeAll" ? { ...s, chart: "bar" } : s
				);
				c.content.kpis = ["signals", "verificationRate", "alerts", "pending", "deaths", "districts"];
				c.content.insights = ["volume", "verification", "alerts", "deaths", "topDistrict", "focus"];
				c.content.topDistricts = 8;
				c.design.titleStyle = "band";
				c.design.chartPalette = "theme";
			}),
		},
		{
			id: "vhf",
			name: "VHF situation report",
			description: "Viral haemorrhagic fever focus: VHF KPIs, table, cascade, narratives, map.",
			builtIn: true,
			config: withPatch((c) => {
				c.templateId = "vhf";
				c.slides = slidesFromKinds([
					"cover",
					"summary",
					"highlights",
					"tableVhf",
					"cascadeVhf",
					"narratives",
					"map",
					"trend",
					"focus",
				]);
				c.content.kpis = ["vhfSignals", "vhfAlerts", "deaths", "sampleCollected", "pending", "fieldVerification"];
				c.content.insights = ["vhf", "deaths", "pending", "topDistrict", "busiestDay", "focus"];
				c.content.narrativesLimit = 120;
				c.design.titleStyle = "sidebar";
			}),
		},
		{
			id: "full",
			name: "Full detail",
			description: "Every section, with agenda and closing slides — for a complete review meeting.",
			builtIn: true,
			config: withPatch((c) => {
				c.templateId = "full";
				c.slides = slidesFromKinds([...BUILT_IN_SLIDE_ORDER]);
				c.content.insights = [...INSIGHT_ORDER];
				c.content.narrativesLimit = 150;
				c.content.topDistricts = 15;
			}),
		},
		{
			id: "annex",
			name: "Data annex",
			description: "Tables only — compact district tables and narratives for an annex or the Word file.",
			builtIn: true,
			config: withPatch((c) => {
				c.templateId = "annex";
				c.slides = slidesFromKinds(["cover", "tableAll", "tableVhf", "narratives"]);
				c.content.narrativesLimit = 300;
				c.content.autoNotes = false;
				c.design.titleStyle = "minimal";
				c.design.density = "compact";
			}),
		},
		{
			id: "projector",
			name: "Projector (dark)",
			description: "High-contrast dark slides for a bright room or a big screen.",
			builtIn: true,
			config: withPatch((c) => {
				c.templateId = "projector";
				c.slides = slidesFromKinds([
					"cover",
					"agenda",
					"summary",
					"highlights",
					"cascadeAll",
					"sourcesBar",
					"map",
					"trend",
					"closing",
				]);
				c.slides = c.slides.map((s) => (s.kind === "sourcesBar" ? { ...s, chart: "doughnut" } : s));
				c.design.background = "dark";
				c.design.titleStyle = "minimal";
				c.design.themeKey = "flag";
				c.design.accent = "#D90000";
				c.design.secondary = "#B98900";
				c.design.font = "Segoe UI";
			}),
		},
	];
}

/** Apply a template onto the current config (see DeckTemplate.config). */
export function applyTemplate(current: DeckConfig, template: DeckTemplate): DeckConfig {
	const t = mergeConfig(defaultDeckConfig(), template.config as unknown as Record<string, unknown>);
	if (!template.builtIn) return { ...t, templateId: template.id };
	// Keep custom slides the user added, appended after the template's order.
	const custom = current.slides.filter((s) => SLIDE_KIND_META[s.kind].custom);
	return {
		...current,
		slides: normalizeSlides([...t.slides, ...custom]),
		content: { ...t.content, regions: current.content.regions },
		design: { ...t.design },
		templateId: template.id,
	};
}

/* ------------------------------------------------------------------ */
/* Colour maths + theme derivation                                     */
/* ------------------------------------------------------------------ */

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const SHORT_HEX_RE = /^#?[0-9a-fA-F]{3}$/;

/** A valid "#rrggbb" (or fallback) — accepts "#abc", "abc", "aabbcc". */
export function normalizeHex(value: string, fallback = DEFAULT_DECK_ACCENT): string {
	const v = (value ?? "").trim();
	if (HEX_RE.test(v)) return `#${v.replace("#", "").toLowerCase()}`;
	if (SHORT_HEX_RE.test(v)) {
		const h = v.replace("#", "");
		return `#${h
			.split("")
			.map((c) => c + c)
			.join("")
			.toLowerCase()}`;
	}
	return fallback;
}

/** Strip the leading "#" — pptxgenjs wants bare "RRGGBB". */
export function bareHex(hex: string): string {
	return normalizeHex(hex).replace("#", "").toUpperCase();
}

function parseRgb(hex: string): [number, number, number] {
	const h = normalizeHex(hex).replace("#", "");
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16),
	];
}

function toHex(rgb: [number, number, number]): string {
	return `#${rgb
		.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
		.join("")}`;
}

/** Linear blend: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
	const [ar, ag, ab] = parseRgb(a);
	const [br, bg, bb] = parseRgb(b);
	return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
	const [r, g, b] = parseRgb(hex).map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
	return luminance(bg) > 0.4 ? "#111827" : "#ffffff";
}

const WHITE = "#ffffff";
const BLACK = "#000000";

/** Every colour a slide paints, resolved from the design. Hex WITH "#". */
export interface DeckTheme {
	accent: string;
	secondary: string;
	/** Text on an accent fill. */
	onAccent: string;
	onSecondary: string;
	/** Very light accent tint: status-section rows, soft panels. */
	accentSoft: string;
	/** Slide background. */
	bg: string;
	/** Panel / card fill on the background (KPI tiles, table body). */
	surface: string;
	/** Body ink and muted ink. */
	ink: string;
	muted: string;
	/** Grid lines / cell borders. */
	border: string;
	/** Totals row fill. */
	totalFill: string;
	/** Section-row fill in tables. */
	sectionFill: string;
	/** Good / bad / neutral deltas. */
	good: string;
	bad: string;
	/** 5-stop light→dark choropleth ramp derived from the accent. */
	mapRamp: string[];
	dark: boolean;
}

/**
 * Expand an accent (+ secondary, + background) into the deck's palette. The map
 * ramp runs from a near-white tint of the accent to a dark shade of it, so a
 * chosen accent recolours the choropleth without losing its light→dark reading.
 */
export function deriveDeckTheme(
	accent: string,
	secondary = "#1F2937",
	background: BackgroundStyle = "white"
): DeckTheme {
	const a = normalizeHex(accent);
	const s = normalizeHex(secondary, "#1f2937");
	const dark = background === "dark";
	const bg = dark ? "#0b1220" : background === "tint" ? mix(a, WHITE, 0.955) : WHITE;
	return {
		accent: a,
		secondary: s,
		onAccent: readableOn(a),
		onSecondary: readableOn(s),
		accentSoft: dark ? mix(a, "#0b1220", 0.7) : mix(a, WHITE, 0.86),
		bg,
		surface: dark ? "#131c2e" : WHITE,
		ink: dark ? "#f1f5f9" : "#1a1a1a",
		muted: dark ? "#94a3b8" : "#6b7280",
		border: dark ? "#334155" : "#c9cfd6",
		totalFill: dark ? "#1e293b" : "#e5e7eb",
		sectionFill: dark ? mix(a, "#0b1220", 0.72) : mix(a, WHITE, 0.85),
		good: dark ? "#4ade80" : "#15803d",
		bad: dark ? "#f87171" : "#b91c1c",
		mapRamp: [
			mix(a, WHITE, 0.88),
			mix(a, WHITE, 0.6),
			mix(a, WHITE, 0.32),
			a,
			mix(a, BLACK, 0.35),
		],
		dark,
	};
}

export function themeFromDesign(design: DeckDesign): DeckTheme {
	return deriveDeckTheme(design.accent, design.secondary, design.background);
}

/* ------------------------------------------------------------------ */
/* Persistence + migration                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "alerts-management-deck-config";
const TEMPLATES_KEY = "alerts-management-deck-templates";

type Loose = Record<string, unknown>;

const asObj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {});
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const num = (v: unknown, d: number, min: number, max: number) =>
	typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
	return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}
function keys<T extends string>(v: unknown, allowed: readonly T[], d: T[]): T[] {
	if (!Array.isArray(v)) return d;
	const set = new Set(allowed as readonly string[]);
	return Array.from(new Set(v.filter((x): x is T => typeof x === "string" && set.has(x))));
}

/** v1 stored `slides` as a map of booleans and `cover.enabled`; lift it to v2. */
function migrateV1(raw: Loose): Loose {
	const toggles = asObj(raw.slides);
	const cover = asObj(raw.cover);
	const on = (k: string) => toggles[k] !== false;
	const kinds: SlideKind[] = [];
	if (cover.enabled === true) kinds.push("cover");
	kinds.push("summary", "highlights");
	if (on("districtTables")) kinds.push("tableAll", "tableVhf");
	if (on("sources")) kinds.push("sourcesPie");
	if (on("narratives")) kinds.push("narratives");
	if (on("cascade")) kinds.push("cascadeAll", "cascadeVhf");
	if (on("sources")) kinds.push("sourcesBar");
	if (on("diseaseBar")) kinds.push("diseaseBar");
	if (on("map")) kinds.push("map");
	if (on("trend")) kinds.push("trend");
	if (on("focus")) kinds.push("focus");
	return {
		version: 2,
		focusDiseases: raw.focusDiseases,
		slides: slidesFromKinds(kinds),
		design: { themeKey: raw.themeKey, accent: raw.accent },
		cover,
		templateId: null,
	};
}

/** Merge a persisted / imported (possibly older-schema) config onto defaults. */
export function mergeConfig(base: DeckConfig, input: Loose | null): DeckConfig {
	if (!input || typeof input !== "object") return base;
	const raw = input.version === 2 ? input : migrateV1(input);
	const c = asObj(raw.content);
	const d = asObj(raw.design);
	const cv = asObj(raw.cover);
	const b = asObj(raw.branding);
	const cl = asObj(raw.closing);
	const bc = base.content;
	const bd = base.design;
	return {
		version: 2,
		focusDiseases: Array.isArray(raw.focusDiseases)
			? (raw.focusDiseases as unknown[]).map(String)
			: base.focusDiseases,
		slides: raw.slides ? normalizeSlides(raw.slides) : base.slides,
		content: {
			regions: Array.isArray(c.regions) ? (c.regions as unknown[]).map(String) : bc.regions,
			compareWithPrevious: bool(c.compareWithPrevious, bc.compareWithPrevious),
			kpis: keys(c.kpis, KPI_ORDER, bc.kpis),
			insights: keys(c.insights, INSIGHT_ORDER, bc.insights),
			customHighlights: str(c.customHighlights, bc.customHighlights),
			districtLayout: oneOf(c.districtLayout, ["status", "flat"] as const, bc.districtLayout),
			districtSort: oneOf(c.districtSort, ["signals", "alerts", "pending", "name"] as const, bc.districtSort),
			districtLimit: num(c.districtLimit, bc.districtLimit, 0, 200),
			narrativesLimit: num(c.narrativesLimit, bc.narrativesLimit, 1, 300),
			topDistricts: num(c.topDistricts, bc.topDistricts, 3, 30),
			trendGranularity: oneOf(c.trendGranularity, ["day", "week"] as const, bc.trendGranularity),
			dataLabels: bool(c.dataLabels, bc.dataLabels),
			autoNotes: bool(c.autoNotes, bc.autoNotes),
			mapLabels: oneOf(c.mapLabels, ["all", "affected", "none"] as const, bc.mapLabels),
			mapShowTop: bool(c.mapShowTop, bc.mapShowTop),
		},
		design: {
			themeKey: str(d.themeKey, bd.themeKey),
			accent: typeof d.accent === "string" ? normalizeHex(d.accent) : bd.accent,
			secondary:
				typeof d.secondary === "string" ? normalizeHex(d.secondary, bd.secondary) : bd.secondary,
			font: oneOf(d.font, DECK_FONTS.map((f) => f.value), bd.font),
			titleStyle: oneOf(d.titleStyle, ["rule", "band", "minimal", "sidebar"] as const, bd.titleStyle),
			background: oneOf(d.background, ["white", "tint", "dark"] as const, bd.background),
			aspect: oneOf(d.aspect, ["16x9", "16x10", "4x3"] as const, bd.aspect),
			chartPalette: oneOf(d.chartPalette, ["semantic", "theme"] as const, bd.chartPalette),
			density: oneOf(d.density, ["compact", "comfortable"] as const, bd.density),
		},
		cover: {
			title: str(cv.title, base.cover.title),
			subtitle: str(cv.subtitle, base.cover.subtitle),
			organization: str(cv.organization, base.cover.organization),
			presenter: str(cv.presenter, base.cover.presenter),
			dateLine: str(cv.dateLine, base.cover.dateLine),
			logoDataUrl: typeof cv.logoDataUrl === "string" ? cv.logoDataUrl : null,
			partnerLogoDataUrl: typeof cv.partnerLogoDataUrl === "string" ? cv.partnerLogoDataUrl : null,
			layout: oneOf(cv.layout, ["centered", "split", "minimal"] as const, base.cover.layout),
		},
		branding: {
			footerText: str(b.footerText, base.branding.footerText),
			classification: str(b.classification, base.branding.classification),
			showSlideNumbers: bool(b.showSlideNumbers, base.branding.showSlideNumbers),
			showGeneratedDate: bool(b.showGeneratedDate, base.branding.showGeneratedDate),
			logoOnSlides: bool(b.logoOnSlides, base.branding.logoOnSlides),
			logoPosition: oneOf(
				b.logoPosition,
				["top-right", "bottom-right", "bottom-left"] as const,
				base.branding.logoPosition
			),
			fileName: str(b.fileName, base.branding.fileName),
		},
		closing: {
			title: str(cl.title, base.closing.title),
			message: str(cl.message, base.closing.message),
			contact: str(cl.contact, base.closing.contact),
		},
		templateId: typeof raw.templateId === "string" ? raw.templateId : null,
	};
}

export function loadDeckConfig(): DeckConfig {
	if (typeof window === "undefined") return defaultDeckConfig();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultDeckConfig();
		return mergeConfig(defaultDeckConfig(), JSON.parse(raw) as Loose);
	} catch {
		return defaultDeckConfig();
	}
}

/** Persist; false when storage is full/unavailable (big images are the usual cause). */
export function saveDeckConfig(config: DeckConfig): boolean {
	if (typeof window === "undefined") return false;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
		return true;
	} catch {
		return false;
	}
}

/** User-saved templates (built-ins are not stored). */
export function loadSavedTemplates(): DeckTemplate[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(TEMPLATES_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list
			.filter((t) => t && typeof t === "object" && typeof t.name === "string")
			.map((t) => ({
				id: typeof t.id === "string" ? t.id : `saved-${randomId()}`,
				name: t.name,
				description: typeof t.description === "string" ? t.description : "",
				builtIn: false,
				config: mergeConfig(defaultDeckConfig(), asObj(t.config)),
			}));
	} catch {
		return [];
	}
}

export function saveSavedTemplates(templates: DeckTemplate[]): boolean {
	if (typeof window === "undefined") return false;
	try {
		window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
		return true;
	} catch {
		return false;
	}
}

export function newSavedTemplate(name: string, description: string, config: DeckConfig): DeckTemplate {
	return {
		id: `saved-${randomId()}`,
		name: name.trim() || "My template",
		description: description.trim(),
		builtIn: false,
		config: { ...config, templateId: null },
	};
}

/** A shareable JSON file of a config (what "Export settings" downloads). */
export function serializeConfig(config: DeckConfig, name = "presentation-settings"): string {
	return JSON.stringify({ kind: "alerts-management-deck", name, exportedAt: new Date().toISOString(), config }, null, 2);
}

/** Parse an exported settings file (or a bare config). Throws on garbage. */
export function parseConfigFile(text: string): DeckConfig {
	const json = JSON.parse(text);
	const obj = asObj(json);
	const raw = obj.kind === "alerts-management-deck" ? asObj(obj.config) : obj;
	if (!raw.slides && !raw.design && !raw.accent) {
		throw new Error("That file does not contain presentation settings.");
	}
	return mergeConfig(defaultDeckConfig(), raw);
}

/**
 * Shrink an uploaded image to fit `maxPx` on its longer side and re-encode it,
 * so a phone photo doesn't blow the localStorage quota or bloat the .pptx.
 * PNGs keep transparency (logos); everything else goes to JPEG.
 */
export async function downscaleImage(file: File, maxPx = 1600): Promise<string> {
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Could not read the image."));
		reader.readAsDataURL(file);
	});
	if (file.type === "image/svg+xml") return dataUrl;
	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const el = new Image();
		el.onload = () => resolve(el);
		el.onerror = () => reject(new Error("That file is not a readable image."));
		el.src = dataUrl;
	});
	const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
	const w = Math.max(1, Math.round(img.naturalWidth * scale));
	const h = Math.max(1, Math.round(img.naturalHeight * scale));
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) return dataUrl;
	ctx.drawImage(img, 0, 0, w, h);
	return file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif"
		? canvas.toDataURL("image/png")
		: canvas.toDataURL("image/jpeg", 0.85);
}
