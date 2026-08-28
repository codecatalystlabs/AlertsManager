import { altCode } from "@/lib/alt-code";
import { type ColumnDef } from "@tanstack/react-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	SortableHeader,
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import { MoreHorizontal, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sourceOfAlertOptions } from "@/lib/source-of-alert";
import { spotRepIsMandated } from "@/lib/spotrep";
import {
	VerificationBadge,
	statusBadgeClass,
} from "@/components/ui/status-badges";

export const ALERTS_CONFIG = {
	PAGE_TITLE: "Alerts Management",
	PAGE_DESCRIPTION:
		"Signals that completed the pipeline — confirmed, risk-assessed, and fed back to the reporter. Issue the spot report from here.",
	ITEMS_PER_PAGE: 10,
	EXPORT_FILENAME_PREFIX: "alerts_export",
} as const;

export const STATUS_OPTIONS = [
	{ value: "all", label: "All Statuses" },
	{ value: "Alive", label: "Alive" },
	{ value: "Dead", label: "Dead" },
	{ value: "Unknown", label: "Unknown" },
	{ value: "Pending", label: "Pending" },
] as const;

export const VERIFICATION_FILTER_OPTIONS = [
	{ value: "all", label: "All Verification" },
	{ value: "verified", label: "Verified" },
	{ value: "pending", label: "Pending Verification" },
] as const;

export interface AlertsTableCallbacks {
	onView?: (alert: AlertType) => void;
	/** EBS step 5 — the spot report. See AlertRowActions. */
	onGenerateSpotRep?: (alert: AlertType) => void;
}

export const createAlertsTableColumns = (
	callbacks: AlertsTableCallbacks
): ColumnDef<AlertType>[] => [
	{
		accessorKey: "id",
		filterFn: textIncludesFilter,
		meta: {
			filterLabel: "Signal ID",
			filterPlaceholder: "ALT number",
		},
		header: ({ column }) => (
			<SortableHeader column={column}>Alert ID</SortableHeader>
		),
		cell: ({ row }) => {
			return (
				<div className="font-mono text-sm">
					{altCode(Number(row.getValue("id")))}
				</div>
			);
		},
	},
	{
		accessorKey: "status",
		filterFn: exactStringFilter,
		meta: {
			filterLabel: "Status",
			filterVariant: "select",
			filterOptions: STATUS_OPTIONS.filter(
				(option) => option.value !== "all"
			),
		},
		header: ({ column }) => (
			<SortableHeader column={column}>Status</SortableHeader>
		),
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<Badge variant="secondary" className={statusBadgeClass(status)}>
					{status}
				</Badge>
			);
		},
	},
	{
		accessorKey: "date",
		filterFn: dateRangeFilter,
		meta: {
			filterLabel: "Date",
			filterVariant: "dateRange",
		},
		header: ({ column }) => (
			<SortableHeader column={column}>Date</SortableHeader>
		),
		cell: ({ row }) => {
			const date = new Date(row.getValue("date"));
			return (
				<div className="text-sm"> {date.toLocaleDateString()} </div>
			);
		},
	},
	{
		accessorKey: "time",
		header: "Time",
		filterFn: textIncludesFilter,
		meta: {
			filterPlaceholder: "Time",
		},
		cell: ({ row }) => {
			const time = new Date(row.getValue("time"));
			return (
				<div className="font-mono text-sm">
					{time.toLocaleTimeString()}
				</div>
			);
		},
	},
	{
		accessorKey: "personReporting",
		header: "Reporter",
		meta: {
			filterPlaceholder: "Reporter name",
		},
		cell: ({ row }) => {
			const reporter = row.getValue("personReporting") as string;
			return (
				<div className="font-medium">
					{reporter || "Not specified"}
				</div>
			);
		},
	},
	{
		accessorKey: "sourceOfAlert",
		header: "Source of signal",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: sourceOfAlertOptions().map((source) => ({
				value: source,
				label: source,
			})),
		},
		cell: ({ row }) => {
			const source = row.getValue("sourceOfAlert") as string;
			return (
				<Badge
					variant="outline"
					className="border-uganda-blue text-uganda-blue"
				>
					{source}
				</Badge>
			);
		},
	},
	{
		accessorKey: "alertCaseDistrict",
		header: "District",
		meta: {
			filterPlaceholder: "District",
		},
		cell: ({ row }) => {
			const district = row.getValue("alertCaseDistrict") as string;
			return (
				<div className="text-sm">
					{" "}
					{district || "Not specified"}
				</div>
			);
		},
	},
	{
		accessorKey: "contactNumber",
		header: "Contact Number",
		meta: {
			filterPlaceholder: "Phone number",
		},
		cell: ({ row }) => {
			const contact = row.getValue("contactNumber") as string;
			return (
				<div className="font-mono text-sm">
					{contact || "Not provided"}
				</div>
			);
		},
	},
	{
		accessorKey: "alertCaseName",
		meta: {
			filterLabel: "Alert Case Name",
			filterPlaceholder: "Case name",
		},
		header: ({ column }) => (
			<SortableHeader column={column}>Alert Case Name</SortableHeader>
		),
		cell: ({ row }) => {
			const name = row.getValue("alertCaseName") as string;
			return (
				<div
					className="max-w-[280px] whitespace-normal font-medium line-clamp-2 break-words"
					title={name}
				>
					{name}
				</div>
			);
		},
	},
	{
		accessorKey: "alertCaseAge",
		header: "Age",
		filterFn: textIncludesFilter,
		meta: {
			filterPlaceholder: "Age",
		},
		cell: ({ row }) => (
			<div className="text-center">
				{row.getValue("alertCaseAge")} years
			</div>
		),
	},
	{
		accessorKey: "alertCaseSex",
		header: "Sex",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: [
				{ value: "Male", label: "Male" },
				{ value: "Female", label: "Female" },
			],
		},
		cell: ({ row }) => {
			const sex = row.getValue("alertCaseSex") as string;
			return (
				<Badge
					variant="outline"
					className={
						sex === "Male"
							? "bg-blue-50 text-blue-700"
							: "bg-pink-50 text-pink-700"
					}
				>
					{sex}
				</Badge>
			);
		},
	},
	{
		accessorKey: "isVerified",
		header: "Verified",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: [
				{ value: "true", label: "Verified" },
				{ value: "false", label: "Pending" },
			],
		},
		cell: ({ row }) => (
			<VerificationBadge verified={row.getValue("isVerified") as boolean} />
		),
	},
	{
		id: "actions",
		header: "Actions",
		enableColumnFilter: false,
		cell: ({ row }) => (
			<AlertRowActions alert={row.original} callbacks={callbacks} />
		),
	},
];

