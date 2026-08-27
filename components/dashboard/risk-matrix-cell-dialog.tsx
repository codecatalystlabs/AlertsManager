"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertCircle, Grid2x2, Loader2 } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDetailsDialog } from "@/components/alert-details-dialog";
import { fetchAlertsPage } from "@/lib/fetch-alerts";
import { RISK_BADGE_CLASS, riskLabel, normalizeRiskLevel } from "@/lib/alert-risk";
import { cn } from "@/lib/utils";
import { alertResponse } from "@/constants";
import type { Alert } from "@/lib/auth";

/** The cell the user clicked: one (likelihood, impact) pair. */
export interface RiskMatrixCellTarget {
	likelihood: string;
	impact: string;
	/** Count from the matrix, so the dialog header is instant before the fetch. */
	count: number;
}

/** Dashboard scope carried into the drill-down so the list matches the grid. */
export interface RiskMatrixScope {
	fromDate?: string;
	toDate?: string;
	district?: string;
	region?: string;
}

interface Props {
	target: RiskMatrixCellTarget | null;
	scope: RiskMatrixScope;
	onClose: () => void;
}

function responseName(code?: string | null): string {
	if (!code) return "Not specified";
	return alertResponse.find((d) => d.code === code)?.name ?? code;
}

function formatDay(value?: string | null): string {
	if (!value) return "—";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/**
 * The confirmed events behind one risk-matrix cell. Honours the dashboard's
 * active date/district/region scope plus the cell's likelihood × impact bands,
 * so the list always reconciles with the number on the grid. Each row opens the
 * full alert-details dialog.
 */
export function RiskMatrixCellDialog({ target, scope, onClose }: Props) {
	const [selected, setSelected] = useState<Alert | null>(null);

	const swr = useSWR(
		target
			? [
					"risk-matrix-cell",
					target.likelihood,
					target.impact,
					scope.fromDate ?? "",
					scope.toDate ?? "",
					scope.district ?? "all",
					scope.region ?? "all",
				]
			: null,
		() =>
			fetchAlertsPage({
				risk_likelihood: target!.likelihood,
				risk_impact: target!.impact,
				from_date: scope.fromDate || undefined,
				to_date: scope.toDate || undefined,
				district:
					scope.district && scope.district !== "all" ? scope.district : undefined,
				region: scope.region && scope.region !== "all" ? scope.region : undefined,
				limit: 200,
				sort_by: "date",
				order: "desc",
			}),
		{ revalidateOnFocus: false }
	);

	const alerts = swr.data?.data ?? [];
	const total = swr.data?.total ?? alerts.length;

	return (
		<>
			<Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="max-w-3xl gap-0 p-0">
					<DialogHeader className="border-b px-4 py-3">
						<DialogTitle className="flex items-center gap-2 text-base">
							<Grid2x2 className="h-4 w-4 text-uganda-red" />
							{target ? `${target.impact} impact × ${target.likelihood}` : ""}
						</DialogTitle>
						<DialogDescription>
							{target
								? `Confirmed events assessed at this likelihood and impact${
										total > alerts.length
											? ` — showing the ${alerts.length.toLocaleString()} most recent of ${total.toLocaleString()}`
											: ""
									}. Cell colour reflects each event's own algorithm level. Click a row for full details.`
								: ""}
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[65vh] overflow-y-auto p-4">
						{swr.isLoading && (
							<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading events…
							</div>
						)}

						{swr.error && !swr.isLoading && (
							<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
								Failed to load the events for this cell.
							</div>
						)}

						{swr.data && !swr.isLoading && alerts.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No confirmed events at this likelihood and impact for the current
								scope.
							</p>
						)}

						{alerts.length > 0 && (
							<div className="overflow-hidden rounded-md border">
								<table className="w-full text-left text-xs">
									<thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
										<tr>
											<th className="px-3 py-2 font-medium">Date</th>
											<th className="px-3 py-2 font-medium">Case</th>
											<th className="px-3 py-2 font-medium">District</th>
											<th className="px-3 py-2 font-medium">Condition</th>
											<th className="px-3 py-2 font-medium">Risk level</th>
										</tr>
									</thead>
									<tbody>
										{alerts.map((a) => {
											const level = normalizeRiskLevel(a.riskLevel);
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
															</span>
														) : null}
													</td>
													<td className="max-w-[160px] truncate px-3 py-2">
														{a.alertCaseDistrict || "—"}
													</td>
													<td className="max-w-[160px] truncate px-3 py-2">
														{responseName(a.response)}
													</td>
													<td className="px-3 py-2">
														<Badge
															variant="outline"
															className={cn(
																"whitespace-nowrap text-[10px] font-medium",
																RISK_BADGE_CLASS[level ?? "unassessed"]
															)}
														>
															{riskLabel(a.riskLevel)}
														</Badge>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
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
