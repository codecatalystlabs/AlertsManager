"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, FileDown, Loader2, Presentation } from "lucide-react";

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
import { ManagementReportView } from "@/components/reports/management-report-view";
import { DeckConfigSection } from "@/components/reports/deck-config-section";
import { toLocalISODate } from "@/lib/date-range-presets";
import {
	fetchManagementReport,
	todayIsoDate,
	type ManagementReport,
} from "@/lib/fetch-reports";
import { fetchGeoDistricts, type GeoFeatureCollection } from "@/lib/fetch-geo";
import {
	downloadManagementReportPptx,
	formatReportRange,
} from "@/lib/management-report-pptx";
import {
	defaultDeckConfig,
	loadDeckConfig,
	saveDeckConfig,
	type DeckConfig,
} from "@/lib/management-report-config";

/**
 * Outcome buckets that make a signal an "alert" (recorded, non-discarded) —
 * the map slide shows the distribution of ALERTS, so the district counts are
 * scoped to these buckets. Values must match the backend's OutcomeFilterBucket.
 */
const ALERT_OUTCOME_BUCKETS = [
	"Field Case Verification",
	"Sample Collected",
	"Validated for EMS Evacuation",
	"Mortality Surveillance/Supervised Burial",
	"Others",
];

interface DeckData {
	report: ManagementReport;
	districtGeo: GeoFeatureCollection | null;
	/** The disease-focus selection this data was fetched for (sorted, joined). */
	focusKey: string;
}

/** Stable key for a disease-focus selection, order-independent. */
function focusKeyOf(diseases: string[]): string {
	return [...diseases].sort().join(",");
}

function defaultDeckRange(): { fromDate: string; toDate: string } {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 6);
	return { fromDate: toLocalISODate(from), toDate: toLocalISODate(to) };
}

/**
 * The "Alerts Management presentation" generator: pick a date range, tune the
 * configuration (disease focus, theme, sections, cover), then either view the
 * report inside the app or download it as the .pptx deck — both are built from
 * the same aggregate and the same config, so they always match.
 */
export function ManagementReportPanel() {
	const [range, setRange] = useState(defaultDeckRange);
	const [config, setConfig] = useState<DeckConfig>(defaultDeckConfig);
	const [busy, setBusy] = useState<"view" | "download" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lastFile, setLastFile] = useState<string | null>(null);
	const [view, setView] = useState<DeckData | null>(null);

	// Restore the persisted config after mount (localStorage is client-only, so
	// the first render uses defaults to keep server/client markup in agreement).
	useEffect(() => {
		setConfig(loadDeckConfig());
	}, []);

	const updateConfig = useCallback((patch: Partial<DeckConfig>) => {
		setConfig((prev) => {
			const next = { ...prev, ...patch };
			saveDeckConfig(next);
			return next;
		});
	}, []);

	const valid =
		Boolean(range.fromDate && range.toDate) && range.fromDate <= range.toDate;
	const wantFocusKey = focusKeyOf(config.focusDiseases);
	// The open report no longer matches the pickers OR the disease focus — only
	// these require a re-fetch. Colour / section / cover edits apply live.
	const viewStale =
		view !== null &&
		(view.report.fromDate !== range.fromDate ||
			view.report.toDate !== range.toDate ||
			view.focusKey !== wantFocusKey);

	/** The deck aggregate and the map's district alert counts, in parallel.
	 * Reuses the currently viewed data when it already covers this range+focus. */
	async function loadDeckData(): Promise<DeckData> {
		if (
			view &&
			view.report.fromDate === range.fromDate &&
			view.report.toDate === range.toDate &&
			view.focusKey === wantFocusKey
		) {
			return view;
		}
		const [report, districtGeo] = await Promise.all([
			fetchManagementReport(range, config.focusDiseases),
			fetchGeoDistricts("", {
				fromDate: range.fromDate,
				toDate: range.toDate,
				outcomes: ALERT_OUTCOME_BUCKETS,
			}).catch(() => null), // report still renders if boundaries are unavailable
		]);
		return { report, districtGeo, focusKey: wantFocusKey };
	}

	async function handleView() {
		if (!valid || busy) return;
		setBusy("view");
		setError(null);
		try {
			setView(await loadDeckData());
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load the report."
			);
		} finally {
			setBusy(null);
		}
	}

	async function handleDownload() {
		if (!valid || busy) return;
		setBusy("download");
		setError(null);
		setLastFile(null);
		try {
			const data = await loadDeckData();
			// Keep the freshly-loaded data on screen too, so preview and file agree.
			setView(data);
			const fileName = await downloadManagementReportPptx({
				report: data.report,
				districtGeo: data.districtGeo,
				config,
			});
			setLastFile(fileName);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate the report."
			);
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Presentation className="h-4 w-4 text-uganda-red" />
						Alerts Management presentation
					</CardTitle>
					<CardDescription>
						The standard &ldquo;Alerts Management report&rdquo; for the selected
						dates: All-PHEs &amp; VHFs district tables split by Alive/Dead,
						signal sources, response cascades, alert narratives, the district
						alert map with the top-10 chart, and the signals-vs-alerts trend.
						Configure the disease focus, colours, sections and cover below, then
						view it here or download it as PowerPoint.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<DateRangePresetBar
						fromDate={range.fromDate}
						toDate={range.toDate}
						onChange={setRange}
					/>
					<div className="grid max-w-md grid-cols-2 gap-3">
						<DateRangeInputs
							fromDate={range.fromDate}
							toDate={range.toDate}
							maxDate={todayIsoDate()}
							onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
						/>
					</div>

					<DeckConfigSection
						config={config}
						onChange={updateConfig}
						focusPendingReload={
							view !== null && view.focusKey !== wantFocusKey
						}
						disabled={busy === "download"}
					/>

					{error && (
						<ErrorAlert
							error={error}
							onRetry={busy === "download" ? handleDownload : handleView}
						/>
					)}

					<div className="flex flex-wrap items-center gap-3">
						{(!view || viewStale) && (
							<Button onClick={handleView} disabled={!valid || Boolean(busy)}>
								{busy === "view" ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Eye className="mr-2 h-4 w-4" />
								)}
								{busy === "view" ? "Loading…" : "View report"}
							</Button>
						)}
						{view && (
							<Button
								variant="outline"
								onClick={() => setView(null)}
								disabled={Boolean(busy)}
							>
								<EyeOff className="mr-2 h-4 w-4" />
								Hide report
							</Button>
						)}
						<Button
							variant={view && !viewStale ? "default" : "outline"}
							onClick={handleDownload}
							disabled={!valid || Boolean(busy)}
						>
							{busy === "download" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileDown className="mr-2 h-4 w-4" />
							)}
							{busy === "download" ? "Generating…" : "Download PPT"}
						</Button>
						{valid && (
							<span className="text-xs text-muted-foreground">
								Alerts Management report (
								{formatReportRange(range.fromDate, range.toDate)})
							</span>
						)}
					</div>
					{lastFile && !busy && (
						<p className="text-xs text-emerald-700">
							Downloaded <span className="font-medium">{lastFile}</span>
						</p>
					)}
					{viewStale && view && (
						<p className="text-xs text-amber-700">
							The report below is for{" "}
							{formatReportRange(view.report.fromDate, view.report.toDate)}
							{view.focusKey !== wantFocusKey ? " (different focus)" : ""} —
							click &ldquo;View report&rdquo; to refresh it.
						</p>
					)}
				</CardContent>
			</Card>

			{view && (
				<ManagementReportView
					report={view.report}
					districtGeo={view.districtGeo}
					config={config}
				/>
			)}
		</div>
	);
}