/**
 * Row action menu for a single alert: copy the id, or open it read-only.
 *
 * Editing and deleting were removed from this list on purpose. An alert is the
 * record of what was reported, and correcting or destroying one from a row menu
 * on a 6,000-row list is not a decision a hover away. Both flows still exist
 * (the edit dialog, DeleteAlertDialog) for wherever they are next mounted.
 */
function AlertRowActions({
	alert,
	callbacks,
}: {
	alert: AlertType;
	callbacks: AlertsTableCallbacks;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-8 w-8 p-0 hover:bg-uganda-yellow/10"
				>
					<span className="sr-only"> Open menu </span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Actions </DropdownMenuLabel>
				<DropdownMenuItem
					onClick={() =>
						navigator.clipboard.writeText(alert.id?.toString() || "")
					}
				>
					Copy Alert ID
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{callbacks.onView && (
					<DropdownMenuItem
						className="flex items-center gap-2"
						onClick={() => callbacks.onView!(alert)}
					>
						<Eye className="h-4 w-4" />
						View Details
					</DropdownMenuItem>
				)}
				{/* EBS step 5, issued from here (user decision 2026-08-28) rather
				    than from the Risk Assessed queue. It moved because a spot
				    report is the pipeline's OUTPUT: a signal on the risk queue
				    still has work due on it, and a report written mid-pipeline
				    states a conclusion nobody has reached. Every row on THIS list
				    is finished, so no row-level guard is needed — the list is the
				    guard. Flagged red for High and Very High, the levels the
				    guidelines REQUIRE a spot report for. */}
				{callbacks.onGenerateSpotRep && (
					<DropdownMenuItem
						className={`flex items-center gap-2${
							spotRepIsMandated(alert.riskLevel)
								? " text-uganda-red focus:text-uganda-red"
								: ""
						}`}
						onClick={() => callbacks.onGenerateSpotRep!(alert)}
					>
						<FileText className="h-4 w-4" />
						Generate spot report
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
