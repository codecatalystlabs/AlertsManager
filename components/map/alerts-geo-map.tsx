"use client";

import "leaflet/dist/leaflet.css";

import React, { useEffect, useRef, useState } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";

import {
	fetchGeoSubcounties,
	type GeoFeature,
	type GeoFeatureCollection,
	type GeoQuery,
} from "@/lib/fetch-geo";

const UGANDA_CENTER: [number, number] = [1.3733, 32.2903];

// Zoom thresholds that swap the visible admin level. Below DISTRICT_ZOOM the map
// shows regions (one pill each); from DISTRICT_ZOOM districts; from
// SUBCOUNTY_ZOOM subcounties (fetched per visible district on demand).
const DISTRICT_ZOOM = 8;
const SUBCOUNTY_ZOOM = 10;

type Level = "region" | "district" | "subcounty";

// Sequential reds for the choropleth fill; 0 alerts → neutral grey.
const RAMP = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
const ZERO_COLOR = "#e9edf0";

interface LegendBin {
	color: string;
	label: string;
}

/** Colour scale with strictly-increasing, unique bucket bounds (no "2–1" dupes). */
function makeScale(maxCount: number): {
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

/** A named pill icon (label + count badge), used at the centroid of each area. */
function pillIcon(label: string, count: number): L.DivIcon {
	const badge = count >= 100 ? "#a50f15" : count >= 25 ? "#de2d26" : "#fb6a4a";
	const html = `<div style="position:absolute;transform:translate(-50%,-50%);white-space:nowrap;display:flex;align-items:center;gap:6px;background:#ffffff;border:1px solid rgba(0,0,0,.18);border-radius:9999px;padding:2px 4px 2px 10px;box-shadow:0 1px 4px rgba(0,0,0,.3);font-size:11px;font-weight:600;color:#1f2937">
		<span style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label)}</span>
		<span style="background:${badge};color:#fff;border-radius:9999px;padding:1px 7px;font-weight:700">${count.toLocaleString()}</span>
	</div>`;
	return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

/** Does an area bbox [minLng,minLat,maxLng,maxLat] intersect the map view? */
function bboxIntersects(
	bbox: [number, number, number, number],
	b: L.LatLngBounds
): boolean {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	return (
		maxLng >= b.getWest() &&
		minLng <= b.getEast() &&
		maxLat >= b.getSouth() &&
		minLat <= b.getNorth()
	);
}

const CARTO_ATTR =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const OSM_ATTR =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_IMAGERY_ATTR =
	"Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const ESRI_TOPO_ATTR = "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ";

/**
 * Adds a base-map switcher + overlay toggles (Leaflet's native layers control).
 * The default base (Light) is added on mount; the boundary/label groups are
 * shared with AdminLayers so the user can show/hide them. Imperative so the
 * native control and the imperatively-drawn layers stay in one place.
 */
function LayersControl({
	boundary,
	pills,
}: {
	boundary: L.LayerGroup;
	pills: L.LayerGroup;
}) {
	const map = useMap();
	useEffect(() => {
		const bases: Record<string, L.TileLayer> = {
			Light: L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
				{ subdomains: "abcd", maxZoom: 19, attribution: CARTO_ATTR }
			),
			Streets: L.tileLayer(
				"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
				{ maxZoom: 19, attribution: OSM_ATTR }
			),
			Satellite: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				{ maxZoom: 19, attribution: ESRI_IMAGERY_ATTR }
			),
			Terrain: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
				{ maxZoom: 19, attribution: ESRI_TOPO_ATTR }
			),
			Dark: L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
				{ subdomains: "abcd", maxZoom: 19, attribution: CARTO_ATTR }
			),
		};

		bases.Light.addTo(map); // default base
		boundary.addTo(map); // overlays start visible
		pills.addTo(map);

		const overlays: Record<string, L.Layer> = {
			"Boundaries & shading": boundary,
			Labels: pills,
		};

		const control = L.control
			.layers(bases, overlays, { position: "topright", collapsed: true })
			.addTo(map);

		return () => {
			control.remove();
			for (const layer of Object.values(bases)) map.removeLayer(layer);
		};
	}, [map, boundary, pills]);

	return null;
}

