/**
 * The arithmetic behind the Signals Map's analytical layers — comparison
 * windows, trend classes, hotspots and timeline frames. Pure and DOM-free, so
 * it runs under `node --experimental-strip-types lib/geo-map-analytics.test.ts`.
 */
import type {
	GeoFeature,
	GeoTimeline,
	TimelineBucket,
	TimelineGranularity,
} from "@/lib/fetch-geo";

// ── Dates (local calendar days, as the range picker emits them) ─────────────

/** Local-time YYYY-MM-DD (no UTC off-by-one near midnight). */
export function toYmd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function parseYmd(value: string): Date {
	const [y, m, d] = value.split("-").map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(value: string, days: number): string {
	const d = parseYmd(value);
	d.setDate(d.getDate() + days);
	return toYmd(d);
}

/** Whole days from `from` to `to` (0 for the same day). */
export function daysBetween(from: string, to: string): number {
	// Round, so a DST shift inside the window can't leave a fractional day.
	return Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86_400_000);
}

// ── Comparison windows ─────────────────────────────────────────────────────

/** Length of the rolling window used when the range is open-ended (all time). */
export const ROLLING_DAYS = 30;

export interface DayWindow {
	from: string;
	to: string;
}

/**
 * What the trend arrows, the "Change" colouring and the hotspot rings compare.
 *
 * - "range": a bounded range is compared with the equal-length window right
 *   before it, and its own counts are the "current" side (what the map shows).
 * - "rolling": an open-ended range (all time) has no "before", so the last 30
 *   days are compared with the 30 before them — the map's colours still show
 *   the all-time counts, which is why the label names both windows.
 */
export interface ComparisonWindows {
	mode: "range" | "rolling";
	current: DayWindow;
	previous: DayWindow;
	/** Short phrase for the legend. */
	label: string;
	/**
	 * How tooltips phrase it: "vs previous 30 days" — prefixed, in rolling
	 * mode, by the window the "current" number covers ("Last 30 days"), since
	 * there it differs from the count the polygon is coloured by.
	 */
	text: TrendText;
}

/** The comparison as tooltips phrase it. */
export interface TrendText {
	/** Names the window of the trend's current number when it is NOT the displayed count. */
	current: string | null;
	vs: string;
}

export function comparisonWindows(
	from: string | undefined,
	to: string | undefined,
	today: Date = new Date()
): ComparisonWindows {
	if (from && to && from <= to) {
		const days = daysBetween(from, to) + 1;
		return {
			mode: "range",
			current: { from, to },
			previous: { from: addDays(from, -days), to: addDays(from, -1) },
			label: `vs previous ${days} day${days === 1 ? "" : "s"}`,
			text: { current: null, vs: `vs previous ${days} day${days === 1 ? "" : "s"}` },
		};
	}
	const end = toYmd(today);
	const start = addDays(end, -(ROLLING_DAYS - 1));
	return {
		mode: "rolling",
		current: { from: start, to: end },
		previous: { from: addDays(start, -ROLLING_DAYS), to: addDays(start, -1) },
		label: `last ${ROLLING_DAYS} days vs prior ${ROLLING_DAYS}`,
		text: { current: `Last ${ROLLING_DAYS} days`, vs: `vs prior ${ROLLING_DAYS} days` },
	};
}

// ── Trends & hotspots ──────────────────────────────────────────────────────

export type TrendClass =
	| "none"
	| "new"
	| "surge"
	| "rising"
	| "steady"
	| "falling"
	| "plunge";

export interface Trend {
	cur: number;
	prev: number;
	delta: number;
	/** Relative change; null when there was nothing to compare against. */
	pct: number | null;
	cls: TrendClass;
	/** Rising enough, on enough signals, to ring on the map. */
	hotspot: boolean;
}

/** A hotspot needs at least this many signals now… */
export const HOTSPOT_MIN_SIGNALS = 3;
/** …at least this many more than before… */
export const HOTSPOT_MIN_DELTA = 2;
/** …and at least this multiple of before (or nothing before). */
export const HOTSPOT_MIN_RATIO = 1.5;

/**
 * Classify one area's change. The hotspot rule deliberately ignores tiny
 * numbers: 1 → 2 is "doubled" but is not an outbreak signal, so a ring needs
 * ≥3 signals, ≥2 more than before, and ≥1.5× the previous count.
 */
export function classifyTrend(cur: number, prev: number): Trend {
	const delta = cur - prev;
	if (cur <= 0 && prev <= 0) {
		return { cur, prev, delta: 0, pct: null, cls: "none", hotspot: false };
	}
	const hotspot =
		cur >= HOTSPOT_MIN_SIGNALS &&
		delta >= HOTSPOT_MIN_DELTA &&
		(prev <= 0 || cur / prev >= HOTSPOT_MIN_RATIO);
	if (prev <= 0) return { cur, prev, delta, pct: null, cls: "new", hotspot };
	const pct = delta / prev;
	const cls: TrendClass =
		pct >= 1
			? "surge"
			: pct >= 0.25
				? "rising"
				: pct > -0.25
					? "steady"
					: pct > -0.75
						? "falling"
						: "plunge";
	return { cur, prev, delta, pct, cls, hotspot };
}

