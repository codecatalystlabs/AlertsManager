import { memo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
	dateRangeFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { echisSignalMeta } from "@/lib/echis-signals";
import { cn } from "@/lib/utils";
import {
	NdwSignalsTable,
	type NdwSignalsTableProps,
} from "@/components/ndw-alerts/ndw-signals-table";

/** Coloured pill for the community signal type — the first thing to read. */
export function EchisSignalPill({ code }: { code?: string | null }) {
	const meta = echisSignalMeta(code);
	const Icon = meta.icon;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium leading-none",
				meta.pill
			)}
		>
			<Icon className="h-3 w-3" />
			{meta.label}
		</span>
	);
}

const LIST_TIME: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" };

/** "Kazinga Health Centre III" → "Kazinga HC III", the form used on the ground. */
const shortFacility = (v: string) => v.replace(/\bHealth Cent(re|er)\b/gi, "HC");

const stripDistrict = (v?: string) => (v ?? "").replace(/\s+District$/i, "").trim();

const ECHIS_DOMAIN_COLUMNS: ColumnDef<EchisAlertRow>[] = [
	{
		// The day filter runs on `date` (the report's day); the cell prefers the
		// real report time the newer feed sends, since `date` carries no time.
		accessorKey: "date",
		header: "Reported",
		filterFn: dateRangeFilter,
		meta: { filterVariant: "dateRange" },
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{row.original.reportedAt
					? formatDateTime(row.original.reportedAt, "—", LIST_TIME)
					: formatDate(row.original.date, "—")}
			</span>
		),
	},
	{
		// Filtered by the signal tiles above the table, not a header funnel.
		accessorKey: "signalReported",
		header: "Signal",
		enableColumnFilter: false,
		cell: ({ row }) => <EchisSignalPill code={row.original.signalReported} />,
	},
	{
		accessorKey: "district",
		header: "District",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "District" },
		cell: ({ row }) => (
			<span className="font-semibold">{stripDistrict(row.original.district) || "—"}</span>
		),
	},
	{
		accessorKey: "subCounty",
		header: "Sub-county · village",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Sub-county" },
		cell: ({ row }) => (
			<span>
				{row.original.subCounty || "—"}
				{row.original.village && (
					<span className="text-muted-foreground"> · {row.original.village}</span>
				)}
			</span>
		),
	},
	{
		accessorKey: "healthFacility",
		header: "Health facility",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Health facility" },
		cell: ({ row }) =>
			row.original.healthFacility ? (
				<span title={row.original.healthFacility}>
					{shortFacility(row.original.healthFacility)}
				</span>
			) : (
				<span className="text-muted-foreground">—</span>
			),
	},
	{
		accessorKey: "vhtName",
		header: "VHT",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "VHT name" },
		cell: ({ row }) => (
			<span>
				{row.original.vhtName || "—"}
				{row.original.vhtPhone && (
					<span className="ml-1.5 font-mono text-[12px] text-muted-foreground">
						{row.original.vhtPhone}
					</span>
				)}
			</span>
		),
	},
];

// After Status: free text, truncated anyway, so it is the column to scroll to.
const ECHIS_TRAILING_COLUMNS: ColumnDef<EchisAlertRow>[] = [
	// NOTE: the eCHIS feed's own "Verification" column stays hidden (2026-08-28):
	// it reads "Pending Verification" on every row. What verification means to
	// THIS system is the Status column (forwarded / in alerts + their chips).
	{
		accessorKey: "briefDescription",
		header: "Description",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Description" },
		cell: ({ row }) => {
			// The newer feed often leaves the brief description empty and puts
			// the account in "additional information".
			const text = row.original.briefDescription || row.original.additionalInformation;
			return text ? (
				<span className="block max-w-[200px] truncate" title={text}>
					{text}
				</span>
			) : (
				<span className="text-muted-foreground">—</span>
			);
		},
	},
];

type EchisAlertsTableProps = Omit<
	NdwSignalsTableProps<EchisAlertRow>,
	"domainColumns" | "trailingColumns" | "feed" | "noun"
>;

export const EchisAlertsTable = memo<EchisAlertsTableProps>((props) => (
	<NdwSignalsTable<EchisAlertRow>
		feed="echis"
		noun="signals"
		domainColumns={ECHIS_DOMAIN_COLUMNS}
		trailingColumns={ECHIS_TRAILING_COLUMNS}
		{...props}
	/>
));
EchisAlertsTable.displayName = "EchisAlertsTable";
