"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	FileDown,
	FileSpreadsheet,
	FileText,
	Loader2,
	MapPin,
	MapPinned,
	X,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DateRangeInputs,
	DateRangePresetBar,
} from "@/components/filters/date-range-filter";
import { ErrorAlert } from "@/components/dashboard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isDistrictScoped, isRegionScoped } from "@/lib/access";
import { describeDateRange, resolveDateRangePreset, toLocalISODate } from "@/lib/date-range-presets";
import {
	fetchDistrictUnits,
	fetchRegions,
	fetchSubcountiesByDistrict,
} from "@/lib/fetch-admin-units";
import {
	fetchSignalPerformance,
	todayIsoDate,
	type PerformanceFilterValues,
	type PerformanceLevel,
	type RegionalPerformanceReport,
} from "@/lib/fetch-reports";
import { formatReportRange } from "@/lib/management-report-pptx";
import {
	REGIONAL_REPORT_COLORS as C,
	formatPerformanceScope,
	performanceColumns,
	performanceDistrictName,
	performanceDistrictOptions,
	performanceReportTitle,
	regionalTableRows,
	sortPerformanceRows,
	type PerformanceSort,
} from "@/lib/regional-performance";
import {
	downloadRegionalPerformancePdf,
	downloadRegionalPerformancePptx,
	downloadRegionalPerformanceXlsx,
} from "@/lib/regional-performance-export";
import { SIGNAL_ORIGINS, type SignalOriginFilter } from "@/lib/signal-origin";
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

const NO_FILTERS: PerformanceFilterValues = {
	regions: [],
	districts: [],
	division: "all",
	origin: "all",
};

const DESCRIPTIONS: Record<PerformanceLevel, string> = {
	region:
		"For each region, how far the period’s reports were carried through the EBS steps — raw data, triaged, matched to a signal, verified (and within 24h), risk assessed, and issued as alerts. Download it as a PowerPoint slide, PDF or Excel.",
	district:
		"The same EBS steps for each district. Pick regions to see all of their districts, including those that reported nothing; click a column header to rank the districts. Download it as PowerPoint, PDF or Excel.",
};

/** The regional signal-performance table (Reports → Regional performance). */
export function RegionalPerformancePanel() {
	return <SignalPerformancePanel level="region" />;
}

/** The district signal-performance table (Reports → District performance). */
export function DistrictPerformancePanel() {
	return <SignalPerformancePanel level="district" />;
}

/**
 * A signal-performance table: per region or per district, how far the
 * period's reports were carried down the EBS funnel (raw → triaged → signal →
 * verified → verified <24h → risk assessed → alert). The table reloads as the
 * dates or filters change, and downloads as PowerPoint, PDF or Excel — all
 * rendered from the same rows, in the order on screen.
 */