/** Diverging fill per trend class for the "Change" colouring. */
export const CHANGE_COLORS: Record<Exclude<TrendClass, "none">, string> = {
	new: "#67001f",
	surge: "#b2182b",
	rising: "#ef8a62",
	steady: "#f4f4f4",
	falling: "#67a9cf",
	plunge: "#2166ac",
};

export const CHANGE_LEGEND: { cls: Exclude<TrendClass, "none">; label: string }[] = [
	{ cls: "new", label: "New (none before)" },
	{ cls: "surge", label: "Doubled or more" },
	{ cls: "rising", label: "Up 25–99%" },
	{ cls: "steady", label: "Within ±25%" },
	{ cls: "falling", label: "Down 25–74%" },
	{ cls: "plunge", label: "Down 75% or more" },
];

/** "▲ 4 (+40%)", "▼ 2 (−20%)", "new", "no change", or "" when both are zero. */
export function formatTrend(t: Trend): string {
	if (t.cls === "none") return "";
	if (t.cls === "new") return `new · ${t.cur.toLocaleString()}`;
	if (t.delta === 0) return "no change";
	const arrow = t.delta > 0 ? "▲" : "▼";
	const pct = t.pct === null ? "" : ` (${t.delta > 0 ? "+" : "−"}${Math.round(Math.abs(t.pct) * 100)}%)`;
	return `${arrow} ${Math.abs(t.delta).toLocaleString()}${pct}`;
}

/** Trend for every uid in `current`, compared with `previous` (missing = 0). */
export function trendsFor(
	current: Map<string, number>,
	previous: Map<string, number>
): Map<string, Trend> {
	const out = new Map<string, Trend>();
	for (const [uid, cur] of current) out.set(uid, classifyTrend(cur, previous.get(uid) ?? 0));
	return out;
}

// ── Timeline frames ────────────────────────────────────────────────────────

/** Running total of a per-frame series. */
export function cumulative(series: number[]): number[] {
	const out = new Array<number>(series.length);
	let sum = 0;
	for (let i = 0; i < series.length; i++) {
		sum += series[i] ?? 0;
		out[i] = sum;
	}
	return out;
}

/** Element-wise sum of several equal-length series. */
export function sumSeries(list: number[][], length: number): number[] {
	const out = new Array<number>(length).fill(0);
	for (const s of list) for (let i = 0; i < length; i++) out[i] += s[i] ?? 0;
	return out;
}

/**
 * Region series = the sum of their districts' series — exactly how the region
 * bubbles are rolled up — using each district feature's regionUid.
 */
export function regionSeriesFrom(
	timeline: GeoTimeline,
	districts: GeoFeature[]
): Map<string, number[]> {
	const regionOf = new Map<string, string>();
	for (const f of districts) regionOf.set(f.properties.uid, f.properties.regionUid);
	const n = timeline.buckets.length;
	const out = new Map<string, number[]>();
	for (const [uid, series] of Object.entries(timeline.series)) {
		const region = regionOf.get(uid);
		if (!region) continue;
		let acc = out.get(region);
		if (!acc) {
			acc = new Array<number>(n).fill(0);
			out.set(region, acc);
		}
		for (let i = 0; i < n; i++) acc[i] += series[i] ?? 0;
	}
	return out;
}

/**
 * Counts at frame `index` for the given uids, plus the frame before it (for
 * the trend), and the colour-scale ceiling over EVERY frame — fixed for the
 * whole playback so a colour means the same number on every frame.
 */
export function frameCounts(
	seriesByUid: Map<string, number[]>,
	uids: string[],
	index: number,
	isCumulative: boolean
): { current: Map<string, number>; previous: Map<string, number>; scaleMax: number } {
	const current = new Map<string, number>();
	const previous = new Map<string, number>();
	let scaleMax = 0;
	for (const uid of uids) {
		const raw = seriesByUid.get(uid);
		if (!raw) {
			current.set(uid, 0);
			previous.set(uid, 0);
			continue;
		}
		const s = isCumulative ? cumulative(raw) : raw;
		current.set(uid, s[index] ?? 0);
		previous.set(uid, index > 0 ? (s[index - 1] ?? 0) : 0);
		for (const v of s) if (v > scaleMax) scaleMax = v;
	}
	return { current, previous, scaleMax };
}

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const SHORT_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH_FMT = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** Human label for one frame: "Tue, 15 Sep 2026", "W38 · 14 Sep – 20 Sep 2026", "September 2026". */
export function describeFrame(bucket: TimelineBucket, granularity: TimelineGranularity): string {
	const start = parseYmd(bucket.start);
	const end = parseYmd(bucket.end);
	if (granularity === "day") return DAY_FMT.format(start);
	if (granularity === "month") {
		const full = start.getDate() === 1 && addDays(bucket.end, 1).endsWith("-01");
		return full ? MONTH_FMT.format(start) : `${SHORT_FMT.format(start)} – ${SHORT_FMT.format(end)} ${end.getFullYear()}`;
	}
	const week = bucket.label.split(" ")[0];
	return `${week} · ${SHORT_FMT.format(start)} – ${SHORT_FMT.format(end)} ${end.getFullYear()}`;
}

/** Previous frame as a comparison phrase: "vs W37 2026". */
export function previousFrameLabel(buckets: TimelineBucket[], index: number): string {
	return index > 0 ? `vs ${buckets[index - 1].label}` : "first frame";
}
