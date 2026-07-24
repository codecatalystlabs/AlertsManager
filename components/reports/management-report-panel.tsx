"use client";

import { useState } from "react";
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
}

function defaultDeckRange(): { fromDate: string; toDate: string } {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 6);
	return { fromDate: toLocalISODate(from), toDate: toLocalISODate(to) };
}

/**
 * The "Alerts Management presentation" generator: pick a date range, then
 * either view the full report inside the app or download it as the standard
 * .pptx deck — both are built from the same aggregate, so they always match.
 */
export function ManagementReportPanel() {
	const [range, setRange] = useState(defaultDeckRange);
	const [busy, setBusy] = useState<"view" | "download" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lastFile, setLastFile] = useState<string | null>(null);
	const [view, setView] = useState<DeckData | null>(null);

	const valid =
		Boolean(range.fromDate && range.toDate) && range.fromDate <= range.toDate;
	// The open report no longer matches the pickers — offer a refresh.
	const viewStale =
		view !== null &&
		(view.report.fromDate !== range.fromDate ||
			view.report.toDate !== range.toDate);

	/** The deck aggregate and the map's district alert counts, in parallel.
	 * Reuses the currently viewed data when it already covers this range. */
	async function loadDeckData(): Promise<DeckData> {
		if (
			view &&
			view.report.fromDate === range.fromDate &&
			view.report.toDate === range.toDate
		) {
			return view;
		}
		const [report, districtGeo] = await Promise.all([
			fetchManagementReport(range),
			fetchGeoDistricts("", {
				fromDate: range.fromDate,
				toDate: range.toDate,
				outcomes: ALERT_OUTCOME_BUCKETS,
			}).catch(() => null), // report still renders if boundaries are unavailable
		]);
		return { report, districtGeo };
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
			const fileName = await downloadManagementReportPptx(data);
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
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Presentation className="h-4 w-4 text-uganda-red" />
						Alerts Management presentation
					</CardTitle>
					<CardDescription>
						The standard &ldquo;Alerts Management report&rdquo; for the selected
						dates: All-PHEs &amp; VHFs district tables split by Alive/Dead,
						signal sources, response cascades, alert narratives, the district
						alert map with the top-10 chart, and the signals-vs-alerts trend.
						View it here in the system or download it as PowerPoint.
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
							{formatReportRange(view.report.fromDate, view.report.toDate)} —
							click &ldquo;View report&rdquo; to refresh it for the new dates.
						</p>
					)}
				</CardContent>
			</Card>

			{view && (
				<ManagementReportView
					report={view.report}
					districtGeo={view.districtGeo}
				/>
			)}
		</div>
	);
}
