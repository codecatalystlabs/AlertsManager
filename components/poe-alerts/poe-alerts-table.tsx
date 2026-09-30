import { memo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Biohazard, Thermometer } from "lucide-react";
import {
	dateRangeFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { formatDateTime } from "@/lib/format-date";
import {
	poeRiskPill,
	poeScreening,
	shortPortName,
	EXPOSURE_QUESTIONS,
} from "@/lib/poe-screening";
import { cn } from "@/lib/utils";
import {
	NdwSignalsTable,
	type NdwSignalsTableProps,
} from "@/components/ndw-alerts/ndw-signals-table";

const PILL =
	"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium leading-none";

/**
 * What the traveller declared, as pills: risk (only when NDW has assessed one —
 * almost no record has), symptoms, exposures. "No symptoms" otherwise, which is
 * most of the feed, so the rows that matter stand out by colour alone.
 */
function PoeScreeningCell({ row }: { row: PoeAlertRow }) {
	const s = poeScreening(row);
	const exposureNames = EXPOSURE_QUESTIONS.filter((q) => s.exposures.includes(q.label)).map(
		(q) => q.long
	);
	if (!s.risk && s.symptoms.length === 0 && s.exposureCount === 0) {
		return <span className="text-muted-foreground">No symptoms</span>;
	}
	return (
		<div className="flex items-center gap-1">
			{s.risk && <span className={cn(PILL, "capitalize", poeRiskPill(s.risk))}>{s.risk}</span>}
			{s.symptoms.length > 0 && (
				<span
					className={cn(PILL, "border-rose-200 bg-rose-50 text-rose-700")}
					title={`Symptoms: ${s.symptoms.join(", ")}`}
				>
					<Thermometer className="h-3 w-3" />
					{s.symptoms[0]}
					{s.symptoms.length > 1 && (
						<span className="opacity-70">+{s.symptoms.length - 1}</span>
					)}
				</span>
			)}
			{s.exposureCount > 0 && (
				<span
					className={cn(PILL, "border-amber-200 bg-amber-50 text-amber-800")}
					title={
						exposureNames.length
							? `Exposure: ${exposureNames.join(", ")}`
							: `${s.exposureCount} exposure(s) declared`
					}
				>
					<Biohazard className="h-3 w-3" />
					{s.exposures.length === 1
						? s.exposures[0]
						: `${s.exposureCount} exposures`}
				</span>
			)}
		</div>
	);
}

const mono = "font-mono text-[12px]";
const LIST_TIME: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" };

const POE_DOMAIN_COLUMNS: ColumnDef<PoeAlertRow>[] = [
	{
		accessorKey: "createdAtRemote",
		header: "Created",
		filterFn: dateRangeFilter,
		meta: { filterVariant: "dateRange" },
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{formatDateTime(row.original.createdAtRemote, "—", LIST_TIME)}
			</span>
		),
	},
	{
		accessorKey: "fullName",
		header: "Traveller",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Traveller name" },
		cell: ({ row }) => (
			<span className="font-semibold">{row.original.fullName || "—"}</span>
		),
	},
	{
		accessorKey: "passportNumber",
		header: "Passport",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Passport" },
		cell: ({ row }) => <span className={mono}>{row.original.passportNumber || "—"}</span>,
	},
	{
		accessorKey: "nationality",
		header: "Nationality",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Nationality" },
		cell: ({ row }) =>
			row.original.nationality || <span className="text-muted-foreground">—</span>,
	},
	{
		accessorKey: "portOfEntry",
		header: "Port of entry",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Port of entry" },
		cell: ({ row }) => (
			<span title={row.original.portOfEntry}>
				{shortPortName(row.original.portOfEntry) || "—"}
			</span>
		),
	},
	{
		accessorKey: "flightNumber",
		header: "Flight",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Flight" },
		cell: ({ row }) => <span className={mono}>{row.original.flightNumber || "—"}</span>,
	},
	{
		// accessorKey stays symptomsText: its header filter maps to ?symptom=.
		accessorKey: "symptomsText",
		header: "Screening",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Symptom, e.g. fever" },
		cell: ({ row }) => <PoeScreeningCell row={row.original} />,
	},
	{
		accessorKey: "refCode",
		header: "Ref",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Ref code" },
		cell: ({ row }) => (
			<span className={cn(mono, "uppercase text-muted-foreground")}>
				{row.original.refCode || "—"}
			</span>
		),
	},
];

type PoeAlertsTableProps = Omit<
	NdwSignalsTableProps<PoeAlertRow>,
	"domainColumns" | "trailingColumns" | "feed" | "noun"
>;

export const PoeAlertsTable = memo<PoeAlertsTableProps>((props) => (
	<NdwSignalsTable<PoeAlertRow>
		feed="poe"
		noun="travellers"
		domainColumns={POE_DOMAIN_COLUMNS}
		{...props}
	/>
));
PoeAlertsTable.displayName = "PoeAlertsTable";
