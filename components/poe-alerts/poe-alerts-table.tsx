import { memo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { POE_RISK_LEVEL_OPTIONS } from "@/constants/poe-alerts";
import { formatDateTime } from "@/lib/format-date";
import {
	NdwSignalsTable,
	type NdwSignalsTableProps,
} from "@/components/ndw-alerts/ndw-signals-table";

function fmtDate(v?: string) {
	return formatDateTime(v, "—");
}

function riskVariant(
	level: string
): "default" | "secondary" | "destructive" | "outline" {
	const l = level.toLowerCase();
	if (l === "high") return "destructive";
	if (l === "medium") return "default";
	return "secondary";
}

const POE_DOMAIN_COLUMNS: ColumnDef<PoeAlertRow>[] = [
	{
		accessorKey: "createdAtRemote",
		header: "Created",
		filterFn: dateRangeFilter,
		meta: { filterVariant: "dateRange" },
		cell: ({ row }) => fmtDate(row.original.createdAtRemote),
	},
	{
		accessorKey: "fullName",
		header: "Traveller",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Traveller name" },
	},
	{
		accessorKey: "passportNumber",
		header: "Passport",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Passport" },
	},
	{
		accessorKey: "nationality",
		header: "Nationality",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Nationality" },
	},
	{
		accessorKey: "portOfEntry",
		header: "Port of entry",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Port of entry" },
	},
	{
		accessorKey: "arrivalDate",
		header: "Arrival",
		filterFn: dateRangeFilter,
		meta: { filterVariant: "dateRange" },
		cell: ({ row }) => fmtDate(row.original.arrivalDate),
	},
	{
		accessorKey: "flightNumber",
		header: "Flight",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Flight" },
	},
	{
		accessorKey: "riskLevel",
		header: "Risk",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: POE_RISK_LEVEL_OPTIONS.map((level) => ({
				value: level,
				label: level.charAt(0).toUpperCase() + level.slice(1),
			})),
		},
		cell: ({ row }) => (
			<Badge variant={riskVariant(row.original.riskLevel)}>
				{row.original.riskLevel || "—"}
			</Badge>
		),
	},
	{
		accessorKey: "symptomsText",
		header: "Symptoms",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Symptoms" },
		cell: ({ row }) => (
			<span className="line-clamp-2 max-w-[240px] break-words text-xs">
				{row.original.symptomsText || "—"}
			</span>
		),
	},
	{
		accessorKey: "refCode",
		header: "Ref",
		filterFn: textIncludesFilter,
		meta: { filterPlaceholder: "Ref code" },
	},
];

type PoeAlertsTableProps = Omit<
	NdwSignalsTableProps<PoeAlertRow>,
	"title" | "domainColumns"
>;

export const PoeAlertsTable = memo<PoeAlertsTableProps>((props) => (
	<NdwSignalsTable<PoeAlertRow>
		title="POE alerts"
		domainColumns={POE_DOMAIN_COLUMNS}
		{...props}
	/>
));
PoeAlertsTable.displayName = "PoeAlertsTable";
