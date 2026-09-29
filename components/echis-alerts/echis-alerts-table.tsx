import { memo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
	dateRangeFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { formatDateTime } from "@/lib/format-date";
import {
	NdwSignalsTable,
	type NdwSignalsTableProps,
} from "@/components/ndw-alerts/ndw-signals-table";

function fmtDate(v?: string) {
	return formatDateTime(v, "—");
}

const ECHIS_DOMAIN_COLUMNS: ColumnDef<EchisAlertRow>[] = [
	{
		accessorKey: "date",
		header: "Date",
		filterFn: dateRangeFilter,
		meta: { filterVariant: "dateRange" },
		cell: ({ row }) => fmtDate(row.original.date),
	},
	{
		accessorKey: "district",
		header: "District",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "District" },
	},
	{
		accessorKey: "county",
		header: "County",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "County" },
	},
	{
		accessorKey: "subCounty",
		header: "Sub-county",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Sub-county" },
	},
	{
		accessorKey: "healthFacility",
		header: "Health facility",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Health facility" },
	},
	{
		accessorKey: "vhtName",
		header: "VHT name",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "VHT name" },
		cell: ({ row }) => row.original.vhtName || "—",
	},
	{
		accessorKey: "vhtPhone",
		header: "VHT phone",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "VHT phone" },
		cell: ({ row }) => row.original.vhtPhone || "—",
	},
	// NOTE: the "Verification" column was hidden on request (2026-08-28). It is
	// the eCHIS feed's OWN status field, which reads "Pending Verification" on
	// essentially every row — a column that never varies is a column that says
	// nothing. The value is still on the record and still shown per row in the
	// details dialog; what a signal's verification means to THIS system is
	// carried by "In alerts" and "Forwarded" instead.
	{
		accessorKey: "briefDescription",
		header: "Description",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Description" },
		cell: ({ row }) => (
			<span className="line-clamp-2 max-w-[240px] break-words text-xs">
				{row.original.briefDescription || "—"}
			</span>
		),
	},
	{
		accessorKey: "additionalInformation",
		header: "Additional info",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Additional info" },
		cell: ({ row }) => (
			<span className="line-clamp-2 max-w-[240px] break-words text-xs">
				{row.original.additionalInformation || "—"}
			</span>
		),
	},
];

type EchisAlertsTableProps = Omit<
	NdwSignalsTableProps<EchisAlertRow>,
	"title" | "domainColumns"
>;

export const EchisAlertsTable = memo<EchisAlertsTableProps>((props) => (
	<NdwSignalsTable<EchisAlertRow>
		title="eCHIS signals"
		domainColumns={ECHIS_DOMAIN_COLUMNS}
		{...props}
	/>
));
EchisAlertsTable.displayName = "EchisAlertsTable";
