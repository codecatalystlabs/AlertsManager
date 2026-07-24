"use client";

import "leaflet/dist/leaflet.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import { ChevronRight, Home, Info } from "lucide-react";

import {
	fetchGeoSubcounties,
	type GeoFeature,
	type GeoFeatureCollection,
	type GeoQuery,
} from "@/lib/fetch-geo";
import {
	SubcountyAlertsDialog,
	type SubcountyAlertsTarget,
} from "@/components/map/subcounty-alerts-dialog";

const UGANDA_CENTER: [number, number] = [1.3733, 32.2903];

type Level = "region" | "district" | "subcounty";

/** A drill target carried in the breadcrumb (own UID + bbox to zoom to). */
interface AreaRef {
	uid: string;
	name: string;
	bbox: [number, number, number, number];
}

type Drill =
	| { level: "region" }
	| { level: "district"; region: AreaRef }
	| { level: "subcounty"; region: AreaRef; district: AreaRef };

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

/** A count badge, placed at the centroid of each area. Click falls through to
 * the polygon underneath (pointer-events:none), so clicking the count drills. */
function pillIcon(count: number): L.DivIcon {
	const badge = count >= 100 ? "#a50f15" : count >= 25 ? "#de2d26" : "#fb6a4a";
	const html = `<div style="position:absolute;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;background:${badge};color:#fff;border:1px solid rgba(0,0,0,.18);border-radius:9999px;padding:1px 8px;box-shadow:0 1px 4px rgba(0,0,0,.3);font-size:11px;font-weight:700">${count.toLocaleString()}</div>`;
	return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

/** bbox [minLng,minLat,maxLng,maxLat] → Leaflet [[s,w],[n,e]] bounds. */
function bboxToBounds(
	bbox: [number, number, number, number]
): L.LatLngBoundsExpression {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	return [
		[minLat, minLng],
		[maxLat, maxLng],
	];
}

function featuresBounds(
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
 * shared with AdminLayers so the user can show/hide them.
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
	features: GeoFeature[];
	maxCount: number;
	/** Whether a click descends a level (region/district) or lists alerts (subcounty). */
	drillable: boolean;
	/** Identity of the current drill view; bumps trigger a fitBounds. */
	focusKey: string;
	focusBounds: L.LatLngBoundsExpression | null;
	boundary: L.LayerGroup;
	pills: L.LayerGroup;
	onDrill: (f: GeoFeature) => void;
}

/**
 * Draws the features of the current drill level imperatively into the shared
 * boundary/label groups, and binds a click on each polygon: on region/district
 * level the click descends into the area, on subcounty level it opens the list
 * of alerts behind the count. Fits the map to focusBounds whenever the drill
 * view changes — so opening a region frames just that region's districts.
 */
function AdminLayers({
	features,
	maxCount,
	drillable,
	focusKey,
	focusBounds,
	boundary,
	pills,
	onDrill,
}: AdminLayersProps) {
	const map = useMap();
	// Keep the latest onDrill without forcing a redraw when only it changes.
	const onDrillRef = useRef(onDrill);
	onDrillRef.current = onDrill;
	// Tracks which drill view has been framed, so we fit exactly once per view.
	const fittedKey = useRef<string | null>(null);

	// Re-fit when the drill view changes (or its bounds first become available).
	useEffect(() => {
		if (!focusBounds) return;
		if (fittedKey.current === focusKey) return;
		map.fitBounds(focusBounds, { padding: [16, 16] });
		fittedKey.current = focusKey;
	}, [focusKey, focusBounds, map]);

	// Redraw whenever the feature set / level changes.
	useEffect(() => {
		const scale = makeScale(maxCount);
		boundary.clearLayers();
		pills.clearLayers();

		for (const f of features) {
			const count = f.properties.count;
			// Zero-alert areas stay near-transparent so the chosen base skin
			// (satellite/dark/etc.) shows through instead of a flat grey wash;
			// areas with alerts keep a translucent shade you can still see the map under.
			const base: L.PathOptions = {
				fillColor: count > 0 ? scale.colorFor(count) : ZERO_COLOR,
				fillOpacity: count > 0 ? 0.62 : 0.08,
				color: "#475569",
				weight: count > 0 ? 1 : 0.8,
				opacity: 0.85,
			};
			if (f.geometry) {
				const poly = L.geoJSON(f.geometry as any, { style: () => base });
				const hint = drillable
					? `<br/><span style="opacity:.7">click to drill in</span>`
					: `<br/><span style="opacity:.7">click to list signals</span>`;
				poly.bindTooltip(
					`<strong>${escapeHtml(f.properties.name)}</strong><br/>${count.toLocaleString()} signal${count === 1 ? "" : "s"}${hint}`,
					{ sticky: true }
				);
				poly.on("mouseover", () =>
					poly.setStyle({
						weight: 2.5,
						color: "#0f172a",
						opacity: 1,
						fillOpacity: count > 0 ? 0.72 : 0.18,
					})
				);
				poly.on("mouseout", () => poly.setStyle(base));
				// Clickable at every level: region/district clicks drill in,
				// subcounty clicks open the list of signals behind the count.
				poly.on("click", () => onDrillRef.current(f));
				boundary.addLayer(poly);
				// Pointer cursor on the rendered SVG paths (available after add).
				poly.eachLayer((l) => {
					const el = (
						l as unknown as { getElement?: () => Element | null }
					).getElement?.();
					if (el) (el as HTMLElement | SVGElement).style.cursor = "pointer";
				});
			}
			// Only badge areas that actually have alerts — "0" pills everywhere were
			// pure clutter and hid the base skin.
			const [lng, lat] = f.properties.centroid;
			if (count > 0 && (lat || lng)) {
				pills.addLayer(
					L.marker([lat, lng], {
						icon: pillIcon(count),
						interactive: false,
					})
				);
			}
		}
	}, [features, maxCount, drillable, boundary, pills]);

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
	const [drill, setDrill] = useState<Drill>({ level: "region" });
	// The subcounty (or unassigned bucket) whose signal list is open, if any.
	const [listTarget, setListTarget] = useState<SubcountyAlertsTarget | null>(
		null
	);

	// Subcounties aren't loaded up front — fetch the open district's on demand.
	const openDistrictUid =
		drill.level === "subcounty" ? drill.district.uid : null;
	const subSWR = useSWR<GeoFeatureCollection>(
		openDistrictUid
			? [
					"geo-subcounties",
					openDistrictUid,
					query.fromDate,
					query.toDate,
					[...(query.responses ?? [])].sort().join(","),
					[...(query.outcomes ?? [])].sort().join(","),
				]
			: null,
		() => fetchGeoSubcounties(openDistrictUid as string, query),
		{ revalidateOnFocus: false }
	);

	// The features + colour scale for the level currently shown.
	const { features, maxCount } = useMemo(() => {
		if (drill.level === "region") {
			return {
				features: regions?.features ?? [],
				maxCount: regions?.maxCount ?? 0,
			};
		}
		if (drill.level === "district") {
			const feats = (districts?.features ?? []).filter(
				(f) => f.properties.regionUid === drill.region.uid
			);
			const max = feats.reduce((m, f) => Math.max(m, f.properties.count), 0);
			return { features: feats, maxCount: max };
		}
		return {
			features: subSWR.data?.features ?? [],
			maxCount: subSWR.data?.maxCount ?? 0,
		};
	}, [drill, regions, districts, subSWR.data]);

	// What the map should frame for this drill view.
	const focus = useMemo((): {
		key: string;
		bounds: L.LatLngBoundsExpression | null;
	} => {
		if (drill.level === "region") {
			return {
				key: "region",
				bounds: regions ? featuresBounds(regions.features) : null,
			};
		}
		if (drill.level === "district") {
			return { key: `d:${drill.region.uid}`, bounds: bboxToBounds(drill.region.bbox) };
		}
		return {
			key: `s:${drill.district.uid}`,
			bounds: bboxToBounds(drill.district.bbox),
		};
	}, [drill, regions]);

	function handleDrill(f: GeoFeature) {
		const ref: AreaRef = {
			uid: f.properties.uid,
			name: f.properties.name,
			bbox: f.properties.bbox,
		};
		if (drill.level === "region") {
			setDrill({ level: "district", region: ref });
		} else if (drill.level === "district") {
			setDrill({ level: "subcounty", region: drill.region, district: ref });
		} else {
			// Subcounty level: open the breakdown/list of the signals behind
			// this subcounty's count.
			setListTarget({
				districtUid: drill.district.uid,
				districtName: drill.district.name,
				subcounty: f.properties.name,
			});
		}
	}

	// Shared layer groups, created once, so both the layers control (toggle) and
	// AdminLayers (draw) reference the same Leaflet groups.
	const boundaryRef = useRef<L.LayerGroup | null>(null);
	const pillRef = useRef<L.LayerGroup | null>(null);
	if (!boundaryRef.current) boundaryRef.current = L.layerGroup();
	if (!pillRef.current) pillRef.current = L.layerGroup();

	const scale = makeScale(maxCount);
	const levelLabel =
		drill.level === "region"
			? "Regions"
			: drill.level === "district"
				? "Districts"
				: "Subcounties";
	const subLoading = drill.level === "subcounty" && subSWR.isLoading;
	// Signals in the drilled district that can't be placed on a subcounty polygon
	// (blank/unmatched subcounty). Surfaced so the total doesn't appear to vanish
	// on drill-in — ~43% of signals carry no subcounty.
	const unassigned =
		drill.level === "subcounty" ? (subSWR.data?.unassigned ?? 0) : 0;

	// `isolate` traps Leaflet's internal z-indexes (panes/controls reach 1000)
	// in their own stacking context, so portalled UI like the date-range
	// dropdown renders above the map instead of behind it.
	return (
		<div className="relative h-full w-full overflow-hidden rounded-md border border-gray-200 isolate">
			<MapContainer
				center={UGANDA_CENTER}
				zoom={7}
				zoomSnap={0.5}
				scrollWheelZoom
				className="h-full w-full"
				style={{ background: "#f8fafc" }}
			>
				<LayersControl boundary={boundaryRef.current} pills={pillRef.current} />
				<AdminLayers
					features={features}
					maxCount={maxCount}
					drillable={drill.level !== "subcounty"}
					focusKey={focus.key}
					focusBounds={focus.bounds}
					boundary={boundaryRef.current}
					pills={pillRef.current}
					onDrill={handleDrill}
				/>
			</MapContainer>

			<MapBreadcrumb drill={drill} setDrill={setDrill} count={features.length} />

			<MapLegend bins={scale.bins} level={levelLabel} />

			{drill.level === "subcounty" && unassigned > 0 && !subLoading && (
				<button
					type="button"
					onClick={() =>
						drill.level === "subcounty" &&
						setListTarget({
							districtUid: drill.district.uid,
							districtName: drill.district.name,
							unassigned: true,
						})
					}
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

			{(validating || subLoading) && (
				<div className="pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow">
					{subLoading ? "Loading subcounties…" : "Updating…"}
				</div>
			)}

			<SubcountyAlertsDialog
				target={listTarget}
				query={query}
				onClose={() => setListTarget(null)}
			/>
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

function MapLegend({ bins, level }: { bins: LegendBin[]; level: string }) {
	return (
		<div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/95 px-2.5 py-2 text-[11px] shadow-md">
			<div className="mb-1 font-semibold text-gray-700">Signals · {level}</div>
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