interface AdminLayersProps {
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	query: GeoQuery;
	boundary: L.LayerGroup;
	pills: L.LayerGroup;
	onView: (v: { level: Level; maxCount: number }) => void;
}

/**
 * Renders the admin level appropriate to the current zoom, imperatively into the
 * shared boundary/label layer groups — so we can lazy-load subcounties per
 * visible district and force exactly one pill per region at the overview.
 */
function AdminLayers({
	regions,
	districts,
	query,
	boundary,
	pills,
	onView,
}: AdminLayersProps) {
	const map = useMap();
	const subCache = useRef<Map<string, GeoFeature[]>>(new Map());
	const generation = useRef(0);
	const didFit = useRef(false);
	// Latest props for the (stable) event handlers.
	const propsRef = useRef({ regions, districts, query, onView });
	propsRef.current = { regions, districts, query, onView };

	useEffect(() => {
		const handler = () => {
			void redraw();
		};
		map.on("zoomend", handler);
		map.on("moveend", handler);
		void redraw();
		return () => {
			map.off("zoomend", handler);
			map.off("moveend", handler);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map]);

	// Date filter changed → counts are stale, drop the subcounty cache and redraw.
	useEffect(() => {
		subCache.current.clear();
		void redraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query.fromDate, query.toDate]);

	// Region/district data arrived (or changed) → frame Uganda once, then redraw.
	useEffect(() => {
		if (!didFit.current && regions && regions.features.length) {
			const bounds = featuresBounds(regions.features);
			if (bounds) {
				map.fitBounds(bounds, { padding: [20, 20] });
				didFit.current = true;
			}
		}
		void redraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [regions, districts]);

	function featuresBounds(features: GeoFeature[]): L.LatLngBoundsExpression | null {
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

	function drawFeature(f: GeoFeature, colorFor: (n: number) => string) {
		const base: L.PathOptions = {
			fillColor: colorFor(f.properties.count),
			fillOpacity: 0.45,
			color: "#64748b",
			weight: 1,
		};
		if (f.geometry) {
			const poly = L.geoJSON(f.geometry as any, { style: () => base });
			poly.bindTooltip(
				`<strong>${escapeHtml(f.properties.name)}</strong><br/>${f.properties.count.toLocaleString()} alert${f.properties.count === 1 ? "" : "s"}`,
				{ sticky: true }
			);
			poly.on("mouseover", () =>
				poly.setStyle({ weight: 2.5, color: "#111827", fillOpacity: 0.62 })
			);
			poly.on("mouseout", () => poly.setStyle(base));
			boundary.addLayer(poly);
		}
		const [lng, lat] = f.properties.centroid;
		if (lat || lng) {
			pills.addLayer(
				L.marker([lat, lng], {
					icon: pillIcon(f.properties.name, f.properties.count),
					interactive: false,
				})
			);
		}
	}

	async function redraw() {
		const my = ++generation.current;
		const { regions, districts, query, onView } = propsRef.current;
		const zoom = map.getZoom();
		const level: Level =
			zoom >= SUBCOUNTY_ZOOM
				? "subcounty"
				: zoom >= DISTRICT_ZOOM
					? "district"
					: "region";

		// Region overview: always all regions, one pill each.
		if (level === "region") {
			const scale = makeScale(regions?.maxCount ?? 0);
			boundary.clearLayers();
			pills.clearLayers();
			for (const f of regions?.features ?? []) drawFeature(f, scale.colorFor);
			onView({ level, maxCount: regions?.maxCount ?? 0 });
			return;
		}

		const view = map.getBounds();

		if (level === "district") {
			const scale = makeScale(districts?.maxCount ?? 0);
			const visible = (districts?.features ?? []).filter((f) =>
				bboxIntersects(f.properties.bbox, view)
			);
			boundary.clearLayers();
			pills.clearLayers();
			for (const f of visible) drawFeature(f, scale.colorFor);
			onView({ level, maxCount: districts?.maxCount ?? 0 });
			return;
		}

		// Subcounty: fetch (once) the subcounties of each visible district.
		const visibleDistricts = (districts?.features ?? []).filter((f) =>
			bboxIntersects(f.properties.bbox, view)
		);
		await Promise.all(
			visibleDistricts.map(async (d) => {
				const uid = d.properties.uid;
				if (subCache.current.has(uid)) return;
				try {
					const fc = await fetchGeoSubcounties(uid, query);
					subCache.current.set(uid, fc.features);
				} catch {
					subCache.current.set(uid, []);
				}
			})
		);
		// A newer redraw started (zoom/pan/date) while we awaited — abandon this one.
		if (my !== generation.current) return;
		if (map.getZoom() < SUBCOUNTY_ZOOM) return;

		let maxCount = 1;
		const feats: GeoFeature[] = [];
		for (const d of visibleDistricts) {
			for (const f of subCache.current.get(d.properties.uid) ?? []) {
				feats.push(f);
				if (f.properties.count > maxCount) maxCount = f.properties.count;
			}
		}
		const scale = makeScale(maxCount);
		boundary.clearLayers();
		pills.clearLayers();
		// Faint parent-district outlines for context.
		for (const d of visibleDistricts) {
			if (!d.geometry) continue;
			boundary.addLayer(
				L.geoJSON(d.geometry as any, {
					interactive: false,
					style: () => ({
						fill: false,
						color: "#475569",
						weight: 1.5,
						opacity: 0.5,
						dashArray: "4",
					}),
				})
			);
		}
		for (const f of feats) drawFeature(f, scale.colorFor);
		onView({ level, maxCount });
	}

	return null;
}

interface AlertsGeoMapProps {
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	query: GeoQuery;
	validating: boolean;
}

export function AlertsGeoMap({
	regions,
	districts,
	query,
	validating,
}: AlertsGeoMapProps) {
	const [view, setView] = useState<{ level: Level; maxCount: number }>({
		level: "region",
		maxCount: 0,
	});

	// Shared layer groups, created once, so both the layers control (toggle) and
	// AdminLayers (draw) reference the same Leaflet groups.
	const boundaryRef = useRef<L.LayerGroup | null>(null);
	const pillRef = useRef<L.LayerGroup | null>(null);
	if (!boundaryRef.current) boundaryRef.current = L.layerGroup();
	if (!pillRef.current) pillRef.current = L.layerGroup();

	const scale = makeScale(view.maxCount);
	const levelLabel =
		view.level === "region"
			? "Regions"
			: view.level === "district"
				? "Districts"
				: "Subcounties";

	// `isolate` traps Leaflet's internal z-indexes (panes/controls reach 1000)
	// in their own stacking context, so portalled UI like the date-range
	// dropdown renders above the map instead of behind it.
	return (
		<div className="relative h-full w-full overflow-hidden rounded-md border border-gray-200 isolate">
			<MapContainer
				center={UGANDA_CENTER}
				zoom={7}
				scrollWheelZoom
				className="h-full w-full"
				style={{ background: "#f8fafc" }}
			>
				<LayersControl boundary={boundaryRef.current} pills={pillRef.current} />
				<AdminLayers
					regions={regions}
					districts={districts}
					query={query}
					boundary={boundaryRef.current}
					pills={pillRef.current}
					onView={setView}
				/>
			</MapContainer>

			<div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md bg-white/90 px-2.5 py-1 text-xs shadow">
				<span className="font-semibold text-gray-800">{levelLabel}</span>
				<span className="ml-1 text-gray-500">· hover an area for its name · zoom to drill</span>
			</div>

			<MapLegend bins={scale.bins} level={levelLabel} />

			{validating && (
				<div className="pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow">
					Updating…
				</div>
			)}
		</div>
	);
}

function MapLegend({ bins, level }: { bins: LegendBin[]; level: string }) {
	return (
		<div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/95 px-2.5 py-2 text-[11px] shadow-md">
			<div className="mb-1 font-semibold text-gray-700">Alerts · {level}</div>
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
		</div>
	);
}
