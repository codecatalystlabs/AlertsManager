"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import hotToast from "react-hot-toast";
import {
	Camera,
	FileSpreadsheet,
	History,
	Keyboard,
	Link2,
	LocateFixed,
	Maximize2,
	Minimize2,
	Radio,
	Search,
} from "lucide-react";

import {
	AlertsGeoMap,
	bboxToBounds,
	featuresBounds,
	type AreaRef,
	type ColorMode,
	type Drill,
} from "@/components/map/alerts-geo-map";
import {
	AreaInsightsPanel,
	type InsightChildRow,
} from "@/components/map/area-insights-panel";
import { MapTimelineBar } from "@/components/map/map-timeline-bar";
import { MapSearchDialog, type MapSearchHit } from "@/components/map/map-search-dialog";
import { MapShortcutsDialog } from "@/components/map/map-shortcuts-dialog";
import {
	SubcountyAlertsDialog,
	type SubcountyAlertsTarget,
} from "@/components/map/subcounty-alerts-dialog";
import { AlertDetailsDialog } from "@/components/alert-details-dialog";
import {
	geoFilterKey,
	useGeoInsights,
	useGeoSubTimeline,
	useGeoSubcounties,
	useGeoTimeline,
	useGeoWindowCounts,
} from "@/hooks/use-geo-layers";
import type { GeoFeature, GeoFeatureCollection, GeoQuery } from "@/lib/fetch-geo";
import {
	classifyTrend,
	comparisonWindows,
	cumulative as runningTotal,
	describeFrame,
	frameCounts,
	previousFrameLabel,
	regionSeriesFrom,
	trendsFor,
	type Trend,
	type TrendText,
} from "@/lib/geo-map-analytics";
import {
	exportMapAreasToExcel,
	exportMapImage,
	mapExportFilename,
} from "@/lib/geo-map-export";
import type { Alert } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Live mode re-polls this often. */
export const LIVE_REFRESH_MS = 60_000;
/** How long a live "new signals" flash rings on the map. */
const FLASH_MS = 9_000;
/** Playback: one frame per second at 1×. */
const FRAME_MS = 1_000;

const EMPTY_SET: ReadonlySet<string> = new Set();

function refOf(f: GeoFeature): AreaRef {
	return { uid: f.properties.uid, name: f.properties.name, bbox: f.properties.bbox };
}

/** Mirrors the backend's CanonicalDistrict: "Gulu City" and "Gulu District" are one place. */
function canonicalDistrict(name: string): string {
	let s = name.trim().toLowerCase();
	if (s.endsWith(" district")) s = s.slice(0, -" district".length);
	if (s.endsWith(" city")) s = s.slice(0, -" city".length);
	return s.trim();
}

/**
 * uid → the uid of the polygon that carries its canonical district's count.
 * A City/District pair shares ONE count, which the server puts on the
 * "… District" polygon (choosePrimaries); opening the City member must still
 * read that count, trend and timeline.
 */
function districtPrimaries(features: GeoFeature[]): Map<string, string> {
	const isDistrict = (f: GeoFeature) => f.properties.name.toLowerCase().endsWith(" district");
	const best = new Map<string, GeoFeature>();
	for (const f of features) {
		const c = canonicalDistrict(f.properties.name);
		const cur = best.get(c);
		if (!cur || (isDistrict(f) && !isDistrict(cur))) best.set(c, f);
	}
	const out = new Map<string, string>();
	for (const f of features) {
		out.set(f.properties.uid, best.get(canonicalDistrict(f.properties.name))!.properties.uid);
	}
	return out;
}

/** Index of the last frame with any signal, or the last frame if none has one. */
function lastActiveFrame(values: number[] | null | undefined, n: number): number {
	if (values) for (let i = Math.min(values.length, n) - 1; i >= 0; i--) if (values[i] > 0) return i;
	return n - 1;
}

function frameValue(series: number[] | undefined, index: number, cumulative: boolean): number {
	if (!series || index < 0) return 0;
	if (!cumulative) return series[index] ?? 0;
	let sum = 0;
	for (let i = 0; i <= index && i < series.length; i++) sum += series[i] ?? 0;
	return sum;
}

export interface SignalsMapExplorerProps {
	query: GeoQuery;
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	/** True while the boundary layers for the CURRENT query have not arrived yet. */
	loading: boolean;
	validating: boolean;
	live: boolean;
	liveAvailable: boolean;
	onLiveChange: (live: boolean) => void;
	timelineOpen: boolean;
	onTimelineOpenChange: (open: boolean) => void;
	insightsOpen: boolean;
	onInsightsOpenChange: (open: boolean) => void;
	onToggleResponse: (value: string) => void;
	onToggleOutcome: (value: string) => void;
	/** Human-readable range + filters, for exports and the full-screen header. */
	rangeLabel: string;
	filterLabel: string;
}

