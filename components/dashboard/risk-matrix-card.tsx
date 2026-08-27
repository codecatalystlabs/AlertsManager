"use client";

import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAYOUT } from "@/constants/layout";
import { cn } from "@/lib/utils";
import { RISK_LIKELIHOODS, RISK_IMPACTS, RISK_LEVELS } from "@/lib/alert-risk";
import type { RiskMatrix } from "@/lib/fetch-dashboard";
import {
	RiskMatrixCellDialog,
	type RiskMatrixCellTarget,
	type RiskMatrixScope,
} from "./risk-matrix-cell-dialog";

interface Props {
	matrix?: RiskMatrix;
	scope: RiskMatrixScope;
	isLoading?: boolean;
}

/** Solid cell tint for a level; neutral when a cell has no assessed level. */
const CELL_TINT: Record<string, string> = {
	Low: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-emerald-200",
	Moderate: "bg-amber-100 text-amber-950 hover:bg-amber-200 border-amber-200",
	High: "bg-orange-200 text-orange-950 hover:bg-orange-300 border-orange-300",
	"Very High": "bg-red-600 text-white hover:bg-red-700 border-red-700",
	// Plotted but no algorithm level recorded on any event in the cell.
	none: "bg-slate-200 text-slate-800 hover:bg-slate-300 border-slate-300",
};

/**
 * Risk assessment matrix — the EBS §6 likelihood × impact grid, populated with
 * the confirmed events actually assessed.
 *
 * The colour rule is the whole point, and it is deliberately NOT the textbook
 * "red top-right" heat map: the guideline publishes that grid only as a shaded
 * figure, so the app never derives a level from a cell's position. Instead each
 * event is POSITIONED by its recorded likelihood/impact and the cell is COLOURED
 * by the events' own algorithm-derived levels. Plotting the two instruments
 * against each other is what lets a supervisor see where they disagree — an
 * event sitting top-right but carrying only a "Moderate" algorithm level is a
 * flag, not something the tool should paint over.
 */
