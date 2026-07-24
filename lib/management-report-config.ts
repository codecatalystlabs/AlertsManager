/**
 * Configuration for the Alerts Management presentation.
 *
 * One `DeckConfig` object drives BOTH the in-app report view
 * (management-report-view) and the downloaded .pptx (management-report-pptx),
 * so what you preview is exactly what the PowerPoint contains. It carries four
 * groups of settings: a disease focus, a colour theme, per-section visibility
 * toggles, and cover/branding text.
 *
 * Colours are stored as a single accent (hex). `deriveDeckTheme` expands that
 * accent into the handful of brand colours the deck actually paints (table
 * headers, section tints, the choropleth ramp, the primary bar/line series).
 * Semantic hues — the Alive/Dead/Unknown status series and the categorical
 * sources palette — are intentionally NOT themed: they carry meaning and are
 * tuned for colour-vision accessibility, so the accent leaves them alone.
 */

/* ------------------------------------------------------------------ */
/* Config shape                                                        */
/* ------------------------------------------------------------------ */

export interface DeckSlideToggles {
	/** District tables split by patient status (All PHEs + VHFs). */
	districtTables: boolean;
	/** Signal-sources pie + the "Signal Sources (n=…)" bar. */
	sources: boolean;
	/** Alert-details narrative table. */
	narratives: boolean;
	/** Response-cascade charts (All PHEs + VHFs). */
	cascade: boolean;
	/** "Other PHEs reported: Alerts" bar. */
	diseaseBar: boolean;
	/** District choropleth + top-10 districts. */
	map: boolean;
	/** Signals-vs-alerts trend line. */
	trend: boolean;
	/** The disease-focus section (only rendered when focus data is present). */
	focus: boolean;
}

export interface DeckCover {
	/** When true, a cover/title slide (and an in-app header) is rendered. */
	enabled: boolean;
	title: string;
	subtitle: string;
	organization: string;
	/** A data: URL for a logo, or null. Embedded into the deck. */
	logoDataUrl: string | null;
}

export interface DeckConfig {
	/** Disease codes (alertResponse.code) to focus on; [] = no focus block. */
	focusDiseases: string[];
	/** Preset id, or "custom" when the accent was hand-picked. */
	themeKey: string;
	/** Accent / brand colour, hex WITH a leading "#". */
	accent: string;
	slides: DeckSlideToggles;
	cover: DeckCover;
}

/* ------------------------------------------------------------------ */
/* Presets + defaults                                                  */
/* ------------------------------------------------------------------ */

export interface DeckThemePreset {
	key: string;
	label: string;
	accent: string;
}

/** Ready-made accents; "Custom" is offered separately via the colour picker. */
export const DECK_THEME_PRESETS: DeckThemePreset[] = [
	{ key: "crimson", label: "MoH Crimson", accent: "#C1272D" },
	{ key: "blue", label: "Ocean Blue", accent: "#1D4ED8" },
	{ key: "green", label: "Forest Green", accent: "#15803D" },
	{ key: "purple", label: "Royal Purple", accent: "#6D28D9" },
	{ key: "teal", label: "Deep Teal", accent: "#0F766E" },
	{ key: "contrast", label: "High Contrast", accent: "#111827" },
];

export const DEFAULT_DECK_ACCENT = "#C1272D"; // uganda-red / --primary

export function defaultSlideToggles(): DeckSlideToggles {
	return {
		districtTables: true,
		sources: true,
		narratives: true,
		cascade: true,
		diseaseBar: true,
		map: true,
		trend: true,
		focus: true,
	};
}

export function defaultDeckConfig(): DeckConfig {
	return {
		focusDiseases: [],
		themeKey: "crimson",
		accent: DEFAULT_DECK_ACCENT,
		slides: defaultSlideToggles(),
		cover: {
			enabled: false,
			title: "",
			subtitle: "",
			organization: "Ministry of Health, Uganda",
			logoDataUrl: null,
		},
	};
}

/** Human labels for the slide toggles, in deck order (drives the config UI). */
export const SLIDE_TOGGLE_META: { key: keyof DeckSlideToggles; label: string }[] =
	[
		{ key: "districtTables", label: "District tables (All PHEs + VHFs)" },
		{ key: "sources", label: "Signal sources (pie + bar)" },
		{ key: "narratives", label: "Alert details / narratives" },
		{ key: "cascade", label: "Response cascade charts" },
		{ key: "diseaseBar", label: "Other PHEs reported (by disease)" },
		{ key: "map", label: "District map + top-10" },
		{ key: "trend", label: "Signals-vs-alerts trend" },
		{ key: "focus", label: "Disease-focus section" },
	];

/* ------------------------------------------------------------------ */
/* Colour maths + theme derivation                                     */
/* ------------------------------------------------------------------ */

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const SHORT_HEX_RE = /^#?[0-9a-fA-F]{3}$/;

/** A valid "#rrggbb" (or fallback) — accepts "#abc", "abc", "aabbcc". */
export function normalizeHex(value: string, fallback = DEFAULT_DECK_ACCENT): string {
	const v = value.trim();
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
function mix(a: string, b: string, t: number): string {
	const [ar, ag, ab] = parseRgb(a);
	const [br, bg, bb] = parseRgb(b);
	return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

const WHITE = "#ffffff";
const BLACK = "#000000";

export interface DeckTheme {
	/** Accent / brand: title rule, table headers, primary bar & line series. */
	accent: string;
	/** Very light accent tint for status-section rows / totals accents. */
	accentSoft: string;
	/** Body ink. */
	ink: string;
	/** Neutral grey fill for the totals row. */
	neutralFill: string;
	/** Table cell border. */
	border: string;
	/** 5-stop light→dark choropleth ramp derived from the accent. */
	mapRamp: string[];
}

/**
 * Expand an accent into the deck's brand palette. The ramp runs from a near-white
 * tint of the accent to a dark shade of it, so a chosen accent recolours the
 * choropleth without losing its light→dark reading.
 */
export function deriveDeckTheme(accent: string): DeckTheme {
	const a = normalizeHex(accent);
	return {
		accent: a,
		accentSoft: mix(a, WHITE, 0.85),
		ink: "#1a1a1a",
		neutralFill: "#e5e7eb",
		border: "#c9cfd6",
		mapRamp: [
			mix(a, WHITE, 0.88),
			mix(a, WHITE, 0.6),
			mix(a, WHITE, 0.32),
			a,
			mix(a, BLACK, 0.35),
		],
	};
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "alerts-management-deck-config";

/** Merge a persisted (possibly older-schema) config onto the current defaults. */
function mergeConfig(base: DeckConfig, patch: Partial<DeckConfig> | null): DeckConfig {
	if (!patch || typeof patch !== "object") return base;
	return {
		focusDiseases: Array.isArray(patch.focusDiseases)
			? patch.focusDiseases.map(String)
			: base.focusDiseases,
		themeKey: typeof patch.themeKey === "string" ? patch.themeKey : base.themeKey,
		accent: typeof patch.accent === "string" ? normalizeHex(patch.accent) : base.accent,
		slides: { ...base.slides, ...(patch.slides ?? {}) },
		cover: { ...base.cover, ...(patch.cover ?? {}) },
	};
}

export function loadDeckConfig(): DeckConfig {
	if (typeof window === "undefined") return defaultDeckConfig();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultDeckConfig();
		return mergeConfig(defaultDeckConfig(), JSON.parse(raw) as Partial<DeckConfig>);
	} catch {
		return defaultDeckConfig();
	}
}

export function saveDeckConfig(config: DeckConfig): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch {
		/* storage full / unavailable — config just won't persist */
	}
}
