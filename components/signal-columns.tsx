import type { ColumnDef } from "@tanstack/react-table";
import {
	SortableHeader,
	TextSummaryCell,
	WhenCell,
	dateRangeFilter,
} from "@/components/ui/data-table";
import { findSignal } from "@/lib/ebs-signals";
import { signalReceivedAt } from "@/lib/signal-received";

/**
 * The WHEN and WHAT columns of the column standard (lib/table-columns.ts),
 * shared by the Signal Register and the Alerts table so both read a signal the
 * same way.
 */

interface ReceivedRow {
	date?: string | null;
	time?: string | null;
}

interface ReportedRow {
	signalCode?: string | null;
	history?: string | null;
	symptoms?: string | null;
	narrative?: string | null;
}

/**
 * "Received": the register's `date` (day) and `time` (clock) in one column,
 * date-only where no time was recorded. Keeps the id "date" so the server-side
 * sort and the date-range header filter carry on working unchanged.
 */
export function receivedColumn<T extends ReceivedRow>(): ColumnDef<T> {
	return {
		id: "date",
		accessorKey: "date",
		filterFn: dateRangeFilter,
		meta: {
			filterLabel: "Received",
			filterVariant: "dateRange",
		},
		header: ({ column }) => <SortableHeader column={column}>Received</SortableHeader>,
		cell: ({ row }) => {
			const { at, hasTime } = signalReceivedAt(row.original.date, row.original.time);
			return <WhenCell value={at} hasTime={hasTime} />;
		},
	} as ColumnDef<T>;
}

const squash = (v?: string | null) => (v ?? "").replace(/\s+/g, " ").trim();

/**
 * The reporter's account of what happened. `history` holds it on most rows,
 * `symptoms` on most of the rest. `narrative` is last because it is usually a
 * generated summary — "Case Name: <patient>. Age: … History: <account>" — so
 * only its History part is used, and a summary without one is skipped rather
 * than putting a patient's name in a list column.
 */
function reportText(row: ReportedRow): string {
	let text = squash(row.history) || squash(row.symptoms);
	if (!text) {
		const narrative = squash(row.narrative);
		const history = /\bHistory:\s*(.+)$/i.exec(narrative)?.[1];
		if (history) text = history;
		else if (!/^case name:/i.test(narrative)) {
			text = narrative.replace(/^signal reported:\s*/i, "");
		}
	}
	// Most reports open with "Alert" ("Alert EVD suspect…", "Alert message: …")
	// — the channel's habit, not information.
	return text.replace(/^alert(\s+message)?\s*[:\-–]?\s*/i, "");
}

/**
 * "Signal": WHAT was reported. The EBS signal triage classified it as, when it
 * has one, followed by the reporter's own words; just the words otherwise.
 *
 * One line, cut to fit, by default — the register is a worklist scanned for
 * the next row to act on. A table read for the account itself (the Alerts
 * page) passes `lines` to wrap it, with its own header and width.
 */
export function signalColumn<T extends ReportedRow>(
	options: { header?: string; lines?: number; size?: number } = {}
): ColumnDef<T> {
	const { header = "Signal", lines, size } = options;
	const wrapped = !!lines && lines > 1;
	return {
		id: "signal",
		header,
		enableSorting: false,
		// Free text; the top search box already searches it server-side.
		enableColumnFilter: false,
		...(size !== undefined ? { size } : {}),
		...(wrapped ? { meta: { wrap: true, minWidth: 240 } } : {}),
		accessorFn: (row) => reportText(row),
		cell: ({ row }) => {
			const signal = findSignal(row.original.signalCode);
			const text = reportText(row.original);
			return (
				<TextSummaryCell
					badge={signal?.code}
					badgeTitle={signal ? `${signal.code} — ${signal.label}` : undefined}
					text={text || signal?.label}
					lines={lines}
					maxWidthClass={wrapped ? "max-w-none" : undefined}
				/>
			);
		},
	} as ColumnDef<T>;
}