export function RiskMatrixCard({ matrix, scope, isLoading }: Props) {
	const [target, setTarget] = useState<RiskMatrixCellTarget | null>(null);

	// Columns increase in likelihood left→right (canonical list is most-likely
	// first), rows descend in severity top→bottom — so the worst corner is
	// top-right, matching how a risk matrix is conventionally read.
	const columns = useMemo(() => [...RISK_LIKELIHOODS].reverse(), []);
	const cellIndex = useMemo(() => {
		const m = new Map<string, RiskMatrix["cells"][number]>();
		for (const c of matrix?.cells ?? []) m.set(`${c.likelihood}|${c.impact}`, c);
		return m;
	}, [matrix]);

	const confirmed = matrix?.confirmed ?? 0;
	const plotted = matrix?.plotted ?? 0;
	const unbanded = matrix?.unbanded ?? 0;

	return (
		<>
			<Card className={LAYOUT.card}>
				<CardHeader
					className={cn(
						LAYOUT.cardHeader,
						"flex-row items-center justify-between gap-2 space-y-0"
					)}
				>
					<CardTitle className={cn(LAYOUT.cardTitle, "flex items-center gap-2")}>
						<LayoutGrid className="h-4 w-4 text-muted-foreground" />
						Risk assessment matrix
						<span className="font-normal text-muted-foreground">
							— confirmed events by likelihood × impact
						</span>
					</CardTitle>
					{unbanded > 0 && (
						<Badge
							variant="secondary"
							className="bg-amber-100 text-[11px] font-semibold text-amber-900"
						>
							{unbanded.toLocaleString()} not yet risk-banded
						</Badge>
					)}
				</CardHeader>

				<CardContent className={LAYOUT.cardContent}>
					{isLoading && !matrix ? (
						<p className="text-xs text-muted-foreground">Loading matrix…</p>
					) : confirmed === 0 ? (
						<p className="py-6 text-center text-xs text-muted-foreground">
							No confirmed events in this scope yet — the matrix plots events once
							they are verified and risk-assessed.
						</p>
					) : (
						<div className="space-y-3">
							<p className="text-xs text-muted-foreground">
								Each confirmed event is placed by its recorded{" "}
								<strong>likelihood</strong> and <strong>impact</strong>; a cell is
								coloured by the <strong>algorithm-derived risk level</strong> of the
								events in it — never by the cell position. Click a cell to see its
								events.
							</p>

							<div className="overflow-x-auto">
								<table className="border-separate border-spacing-1 text-[11px]">
									<thead>
										<tr>
											<th className="w-16" />
											<th
												className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
												colSpan={columns.length}
											>
												Likelihood →
											</th>
										</tr>
										<tr>
											<th className="text-left align-bottom text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
												Impact ↓
											</th>
											{columns.map((col) => (
												<th
													key={col.value}
													className="px-1 pb-1 text-center align-bottom font-medium text-muted-foreground"
													title={`${col.value} (${col.probability})`}
												>
													<div className="leading-tight">{col.value}</div>
													<div className="text-[9px] font-normal text-muted-foreground/70">
														{col.probability}
													</div>
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{RISK_IMPACTS.map((row) => (
											<tr key={row.value}>
												<th
													className="pr-1 text-right align-middle font-medium text-muted-foreground"
													title={row.meaning}
												>
													{row.value}
												</th>
												{columns.map((col) => {
													const cell = cellIndex.get(`${col.value}|${row.value}`);
													const count = cell?.count ?? 0;
													const tintKey = cell
														? cell.highestLevel || "none"
														: "empty";
													if (count === 0) {
														return (
															<td
																key={col.value}
																className="h-12 w-16 rounded border border-dashed border-slate-200 bg-slate-50/50 text-center align-middle text-slate-300"
															>
																·
															</td>
														);
													}
													return (
														<td key={col.value} className="p-0">
															<button
																type="button"
																onClick={() =>
																	setTarget({
																		likelihood: col.value,
																		impact: row.value,
																		count,
																	})
																}
																title={cellTooltip(cell)}
																className={cn(
																	"flex h-12 w-16 flex-col items-center justify-center rounded border transition-colors",
																	CELL_TINT[tintKey] ?? CELL_TINT.none
																)}
															>
																<span className="text-sm font-bold tabular-nums leading-none">
																	{count}
																</span>
																{cell?.highestLevel ? (
																	<span className="mt-0.5 text-[8px] font-medium uppercase leading-none opacity-80">
																		{cell.highestLevel}
																	</span>
																) : null}
															</button>
														</td>
													);
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Level legend + honest coverage line. */}
							<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
								<div className="flex flex-wrap items-center gap-3">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										Cell colour = event risk level
									</span>
									{RISK_LEVELS.map((lvl) => (
										<span key={lvl} className="flex items-center gap-1 text-[10px]">
											<span
												className={cn(
													"inline-block h-2.5 w-2.5 rounded-sm border",
													CELL_TINT[lvl]
												)}
											/>
											{lvl}
										</span>
									))}
								</div>
								<span className="text-[10px] text-muted-foreground">
									{plotted.toLocaleString()} of {confirmed.toLocaleString()} confirmed
									events plotted
									{unbanded > 0
										? ` · ${unbanded.toLocaleString()} not yet risk-banded`
										: ""}
								</span>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<RiskMatrixCellDialog
				target={target}
				scope={scope}
				onClose={() => setTarget(null)}
			/>
		</>
	);
}

/** Hover text: the per-level breakdown of events in a cell. */
function cellTooltip(cell?: RiskMatrix["cells"][number]): string {
	if (!cell) return "";
	const parts = RISK_LEVELS.filter((l) => (cell.levels?.[l] ?? 0) > 0).map(
		(l) => `${cell.levels[l]} ${l}`
	);
	const levelText =
		parts.length > 0 ? parts.join(", ") : "no algorithm level recorded";
	return `${cell.count} event${cell.count === 1 ? "" : "s"} · ${levelText}`;
}
