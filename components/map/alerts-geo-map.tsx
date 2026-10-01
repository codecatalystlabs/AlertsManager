"use client";

import "leaflet/dist/leaflet.css";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import { ChevronRight, Home, Info } from "lucide-react";

import type { GeoFeature, GeoFeatureCollection } from "@/lib/fetch-geo";
import {
	CHANGE_COLORS,
	CHANGE_LEGEND,
	formatTrend,
	type Trend,
	type TrendText,
} from "@/lib/geo-map-analytics";
import { MapLocatorInset } from "@/components/map/map-locator-inset";

export const UGANDA_CENTER: [number, number] = [1.3733, 32.2903];

export type Level = "region" | "district" | "subcounty";

/** A drill target carried in the breadcrumb (own UID + bbox to zoom to). */
export interface AreaRef {
	uid: string;
	name: string;
	bbox: [number, number, number, number];
}

export type Drill =
	| { level: "region" }
	| { level: "district"; region: AreaRef }
	| { level: "subcounty"; region: AreaRef; district: AreaRef };

/** What the choropleth is shaded by: signal volume, or its change. */
export type ColorMode = "count" | "change";

// Sequential reds for the choropleth fill; 0 alerts → neutral grey.
const RAMP = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
const ZERO_COLOR = "#e9edf0";

interface LegendBin {
	color: string;
	label: string;
}

/** Colour scale with strictly-increasing, unique bucket bounds (no "2–1" dupes). */
export function makeScale(maxCount: number): {
	colorFor: (count: number) => string;
	bins: LegendBin[];
} {
	const max = Math.max(0, Math.floor(maxCount));
	let uppers: number[];
	if (max <= 0) {
		uppers = [];
	} else if (max <= RAMP.length) {
		uppers = Array.from({ length: max }, (_, i) => i + 1);
	} else {
		const set = new Set<number>();
		for (const f of [0.1, 0.25, 0.45, 0.7]) set.add(Math.max(1, Math.ceil(max * f)));
		set.add(max);
		uppers = Array.from(set)
			.filter((v) => v <= max)
			.sort((a, b) => a - b);
	}
	const colorFor = (count: number): string => {
		if (count <= 0 || uppers.length === 0) return ZERO_COLOR;
		for (let i = 0; i < uppers.length; i++) {
			if (count <= uppers[i]) return RAMP[Math.min(i, RAMP.length - 1)];
		}
		return RAMP[Math.min(uppers.length - 1, RAMP.length - 1)];
	};
	const bins: LegendBin[] = [{ color: ZERO_COLOR, label: "0" }];
	let prev = 1;
	for (let i = 0; i < uppers.length; i++) {
		const hi = uppers[i];
		bins.push({
			color: RAMP[Math.min(i, RAMP.length - 1)],
			label: prev >= hi ? `${hi}` : `${prev}–${hi}`,
		});
		prev = hi + 1;
	}
	return { colorFor, bins };
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return "&#39;";
		}
	});
}

/** A count badge, placed at the centroid of each area. Click falls through to
 * the polygon underneath (pointer-events:none), so clicking the count drills. */
