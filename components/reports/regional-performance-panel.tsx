"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	FileDown,
	FileSpreadsheet,
	FileText,
	Loader2,
	MapPinned,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DateRangeInputs,
	DateRangePresetBar,
} from "@/components/filters/date-range-filter";
import { ErrorAlert } from "@/components/dashboard";
import { resolveDateRangePreset } from "@/lib/date-range-presets";
import {
	fetchRegionalPerformance,
	fetchReportOptions,
	todayIsoDate,
	type RegionalPerformanceReport,
} from "@/lib/fetch-reports";
import { formatReportRange } from "@/lib/management-report-pptx";
import {
	REGIONAL_COLUMNS,
	REGIONAL_REPORT_COLORS as C,
	REGIONAL_REPORT_TITLE,
	regionalTableRows,
} from "@/lib/regional-performance";
import {
	downloadRegionalPerformancePdf,
	downloadRegionalPerformancePptx,
	downloadRegionalPerformanceXlsx,
} from "@/lib/regional-performance-export";
import { cn } from "@/lib/utils";

type Format = "pptx" | "pdf" | "xlsx";

const DOWNLOADERS: Record<
	Format,
	(report: RegionalPerformanceReport) => Promise<string>
> = {
	pptx: downloadRegionalPerformancePptx,
	pdf: downloadRegionalPerformancePdf,
	xlsx: downloadRegionalPerformanceXlsx,
};

/**
 * The regional signal-performance table: per region, how far the period's
 * reports were carried down the EBS funnel (raw → triaged → signal → verified
 * → verified <24h → risk assessed → alert). The table reloads as the dates or
 * regions change, and downloads as the one-slide PowerPoint, a PDF or Excel —
 * all rendered from the same rows and the same column definitions.
 */
