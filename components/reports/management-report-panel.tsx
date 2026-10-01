"use client";

import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import hotToast from "react-hot-toast";
import {
	FileDown,
	FileText,
	FileType,
	Images,
	Loader2,
	MonitorPlay,
	Presentation,
	RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DateRangeInputs,
	DateRangePresetBar,
} from "@/components/filters/date-range-filter";
import { ErrorAlert } from "@/components/dashboard";
import { DeckConfigSection } from "@/components/reports/deck-config-section";
import {
	DeckExportRack,
	DeckPresenter,
	DeckPreview,
} from "@/components/reports/deck-preview";
import { toLocalISODate } from "@/lib/date-range-presets";
import {
	fetchManagementReport,
	todayIsoDate,
	type ManagementReport,
} from "@/lib/fetch-reports";
import {
	fetchGeoDistricts,
	fetchGeoRegions,
	type GeoFeatureCollection,
} from "@/lib/fetch-geo";
import {
	buildDeck,
	deckFileStem,
	deckScopeLabel,
	formatReportRange,
	previousPeriod,
} from "@/lib/management-report-deck";
import {
	filterDistrictsToRegions,
	renderDistrictChoropleth,
} from "@/lib/management-report-map";
import {
	downloadManagementReportPptx,
	measureImages,
} from "@/lib/management-report-pptx";
import { buildManagementReportDoc } from "@/lib/management-report-doc";
import { downloadManagementReportPdf } from "@/lib/management-report-pdf";
import { downloadManagementReportDocx } from "@/lib/management-report-docx";
import {
	downloadSlidePng,
	downloadSlidesPdf,
	nextFrames,
} from "@/lib/management-report-slides-pdf";
import {
	defaultDeckConfig,
	loadDeckConfig,
	loadSavedTemplates,
	saveDeckConfig,
	saveSavedTemplates,
	themeFromDesign,
	type DeckConfig,
	type DeckTemplate,
} from "@/lib/management-report-config";

/**
 * The map slide shows the distribution of ISSUED alerts, so its district
 * counts are scoped by the same stage key the Alerts page lists
 * (services.StagePredicate "alert") — the N in the map title and the
 * shading then count the same signals.
 */
const ALERT_STAGE = "alert";

/** "West Nile" is the legacy name for today's Arua + Yumbe regions. */
const LEGACY_REGIONS: Record<string, string[]> = { "west nile": ["arua", "yumbe"] };

interface DeckData {
	report: ManagementReport;
	previous: ManagementReport | null;
	geo: GeoFeatureCollection | null;
	key: string;
}

type ExportKind = "pptx" | "slides" | "pdf" | "docx";

function defaultDeckRange(): { fromDate: string; toDate: string } {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 6);
	return { fromDate: toLocalISODate(from), toDate: toLocalISODate(to) };
}

/**
 * "Presentation Studio": pick a date range, shape the deck (slides, content,
 * design, branding, templates) and watch it rebuild live; then present it
 * fullscreen or download it as PowerPoint, a slide PDF, a document PDF or
 * Word. Every output renders from the one resolved deck, so they all agree.
 */