/**
 * The Signals Map workspace: the drill-down choropleth plus everything around
 * it — trend comparison and hotspot rings, timeline playback, the area
 * insights panel, search, live updates, full screen, deep links, exports and
 * keyboard shortcuts. The map's look is unchanged; these are layered on.
 */
export function SignalsMapExplorer({
	query,
	regions,
	districts,
	loading,
	validating,
	live,
	liveAvailable,
	onLiveChange,
	timelineOpen,
	onTimelineOpenChange,
	insightsOpen,
	onInsightsOpenChange,
	onToggleResponse,
	onToggleOutcome,
	rangeLabel,
	filterLabel,
}: SignalsMapExplorerProps) {
	const [drill, setDrillState] = useState<Drill>({ level: "region" });
	const [listTarget, setListTarget] = useState<SubcountyAlertsTarget | null>(null);
	const [detailAlert, setDetailAlert] = useState<Alert | null>(null);
	const [colorMode, setColorMode] = useState<ColorMode>("count");
	const [highlightUid, setHighlightUid] = useState<string | null>(null);
	const [flashUids, setFlashUids] = useState<ReadonlySet<string>>(EMPTY_SET);
	const [searchOpen, setSearchOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [frame, setFrame] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState(1);
	const [cumulative, setCumulative] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [exporting, setExporting] = useState(false);
	const mapRef = useRef<L.Map | null>(null);
	const captureRef = useRef<HTMLDivElement>(null);

	const handleMapReady = useCallback((m: L.Map | null) => {
		mapRef.current = m;
	}, []);

	const setDrill = useCallback((next: Drill) => {
		setHighlightUid(null);
		setDrillState(next);
	}, []);

	// ── Data ────────────────────────────────────────────────────────────
	const refresh = { refreshInterval: live ? LIVE_REFRESH_MS : 0 };
	const openDistrictUid = drill.level === "subcounty" ? drill.district.uid : null;
	const subSWR = useGeoSubcounties(query, openDistrictUid, refresh);

	const cmp = useMemo(
		() => comparisonWindows(query.fromDate, query.toDate),
		[query.fromDate, query.toDate]
	);
	const prevCounts = useGeoWindowCounts(query, cmp.previous, openDistrictUid, refresh);
	const rollCounts = useGeoWindowCounts(
		query,
		cmp.mode === "rolling" ? cmp.current : null,
		openDistrictUid,
		refresh
	);

	const tlSWR = useGeoTimeline(query, timelineOpen || insightsOpen, refresh);
	const tl = tlSWR.data;
	const subTlSWR = useGeoSubTimeline(
		query,
		openDistrictUid,
		tl,
		timelineOpen && drill.level === "subcounty",
		refresh
	);

	const insightsArea =
		drill.level === "region"
			? {}
			: drill.level === "district"
				? { regionUid: drill.region.uid }
				: { districtUid: drill.district.uid };
	const insightsSWR = useGeoInsights(query, insightsArea, insightsOpen, refresh);
	const expectedInsightsUid =
		drill.level === "region" ? "" : drill.level === "district" ? drill.region.uid : drill.district.uid;
	// keepPreviousData would otherwise show the last area's breakdown under the new area's name.
	const insights =
		insightsSWR.data && insightsSWR.data.uid === expectedInsightsUid ? insightsSWR.data : undefined;

	// ── Timeline frames ─────────────────────────────────────────────────
	const frameCount = tl?.buckets.length ?? 0;
	const frameIdx = Math.min(frame, Math.max(0, frameCount - 1));
	const timelineActive = timelineOpen && frameCount > 0;

	// Opening the timeline (or loading a new window) lands on the latest frame
	// that has signals in the area on screen — an all-time window ends on
	// today's barely-begun month, which would open on an empty map — unless a
	// specific frame was asked for (a sparkline click).
	const pendingFrame = useRef<number | null>(null);
	const areaValuesRef = useRef<number[] | null>(null);
	useEffect(() => {
		if (!timelineOpen || !tl) return;
		const n = tl.buckets.length;
		const area = areaValuesRef.current;
		const latest = lastActiveFrame(area && area.some((v) => v > 0) ? area : tl.totals, n);
		setFrame(pendingFrame.current !== null ? Math.min(pendingFrame.current, n - 1) : latest);
		pendingFrame.current = null;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timelineOpen, tl?.from, tl?.to, tl?.granularity]);

	useEffect(() => {
		if (!timelineOpen) setPlaying(false);
	}, [timelineOpen]);

	useEffect(() => {
		if (!playing || !timelineActive) return;
		const id = setInterval(
			() => setFrame((i) => Math.min(i + 1, frameCount - 1)),
			FRAME_MS / speed
		);
		return () => clearInterval(id);
	}, [playing, speed, frameCount, timelineActive]);

	useEffect(() => {
		if (playing && frameIdx >= frameCount - 1) setPlaying(false);
	}, [playing, frameIdx, frameCount]);

	const regionSeries = useMemo(
		() => (tl && districts ? regionSeriesFrom(tl, districts.features) : null),
		[tl, districts]
	);
	const districtSeries = useMemo(
		() => (tl ? new Map(Object.entries(tl.series)) : null),
		[tl]
	);
	const subSeries = useMemo(
		() => (subTlSWR.data ? new Map(Object.entries(subTlSWR.data.series)) : null),
		[subTlSWR.data]
	);
	const levelSeries =
		drill.level === "region" ? regionSeries : drill.level === "district" ? districtSeries : subSeries;
	const frameReady = timelineActive && levelSeries !== null;

	// ── The level on screen ─────────────────────────────────────────────
	const levelFeatures = useMemo(() => {
		if (drill.level === "region") return regions?.features ?? [];
		if (drill.level === "district") {
			return (districts?.features ?? []).filter(
				(f) => f.properties.regionUid === drill.region.uid
			);
		}
		return subSWR.data?.features ?? [];
	}, [drill, regions, districts, subSWR.data]);

	const countByUid = useMemo(() => {
		const m = new Map<string, number>();
		for (const fc of [regions, districts, subSWR.data]) {
			for (const f of fc?.features ?? []) m.set(f.properties.uid, f.properties.count);
		}
		return m;
	}, [regions, districts, subSWR.data]);

	const primaryOf = useMemo(() => districtPrimaries(districts?.features ?? []), [districts]);

	const view = useMemo((): {
		counts: Map<string, number>;
		scaleMax: number;
		trends: Map<string, Trend> | null;
		trendText: TrendText;
		changeLabel: string;
	} => {
		const uids = levelFeatures.map((f) => f.properties.uid);
		if (frameReady && tl) {
			const { current, previous, scaleMax } = frameCounts(levelSeries!, uids, frameIdx, cumulative);
			return {
				counts: current,
				scaleMax,
				trends: frameIdx > 0 ? trendsFor(current, previous) : null,
				trendText: { current: null, vs: previousFrameLabel(tl.buckets, frameIdx) },
				changeLabel: `vs the previous ${tl.granularity}`,
			};
		}
		const counts = new Map(uids.map((u) => [u, countByUid.get(u) ?? 0]));
		let scaleMax = 0;
		for (const c of counts.values()) if (c > scaleMax) scaleMax = c;
		let trends: Map<string, Trend> | null = null;
		const prev = prevCounts.counts;
		const cur = cmp.mode === "range" ? counts : rollCounts.counts;
		if (prev && cur) {
			trends = trendsFor(
				new Map(uids.map((u) => [u, cur.get(u) ?? 0])),
				new Map(uids.map((u) => [u, prev.get(u) ?? 0]))
			);
		}
		return { counts, scaleMax, trends, trendText: cmp.text, changeLabel: cmp.label };
	}, [levelFeatures, frameReady, tl, levelSeries, frameIdx, cumulative, countByUid, prevCounts.counts, rollCounts.counts, cmp]);

	// The change colouring needs something to compare against.
	const effectiveColorMode: ColorMode = colorMode === "change" && view.trends ? "change" : "count";

	// ── The area the panel describes (country / region / district) ─────
	const area = useMemo(() => {
		const name =
			drill.level === "region" ? "Uganda" : drill.level === "district" ? drill.region.name : drill.district.name;
		const kind = (drill.level === "region" ? "Country" : drill.level === "district" ? "Region" : "District") as
			| "Country"
			| "Region"
			| "District";
		// The open district, as the polygon that carries its count.
		const districtUid =
			drill.level === "subcounty" ? (primaryOf.get(drill.district.uid) ?? drill.district.uid) : null;
		// Per-frame values of the area itself.
		const values =
			drill.level === "region"
				? tl?.totals
				: drill.level === "district"
					? regionSeries?.get(drill.region.uid)
					: districtSeries?.get(districtUid!);

		// Value of any region/district at the current frame (or its total).
		const valueOf = (uid: string, kind: "region" | "district") =>
			timelineActive
				? frameValue((kind === "region" ? regionSeries : districtSeries)?.get(uid), frameIdx, cumulative)
				: (countByUid.get(uid) ?? 0);
		const countryTotal = timelineActive
			? frameValue(tl?.totals, frameIdx, cumulative)
			: (regions?.total ?? 0);

		let total: number;
		let trend: Trend | null = null;
		if (timelineActive) {
			total = frameValue(values ?? undefined, frameIdx, cumulative);
			if (frameIdx > 0) trend = classifyTrend(total, frameValue(values ?? undefined, frameIdx - 1, cumulative));
		} else {
			const uid = drill.level === "district" ? drill.region.uid : districtUid;
			total = uid ? (countByUid.get(uid) ?? 0) : countryTotal;
			const prev = prevCounts.counts;
			const sumOver = (m: Map<string, number>) =>
				(regions?.features ?? []).reduce((s, f) => s + (m.get(f.properties.uid) ?? 0), 0);
			if (prev) {
				const before = uid ? (prev.get(uid) ?? 0) : sumOver(prev);
				const now =
					cmp.mode === "range"
						? total
						: rollCounts.counts
							? uid
								? (rollCounts.counts.get(uid) ?? 0)
								: sumOver(rollCounts.counts)
							: null;
				if (now !== null) trend = classifyTrend(now, before);
			}
		}

		let share: { pct: number; of: string } | null = null;
		let rank: { rank: number; of: number; noun: string } | null = null;
		if (drill.level === "district") {
			if (countryTotal > 0) share = { pct: (total / countryTotal) * 100, of: "Uganda" };
			const sibs = (regions?.features ?? []).map((f) => ({ uid: f.properties.uid, v: valueOf(f.properties.uid, "region") }));
			sibs.sort((a, b) => b.v - a.v);
			const i = sibs.findIndex((s) => s.uid === drill.region.uid);
			if (i >= 0 && total > 0) rank = { rank: i + 1, of: sibs.length, noun: "regions" };
		} else if (drill.level === "subcounty") {
			const regionTotal = valueOf(drill.region.uid, "region");
			if (regionTotal > 0) share = { pct: (total / regionTotal) * 100, of: drill.region.name };
			const sibs = (districts?.features ?? [])
				.filter((f) => f.properties.regionUid === drill.region.uid)
				.map((f) => ({ uid: f.properties.uid, v: valueOf(f.properties.uid, "district") }));
			sibs.sort((a, b) => b.v - a.v);
			const i = sibs.findIndex((s) => s.uid === districtUid);
			if (i >= 0 && total > 0) rank = { rank: i + 1, of: sibs.length, noun: `districts in ${drill.region.name}` };
		}

		return { name, kind, values: values ?? null, total, trend, share, rank };
	}, [drill, tl, regionSeries, districtSeries, timelineActive, frameIdx, cumulative, countByUid, regions, districts, prevCounts.counts, rollCounts.counts, cmp.mode, primaryOf]);
	areaValuesRef.current = area.values;

	// ── Navigation ──────────────────────────────────────────────────────
	const openRegion = useCallback((f: GeoFeature) => setDrill({ level: "district", region: refOf(f) }), [setDrill]);
	const openDistrict = useCallback(
		(f: GeoFeature) => {
			const region = regions?.features.find((r) => r.properties.uid === f.properties.regionUid);
			if (!region) return;
			setDrill({ level: "subcounty", region: refOf(region), district: refOf(f) });
		},
		[regions, setDrill]
	);

	const handleAreaClick = useCallback(
		(f: GeoFeature) => {
			if (drill.level === "region") openRegion(f);
			else if (drill.level === "district") setDrill({ level: "subcounty", region: drill.region, district: refOf(f) });
			else
				setListTarget({
					districtUid: drill.district.uid,
					districtName: drill.district.name,
					subcounty: f.properties.name,
				});
		},
		[drill, openRegion, setDrill]
	);

	const goHome = useCallback(() => {
		if (drill.level === "region") {
			const b = regions ? featuresBounds(regions.features) : null;
			if (b) mapRef.current?.fitBounds(b, { padding: [16, 16] });
		} else {
			setDrill({ level: "region" });
		}
	}, [drill.level, regions, setDrill]);

	const goUp = useCallback(() => {
		if (drill.level === "subcounty") setDrill({ level: "district", region: drill.region });
		else if (drill.level === "district") setDrill({ level: "region" });
	}, [drill, setDrill]);

	const handleSearch = useCallback(
		(hit: MapSearchHit) => {
			if (hit.kind === "region") openRegion(hit.feature);
			else if (hit.kind === "district") openDistrict(hit.feature);
			else {
				setHighlightUid(hit.feature.properties.uid);
				handleAreaClick(hit.feature);
			}
		},
		[openRegion, openDistrict, handleAreaClick]
	);

	// ── Deep links: ?region=<uid>&district=<uid> ────────────────────────
	const urlApplied = useRef(false);
	useEffect(() => {
		if (urlApplied.current || !regions || !districts) return;
		urlApplied.current = true;
		const params = new URLSearchParams(window.location.search);
		const d = params.get("district");
		const r = params.get("region");
		const district = d ? districts.features.find((f) => f.properties.uid === d) : undefined;
		if (district) {
			openDistrict(district);
			return;
		}
		const region = r ? regions.features.find((f) => f.properties.uid === r) : undefined;
		if (region) openRegion(region);
	}, [regions, districts, openDistrict, openRegion]);

	useEffect(() => {
		if (!urlApplied.current) return;
		const url = new URL(window.location.href);
		url.searchParams.delete("region");
		url.searchParams.delete("district");
		if (drill.level !== "region") url.searchParams.set("region", drill.region.uid);
		if (drill.level === "subcounty") url.searchParams.set("district", drill.district.uid);
		window.history.replaceState(null, "", url.toString());
	}, [drill]);

	// ── Live: flash what just rose, toast where ─────────────────────────
	const queryKey = `${query.fromDate ?? ""}|${query.toDate ?? ""}|${geoFilterKey(query)}`;
	const liveBaseline = useRef<{ key: string; counts: Map<string, number> } | null>(null);
	useEffect(() => {
		// Only settled data for the current query may become the baseline: while
		// a filter change loads, SWR still hands back the previous filter's
		// counts, and diffing across filters would flash phantom "new" signals.
		if (!regions || !districts || loading || subSWR.isLoading) return;
		const last = liveBaseline.current;
		liveBaseline.current = { key: queryKey, counts: countByUid };
		if (!live || !last || last.key !== queryKey) return;
		const risen: string[] = [];
		for (const [uid, c] of countByUid) {
			const before = last.counts.get(uid);
			if (before !== undefined && c > before) risen.push(uid);
		}
		if (risen.length === 0) return;
		setFlashUids((prev) => new Set([...prev, ...risen]));
		const byDistrict = districts.features
			.map((f) => ({ name: f.properties.name, d: f.properties.count - (last.counts.get(f.properties.uid) ?? f.properties.count) }))
			.filter((x) => x.d > 0)
			.sort((a, b) => b.d - a.d);
		const added = byDistrict.reduce((s, x) => s + x.d, 0);
		if (added > 0) {
			const where = byDistrict
				.slice(0, 3)
				.map((x) => `${x.name} +${x.d}`)
				.join(", ");
			hotToast(`${added} new signal${added === 1 ? "" : "s"} — ${where}${byDistrict.length > 3 ? "…" : ""}`, {
				icon: "📍",
				duration: 7000,
			});
		}
	}, [countByUid, regions, districts, loading, subSWR.isLoading, live, queryKey]);

	useEffect(() => {
		if (flashUids.size === 0) return;
		const id = setTimeout(() => setFlashUids(EMPTY_SET), FLASH_MS);
		return () => clearTimeout(id);
	}, [flashUids]);

	useEffect(() => {
		if (regions) setLastUpdated(new Date());
	}, [regions]);

	// ── Full screen ─────────────────────────────────────────────────────
	// The whole document goes full screen and the explorer pins itself over
	// the page: fullscreening just the map would hide every portalled dialog
	// and toast, which render outside it.
	const setExpandedMode = useCallback((next: boolean) => {
		setExpanded(next);
		try {
			if (next && !document.fullscreenElement) {
				void document.documentElement.requestFullscreen?.().catch(() => undefined);
			} else if (!next && document.fullscreenElement) {
				void document.exitFullscreen?.().catch(() => undefined);
			}
		} catch {
			/* Fullscreen API unavailable — the pinned view still works */
		}
	}, []);
	useEffect(() => {
		const onChange = () => {
			if (!document.fullscreenElement) setExpanded(false);
		};
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);
	useEffect(() => {
		if (!expanded) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [expanded]);

	// ── Exports ─────────────────────────────────────────────────────────
	const levelNoun = drill.level === "region" ? "Regions" : drill.level === "district" ? "Districts" : "Subcounties";
	const levelLabel =
		drill.level === "region"
			? "Regions of Uganda"
			: drill.level === "district"
				? `Districts in ${drill.region.name}`
				: `Subcounties in ${drill.district.name}`;
	const areaPath =
		drill.level === "region"
			? "Uganda"
			: drill.level === "district"
				? `Uganda › ${drill.region.name}`
				: `Uganda › ${drill.region.name} › ${drill.district.name}`;
	const frameLabel =
		timelineActive && tl ? describeFrame(tl.buckets[frameIdx], tl.granularity) : null;
	const colourLabel =
		effectiveColorMode === "change" ? `Shaded by change ${view.changeLabel}` : "Shaded by signal count";
	const nameTokens = [
		levelNoun.toLowerCase(),
		drill.level === "district" ? drill.region.name : drill.level === "subcounty" ? drill.district.name : "",
	];

	const exportImage = useCallback(async () => {
		const el = captureRef.current;
		if (!el || exporting) return;
		setExporting(true);
		const id = hotToast.loading("Rendering the map image…");
		try {
			await exportMapImage(el, {
				title: `Signals Map — ${areaPath}`,
				subtitle: [
					rangeLabel,
					filterLabel,
					frameLabel ? `${frameLabel} (${cumulative ? "cumulative" : `per ${tl?.granularity}`})` : null,
					colourLabel,
				]
					.filter(Boolean)
					.join(" · "),
				footer:
					"Counts use canonical district/subcounty matching; signals whose location can't be matched to a boundary aren't plotted.",
				filename: mapExportFilename([...nameTokens, frameLabel ? tl!.buckets[frameIdx].label : ""], { from: query.fromDate, to: query.toDate }, "png"),
			});
			hotToast.success("Map image saved.", { id });
		} catch (err) {
			console.error("Map image export failed:", err);
			hotToast.error("Couldn't render the map image. Please try again.", { id });
		} finally {
			setExporting(false);
		}
	}, [exporting, areaPath, rangeLabel, filterLabel, frameLabel, cumulative, tl, colourLabel, nameTokens, frameIdx, query.fromDate, query.toDate]);

	const exportExcel = useCallback(async () => {
		if (exporting) return;
		setExporting(true);
		try {
			const parent =
				drill.level === "region" ? "Uganda" : drill.level === "district" ? drill.region.name : drill.district.name;
			await exportMapAreasToExcel({
				filename: mapExportFilename(nameTokens, { from: query.fromDate, to: query.toDate }, "xlsx"),
				levelLabel: levelNoun,
				areas: levelFeatures.map((f) => ({
					name: f.properties.name,
					parent,
					count: view.counts.get(f.properties.uid) ?? 0,
					trend: view.trends?.get(f.properties.uid),
				})),
				trendText: view.trendText,
				about: [
					["View", levelLabel],
					["Date range", rangeLabel],
					["Filters", filterLabel],
					...(frameLabel
						? ([["Timeline frame", `${frameLabel} (${cumulative ? "cumulative" : `per ${tl?.granularity}`})`]] as [string, string][])
						: []),
					["Comparison", view.changeLabel],
				],
				timeline:
					tl && levelSeries
						? {
								buckets: tl.buckets,
								rows: levelFeatures.map((f) => ({
									name: f.properties.name,
									values: levelSeries.get(f.properties.uid) ?? new Array(tl.buckets.length).fill(0),
								})),
							}
						: null,
			});
			hotToast.success(`Exported ${levelFeatures.length} ${levelNoun.toLowerCase()}.`);
		} catch (err) {
			console.error("Map Excel export failed:", err);
			hotToast.error("Failed to export the Excel file. Please try again.");
		} finally {
			setExporting(false);
		}
	}, [exporting, drill, nameTokens, query.fromDate, query.toDate, levelNoun, levelFeatures, view, levelLabel, rangeLabel, filterLabel, frameLabel, cumulative, tl, levelSeries]);

	const copyLink = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			hotToast.success("Link to this view copied.");
		} catch {
			hotToast.error("Couldn't copy — copy the address bar instead.");
		}
	}, []);

	const togglePlay = useCallback(() => {
		if (!timelineActive) return;
		if (!playing && frameIdx >= frameCount - 1) setFrame(0);
		setPlaying((p) => !p);
	}, [timelineActive, playing, frameIdx, frameCount]);

	const openTimelineAt = useCallback(
		(index: number) => {
			setPlaying(false);
			if (timelineOpen) setFrame(index);
			else {
				pendingFrame.current = index;
				onTimelineOpenChange(true);
			}
		},
		[timelineOpen, onTimelineOpenChange]
	);

	// ── Keyboard ────────────────────────────────────────────────────────
	const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
	keyHandler.current = (e: KeyboardEvent) => {
		if (e.defaultPrevented || e.altKey) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
		if (document.querySelector("[role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']")) return;
		const mod = e.ctrlKey || e.metaKey;
		if (mod && e.key.toLowerCase() === "k") {
			e.preventDefault();
			setSearchOpen(true);
			return;
		}
		if (mod) return;
		const onControl = Boolean(target?.closest("button, a, [role='slider']"));
		switch (e.key) {
			case "/":
				e.preventDefault();
				setSearchOpen(true);
				break;
			case "Escape":
				if (expanded) setExpandedMode(false);
				else goUp();
				break;
			case "Backspace":
				e.preventDefault();
				goUp();
				break;
			case "f":
			case "F":
				setExpandedMode(!expanded);
				break;
			case "h":
			case "H":
				goHome();
				break;
			case "t":
			case "T":
				onTimelineOpenChange(!timelineOpen);
				break;
			case "i":
			case "I":
				onInsightsOpenChange(!insightsOpen);
				break;
			case "l":
			case "L":
				if (liveAvailable) onLiveChange(!live);
				break;
			case "c":
			case "C":
				setColorMode((m) => (m === "count" ? "change" : "count"));
				break;
			case "?":
				setShortcutsOpen(true);
				break;
			case " ":
				if (timelineActive && !onControl) {
					e.preventDefault();
					togglePlay();
				}
				break;
			case "ArrowLeft":
			case "ArrowRight":
				// Arrows on a focused map pan it; elsewhere they step the timeline.
				if (timelineActive && !target?.closest(".leaflet-container, [role='slider']")) {
					e.preventDefault();
					setPlaying(false);
					setFrame((i) => Math.max(0, Math.min(frameCount - 1, i + (e.key === "ArrowLeft" ? -1 : 1))));
				}
				break;
		}
	};
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => keyHandler.current(e);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// ── Render ──────────────────────────────────────────────────────────
	const subLoading = drill.level === "subcounty" && subSWR.isLoading;
	const statusText = subLoading
		? "Loading subcounties…"
		: validating || subSWR.isValidating
			? "Updating…"
			: null;
	const unassigned = (() => {
		if (drill.level !== "subcounty" || subLoading) return 0;
		if (frameReady && subTlSWR.data?.unassigned) {
			return frameValue(subTlSWR.data.unassigned, frameIdx, cumulative);
		}
		return subSWR.data?.unassigned ?? 0;
	})();

	const childNoun = drill.level === "region" ? "regions" : drill.level === "district" ? "districts" : "subcounties";
	const rows: InsightChildRow[] = levelFeatures.map((f) => ({
		uid: f.properties.uid,
		name: f.properties.name,
		count: view.counts.get(f.properties.uid) ?? 0,
		trend: view.trends?.get(f.properties.uid),
	}));
	const hotspots = rows.filter((r) => r.trend?.hotspot).length;

	const focus = useMemo((): { key: string; bounds: L.LatLngBoundsExpression | null } => {
		if (drill.level === "region") {
			return { key: "region", bounds: regions ? featuresBounds(regions.features) : null };
		}
		if (drill.level === "district") {
			return { key: `d:${drill.region.uid}`, bounds: bboxToBounds(drill.region.bbox) };
		}
		return { key: `s:${drill.district.uid}`, bounds: bboxToBounds(drill.district.bbox) };
	}, [drill, regions]);

	const tool = (
		label: string,
		icon: React.ReactNode,
		onClick: () => void,
		opts: { pressed?: boolean; disabled?: boolean } = {}
	) => (
		<a
			href="#"
			role="button"
			title={label}
			aria-label={label}
			aria-pressed={opts.pressed}
			aria-disabled={opts.disabled}
			onClick={(e) => {
				e.preventDefault();
				if (!opts.disabled) onClick();
			}}
			className={opts.disabled ? "leaflet-disabled" : undefined}
		>
			{icon}
		</a>
	);
	const toolbar = (
		<>
			{tool("Find an area (Ctrl+K)", <Search className="h-[15px] w-[15px]" />, () => setSearchOpen(true))}
			{tool("Back to the whole country (H)", <LocateFixed className="h-[15px] w-[15px]" />, goHome)}
			{tool(
				expanded ? "Leave full screen (F)" : "Full screen (F)",
				expanded ? <Minimize2 className="h-[15px] w-[15px]" /> : <Maximize2 className="h-[15px] w-[15px]" />,
				() => setExpandedMode(!expanded),
				{ pressed: expanded }
			)}
			{tool("Play the map over time (T)", <History className="h-[15px] w-[15px]" />, () => onTimelineOpenChange(!timelineOpen), {
				pressed: timelineOpen,
			})}
			{tool("Save this view as an image", <Camera className="h-[15px] w-[15px]" />, () => void exportImage(), {
				disabled: exporting,
			})}
			{tool("Download this view as Excel", <FileSpreadsheet className="h-[15px] w-[15px]" />, () => void exportExcel(), {
				disabled: exporting || levelFeatures.length === 0,
			})}
			{tool("Copy a link to this view", <Link2 className="h-[15px] w-[15px]" />, () => void copyLink())}
			{tool("Keyboard shortcuts (?)", <Keyboard className="h-[15px] w-[15px]" />, () => setShortcutsOpen(true))}
		</>
	);

	const hint =
		drill.level === "region"
			? "click a region to drill into its districts"
			: drill.level === "district"
				? "click a district to open its subcounties"
				: "click a subcounty to list its signals";

	const timelineBar = timelineOpen ? (
		<MapTimelineBar
			timeline={tl}
			loading={tlSWR.isLoading}
			error={tlSWR.error as Error | undefined}
			values={area.values ?? []}
			areaName={area.name}
			index={frameIdx}
			onIndexChange={(i) => setFrame(i)}
			playing={playing}
			onPlayingChange={setPlaying}
			speed={speed}
			onSpeedChange={setSpeed}
			cumulative={cumulative}
			onCumulativeChange={setCumulative}
			onClose={() => onTimelineOpenChange(false)}
			notice={drill.level === "subcounty" && timelineActive && !subSeries ? "Loading subcounty frames…" : null}
		/>
	) : null;

	return (
		<div
			className={cn(
				"flex flex-col gap-2",
				expanded && "fixed inset-0 z-[45] bg-background p-3"
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
					{expanded && (
						<span className="font-semibold text-gray-900">
							Signals Map · {rangeLabel} · {filterLabel}
						</span>
					)}
					<span>
						{regions
							? `${regions.total.toLocaleString()} signals plotted • ${hint}`
							: "Loading…"}
					</span>
					{hotspots > 0 && (
						<span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-inset ring-red-200">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
							{hotspots} rising {hotspots === 1 ? childNoun.replace(/ies$/, "y").replace(/s$/, "") : childNoun}{" "}
							{view.trendText.vs}
						</span>
					)}
				</div>
				<div className="flex items-center gap-3">
					{live && (
						<span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
							<Radio className="h-3.5 w-3.5 animate-pulse" />
							Live{lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ""}
						</span>
					)}
					<button
						type="button"
						className="hover:text-uganda-red hover:underline"
						onClick={() => setShortcutsOpen(true)}
					>
						Shortcuts <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">?</kbd>
					</button>
					{expanded && (
						<button
							type="button"
							className="font-medium text-gray-900 hover:text-uganda-red hover:underline"
							onClick={() => setExpandedMode(false)}
						>
							Exit full screen <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">F</kbd>
						</button>
					)}
				</div>
			</div>

			<div className={cn("flex min-h-0 flex-col gap-3 lg:flex-row", expanded && "flex-1")}>
				<div className={cn("min-w-0 flex-1", expanded ? "h-full min-h-[320px]" : "h-[72vh] min-h-[420px]")}>
					<AlertsGeoMap
						drill={drill}
						onNavigate={setDrill}
						onAreaClick={handleAreaClick}
						features={levelFeatures}
						counts={view.counts}
						scaleMax={view.scaleMax}
						colorMode={effectiveColorMode}
						onColorModeChange={setColorMode}
						trends={view.trends}
						trendText={view.trendText}
						changeLabel={view.changeLabel}
						legendNote={
							timelineActive && tl
								? frameReady
									? `${tl.buckets[frameIdx].label} · ${cumulative ? "cumulative" : `per ${tl.granularity}`}`
									: "Loading frames…"
								: null
						}
						focusKey={focus.key}
						focusBounds={focus.bounds}
						highlightUid={highlightUid}
						flashUids={flashUids}
						unassigned={unassigned}
						onUnassignedClick={() =>
							drill.level === "subcounty" &&
							setListTarget({
								districtUid: drill.district.uid,
								districtName: drill.district.name,
								unassigned: true,
							})
						}
						statusText={statusText}
						regions={regions}
						districts={districts}
						onLocatorRegionClick={openRegion}
						toolbar={toolbar}
						footer={timelineBar}
						onMapReady={handleMapReady}
						captureRef={captureRef}
					/>
				</div>
				{insightsOpen && (
					<AreaInsightsPanel
						className={cn(
							"max-h-[75vh] lg:max-h-none lg:w-80 lg:shrink-0",
							expanded ? "lg:h-full" : "lg:h-[72vh] lg:min-h-[420px]"
						)}
						areaName={area.name}
						areaKind={area.kind}
						total={area.total}
						frameLabel={frameLabel}
						trend={area.trend}
						trendText={timelineActive ? view.trendText : cmp.text}
						share={area.share}
						rank={area.rank}
						spark={
							tl && area.values
								? {
										values: area.values,
										labels: tl.buckets.map((b) => b.label),
										active: timelineActive ? frameIdx : null,
									}
								: null
						}
						onSparkSelect={openTimelineAt}
						childNoun={childNoun}
						rows={rows}
						onRowHover={setHighlightUid}
						onRowClick={(uid) => {
							const f = levelFeatures.find((x) => x.properties.uid === uid);
							if (f) handleAreaClick(f);
						}}
						insights={insights}
						insightsLoading={insightsSWR.isLoading || insightsSWR.isValidating || (!insights && !insightsSWR.error)}
						insightsError={insightsSWR.error as Error | undefined}
						selectedResponses={query.responses ?? []}
						selectedOutcomes={query.outcomes ?? []}
						onToggleResponse={onToggleResponse}
						onToggleOutcome={onToggleOutcome}
						onOpenAlert={setDetailAlert}
						onClose={() => onInsightsOpenChange(false)}
					/>
				)}
			</div>

			<MapSearchDialog
				open={searchOpen}
				onOpenChange={setSearchOpen}
				regions={regions}
				districts={districts}
				subcounties={drill.level === "subcounty" ? (subSWR.data?.features ?? null) : null}
				subcountyParent={drill.level === "subcounty" ? drill.district.name : null}
				onSelect={handleSearch}
			/>
			<MapShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
			<SubcountyAlertsDialog target={listTarget} query={query} onClose={() => setListTarget(null)} />
			{detailAlert && (
				<AlertDetailsDialog isOpen alert={detailAlert} onClose={() => setDetailAlert(null)} />
			)}
		</div>
	);
}
