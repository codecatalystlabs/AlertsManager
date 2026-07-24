import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared read-only "label / value" primitives for details dialogs.
 *
 * Previously every details dialog hand-rolled its own dt/dd markup — a compact
 * two-column grid in the eCHIS/POE dialogs and a "label : value" row in the
 * 6767 message/event dialogs. These two components are the single source of
 * truth for both shapes.
 */

export interface DetailGridRow {
	label: string;
	value: React.ReactNode;
	/** Span the full width of the grid (for long free-text / hashes). */
	span?: boolean;
}

/**
 * Compact grid of stacked `label` (above) / `value` (below) cells. Empty string
 * / null values render as an em dash. Long fields can `span` the full width.
 */
export function DetailGrid({
	rows,
	columns = 2,
	className,
}: {
	rows: DetailGridRow[];
	columns?: 2 | 3;
	className?: string;
}) {
	const colClass = columns === 3 ? "grid-cols-3" : "grid-cols-2";
	const spanClass = columns === 3 ? "col-span-3" : "col-span-2";
	return (
		<dl className={cn("grid gap-x-6 gap-y-2.5 text-sm", colClass, className)}>
			{rows.map((row) => {
				const empty = row.value == null || row.value === "";
				return (
					<div
						key={row.label}
						className={cn("min-w-0", row.span && spanClass)}
					>
						<dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
							{row.label}
						</dt>
						<dd className="break-words font-medium">
							{empty ? "—" : row.value}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}

/**
 * A single "label : value" row — label in the first column, value spanning the
 * remaining two. Renders nothing when the value is empty, so callers can map
 * over a field list without null-guarding each one. Compose inside a
 * `<dl className="grid grid-cols-1 gap-2">`.
 */
export function DetailRow({
	label,
	value,
	labelClassName,
}: {
	label: string;
	value: React.ReactNode;
	labelClassName?: string;
}) {
	if (value == null || value === "") return null;
	return (
		<div className="grid grid-cols-3 gap-2 text-sm">
			<dt className={cn("text-muted-foreground col-span-1", labelClassName)}>
				{label}
			</dt>
			<dd className="col-span-2 font-medium whitespace-pre-wrap">{value}</dd>
		</div>
	);
}