export function ManagementReportPanel() {
	const [range, setRange] = useState(defaultDeckRange);
	const [config, setConfig] = useState<DeckConfig>(defaultDeckConfig);
	const [hydrated, setHydrated] = useState(false);
	const [savedTemplates, setSavedTemplates] = useState<DeckTemplate[]>([]);
	const [data, setData] = useState<DeckData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reloadTick, setReloadTick] = useState(0);
	const [selected, setSelected] = useState(0);
	const [presenting, setPresenting] = useState(false);
	const [busy, setBusy] = useState<ExportKind | null>(null);
	const [progress, setProgress] = useState<string | null>(null);
	const [lastFile, setLastFile] = useState<string | null>(null);
	const [rack, setRack] = useState(false);
	const [geoRegions, setGeoRegions] = useState<{ name: string; uid: string }[]>([]);
	const rackRef = useRef<HTMLDivElement>(null);
	const reqId = useRef(0);
	const geoCache = useRef<{ key: string; value: Promise<GeoFeatureCollection | null> } | null>(null);
	const warnedStorage = useRef(false);

	// Restore persisted settings after mount (localStorage is client-only, so
	// the first render uses defaults to keep server/client markup in agreement).
	useEffect(() => {
		setConfig(loadDeckConfig());
		setSavedTemplates(loadSavedTemplates());
		setHydrated(true);
	}, []);

	// Persist (debounced — a logo makes the JSON a few hundred KB).
	useEffect(() => {
		if (!hydrated) return;
		const t = setTimeout(() => {
			if (!saveDeckConfig(config) && !warnedStorage.current) {
				warnedStorage.current = true;
				hotToast.error("These settings are too large to remember in this browser — try a smaller image.");
			}
		}, 400);
		return () => clearTimeout(t);
	}, [config, hydrated]);

	// Region names + uids for the scope picker and the map crop.
	useEffect(() => {
		fetchGeoRegions({}, { countsOnly: true })
			.then((fc) =>
				setGeoRegions(
					fc.features
						.map((f) => ({ name: f.properties.name, uid: f.properties.uid }))
						.sort((a, b) => a.name.localeCompare(b.name))
				)
			)
			.catch(() => setGeoRegions([]));
	}, []);

	const updateConfig = useCallback((patch: Partial<DeckConfig>) => {
		setConfig((prev) => ({ ...prev, ...patch }));
	}, []);

	const replaceConfig = useCallback((next: DeckConfig) => setConfig(next), []);

	const updateTemplates = useCallback((list: DeckTemplate[]) => {
		setSavedTemplates(list);
		if (!saveSavedTemplates(list)) hotToast.error("Could not save templates in this browser (storage full).");
	}, []);

	const valid = Boolean(range.fromDate && range.toDate) && range.fromDate <= range.toDate;
	const content = config.content;

	/* -------------------------- data -------------------------- */

	const fetchKey = JSON.stringify({
		f: range.fromDate,
		t: range.toDate,
		d: [...config.focusDiseases].sort(),
		r: [...content.regions].sort(),
		c: content.compareWithPrevious,
		n: content.narrativesLimit,
		k: content.topDistricts,
		x: reloadTick,
	});

	useEffect(() => {
		if (!hydrated || !valid) return;
		const id = ++reqId.current;
		setLoading(true);
		setError(null);
		const geoKey = `${range.fromDate}|${range.toDate}`;
		// Debounced so typing a date doesn't fire a request per keystroke.
		const timer = setTimeout(async () => {
			try {
				if (!geoCache.current || geoCache.current.key !== geoKey) {
					geoCache.current = {
						key: geoKey,
						value: fetchGeoDistricts("", { fromDate: range.fromDate, toDate: range.toDate, stage: ALERT_STAGE }).catch(() => null),
					};
				}
				const prev = previousPeriod(range.fromDate, range.toDate);
				const [report, previous, geo] = await Promise.all([
					fetchManagementReport(range, {
						focusDiseases: config.focusDiseases,
						regions: content.regions,
						topDistricts: content.topDistricts,
						detailsLimit: content.narrativesLimit,
					}),
					content.compareWithPrevious
						? fetchManagementReport(prev, { regions: content.regions, topDistricts: 3, detailsLimit: 1 }).catch(() => null)
						: Promise.resolve(null),
					geoCache.current.value,
				]);
				if (id !== reqId.current) return;
				setData({ report, previous, geo, key: fetchKey });
			} catch (err) {
				if (id !== reqId.current) return;
				setError(err instanceof Error ? err.message : "Failed to load the report.");
			} finally {
				if (id === reqId.current) setLoading(false);
			}
		}, data ? 450 : 0);
		return () => clearTimeout(timer);
		// fetchKey captures every input that changes the server payload.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchKey, hydrated, valid]);

	/* -------------------------- deck -------------------------- */

	const deferredConfig = useDeferredValue(config);
	const theme = useMemo(() => themeFromDesign(deferredConfig.design), [deferredConfig.design]);
	const mapEnabled = deferredConfig.slides.some((s) => s.kind === "map" && s.enabled);
	const regionUids = useMemo(() => {
		const wanted = new Set(
			deferredConfig.content.regions.flatMap((r) => LEGACY_REGIONS[r.toLowerCase()] ?? [r.toLowerCase()])
		);
		return geoRegions.filter((g) => wanted.has(g.name.toLowerCase())).map((g) => g.uid);
	}, [deferredConfig.content.regions, geoRegions]);

	const mapImage = useMemo(() => {
		if (!mapEnabled || !data?.geo) return null;
		const geo = filterDistrictsToRegions(data.geo, regionUids);
		return renderDistrictChoropleth(geo, {
			ramp: theme.mapRamp,
			labels: deferredConfig.content.mapLabels,
		});
	}, [mapEnabled, data?.geo, regionUids, theme.mapRamp, deferredConfig.content.mapLabels]);

	const deck = useMemo(() => {
		if (!data) return null;
		return buildDeck({
			report: data.report,
			previous: deferredConfig.content.compareWithPrevious ? data.previous : null,
			map: mapImage,
			config: deferredConfig,
		});
	}, [data, mapImage, deferredConfig]);

	const { pageCounts, firstIndex } = useMemo(() => {
		const pageCounts: Record<string, number> = {};
		const firstIndex: Record<string, number> = {};
		deck?.slides.forEach((s, i) => {
			pageCounts[s.itemId] = (pageCounts[s.itemId] ?? 0) + 1;
			if (firstIndex[s.itemId] === undefined) firstIndex[s.itemId] = i;
		});
		return { pageCounts, firstIndex };
	}, [deck]);

	const total = deck?.slides.length ?? 0;
	const safeSelected = Math.min(selected, Math.max(0, total - 1));
	const activeItemId = deck?.slides[safeSelected]?.itemId ?? null;
	const regionOptions = useMemo(() => geoRegions.map((g) => ({ value: g.name, label: g.name })), [geoRegions]);
	const stale = data !== null && data.key !== fetchKey;

	const onSelectItem = useCallback(
		(itemId: string) => {
			const idx = firstIndex[itemId];
			if (idx !== undefined) setSelected(idx);
		},
		[firstIndex]
	);

	/* ------------------------- exports ------------------------- */

	async function runExport(kind: ExportKind) {
		if (!deck || !data || busy) return;
		setBusy(kind);
		setLastFile(null);
		setProgress(null);
		const stem = deckFileStem(config, data.report);
		try {
			let saved: string;
			if (kind === "pptx") {
				saved = await downloadManagementReportPptx({ deck, config: deferredConfig, fileStem: stem });
			} else if (kind === "slides") {
				setRack(true);
				await nextFrames(3);
				const nodes = Array.from(rackRef.current?.querySelectorAll<HTMLElement>("[data-slide-key]") ?? []);
				if (nodes.length === 0) throw new Error("The slides did not render for export.");
				saved = await downloadSlidesPdf({
					nodes,
					size: { w: deck.style.geometry.w, h: deck.style.geometry.h },
					fileName: `${stem}_slides.pdf`,
					background: deck.style.theme.bg,
					onProgress: (done, n) => setProgress(`Capturing slide ${done} of ${n}…`),
				});
			} else {
				const aspects = await measureImages(deck.slides.map((s) => (s.type === "image" ? s.image : null)));
				const blocks = buildManagementReportDoc({ deck, aspects });
				const fileName = `${stem}.${kind}`;
				saved =
					kind === "pdf"
						? await downloadManagementReportPdf({ blocks, fileName, accent: deferredConfig.design.accent })
						: await downloadManagementReportDocx({ blocks, fileName, accent: deferredConfig.design.accent });
			}
			setLastFile(saved);
			hotToast.success(`Downloaded ${saved}`);
		} catch (err) {
			hotToast.error(err instanceof Error ? err.message : "Export failed.");
		} finally {
			setRack(false);
			setBusy(null);
			setProgress(null);
		}
	}

	async function slidePng(node: HTMLElement) {
		if (!deck || !data) return;
		try {
			const name = `${deckFileStem(config, data.report)}_slide-${safeSelected + 1}.png`;
			await downloadSlidePng(node, name, deck.style.theme.bg);
			hotToast.success(`Saved ${name}`);
		} catch (err) {
			hotToast.error(err instanceof Error ? err.message : "Could not save the slide.");
		}
	}

	const closePresenter = useCallback(() => setPresenting(false), []);

	const exportButton = (kind: ExportKind, label: string, Icon: typeof FileDown, variant: "default" | "outline" = "outline", title?: string) => (
		<Button variant={variant} size="sm" onClick={() => runExport(kind)} disabled={!deck || Boolean(busy)} title={title}>
			{busy === kind ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Icon className="mr-1.5 h-4 w-4" />}
			{label}
		</Button>
	);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Presentation className="h-4 w-4 text-uganda-red" />
						Presentation Studio
					</CardTitle>
					<CardDescription>
						Build the Alerts Management deck for any dates and regions. Reorder, rename and restyle every slide, add your own
						slides, pick KPIs and key messages, then present it fullscreen or download it as PowerPoint, PDF or Word. The
						preview rebuilds as you edit, and every format is made from the same slides.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<DateRangePresetBar fromDate={range.fromDate} toDate={range.toDate} onChange={setRange} />
					<div className="flex flex-wrap items-end gap-x-4 gap-y-2">
						<div className="grid w-full max-w-md grid-cols-2 gap-3">
							<DateRangeInputs
								fromDate={range.fromDate}
								toDate={range.toDate}
								maxDate={todayIsoDate()}
								onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
							/>
						</div>
						<div className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground">
							{loading ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin text-uganda-red" />
									{data ? "Updating data…" : "Building your deck…"}
								</>
							) : data ? (
								<>
									<span>
										<span className="font-medium text-foreground">{formatReportRange(data.report.fromDate, data.report.toDate)}</span>
										{" · "}
										{deckScopeLabel(content.regions)}
										{" · "}
										{data.report.allPhes.totals.signals.toLocaleString()} signals
										{data.previous && content.compareWithPrevious ? " · compared with previous period" : ""}
									</span>
									<button
										type="button"
										className="rounded p-1 hover:bg-muted hover:text-foreground"
										onClick={() => setReloadTick((n) => n + 1)}
										title="Reload the data"
										aria-label="Reload the data"
									>
										<RefreshCw className="h-3.5 w-3.5" />
									</button>
								</>
							) : !valid ? (
								<span className="text-amber-700">Pick a valid date range.</span>
							) : null}
						</div>
					</div>

					{error && <ErrorAlert error={error} onRetry={() => setReloadTick((n) => n + 1)} />}

					<div className="flex flex-wrap items-center gap-2 border-t pt-3">
						<Button size="sm" onClick={() => setPresenting(true)} disabled={!deck || total === 0}>
							<MonitorPlay className="mr-1.5 h-4 w-4" />
							Present
						</Button>
						{exportButton("pptx", "PowerPoint", FileDown, "default", "Editable .pptx with native charts and speaker notes")}
						{exportButton("slides", "PDF (slides)", Images, "outline", "One page per slide, exactly as previewed")}
						{exportButton("pdf", "PDF (document)", FileText, "outline", "Searchable tables — charts become their numbers")}
						{exportButton("docx", "Word", FileType, "outline", "Editable document with the same content")}
						<span className="text-xs text-muted-foreground">
							{progress ??
								(lastFile && !busy ? (
									<span className="text-emerald-700">
										Downloaded <span className="font-medium">{lastFile}</span>
									</span>
								) : deck ? (
									`${total} slide${total === 1 ? "" : "s"}`
								) : null)}
						</span>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
				<div className="order-2 min-w-0 xl:order-1">
					<DeckConfigSection
						config={config}
						onChange={updateConfig}
						onReplace={replaceConfig}
						regionOptions={regionOptions}
						pageCounts={pageCounts}
						activeItemId={activeItemId}
						onSelectItem={onSelectItem}
						hasFocusData={Boolean(data?.report.focus && data.report.focus.diseases.length > 0)}
						savedTemplates={savedTemplates}
						onSavedTemplatesChange={updateTemplates}
						disabled={Boolean(busy)}
					/>
				</div>
				<div className="order-1 min-w-0 self-start rounded-lg border p-3 xl:sticky xl:top-4 xl:order-2">
					{deck ? (
						<DeckPreview
							deck={deck}
							config={deferredConfig}
							selected={safeSelected}
							onSelect={setSelected}
							onPresent={() => setPresenting(true)}
							onSlidePng={slidePng}
							busy={loading || stale}
						/>
					) : (
						<div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
							{loading ? (
								<>
									<Loader2 className="h-6 w-6 animate-spin text-uganda-red" />
									Building your deck…
								</>
							) : (
								"Pick a date range to build the deck."
							)}
						</div>
					)}
				</div>
			</div>

			{presenting && deck && (
				<DeckPresenter deck={deck} config={deferredConfig} start={safeSelected} onClose={closePresenter} onIndexChange={setSelected} />
			)}
			{rack && deck && <DeckExportRack deck={deck} config={deferredConfig} containerRef={rackRef} />}
		</div>
	);
}
