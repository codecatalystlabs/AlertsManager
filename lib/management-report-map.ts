import type { GeoFeature, GeoFeatureCollection } from "@/lib/fetch-geo";

/**
 * The deck's district choropleth, drawn on a canvas and returned as a PNG data
 * URL so the same picture goes into the slide preview, the .pptx, the PDF and
 * the Word file. White background, district outlines, a binned legend, and
 * district names (all / only those with alerts / none).
 */

// The standard red ramp (hex WITH "#"), used when a caller doesn't pass an
// accent-derived ramp.
const DEFAULT_MAP_RAMP = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];

export interface ChoroplethOptions {
	ramp?: string[];
	labels?: "all" | "affected" | "none";
	legendTitle?: string;
}

interface MapBins {
	color: string;
	label: string;
}

/** Colour scale identical in spirit to the in-app map's makeScale. */
function mapScale(
	maxCount: number,
	ramp: string[]
): { colorFor: (count: number) => string; bins: MapBins[] } {
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
	const bins: MapBins[] = [{ color: "#ffffff", label: "None" }];
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

function eachRing(feature: GeoFeature, cb: (ring: number[][]) => void): void {
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
 * Draws a district choropleth of alert counts. Accepts either a ramp (legacy
 * call shape) or an options object.
 */
export function renderDistrictChoropleth(
	districts: GeoFeatureCollection,
	opts: string[] | ChoroplethOptions = {}
): { dataUrl: string; aspect: number } | null {
	if (typeof document === "undefined") return null;
	const o: ChoroplethOptions = Array.isArray(opts) ? { ramp: opts } : opts;
	const ramp = o.ramp ?? DEFAULT_MAP_RAMP;
	const labels = o.labels ?? "all";
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
	const scalePx = (W - pad * 2 - legendW) / Math.max(1e-6, maxLng - minLng);
	// A region crop can be much taller than wide — cap the height so the
	// picture still fits a slide, and shrink the scale to match.
	const rawH = (maxLat - minLat) * scalePx + pad * 2;
	const maxH = 1300;
	const k = rawH > maxH ? (maxH - pad * 2) / ((maxLat - minLat) * scalePx) : 1;
	const s = scalePx * k;
	const H = Math.round(Math.max(420, (maxLat - minLat) * s + pad * 2));
	const offsetX = pad + ((W - pad * 2 - legendW) - (maxLng - minLng) * s) / 2;
	const px = (lng: number) => offsetX + (lng - minLng) * s;
	const py = (lat: number) => pad + (maxLat - lat) * s;

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

	if (labels !== "none") {
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const fewer = feats.length < 40; // a region crop has room for bigger type
		for (const f of feats) {
			const [lng, lat] = f.properties.centroid;
			if (!lng && !lat) continue;
			const count = f.properties.count;
			if (labels === "affected" && count <= 0) continue;
			ctx.font = count > 0 ? `bold ${fewer ? 20 : 13}px sans-serif` : `${fewer ? 16 : 11}px sans-serif`;
			// A halo keeps names legible over the darkest ramp stops.
			ctx.lineWidth = 3;
			ctx.strokeStyle = "rgba(255,255,255,0.85)";
			const text = labels === "affected" ? `${f.properties.name.toUpperCase()} (${count})` : f.properties.name.toUpperCase();
			ctx.strokeText(text, px(lng), py(lat));
			ctx.fillStyle = count > 0 ? "#111827" : "#6b7280";
			ctx.fillText(text, px(lng), py(lat));
		}
	}

	// Legend (right-hand side, like the deck).
	const lx = W - legendW + 10;
	let ly = Math.max(pad + 10, H * 0.5);
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#111827";
	ctx.font = "bold 22px sans-serif";
	ctx.fillText(o.legendTitle ?? "Alerts issued", lx, ly);
	ly += 30;
	ctx.font = "18px sans-serif";
	for (const bin of bins) {
		ctx.fillStyle = bin.color;
		ctx.fillRect(lx, ly - 11, 30, 22);
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 1;
		ctx.strokeRect(lx, ly - 11, 30, 22);
		ctx.fillStyle = "#111827";
		ctx.fillText(bin.label, lx + 40, ly);
		ly += 30;
	}

	return { dataUrl: canvas.toDataURL("image/png"), aspect: W / H };
}

/** Keep only districts whose region is one of `regionUids` ([] = all). */
export function filterDistrictsToRegions(
	geo: GeoFeatureCollection,
	regionUids: string[]
): GeoFeatureCollection {
	if (regionUids.length === 0) return geo;
	const set = new Set(regionUids);
	const features = geo.features.filter(
		(f) => set.has(f.properties.regionUid) || set.has(f.properties.parentUid)
	);
	return {
		...geo,
		features,
		maxCount: features.reduce((m, f) => Math.max(m, f.properties.count), 0),
		total: features.reduce((s, f) => s + f.properties.count, 0),
	};
}