function pillIcon(count: number): L.DivIcon {
	const badge = count >= 100 ? "#a50f15" : count >= 25 ? "#de2d26" : "#fb6a4a";
	const html = `<div style="position:absolute;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;background:${badge};color:#fff;border:1px solid rgba(0,0,0,.18);border-radius:9999px;padding:1px 8px;box-shadow:0 1px 4px rgba(0,0,0,.3);font-size:11px;font-weight:700">${count.toLocaleString()}</div>`;
	return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

/** Pulsing ring behind a pill: "hot" = a rising area, "flash" = just got new signals. */
function ringIcon(kind: "hot" | "flash"): L.DivIcon {
	return L.divIcon({
		html: `<div class="sm-ring sm-ring--${kind}"></div>`,
		className: "",
		iconSize: [0, 0],
	});
}

/** Area name, set just under the pill (or centred where there is no pill). */
function nameIcon(name: string, belowPill: boolean): L.DivIcon {
	const dy = belowPill ? "11px" : "-50%";
	const html = `<div style="position:absolute;transform:translate(-50%,${dy});pointer-events:none;white-space:nowrap;font-size:10px;font-weight:600;color:#1f2937;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 4px #fff">${escapeHtml(name)}</div>`;
	return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

/** Ring + flash animations. Inlined so the map ships with its own motion. */
const MAP_CSS = `
.sm-ring{position:absolute;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:9999px;pointer-events:none}
.sm-ring--hot{border:2px solid rgba(220,38,38,.95);box-shadow:0 0 0 3px rgba(220,38,38,.18);animation:sm-pulse 1.8s ease-out infinite}
.sm-ring--flash{border:3px solid rgba(245,158,11,.95);animation:sm-pulse 1.1s ease-out 7}
@keyframes sm-pulse{0%{transform:scale(.45);opacity:1}75%{opacity:.25}100%{transform:scale(1.4);opacity:0}}
@media (prefers-reduced-motion:reduce){.sm-ring{animation:none!important;opacity:.85}}
.sm-toolbar a{display:flex!important;align-items:center;justify-content:center;color:#334155}
.sm-toolbar a:hover{color:#b91c1c}
.sm-toolbar a[aria-pressed="true"]{color:#b91c1c;background:#fef2f2}
`;

/** bbox [minLng,minLat,maxLng,maxLat] → Leaflet [[s,w],[n,e]] bounds. */
export function bboxToBounds(
	bbox: [number, number, number, number]
): L.LatLngBoundsExpression {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	return [
		[minLat, minLng],
		[maxLat, maxLng],
	];
}

export function featuresBounds(
	features: GeoFeature[]
): L.LatLngBoundsExpression | null {
	let mnLat = Infinity,
		mnLng = Infinity,
		mxLat = -Infinity,
		mxLng = -Infinity;
	for (const f of features) {
		const [a, b, c, d] = f.properties.bbox;
		if (a < mnLng) mnLng = a;
		if (b < mnLat) mnLat = b;
		if (c > mxLng) mxLng = c;
		if (d > mxLat) mxLat = d;
	}
	if (!Number.isFinite(mnLat)) return null;
	return [
		[mnLat, mnLng],
		[mxLat, mxLng],
	];
}

const OSM_ATTR =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_IMAGERY_ATTR =
	"Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const ESRI_TOPO_ATTR = "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ";

/** The map's shared overlay groups: drawn by AdminLayers, toggled by LayersControl. */
interface MapGroups {
	boundary: L.LayerGroup;
	pills: L.LayerGroup;
	hotspots: L.LayerGroup;
	names: L.LayerGroup;
	flash: L.LayerGroup;
}

/** localStorage key for the remembered base map + overlay switches. */
const LAYERS_PREF_KEY = "map-layers-v1";

interface LayersPref {
	base?: string;
	off?: string[];
}

function readLayersPref(): LayersPref {
	try {
		return JSON.parse(localStorage.getItem(LAYERS_PREF_KEY) || "{}") as LayersPref;
	} catch {
		return {};
	}
}

function writeLayersPref(pref: LayersPref): void {
	try {
		localStorage.setItem(LAYERS_PREF_KEY, JSON.stringify(pref));
	} catch {
		/* private mode / blocked storage — the choice just isn't remembered */
	}
}

/**
 * Adds a base-map switcher + overlay toggles (Leaflet's native layers control)
 * and a metric scale bar. The chosen base and overlays are remembered. Only
 * key-free tile providers are offered — the CARTO light/dark skins now
 * watermark every tile with "API KEY REQUIRED". Tiles load with CORS so the
 * map can be exported as an image.
 */
function LayersControl({ groups }: { groups: MapGroups }) {
	const map = useMap();
	useEffect(() => {
		const tile = (url: string, attribution: string) =>
			L.tileLayer(url, { maxZoom: 19, attribution, crossOrigin: "anonymous" });
		const bases: Record<string, L.TileLayer> = {
			Streets: tile("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", OSM_ATTR),
			Satellite: tile(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				ESRI_IMAGERY_ATTR
			),
			Terrain: tile(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
				ESRI_TOPO_ATTR
			),
		};
		const overlays: Record<string, L.LayerGroup> = {
			"Boundaries & shading": groups.boundary,
			Labels: groups.pills,
			"Hotspots (rising areas)": groups.hotspots,
			"Area names": groups.names,
		};
		// Area names start hidden (opt-in); everything else starts visible.
		const pref = readLayersPref();
		const off = new Set(pref.off ?? ["Area names"]);
		(bases[pref.base ?? ""] ?? bases.Streets).addTo(map);
		for (const [name, layer] of Object.entries(overlays)) {
			if (!off.has(name)) layer.addTo(map);
		}
		groups.flash.addTo(map); // live flashes are always on

		const control = L.control
			.layers(bases, overlays, { position: "topright", collapsed: true })
			.addTo(map);
		const scale = L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

		const remember = () => {
			const base = Object.keys(bases).find((k) => map.hasLayer(bases[k]));
			writeLayersPref({
				base,
				off: Object.keys(overlays).filter((k) => !map.hasLayer(overlays[k])),
			});
		};
		map.on("baselayerchange overlayadd overlayremove", remember);

		return () => {
			map.off("baselayerchange overlayadd overlayremove", remember);
			control.remove();
			scale.remove();
			for (const layer of Object.values(bases)) map.removeLayer(layer);
		};
	}, [map, groups]);

	return null;
}

/**
 * Renders React children inside a real Leaflet control, so a custom toolbar
 * stacks with the zoom buttons exactly like a native control (and clicks or
 * wheel on it never pan/zoom the map).
 */
export function MapControlPortal({
	position,
	className,
	children,
}: {
	position: L.ControlPosition;
	className?: string;
	children: React.ReactNode;
}) {
	const map = useMap();
	const [el, setEl] = useState<HTMLElement | null>(null);
	useEffect(() => {
		const Control = L.Control.extend({
			onAdd() {
				const div = L.DomUtil.create("div", className ?? "");
				L.DomEvent.disableClickPropagation(div);
				L.DomEvent.disableScrollPropagation(div);
				return div;
			},
		});
		const control = new Control({ position });
		control.addTo(map);
		setEl(control.getContainer() ?? null);
		return () => {
			control.remove();
			setEl(null);
		};
	}, [map, position, className]);
	return el ? createPortal(children, el) : null;
}

/** Hands the Leaflet map instance up, and keeps it sized to its box. */
function MapInstanceBridge({
	onMap,
	onViewport,
}: {
	onMap?: (map: L.Map | null) => void;
	onViewport: (bbox: [number, number, number, number]) => void;
}) {
	const map = useMap();
	useEffect(() => {
		onMap?.(map);
		return () => onMap?.(null);
	}, [map, onMap]);

	// The box changes size without a window resize (insights panel toggled,
	// timeline bar opened, fullscreen) — Leaflet must be told or tiles tear.
	useEffect(() => {
		const el = map.getContainer();
		let frame = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
		});
		ro.observe(el);
		return () => {
			cancelAnimationFrame(frame);
			ro.disconnect();
		};
	}, [map]);

	useEffect(() => {
		const report = () => {
			const b = map.getBounds();
			onViewport([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
		};
		report();
		map.on("moveend zoomend resize", report);
		return () => {
			map.off("moveend zoomend resize", report);
		};
	}, [map, onViewport]);
	return null;
}

function tooltipHtml(
	name: string,
	count: number,
	trend: Trend | undefined,
	trendText: TrendText,
	hint: string
): string {
	let html = `<strong>${escapeHtml(name)}</strong><br/>${count.toLocaleString()} signal${count === 1 ? "" : "s"}`;
	if (trend && trend.cls !== "none") {
		const up = trend.delta > 0;
		const colour = trend.delta === 0 ? "#475569" : up ? "#b91c1c" : "#1d4ed8";
		const current = trendText.current
			? `${escapeHtml(trendText.current)}: ${trend.cur.toLocaleString()} · `
			: "";
		html += `<br/><span style="color:${colour}">${current}${escapeHtml(formatTrend(trend))} ${escapeHtml(trendText.vs)}</span>`;
		if (trend.hotspot) {
			html += `<br/><span style="color:#b91c1c;font-weight:600">● Hotspot — rising fast</span>`;
		}
	}
	return `${html}<br/><span style="opacity:.7">${hint}</span>`;
}

interface AdminLayersProps {
	features: GeoFeature[];
	counts: Map<string, number>;
	scaleMax: number;
	colorMode: ColorMode;
	trends: Map<string, Trend> | null;
	trendText: TrendText;
	/** Whether a click descends a level (region/district) or lists alerts (subcounty). */
	drillable: boolean;
	/** Identity of the current drill view; bumps trigger a fitBounds. */
	focusKey: string;
	focusBounds: L.LatLngBoundsExpression | null;
	groups: MapGroups;
	highlightUid: string | null;
	flashUids: ReadonlySet<string>;
	onDrill: (f: GeoFeature) => void;
}

/**
 * Draws the features of the current drill level imperatively into the shared
 * groups. Geometry is built once per feature set; the numbers, colours,
 * tooltips, pills and rings are re-applied in place when they change — so the
 * timeline can play frame after frame without tearing down a single polygon.
 * A click on a polygon descends into the area (region/district) or lists the
 * alerts behind its count (subcounty). Fits the map to focusBounds whenever
 * the drill view changes — so opening a region frames just its districts.
 */
function AdminLayers({
	features,
	counts,
	scaleMax,
	colorMode,
	trends,
	trendText,
	drillable,
	focusKey,
	focusBounds,
	groups,
	highlightUid,
	flashUids,
	onDrill,
}: AdminLayersProps) {
	const map = useMap();
	// Keep the latest onDrill without forcing a redraw when only it changes.
	const onDrillRef = useRef(onDrill);
	onDrillRef.current = onDrill;
	// Tracks which drill view has been framed, so we fit exactly once per view.
	const fittedKey = useRef<string | null>(null);
	// uid → polygon of the current feature set.
	const polysRef = useRef(new Map<string, L.GeoJSON>());
	// The latest base/hover styles, read by the (long-lived) mouse handlers.
	const styleRef = useRef<{
		base: (uid: string) => L.PathOptions;
		hover: (uid: string) => L.PathOptions;
	}>({ base: () => ({}), hover: () => ({}) });
	const highlightRef = useRef<string | null>(null);

	// Re-fit when the drill view changes (or its bounds first become available).
	useEffect(() => {
		if (!focusBounds) return;
		if (fittedKey.current === focusKey) return;
		map.fitBounds(focusBounds, { padding: [16, 16] });
		fittedKey.current = focusKey;
	}, [focusKey, focusBounds, map]);

	// Geometry: rebuild the polygons only when the feature set changes.
	useEffect(() => {
		groups.boundary.clearLayers();
		const polys = new Map<string, L.GeoJSON>();
		for (const f of features) {
			if (!f.geometry) continue;
			const uid = f.properties.uid;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const poly = L.geoJSON(f.geometry as any, {
				style: () => styleRef.current.base(uid),
			});
			poly.bindTooltip("", { sticky: true });
			poly.on("mouseover", () => poly.setStyle(styleRef.current.hover(uid)));
			poly.on("mouseout", () => {
				if (highlightRef.current !== uid) poly.setStyle(styleRef.current.base(uid));
			});
			// Clickable at every level: region/district clicks drill in,
			// subcounty clicks open the list of signals behind the count.
			poly.on("click", () => onDrillRef.current(f));
			groups.boundary.addLayer(poly);
			// Pointer cursor on the rendered SVG paths (available after add).
			poly.eachLayer((l) => {
				const el = (
					l as unknown as { getElement?: () => Element | null }
				).getElement?.();
				if (el) (el as HTMLElement | SVGElement).style.cursor = "pointer";
			});
			polys.set(uid, poly);
		}
		polysRef.current = polys;
		highlightRef.current = null;
	}, [features, groups]);

	// Numbers: colours, tooltips, count pills, hotspot rings and names.
	useEffect(() => {
		const scale = makeScale(scaleMax);
		const fill = (uid: string): { color: string; active: boolean } => {
			if (colorMode === "change") {
				const t = trends?.get(uid);
				if (!t || t.cls === "none") return { color: ZERO_COLOR, active: false };
				return { color: CHANGE_COLORS[t.cls], active: true };
			}
			const count = counts.get(uid) ?? 0;
			return { color: count > 0 ? scale.colorFor(count) : ZERO_COLOR, active: count > 0 };
		};
		// Zero-alert areas stay near-transparent so the chosen base skin
		// (satellite/terrain/etc.) shows through instead of a flat grey wash;
		// areas with alerts keep a translucent shade you can still see the map under.
		const base = (uid: string): L.PathOptions => {
			const { color, active } = fill(uid);
			return {
				fillColor: color,
				fillOpacity: active ? 0.62 : 0.08,
				color: "#475569",
				weight: active ? 1 : 0.8,
				opacity: 0.85,
			};
		};
		const hover = (uid: string): L.PathOptions => ({
			weight: 2.5,
			color: "#0f172a",
			opacity: 1,
			fillOpacity: fill(uid).active ? 0.72 : 0.18,
		});
		styleRef.current = { base, hover };

		const hint = drillable ? "click to drill in" : "click to list signals";
		groups.pills.clearLayers();
		groups.hotspots.clearLayers();
		groups.names.clearLayers();
		for (const f of features) {
			const uid = f.properties.uid;
			const count = counts.get(uid) ?? 0;
			const trend = trends?.get(uid);
			const poly = polysRef.current.get(uid);
			if (poly) {
				poly.setStyle(
					highlightRef.current === uid ? { ...base(uid), ...hover(uid) } : base(uid)
				);
				poly.setTooltipContent(
					tooltipHtml(f.properties.name, count, trend, trendText, hint)
				);
			}
			const [lng, lat] = f.properties.centroid;
			if (!(lat || lng)) continue;
			// Only badge areas that actually have alerts — "0" pills everywhere were
			// pure clutter and hid the base skin.
			if (count > 0) {
				groups.pills.addLayer(
					L.marker([lat, lng], { icon: pillIcon(count), interactive: false })
				);
			}
			if (trend?.hotspot) {
				groups.hotspots.addLayer(
					L.marker([lat, lng], {
						icon: ringIcon("hot"),
						interactive: false,
						zIndexOffset: -1000,
					})
				);
			}
			groups.names.addLayer(
				L.marker([lat, lng], {
					icon: nameIcon(f.properties.name, count > 0),
					interactive: false,
					zIndexOffset: -500,
				})
			);
		}
	}, [features, counts, scaleMax, colorMode, trends, trendText, drillable, groups]);

	// Cross-highlight from outside the map (e.g. hovering a row in the insights
	// panel): outline the polygon and pop its tooltip at the centroid.
	useEffect(() => {
		const prev = highlightRef.current;
		if (prev && prev !== highlightUid) {
			const p = polysRef.current.get(prev);
			p?.setStyle(styleRef.current.base(prev));
			p?.closeTooltip();
		}
		highlightRef.current = highlightUid;
		if (!highlightUid) return;
		const poly = polysRef.current.get(highlightUid);
		const f = features.find((x) => x.properties.uid === highlightUid);
		if (!poly || !f) return;
		poly.setStyle(styleRef.current.hover(highlightUid));
		poly.bringToFront();
		const [lng, lat] = f.properties.centroid;
		if (lat || lng) poly.openTooltip(L.latLng(lat, lng));
	}, [highlightUid, features]);

	// Live mode: amber flash on areas that just received new signals.
	useEffect(() => {
		groups.flash.clearLayers();
		if (flashUids.size === 0) return;
		for (const f of features) {
			if (!flashUids.has(f.properties.uid)) continue;
			const [lng, lat] = f.properties.centroid;
			if (!(lat || lng)) continue;
			groups.flash.addLayer(
				L.marker([lat, lng], {
					icon: ringIcon("flash"),
					interactive: false,
					zIndexOffset: -900,
				})
			);
		}
	}, [features, flashUids, groups]);

	return null;
}

export interface AlertsGeoMapProps {
	drill: Drill;
	/** Breadcrumb navigation (climb back up). */
	onNavigate: (drill: Drill) => void;
	/** A polygon click: drill into it, or list its signals at subcounty level. */
	onAreaClick: (f: GeoFeature) => void;
	/** The current level's features and the counts to shade them by. */
	features: GeoFeature[];
	counts: Map<string, number>;
	scaleMax: number;
	colorMode: ColorMode;
	onColorModeChange: (mode: ColorMode) => void;
	trends: Map<string, Trend> | null;
	trendText: TrendText;
	/** Legend headline for the change colouring, e.g. "vs previous 30 days". */
	changeLabel: string;
	/** Extra legend line, e.g. the timeline frame being shown. */
	legendNote?: string | null;
	focusKey: string;
	focusBounds: L.LatLngBoundsExpression | null;
	highlightUid: string | null;
	flashUids: ReadonlySet<string>;
	/** Signals in the open district not placed on any subcounty polygon. */
	unassigned: number;
	onUnassignedClick?: () => void;
	/** Small busy pill, e.g. "Loading subcounties…". */
	statusText?: string | null;
	/** For the locator inset (shown once drilled in). */
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	onLocatorRegionClick: (f: GeoFeature) => void;
	/** Rendered as a Leaflet control under the zoom buttons. */
	toolbar?: React.ReactNode;
	/** Rendered under the map, inside its frame (the timeline bar). */
	footer?: React.ReactNode;
	onMapReady?: (map: L.Map | null) => void;
	/** The element an image export captures (the map without its footer). */
	captureRef?: React.Ref<HTMLDivElement>;
}

export function AlertsGeoMap({
	drill,
	onNavigate,
	onAreaClick,
	features,
	counts,
	scaleMax,
	colorMode,
	onColorModeChange,
	trends,
	trendText,
	changeLabel,
	legendNote,
	focusKey,
	focusBounds,
	highlightUid,
	flashUids,
	unassigned,
	onUnassignedClick,
	statusText,
	regions,
	districts,
	onLocatorRegionClick,
	toolbar,
	footer,
	onMapReady,
	captureRef,
}: AlertsGeoMapProps) {
	// Shared layer groups, created once, so both the layers control (toggle) and
	// AdminLayers (draw) reference the same Leaflet groups.
	const groupsRef = useRef<MapGroups | null>(null);
	if (!groupsRef.current) {
		groupsRef.current = {
			boundary: L.layerGroup(),
			pills: L.layerGroup(),
			hotspots: L.layerGroup(),
			names: L.layerGroup(),
			flash: L.layerGroup(),
		};
	}
	const [viewport, setViewport] = useState<[number, number, number, number] | null>(null);

	const scale = makeScale(scaleMax);
	const levelLabel =
		drill.level === "region"
			? "Regions"
			: drill.level === "district"
				? "Districts"
				: "Subcounties";

	// `isolate` traps Leaflet's internal z-indexes (panes/controls reach 1000)
	// in their own stacking context, so portalled UI like the date-range
	// dropdown renders above the map instead of behind it.
	return (
		<div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white isolate">
			<style>{MAP_CSS}</style>
			<div ref={captureRef} className="relative min-h-0 flex-1">
				<MapContainer
					center={UGANDA_CENTER}
					zoom={7}
					zoomSnap={0.5}
					scrollWheelZoom
					className="h-full w-full"
					style={{ background: "#f8fafc" }}
				>
					<LayersControl groups={groupsRef.current} />
					<MapInstanceBridge onMap={onMapReady} onViewport={setViewport} />
					{toolbar && (
						<MapControlPortal position="topleft" className="leaflet-bar sm-toolbar">
							{toolbar}
						</MapControlPortal>
					)}
					<AdminLayers
						features={features}
						counts={counts}
						scaleMax={scaleMax}
						colorMode={colorMode}
						trends={trends}
						trendText={trendText}
						drillable={drill.level !== "subcounty"}
						focusKey={focusKey}
						focusBounds={focusBounds}
						groups={groupsRef.current}
						highlightUid={highlightUid}
						flashUids={flashUids}
						onDrill={onAreaClick}
					/>
				</MapContainer>

				<MapBreadcrumb drill={drill} setDrill={onNavigate} count={features.length} />

				<MapLegend
					bins={scale.bins}
					level={levelLabel}
					mode={colorMode}
					onModeChange={onColorModeChange}
					changeLabel={changeLabel}
					note={legendNote}
					changeAvailable={trends !== null}
				/>

				{drill.level !== "region" && regions && (
					<MapLocatorInset
						regions={regions}
						districts={districts}
						drill={drill}
						viewport={viewport}
						onRegionClick={onLocatorRegionClick}
					/>
				)}

				{drill.level === "subcounty" && unassigned > 0 && (
					<button
						type="button"
						onClick={onUnassignedClick}
						data-export-ignore
						className="absolute bottom-3 left-1/2 z-[1000] flex max-w-[70%] -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/95 px-2.5 py-1.5 text-[11px] text-amber-900 shadow-md transition-colors hover:bg-amber-100"
						title="List these signals"
					>
						<Info className="h-3.5 w-3.5 shrink-0" />
						<span>
							<strong>{unassigned.toLocaleString()}</strong> signal
							{unassigned === 1 ? "" : "s"} in {drill.district.name} not mapped to
							a subcounty — click to list
						</span>
					</button>
				)}

				{statusText && (
					<div
						data-export-ignore
						className="pointer-events-none absolute right-[60px] top-3 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow"
					>
						{statusText}
					</div>
				)}
			</div>
			{footer}
		</div>
	);
}

/** Region › District trail; click a crumb to climb back up a level. */
function MapBreadcrumb({
	drill,
	setDrill,
	count,
}: {
	drill: Drill;
	setDrill: (d: Drill) => void;
	count: number;
}) {
	const region = drill.level !== "region" ? drill.region : null;
	const district = drill.level === "subcounty" ? drill.district : null;

	const childLabel =
		drill.level === "region"
			? `${count} region${count === 1 ? "" : "s"}`
			: drill.level === "district"
				? `${count} district${count === 1 ? "" : "s"}`
				: `${count} subcount${count === 1 ? "y" : "ies"}`;

	const crumb = "flex items-center gap-1 max-w-[40vw] truncate";
	const link =
		"font-medium text-gray-700 hover:text-uganda-red hover:underline";

	return (
		<div className="absolute left-[52px] top-3 z-[1000] flex max-w-[calc(100%-4rem)] items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-xs shadow-md">
			<button
				type="button"
				className={`${crumb} ${region ? link : "font-semibold text-gray-900"}`}
				onClick={() => region && setDrill({ level: "region" })}
				disabled={!region}
			>
				<Home className="h-3.5 w-3.5 shrink-0" />
				Uganda
			</button>

			{region && (
				<>
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
					<button
						type="button"
						className={`${crumb} ${district ? link : "font-semibold text-gray-900"}`}
						onClick={() =>
							district && setDrill({ level: "district", region })
						}
						disabled={!district}
						title={region.name}
					>
						<span className="truncate">{region.name}</span>
					</button>
				</>
			)}

			{district && (
				<>
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
					<span
						className={`${crumb} font-semibold text-gray-900`}
						title={district.name}
					>
						<span className="truncate">{district.name}</span>
					</span>
				</>
			)}

			<span className="ml-1 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
				{childLabel}
			</span>
		</div>
	);
}

function MapLegend({
	bins,
	level,
	mode,
	onModeChange,
	changeLabel,
	note,
	changeAvailable,
}: {
	bins: LegendBin[];
	level: string;
	mode: ColorMode;
	onModeChange: (mode: ColorMode) => void;
	changeLabel: string;
	note?: string | null;
	changeAvailable: boolean;
}) {
	const tab = (value: ColorMode, label: string, disabled = false) => (
		<button
			type="button"
			disabled={disabled}
			onClick={() => onModeChange(value)}
			aria-pressed={mode === value}
			data-export-ignore
			className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 ${
				mode === value
					? "bg-gray-800 text-white"
					: "text-gray-600 hover:bg-gray-100"
			}`}
			title={
				value === "change"
					? `Shade areas by their change ${changeLabel}`
					: "Shade areas by signal count"
			}
		>
			{label}
		</button>
	);
	return (
		<div className="absolute bottom-3 left-3 z-[1000] max-w-[200px] rounded-md bg-white/95 px-2.5 py-2 text-[11px] shadow-md">
			<div className="mb-1 whitespace-nowrap font-semibold text-gray-700">
				{mode === "count" ? "Signals" : "Change"} · {level}
			</div>
			{note && <div className="mb-1 text-[10px] text-gray-500">{note}</div>}
			{mode === "count" ? (
				<div className="space-y-0.5">
					{bins.map((b, i) => (
						<div key={`${i}-${b.label}`} className="flex items-center gap-1.5">
							<span
								className="inline-block h-3 w-3 rounded-sm border border-black/10"
								style={{ background: b.color }}
							/>
							<span className="text-gray-600">{b.label}</span>
						</div>
					))}
				</div>
			) : (
				<div className="space-y-0.5">
					<div className="mb-0.5 text-[10px] text-gray-500">{changeLabel}</div>
					{CHANGE_LEGEND.map((b) => (
						<div key={b.cls} className="flex items-center gap-1.5">
							<span
								className="inline-block h-3 w-3 rounded-sm border border-black/10"
								style={{ background: CHANGE_COLORS[b.cls] }}
							/>
							<span className="text-gray-600">{b.label}</span>
						</div>
					))}
					<div className="flex items-center gap-1.5">
						<span
							className="inline-block h-3 w-3 rounded-sm border border-black/10"
							style={{ background: ZERO_COLOR }}
						/>
						<span className="text-gray-600">No signals either side</span>
					</div>
				</div>
			)}
			<div className="mt-1.5 flex gap-0.5 border-t border-gray-100 pt-1.5" data-export-ignore>
				{tab("count", "Count")}
				{tab("change", "Change", !changeAvailable)}
			</div>
		</div>
	);
}
