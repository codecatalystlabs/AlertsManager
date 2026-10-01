"use client";

import { useMemo } from "react";

import type { GeoFeature, GeoFeatureCollection, GeoGeometry } from "@/lib/fetch-geo";
import type { Drill } from "@/components/map/alerts-geo-map";

const WIDTH = 124;

interface Projection {
	x: (lng: number) => number;
	y: (lat: number) => number;
	height: number;
}

/** Equirectangular fit of [minLng,minLat,maxLng,maxLat] into WIDTH px (Uganda straddles the equator, so no cos correction is needed). */
function fitProjection(bbox: [number, number, number, number]): Projection {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	const pad = 4;
	const k = (WIDTH - pad * 2) / Math.max(maxLng - minLng, 1e-6);
	return {
		x: (lng) => pad + (lng - minLng) * k,
		y: (lat) => pad + (maxLat - lat) * k,
		height: pad * 2 + (maxLat - minLat) * k,
	};
}

function geometryPath(geometry: GeoGeometry | null, p: Projection): string {
	if (!geometry) return "";
	const polygons =
		geometry.type === "Polygon"
			? [geometry.coordinates as number[][][]]
			: (geometry.coordinates as number[][][][]);
	let d = "";
	for (const poly of polygons) {
		for (const ring of poly) {
			ring.forEach(([lng, lat], i) => {
				d += `${i === 0 ? "M" : "L"}${p.x(lng).toFixed(1)} ${p.y(lat).toFixed(1)}`;
			});
			d += "Z";
		}
	}
	return d;
}

/**
 * A small "you are here" map of Uganda shown once the user has drilled in:
 * every region (lightly shaded by volume), the open region and district
 * outlined, and the main map's current viewport as a dashed box. Clicking a
 * region jumps the main map to it.
 */
export function MapLocatorInset({
	regions,
	districts,
	drill,
	viewport,
	onRegionClick,
}: {
	regions: GeoFeatureCollection;
	districts: GeoFeatureCollection | undefined;
	drill: Drill;
	viewport: [number, number, number, number] | null;
	onRegionClick: (f: GeoFeature) => void;
}) {
	const { projection, paths } = useMemo(() => {
		let minLng = Infinity,
			minLat = Infinity,
			maxLng = -Infinity,
			maxLat = -Infinity;
		for (const f of regions.features) {
			const [a, b, c, d] = f.properties.bbox;
			minLng = Math.min(minLng, a);
			minLat = Math.min(minLat, b);
			maxLng = Math.max(maxLng, c);
			maxLat = Math.max(maxLat, d);
		}
		const projection = fitProjection([minLng, minLat, maxLng, maxLat]);
		const max = regions.maxCount || 1;
		const paths = regions.features.map((f) => ({
			feature: f,
			d: geometryPath(f.geometry, projection),
			// Light, single-hue volume cue — the inset orients, it doesn't compete.
			opacity: f.properties.count > 0 ? 0.15 + 0.45 * (f.properties.count / max) : 0,
		}));
		return { projection, paths };
	}, [regions]);

	const regionUid = drill.level !== "region" ? drill.region.uid : null;
	const districtUid = drill.level === "subcounty" ? drill.district.uid : null;
	const districtPath = useMemo(() => {
		if (!districtUid || !districts) return "";
		const f = districts.features.find((x) => x.properties.uid === districtUid);
		return f ? geometryPath(f.geometry, projection) : "";
	}, [districtUid, districts, projection]);

	if (!Number.isFinite(projection.height)) return null;

	let box: { x: number; y: number; w: number; h: number } | null = null;
	if (viewport) {
		const [w, s, e, n] = viewport;
		const x1 = Math.max(0, projection.x(w));
		const x2 = Math.min(WIDTH, projection.x(e));
		const y1 = Math.max(0, projection.y(n));
		const y2 = Math.min(projection.height, projection.y(s));
		if (x2 > x1 && y2 > y1) box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
	}

	return (
		<div
			className="absolute right-3 top-[62px] z-[1000] rounded-md bg-white/95 p-1 shadow-md"
			title="Where you are — click a region to jump to it"
		>
			<svg
				width={WIDTH}
				height={projection.height}
				viewBox={`0 0 ${WIDTH} ${projection.height}`}
				role="img"
				aria-label="Locator map of Uganda"
			>
				{paths.map(({ feature, d, opacity }) => {
					const active = feature.properties.uid === regionUid;
					return (
						<path
							key={feature.properties.uid}
							d={d}
							fill={active ? "#fecaca" : `rgba(222,45,38,${opacity})`}
							stroke={active ? "#b91c1c" : "#94a3b8"}
							strokeWidth={active ? 1.2 : 0.5}
							className="cursor-pointer transition-opacity hover:opacity-70"
							onClick={() => onRegionClick(feature)}
						>
							<title>
								{feature.properties.name}: {feature.properties.count.toLocaleString()} signals
							</title>
						</path>
					);
				})}
				{/* The open region drawn last so its outline is never under a neighbour. */}
				{paths
					.filter((p) => p.feature.properties.uid === regionUid)
					.map((p) => (
						<path
							key="active-outline"
							d={p.d}
							fill="none"
							stroke="#b91c1c"
							strokeWidth={1.2}
							pointerEvents="none"
						/>
					))}
				{districtPath && (
					<path d={districtPath} fill="#b91c1c" fillOpacity={0.55} stroke="#7f1d1d" strokeWidth={0.8} pointerEvents="none" />
				)}
				{box && (
					<rect
						x={box.x}
						y={box.y}
						width={box.w}
						height={box.h}
						fill="none"
						stroke="#0f172a"
						strokeWidth={1}
						strokeDasharray="3 2"
						pointerEvents="none"
					/>
				)}
			</svg>
		</div>
	);
}