function SignalPerformancePanel({ level }: { level: PerformanceLevel }) {
	const title = performanceReportTitle(level);
	// Month to date — the period the weekly deck's page reports.
	const [range, setRange] = useState(() => resolveDateRangePreset("month"));
	const [filters, setFilters] = useState<PerformanceFilterValues>(NO_FILTERS);
	const [sort, setSort] = useState<PerformanceSort>(null);
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

	// Access scope: the server enforces it whatever is sent; the pickers only
	// mirror it so a scoped user is not offered choices that do nothing.
	const user = useCurrentUser();
	const scopedToDistrict = isDistrictScoped(user);
	const scopedToRegion = !scopedToDistrict && isRegionScoped(user);
	const assignedDistrict = user?.district?.trim() || "";
	const assignedRegion = user?.region?.trim() || "";

	const { data: regionUnits } = useSWR("region-options", fetchRegions);
	const { data: districtUnits } = useSWR("district-units", fetchDistrictUnits);

	// Regions that hold districts — the retired "West Nile" holds none (its
	// districts moved to Arua and Yumbe) and would only offer an empty pick.
	const regionOptions = useMemo(() => {
		const withDistricts = new Set((districtUnits ?? []).map((d) => d.regionId));
		return (regionUnits ?? [])
			.filter((r) => !districtUnits || withDistricts.has(r.id))
			.map((r) => r.name);
	}, [regionUnits, districtUnits]);

	const districtRegions = useMemo(
		() => (scopedToRegion ? [assignedRegion] : filters.regions),
		[scopedToRegion, assignedRegion, filters.regions]
	);
	const districtOptions = useMemo(
		() => performanceDistrictOptions(districtUnits ?? [], regionUnits ?? [], districtRegions),
		[districtUnits, regionUnits, districtRegions]
	);

	// Divisions only mean something inside one district.
	const divisionDistrict = scopedToDistrict
		? performanceDistrictName(assignedDistrict)
		: filters.districts.length === 1
			? filters.districts[0]
			: "";
	const { data: divisionOptions, isLoading: divisionsLoading } = useSWR(
		divisionDistrict && districtUnits ? ["performance-divisions", divisionDistrict] : null,
		() => divisionsFor(districtUnits ?? [], divisionDistrict)
	);

	const setRegions = (regions: string[]) => {
		// A district outside the new regions would silently empty the table.
		const keep = new Set(
			performanceDistrictOptions(districtUnits ?? [], regionUnits ?? [], regions).map(
				(d) => d.name
			)
		);
		setFilters((f) => {
			const districts = f.districts.filter((d) => keep.has(d));
			return {
				...f,
				regions,
				districts,
				division: sameList(districts, f.districts) ? f.division : "all",
			};
		});
	};
	const setDistricts = (districts: string[]) =>
		setFilters((f) => ({
			...f,
			districts,
			division: sameList(districts, f.districts) ? f.division : "all",
		}));

	const activeFilters =
		filters.regions.length > 0 ||
		filters.districts.length > 0 ||
		filters.division !== "all" ||
		filters.origin !== "all";

	const valid =
		Boolean(range.fromDate && range.toDate) && range.fromDate <= range.toDate;
	const wantKey = JSON.stringify([
		range.fromDate,
		range.toDate,
		[...filters.regions].sort(),
		[...filters.districts].sort(),
		filters.division,
		filters.origin,
	]);
	const report = loaded?.report ?? null;

	const load = useCallback(async () => {
		if (!valid) return;
		const id = ++requestId.current;
		setLoading(true);
		setError(null);
		try {
			const next = await fetchSignalPerformance(level, range, filters);
			if (id !== requestId.current) return; // a newer request owns the table
			// An API older than the filters ignores them and answers for
			// everything — a table that silently disagrees with its pickers.
			const narrowed =
				filters.districts.length > 0 || filters.division !== "all" || filters.origin !== "all";
			if (narrowed && !next.filters) {
				setError(
					"The API server is out of date and ignored these filters. Restart the backend to pick up the new report."
				);
				return;
			}
			setLoaded({ report: next, key: wantKey });
		} catch (err) {
			if (id === requestId.current) {
				setError(
					err instanceof Error ? err.message : "Failed to load the report."
				);
			}
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}, [level, range, filters, valid, wantKey]);

	useEffect(() => {
		void load();
	}, [load]);

	// The rows in the order on screen — the downloads print the same order.
	const shown = useMemo(
		() =>
			report ? { ...report, rows: sortPerformanceRows(report.rows, level, sort) } : null,
		[report, level, sort]
	);

	async function handleDownload(format: Format) {
		if (!shown || busy) return;
		setBusy(format);
		setError(null);
		setLastFile(null);
		try {
			setLastFile(await DOWNLOADERS[format](shown));
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
						{title}
					</CardTitle>
					<CardDescription>{DESCRIPTIONS[level]}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<DateRangePresetBar
						fromDate={range.fromDate}
						toDate={range.toDate}
						onChange={setRange}
					/>
					<div className="flex flex-wrap items-end gap-3">
						<div className="grid w-full grid-cols-2 gap-3 sm:w-[300px]">
							<DateRangeInputs
								fromDate={range.fromDate}
								toDate={range.toDate}
								maxDate={todayIsoDate()}
								onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
							/>
						</div>

						{scopedToDistrict || scopedToRegion ? (
							<FilterField label={scopedToDistrict ? "District" : "Region"}>
								<div
									className="flex h-8 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 text-xs font-medium"
									title={`You can only see data for your assigned ${scopedToDistrict ? "district" : "region"}`}
								>
									<MapPin className="h-3.5 w-3.5 text-uganda-red" />
									{scopedToDistrict
										? assignedDistrict || "No district assigned"
										: assignedRegion || "No region assigned"}
								</div>
							</FilterField>
						) : (
							<FilterField label="Regions">
								<MultiSelect
									options={regionOptions.map((r) => ({ value: r, label: r }))}
									selected={filters.regions}
									onChange={setRegions}
									allLabel="All regions"
									searchPlaceholder="Search regions…"
									ariaLabel="Regions"
									className="w-[170px]"
								/>
							</FilterField>
						)}

						{!scopedToDistrict && (
							<FilterField label="Districts">
								<MultiSelect
									options={districtOptions.map((d) => ({ value: d.name, label: d.name }))}
									selected={filters.districts}
									onChange={setDistricts}
									allLabel="All districts"
									searchPlaceholder="Search districts…"
									ariaLabel="Districts"
									className="w-[170px]"
								/>
							</FilterField>
						)}

						<FilterField label="Division">
							<Select
								value={filters.division}
								onValueChange={(division) => setFilters((f) => ({ ...f, division }))}
								disabled={!divisionDistrict || divisionsLoading}
							>
								<SelectTrigger
									className="h-8 w-[170px] text-xs"
									aria-label="Division"
									title={divisionDistrict ? undefined : "Choose one district first"}
								>
									<SelectValue placeholder={divisionsLoading ? "Loading…" : "All divisions"} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All divisions</SelectItem>
									{(divisionOptions ?? []).map((d) => (
										<SelectItem key={d} value={d}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FilterField>

						<FilterField label="Came in via">
							<Select
								value={filters.origin}
								onValueChange={(origin) =>
									setFilters((f) => ({ ...f, origin: origin as SignalOriginFilter }))
								}
							>
								<SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Came in via">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Any origin</SelectItem>
									{SIGNAL_ORIGINS.map((o) => (
										<SelectItem key={o.value} value={o.value} title={o.hint}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FilterField>

						{activeFilters && (
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-xs"
								onClick={() => setFilters(NO_FILTERS)}
							>
								<X className="mr-1 h-3.5 w-3.5" />
								Clear filters
							</Button>
						)}
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

			{shown ? (
				<PerformanceTable
					report={shown}
					level={level}
					sort={sort}
					onSort={setSort}
					refreshing={loading}
					filtered={activeFilters}
					onJumpToRange={setRange}
				/>
			) : loading ? (
				<Skeleton className="h-80 w-full" />
			) : null}
		</div>
	);
}

/** Divisions of a district as the tables name it — "Gulu" spans the Gulu
 * City and Gulu District units, so both units' divisions are offered. */
async function divisionsFor(
	units: { id: number; name: string }[],
	district: string
): Promise<string[]> {
	const target = district.toLowerCase();
	const ids = units
		.filter((u) => performanceDistrictName(u.name).toLowerCase() === target)
		.map((u) => u.id);
	const lists = await Promise.all(ids.map((id) => fetchSubcountiesByDistrict(id)));
	const names = new Map<string, string>();
	for (const o of lists.flat()) {
		const name = o.name.trim();
		if (name) names.set(name.toLowerCase(), name);
	}
	return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function sameList(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<Label className="text-[11px]">{label}</Label>
			{children}
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

/** The calendar month a YYYY-MM-DD falls in, up to today at most. */
function monthOf(iso: string): { fromDate: string; toDate: string } | null {
	const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]) - 1;
	const end = new Date(year, month + 1, 0);
	const today = new Date();
	return {
		fromDate: toLocalISODate(new Date(year, month, 1)),
		toDate: toLocalISODate(end > today ? today : end),
	};
}

/**
 * Why the table is all zeros. Recent periods are where this happens — a
 * database copy that ends on 30 Sep reads as a broken date picker when "This
 * month" is 1–5 Oct — so it says where the data stops.
 */
function EmptyPeriodNote({
	report,
	filtered,
	onJump,
}: {
	report: RegionalPerformanceReport;
	filtered: boolean;
	onJump?: (range: { fromDate: string; toDate: string }) => void;
}) {
	const latest = report.latestSignalDate;
	const latestLabel = latest
		? new Date(`${latest}T00:00:00`).toLocaleDateString("en-GB", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
		: null;
	// One click to the month the latest report falls in, rather than a hint
	// to go and find it: the whole month, up to today.
	const jump = latest ? monthOf(latest) : null;
	return (
		<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
			<p className="font-medium">
				No reports were logged for {formatReportRange(report.fromDate, report.toDate)}
				{filtered ? " under these filters" : ""}.
			</p>
			{latestLabel ? (
				<p className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span>
						The most recent report{filtered ? " matching them" : ""} is dated {latestLabel}.
					</span>
					{jump && onJump && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-6 border-amber-300 bg-white px-2 text-[11px] text-amber-900 hover:bg-amber-100 dark:bg-transparent dark:text-amber-200"
							onClick={() => onJump(jump)}
						>
							Show {describeDateRange(jump.fromDate, jump.toDate, { kind: "month" })}
						</Button>
					)}
				</p>
			) : (
				filtered && <p>Try clearing a filter or widening the dates.</p>
			)}
		</div>
	);
}

/** Next sort for a header click: numbers rank highest first, names A→Z;
 * a third click returns to the lookup order. */
function nextSort(current: PerformanceSort, key: string, label: boolean): PerformanceSort {
	const first = label ? "asc" : "desc";
	if (current?.key !== key) return { key, dir: first };
	if (current.dir === first) return { key, dir: first === "asc" ? "desc" : "asc" };
	return null;
}

/**
 * The table as it appears on the slide — navy header, centred counts, the
 * grand total on pale green — so what is on screen is what gets downloaded.
 */
function PerformanceTable({
	report,
	level,
	sort,
	onSort,
	refreshing,
	filtered,
	onJumpToRange,
}: {
	report: RegionalPerformanceReport;
	level: PerformanceLevel;
	sort: PerformanceSort;
	onSort: (sort: PerformanceSort) => void;
	refreshing: boolean;
	filtered: boolean;
	/** Set the date range — the empty-period note's "Show <month>" button. */
	onJumpToRange?: (range: { fromDate: string; toDate: string }) => void;
}) {
	const columns = performanceColumns(level);
	const lines = regionalTableRows(report);
	const scope = formatPerformanceScope(report.filters);
	const places = level === "district" ? "district" : "region";
	const silent = report.rows.filter((r) => r.rawData === 0).length;

	return (
		<Card className={cn("transition-opacity", refreshing && "opacity-60")}>
			<CardContent className="space-y-3 pt-4">
				<div className="border-b-2 pb-2" style={{ borderColor: `#${C.green}` }}>
					{/* Navy like the slide in light mode; the theme's ink in dark,
					    where navy on a dark card would vanish. */}
					<h2 className="text-xl font-bold" style={{ color: `#${C.navy}` }}>
						<span className="dark:text-foreground">{performanceReportTitle(level)}</span>
					</h2>
					<p className="text-xs font-semibold">
						{formatReportRange(report.fromDate, report.toDate)}
						{scope && <span className="font-normal text-muted-foreground"> · {scope}</span>}
					</p>
					{report.rows.length > 0 && (
						<p className="text-[11px] text-muted-foreground">
							{report.rows.length.toLocaleString()} {places}
							{report.rows.length === 1 ? "" : "s"}
							{silent > 0 && ` · ${silent} reported nothing in the period`}
						</p>
					)}
				</div>

				{report.total.rawData === 0 && (
					<EmptyPeriodNote report={report} filtered={filtered} onJump={onJumpToRange} />
				)}

				{report.rows.length === 0 ? null : (
					<div
						className={cn(
							"overflow-x-auto",
							level === "district" && "max-h-[70vh] overflow-y-auto"
						)}
					>
						<table className="w-full min-w-[720px] border-collapse text-sm">
							<thead className="sticky top-0 z-10">
								<tr>
									{columns.map((c) => {
										const label = c.key === "region" || c.key === "district";
										const active = sort?.key === c.key;
										const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
										return (
											<th
												key={c.key}
												scope="col"
												title={c.description}
												aria-sort={
													active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
												}
												className="border border-slate-400 p-0 text-center font-semibold leading-tight text-white"
												style={{ backgroundColor: `#${C.navy}` }}
											>
												<button
													type="button"
													onClick={() => onSort(nextSort(sort, c.key, label))}
													className="inline-flex w-full items-center justify-center gap-1 px-2 py-2 hover:bg-white/10"
												>
													{c.header}
													<Icon className={cn("h-3 w-3 shrink-0", !active && "opacity-40")} />
												</button>
											</th>
										);
									})}
								</tr>
							</thead>
							<tbody>
								{lines.map(({ row, total }) => (
									<tr
										key={total ? "__total" : `${row.region}|${row.district ?? ""}`}
										className={cn(
											total && "font-bold text-slate-900",
											!total && row.rawData === 0 && "text-muted-foreground"
										)}
										style={total ? { backgroundColor: `#${C.totalFill}` } : undefined}
									>
										{columns.map((c, i) =>
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

				{(report.verifiedInPeriod ?? 0) > report.total.verified && (
					<p className="text-[11px] text-amber-800">
						Verified counts only signals coded at triage (each column nests in the one before).
						In all, {report.verifiedInPeriod!.toLocaleString()} signal
						{report.verifiedInPeriod === 1 ? " was" : "s were"} verified in this period under these
						filters — the dashboard&apos;s &ldquo;Verified&rdquo; for the same dates.
					</p>
				)}
				{(report.alertsOutsideFunnel ?? 0) > 0 && (
					<p className="text-[11px] text-amber-800">
						+ {report.alertsOutsideFunnel!.toLocaleString()} more alert
						{report.alertsOutsideFunnel === 1 ? " was" : "s were"} issued in this period from signals
						never coded at triage, so they are not in the table.{" "}
						{scope
							? `With them, ${(report.total.alerts + report.alertsOutsideFunnel!).toLocaleString()} alerts were issued under these filters.`
							: `With them, the Alerts page lists ${(report.total.alerts + report.alertsOutsideFunnel!).toLocaleString()} for the period.`}
					</p>
				)}

				<dl className="grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
					{columns.map((c) => (
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
