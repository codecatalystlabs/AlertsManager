/**
 * Exports for the Signals Map: a titled PNG snapshot of the map as it looks on
 * screen, and an Excel workbook of the areas it shows (counts, share, trend,
 * hotspots, and the per-frame timeline when one is loaded). Libraries load
 * lazily — neither ships with the page.
 */
import type { TimelineBucket } from "@/lib/fetch-geo";
import type { Trend, TrendText } from "@/lib/geo-map-analytics";

function sanitizeToken(value: string): string {
	return value
		.trim()
		.replace(/[^A-Za-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** signals-map_<tokens>_<from>_to_<to>.<ext> (or today's date for all-time). */
export function mapExportFilename(
	tokens: string[],
	range: { from?: string; to?: string },
	extension: string
): string {
	const parts = ["signals-map", ...tokens.map(sanitizeToken).filter(Boolean)];
	if (range.from && range.to) parts.push(`${range.from}_to_${range.to}`);
	else if (range.from) parts.push(`from_${range.from}`);
	else if (range.to) parts.push(`through_${range.to}`);
	else parts.push(`all-time_${new Date().toISOString().slice(0, 10)}`);
	let name = parts.join("_");
	if (name.length > 180) name = name.slice(0, 180).replace(/_+$/, "");
	return `${name}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Image ────────────────────────────────────────────────────────────────

/** Leaflet chrome and our own controls stay out of the picture. */
const IGNORED_CLASSES = ["leaflet-control-zoom", "leaflet-control-layers", "sm-toolbar"];

function keepNode(node: Node): boolean {
	if (!(node instanceof Element)) return true;
	if (node.hasAttribute("data-export-ignore")) return false;
	return !IGNORED_CLASSES.some((c) => node.classList.contains(c));
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Could not decode the map capture"));
		img.src = src;
	});
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
	if (ctx.measureText(text).width <= maxWidth) return text;
	let t = text;
	while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
	return `${t}…`;
}

// A transparent pixel stands in for any tile that can't be fetched, so one
// blocked tile never aborts the whole capture.
const TRANSPARENT_PIXEL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Captures `el` (the map, legend and breadcrumb as shown) and frames it with a
 * title, a context line (range, filters, frame) and a footer, then downloads
 * it as a PNG.
 */
export async function exportMapImage(
	el: HTMLElement,
	meta: { title: string; subtitle: string; footer: string; filename: string }
): Promise<void> {
	const { toPng } = await import("html-to-image");
	const pixelRatio = 2;
	const dataUrl = await toPng(el, {
		pixelRatio,
		backgroundColor: "#f8fafc",
		cacheBust: false, // tiles are CORS-enabled and cached; don't re-hit the tile servers
		skipFonts: true, // cross-origin font fetches can reject the whole capture
		imagePlaceholder: TRANSPARENT_PIXEL,
		filter: keepNode,
	});
	const shot = await loadImage(dataUrl);

	const s = pixelRatio;
	const pad = 16 * s;
	const headerH = 54 * s;
	const footerH = 24 * s;
	const canvas = document.createElement("canvas");
	canvas.width = shot.width;
	canvas.height = shot.height + headerH + footerH;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is unavailable in this browser");

	const font = (weight: number, size: number) =>
		`${weight} ${size * s}px "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif`;

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#C1272D";
	ctx.fillRect(0, 0, 5 * s, headerH);

	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = "#0f172a";
	ctx.font = font(700, 16);
	ctx.fillText(ellipsize(ctx, meta.title, canvas.width - pad * 2), pad, 24 * s);
	ctx.fillStyle = "#475569";
	ctx.font = font(400, 11);
	ctx.fillText(ellipsize(ctx, meta.subtitle, canvas.width - pad * 2), pad, 42 * s);

	ctx.drawImage(shot, 0, headerH);
	ctx.strokeStyle = "#e2e8f0";
	ctx.lineWidth = s;
	ctx.strokeRect(0, headerH, canvas.width, shot.height);

	ctx.fillStyle = "#64748b";
	ctx.font = font(400, 10);
	const generated = `Generated ${new Date().toLocaleString()}`;
	const gw = ctx.measureText(generated).width;
	ctx.fillText(
		ellipsize(ctx, meta.footer, canvas.width - pad * 3 - gw),
		pad,
		headerH + shot.height + 16 * s
	);
	ctx.fillText(generated, canvas.width - pad - gw, headerH + shot.height + 16 * s);

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("Could not encode the PNG");
	downloadBlob(blob, meta.filename);
}

// ── Excel ────────────────────────────────────────────────────────────────

export interface MapExportArea {
	name: string;
	parent: string;
	count: number;
	trend?: Trend;
}

export interface MapExcelInput {
	filename: string;
	/** e.g. "Districts in Acholi". */
	levelLabel: string;
	areas: MapExportArea[];
	trendText: TrendText;
	/** Lines for the "About" sheet: [label, value]. */
	about: [string, string][];
	timeline?: {
		buckets: TimelineBucket[];
		rows: { name: string; values: number[] }[];
	} | null;
}

function capitalise(s: string): string {
	return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const TREND_WORDS: Record<string, string> = {
	none: "",
	new: "New",
	surge: "Doubled or more",
	rising: "Rising",
	steady: "Steady",
	falling: "Falling",
	plunge: "Sharp fall",
};

export async function exportMapAreasToExcel(input: MapExcelInput): Promise<void> {
	const XLSX = await import("xlsx");
	const total = input.areas.reduce((s, a) => s + a.count, 0);
	const ranked = [...input.areas].sort(
		(a, b) => b.count - a.count || a.name.localeCompare(b.name)
	);
	const nowHeader = input.trendText.current ?? "Compared: now";
	const beforeHeader = capitalise(input.trendText.vs.replace(/^vs\s+/, ""));

	const header = [
		"Rank",
		"Area",
		"Parent",
		"Signals",
		"Share of total (%)",
		nowHeader,
		beforeHeader,
		"Change",
		"Change (%)",
		"Trend",
		"Hotspot",
	];
	const rows = ranked.map((a, i) => [
		i + 1,
		a.name,
		a.parent,
		a.count,
		total > 0 ? Math.round((a.count / total) * 1000) / 10 : 0,
		a.trend?.cur ?? "",
		a.trend?.prev ?? "",
		a.trend ? a.trend.delta : "",
		a.trend?.pct != null ? Math.round(a.trend.pct * 1000) / 10 : "",
		a.trend ? TREND_WORDS[a.trend.cls] : "",
		a.trend?.hotspot ? "Yes" : "",
	]);
	const areas = XLSX.utils.aoa_to_sheet([header, ...rows, [], ["", "Total", "", total]]);
	areas["!cols"] = header.map((h, i) => ({ wch: i === 1 || i === 2 ? 28 : Math.max(10, h.length + 2) }));

	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(book, areas, input.levelLabel.slice(0, 31) || "Areas");

	if (input.timeline && input.timeline.buckets.length > 0) {
		const { buckets } = input.timeline;
		const tlRows = [...input.timeline.rows].sort(
			(a, b) =>
				b.values.reduce((s, v) => s + v, 0) - a.values.reduce((s, v) => s + v, 0) ||
				a.name.localeCompare(b.name)
		);
		const sheet = XLSX.utils.aoa_to_sheet([
			["Area", ...buckets.map((b) => b.label), "Total"],
			["(frame start)", ...buckets.map((b) => b.start), ""],
			...tlRows.map((r) => [r.name, ...r.values, r.values.reduce((s, v) => s + v, 0)]),
		]);
		sheet["!cols"] = [{ wch: 28 }, ...buckets.map(() => ({ wch: 11 })), { wch: 9 }];
		XLSX.utils.book_append_sheet(book, sheet, "Timeline");
	}

	const about = XLSX.utils.aoa_to_sheet([
		["Signals Map export"],
		[],
		...input.about,
		["Generated", new Date().toLocaleString()],
		[],
		[
			"Note",
			"Counts use the same canonical district/subcounty matching, date window and filters as the map; signals whose location can't be matched to a boundary aren't plotted.",
		],
	]);
	about["!cols"] = [{ wch: 22 }, { wch: 90 }];
	XLSX.utils.book_append_sheet(book, about, "About");

	const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
	downloadBlob(
		new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		input.filename
	);
}