export function RegionalPerformancePanel() {
	// Month to date — the period the weekly deck's page reports.
	const [range, setRange] = useState(() => resolveDateRangePreset("month"));
	const [regions, setRegions] = useState<string[]>([]);
	const [regionOptions, setRegionOptions] = useState<string[]>([]);
	// The table on screen and the pickers it was loaded for.
	const [loaded, setLoaded] = useState<{
		report: RegionalPerformanceReport;
		key: string;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<Format | null>(null);
	const [lastFile, setLastFile] = useState<string | null>(null);
	const requestId = useRef(0);

	const valid =
		Boolean(range.fromDate && range.toDate) && range.fromDate <= range.toDate;
	const wantKey = [range.fromDate, range.toDate, ...[...regions].sort()].join("|");
	const report = loaded?.report ?? null;

	useEffect(() => {
		fetchReportOptions()
			.then((o) => setRegionOptions(o.regions))
			.catch(() => setRegionOptions([])); // the table still loads unfiltered
	}, []);

	const load = useCallback(async () => {
		if (!valid) return;
		const id = ++requestId.current;
		setLoading(true);
		setError(null);
		try {
			const next = await fetchRegionalPerformance(range, regions);
			// A slower earlier request must not overwrite a newer range's table.
			if (id === requestId.current) setLoaded({ report: next, key: wantKey });
		} catch (err) {
			if (id === requestId.current) {
				setError(
					err instanceof Error ? err.message : "Failed to load the report."
				);
			}
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}, [range, regions, valid, wantKey]);

	useEffect(() => {
		void load();
	}, [load]);

	async function handleDownload(format: Format) {
		if (!report || busy) return;
		setBusy(format);
		setError(null);
		setLastFile(null);
		try {
			setLastFile(await DOWNLOADERS[format](report));
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: `Failed to generate the ${format.toUpperCase()}.`
			);
		} finally {
			setBusy(null);
		}
	}

	// Downloads are built from the table on screen, so they are offered only
	// while that table matches the pickers.
	const current = loaded !== null && !loading && loaded.key === wantKey;

	return (
		<div className="space-y-3">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<MapPinned className="h-4 w-4 text-uganda-red" />
						{REGIONAL_REPORT_TITLE}
					</CardTitle>
					<CardDescription>
						For each region, how far the period&rsquo;s reports were carried
						through the EBS steps — raw data, triaged, matched to a signal,
						verified (and within 24h), risk assessed, and issued as alerts.
						Download it as a PowerPoint slide, PDF or Excel.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<DateRangePresetBar
						fromDate={range.fromDate}
						toDate={range.toDate}
						onChange={setRange}
					/>
					<div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
						<DateRangeInputs
							fromDate={range.fromDate}
							toDate={range.toDate}
							maxDate={todayIsoDate()}
							onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
						/>
						<div className="space-y-1">
							<Label className="text-xs">Regions</Label>
							<MultiSelect
								options={regionOptions.map((r) => ({ value: r, label: r }))}
								selected={regions}
								onChange={setRegions}
								allLabel="All regions"
								searchPlaceholder="Search regions…"
								ariaLabel="Regions"
								className="h-8 w-full text-xs"
							/>
						</div>
					</div>

					{error && (
						<ErrorAlert error={error} onRetry={load} retrying={loading} />
					)}

					<div className="flex flex-wrap items-center gap-2">
						<DownloadButton
							format="pptx"
							label="Download PPT"
							icon={FileDown}
							busy={busy}
							disabled={!current}
							onClick={handleDownload}
						/>
						<DownloadButton
							format="pdf"
							label="Download PDF"
							icon={FileText}
							busy={busy}
							disabled={!current}
							onClick={handleDownload}
						/>
						<DownloadButton
							format="xlsx"
							label="Download Excel"
							icon={FileSpreadsheet}
							busy={busy}
							disabled={!current}
							onClick={handleDownload}
						/>
						{lastFile && !busy && (
							<span className="text-xs text-emerald-700 dark:text-emerald-400">
								Downloaded <span className="font-medium">{lastFile}</span>
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			{report ? (
				<RegionalPerformanceTable report={report} refreshing={loading} />
			) : loading ? (
				<Skeleton className="h-80 w-full" />
			) : null}
		</div>
	);
}

function DownloadButton({
	format,
	label,
	icon: Icon,
	busy,
	disabled,
	onClick,
}: {
	format: Format;
	label: string;
	icon: typeof FileDown;
	busy: Format | null;
	disabled: boolean;
	onClick: (format: Format) => void;
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			onClick={() => onClick(format)}
			disabled={disabled || Boolean(busy)}
		>
			{busy === format ? (
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<Icon className="mr-2 h-4 w-4" />
			)}
			{busy === format ? "Generating…" : label}
		</Button>
	);
}

/**
 * The table as it appears on the slide — navy header, centred counts, the
 * grand total on pale green — so what is on screen is what gets downloaded.
 */
function RegionalPerformanceTable({
	report,
	refreshing,
}: {
	report: RegionalPerformanceReport;
	refreshing: boolean;
}) {
	const lines = regionalTableRows(report);

	return (
		<Card className={cn("transition-opacity", refreshing && "opacity-60")}>
			<CardContent className="space-y-3 pt-4">
				<div className="border-b-2 pb-2" style={{ borderColor: `#${C.green}` }}>
					{/* Navy like the slide in light mode; the theme's ink in dark,
					    where navy on a dark card would vanish. */}
					<h2 className="text-xl font-bold" style={{ color: `#${C.navy}` }}>
						<span className="dark:text-foreground">{REGIONAL_REPORT_TITLE}</span>
					</h2>
					<p className="text-xs font-semibold">
						{formatReportRange(report.fromDate, report.toDate)}
					</p>
				</div>

				{report.rows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No reports were logged in this period.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[720px] border-collapse text-sm">
							<thead>
								<tr>
									{REGIONAL_COLUMNS.map((c) => (
										<th
											key={c.key}
											scope="col"
											className="border border-slate-400 px-2 py-2 text-center font-semibold leading-tight text-white"
											style={{ backgroundColor: `#${C.navy}` }}
										>
											{c.header}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{lines.map(({ row, total }) => (
									<tr
										key={total ? "__total" : row.region}
										className={cn(total && "font-bold text-slate-900")}
										style={total ? { backgroundColor: `#${C.totalFill}` } : undefined}
									>
										{REGIONAL_COLUMNS.map((c, i) =>
											i === 0 ? (
												<th
													key={c.key}
													scope="row"
													className={cn(
														"border border-slate-300 px-2 py-1.5 text-center dark:border-slate-600",
														total ? "font-bold" : "font-normal"
													)}
												>
													{c.format(row)}
												</th>
											) : (
												<td
													key={c.key}
													className="border border-slate-300 px-2 py-1.5 text-center tabular-nums dark:border-slate-600"
												>
													{c.format(row)}
												</td>
											)
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{(report?.alertsOutsideFunnel ?? 0) > 0 && report && (
					<p className="text-[11px] text-amber-800">
						+ {report.alertsOutsideFunnel!.toLocaleString()} more alert
						{report.alertsOutsideFunnel === 1 ? " was" : "s were"} issued in this period from signals
						never coded at triage, so they are not in the table. With them, the Alerts page lists{" "}
						{(report.total.alerts + report.alertsOutsideFunnel!).toLocaleString()} for the period.
					</p>
				)}

				<dl className="grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
					{REGIONAL_COLUMNS.map((c) => (
						<div key={c.key}>
							<dt className="inline font-semibold text-foreground">{c.header}</dt>
							<dd className="inline"> — {c.description}</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}
