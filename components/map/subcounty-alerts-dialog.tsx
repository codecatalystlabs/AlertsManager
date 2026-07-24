"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertCircle, Loader2, MapPin } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDetailsDialog } from "@/components/alert-details-dialog";
import {
	fetchGeoSubcountyAlerts,
	type GeoQuery,
	type SubcountyAlertsResult,
} from "@/lib/fetch-geo";
import { deriveAlertOutcome, OUTCOME_NOT_RECORDED } from "@/lib/alert-outcome";
import { alertResponse } from "@/constants";
import type { Alert } from "@/lib/auth";

/** What the user clicked on the map: one subcounty, or the unassigned chip. */
export interface SubcountyAlertsTarget {
	districtUid: string;
	districtName: string;
	/** Shape name of the clicked subcounty; undefined for the unassigned list. */
	subcounty?: string;
	unassigned?: boolean;
}

interface SubcountyAlertsDialogProps {
	target: SubcountyAlertsTarget | null;
	query: GeoQuery;
	onClose: () => void;
}

/** Resolve a response code (e.g. "ViralHemorrhagicFever") to its display name. */
function responseName(code?: string | null): string {
	if (!code) return "Not specified";
	return alertResponse.find((d) => d.code === code)?.name ?? code;
}

function formatDay(value?: string | null): string {
	if (!value) return "—";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** Top-N label/count breakdown of the listed alerts, by an arbitrary key. */
function breakdown(
	alerts: Alert[],
	keyOf: (a: Alert) => string,
	limit = 6
): { label: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const a of alerts) {
		const k = keyOf(a);
		counts.set(k, (counts.get(k) ?? 0) + 1);
	}
	return Array.from(counts, ([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		.slice(0, limit);
}

/**
 * The drill-down list behind a subcounty's count on the Signals Map: a
 * condition/outcome breakdown plus the individual signals, each openable in
 * the full alert-details dialog. Honours the map's active date range and
 * response/outcome filters, so the list always reconciles with the polygon.
 */
export function SubcountyAlertsDialog({
	target,
	query,
	onClose,
}: SubcountyAlertsDialogProps) {
	const [selected, setSelected] = useState<Alert | null>(null);

	const swr = useSWR<SubcountyAlertsResult>(
		target
			? [
					"geo-subcounty-alerts",
					target.districtUid,
					target.unassigned ? "__unassigned__" : target.subcounty,
					query.fromDate,
					query.toDate,
					[...(query.responses ?? [])].sort().join(","),
					[...(query.outcomes ?? [])].sort().join(","),
				]
			: null,
		() =>
			fetchGeoSubcountyAlerts(
				(target as SubcountyAlertsTarget).districtUid,
				{
					subcounty: target?.subcounty,
					unassigned: target?.unassigned,
				},
				query
			),
		{ revalidateOnFocus: false }
	);

	const alerts = swr.data?.alerts ?? [];

	const byCondition = useMemo(
		() => breakdown(alerts, (a) => responseName(a.response)),
		[alerts]
	);
	const byOutcome = useMemo(
		() => breakdown(alerts, (a) => deriveAlertOutcome(a)),
		[alerts]
	);

	const title = target
		? target.unassigned
			? `Unassigned signals — ${target.districtName}`
			: `${target.subcounty}, ${target.districtName}`
		: "";

	return (
		<>
			<Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="max-w-3xl gap-0 p-0">
					<DialogHeader className="border-b px-4 py-3">
						<DialogTitle className="flex items-center gap-2 text-base">
							<MapPin className="h-4 w-4 text-uganda-red" />
							{title}
						</DialogTitle>
						<DialogDescription>
							{swr.data
								? `${swr.data.total.toLocaleString()} signal${swr.data.total === 1 ? "" : "s"} in the selected period${
										swr.data.total > alerts.length
											? ` — showing the ${alerts.length.toLocaleString()} most recent`
											: ""
									}. Click a row for full details.`
								: "Signals behind this area's count on the map."}
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[65vh] overflow-y-auto p-4">
						{swr.isLoading && (
							<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading signals…
							</div>
						)}

						{swr.error && !swr.isLoading && (
							<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
								{swr.error instanceof Error
									? swr.error.message
									: "Failed to load the signals for this area."}
							</div>
						)}

						{swr.data && !swr.isLoading && alerts.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No signals in this area for the selected period and filters.
							</p>
						)}

						{alerts.length > 0 && (
							<div className="space-y-4">
								{/* Breakdown of the count */}
								<div className="grid gap-3 sm:grid-cols-2">
									<BreakdownCard title="By condition" rows={byCondition} />
									<BreakdownCard title="By verification outcome" rows={byOutcome} />
								</div>

								{/* The individual signals */}
								<div className="overflow-hidden rounded-md border">
									<table className="w-full text-left text-xs">
										<thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
											<tr>
												<th className="px-3 py-2 font-medium">Date</th>
												<th className="px-3 py-2 font-medium">Case</th>
												<th className="px-3 py-2 font-medium">Condition</th>
												<th className="px-3 py-2 font-medium">Status</th>
												<th className="px-3 py-2 font-medium">Outcome</th>
											</tr>
										</thead>
										<tbody>
											{alerts.map((a) => {
												const outcome = deriveAlertOutcome(a);
												return (
													<tr
														key={a.id}
														className="cursor-pointer border-t transition-colors hover:bg-muted/40"
														onClick={() => setSelected(a)}
													>
														<td className="whitespace-nowrap px-3 py-2">
															{formatDay(a.date)}
														</td>
														<td className="max-w-[180px] truncate px-3 py-2">
															{a.alertCaseName || "—"}
															{a.alertCaseAge ? (
																<span className="text-muted-foreground">
																	{" "}
																	· {a.alertCaseAge}y
																	{a.alertCaseSex
																		? ` ${a.alertCaseSex.charAt(0).toUpperCase()}`
																		: ""}
																</span>
															) : null}
														</td>
														<td className="max-w-[180px] truncate px-3 py-2">
															{responseName(a.response)}
														</td>
														<td className="px-3 py-2">{a.status || "—"}</td>
														<td className="px-3 py-2">
															<Badge
																variant={
																	outcome === OUTCOME_NOT_RECORDED
																		? "outline"
																		: "secondary"
																}
																className="whitespace-nowrap text-[10px] font-normal"
															>
																{outcome === OUTCOME_NOT_RECORDED
																	? "Pending"
																	: outcome}
															</Badge>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{selected && (
				<AlertDetailsDialog
					isOpen={Boolean(selected)}
					onClose={() => setSelected(null)}
					alert={selected}
				/>
			)}
		</>
	);
}

function BreakdownCard({
	title,
	rows,
}: {
	title: string;
	rows: { label: string; count: number }[];
}) {
	return (
		<div className="rounded-md border p-3">
			<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</p>
			<div className="space-y-1">
				{rows.map((r) => (
					<div key={r.label} className="flex items-center justify-between gap-2 text-xs">
						<span className="truncate">{r.label}</span>
						<span className="shrink-0 font-semibold tabular-nums">
							{r.count.toLocaleString()}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
