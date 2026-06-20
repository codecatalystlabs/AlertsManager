import { type ColumnDef } from "@tanstack/react-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";
import {
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Shield } from "lucide-react";
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

export const CALL_LOGS_CONFIG = {
	PAGE_TITLE: "Call Logs & Alert Management",
	PAGE_DESCRIPTION: "Monitor and manage health alert calls",
	ITEMS_PER_PAGE: 10,
	EXPORT_FILENAME_PREFIX: "call_logs_export",
} as const;

export const STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: "alive", label: "Alive" },
	{ value: "other", label: "Other Status" },
	{ value: "dead", label: "Dead" },
	{ value: "unknown", label: "Unknown" },
] as const;

export const VERIFICATION_FILTER_OPTIONS = [
	{ value: "all", label: "All Verification" },
	{ value: "verified", label: "Verified" },
	{ value: "pending", label: "Pending Verification" },
] as const;

export const SEX_FILTER_OPTIONS = [
	{ value: "all", label: "All Sexes" },
	{ value: "Male", label: "Male" },
	{ value: "Female", label: "Female" },
] as const;

export type CallLogsStatFilter = "alive" | "other" | "verified" | "pending";

export interface CallLogsFilterState {
	status: string;
	source: string;
	search: string;
	verification: string;
	/** Selected region name, or "all" for no region filter. */
	region: string;
	/** Selected district name, or "all" for no district filter. */
	district: string;
	/** Selected division/subcounty name, or "all" for no division filter. */
	division: string;
	/** Inclusive start of the call date range (YYYY-MM-DD); "" means unbounded. */
	fromDate: string;
	/** Inclusive end of the call date range (YYYY-MM-DD); "" means unbounded. */
	toDate: string;
	/** Case sex ("all" | "Male" | "Female"). */
	sex: string;
	/** Inclusive minimum case age, or "" for unbounded. */
	ageMin: string;
	/** Inclusive maximum case age, or "" for unbounded. */
	ageMax: string;
	/** Partial match on the call taker; "" means no filter. */
	callTaker: string;
	/** Partial match on the assigned user; "" means no filter. */
	assignedTo: string;
	/** Partial match on the verifying user; "" means no filter. */
	verifiedBy: string;
}

export const CALL_LOGS_INITIAL_FILTERS: CallLogsFilterState = {
	status: "all",
	source: "all",
	search: "",
	verification: "all",
	region: "all",
	district: "all",
	division: "all",
	fromDate: "",
	toDate: "",
	sex: "all",
	ageMin: "",
	ageMax: "",
	callTaker: "",
	assignedTo: "",
	verifiedBy: "",
};

// Clicking a stat card resets the non-date filters (source, search, and the
// advanced demographic/staff filters) so the card shows a clean slice, while
// the user's selected date range is preserved (presets are merged into the
// current filters).
const STAT_PRESET_RESET: Partial<CallLogsFilterState> = {
	source: "all",
	search: "",
	sex: "all",
	ageMin: "",
	ageMax: "",
	callTaker: "",
	assignedTo: "",
	verifiedBy: "",
};

export const STAT_FILTER_PRESETS: Record<
	CallLogsStatFilter,
	Partial<CallLogsFilterState>
> = {
	alive: { ...STAT_PRESET_RESET, status: "alive", verification: "all" },
	other: { ...STAT_PRESET_RESET, status: "other", verification: "all" },
	verified: { ...STAT_PRESET_RESET, status: "all", verification: "verified" },
	pending: { ...STAT_PRESET_RESET, status: "all", verification: "pending" },
};

export function getActiveStatFromFilters(
	filters: CallLogsFilterState
): CallLogsStatFilter | null {
	// Any advanced filter being active means the view no longer matches a
	// single stat card, so none should be highlighted.
	if (
		filters.search ||
		filters.source !== "all" ||
		filters.sex !== "all" ||
		filters.ageMin ||
		filters.ageMax ||
		filters.callTaker ||
		filters.assignedTo ||
		filters.verifiedBy
	)
		return null;
	if (filters.status === "alive" && filters.verification === "all")
		return "alive";
	if (filters.status === "other" && filters.verification === "all")
		return "other";
	if (filters.status === "all" && filters.verification === "verified")
		return "verified";
	if (filters.status === "all" && filters.verification === "pending")
		return "pending";
	return null;
}

// Mirror the canonical first-page source list (lib/source-of-alert.ts) so the
// filter always offers every source the add-alert form does — and never drifts
// out of sync (this is why Point Of Entry / Schools had gone missing).
export const SOURCE_FILTER_OPTIONS = [
	{ value: "all", label: "All Sources" },
	...SOURCE_OF_ALERT_OPTIONS.map((name) => ({ value: name, label: name })),
];

export interface CallLogsTableCallbacks {
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	onVerifyAlert: (alert: AlertLog) => void;
	onDeleteAlert: (alertId: number) => Promise<void>;
}

export const createCallLogsTableColumns = (
	callbacks: CallLogsTableCallbacks
): ColumnDef<AlertLog>[] => [
	{
		accessorKey: "id",
		filterFn: textIncludesFilter,
		meta: {
			filterLabel: "Alert ID",
			filterPlaceholder: "ALT number",
		},
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() =>
						column.toggleSorting(
							column.getIsSorted() === "asc"
						)
					}
					className="hover:bg-uganda-yellow/10"
				>
					Alert ID
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return (
				<div className="font-mono text-sm">
					ALT{String(row.getValue("id")).padStart(3, "0")}
				</div>
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
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() =>
						column.toggleSorting(
							column.getIsSorted() === "asc"
						)
					}
					className="hover:bg-uganda-yellow/10"
				>
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const date = new Date(row.getValue("date"));
			return (
				<div className="text-sm">{date.toLocaleDateString()}</div>
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
		meta: {
			filterLabel: "Reporter",
			filterPlaceholder: "Reporter name",
		},
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() =>
						column.toggleSorting(
							column.getIsSorted() === "asc"
						)
					}
					className="hover:bg-uganda-yellow/10"
				>
					Reporter
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
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
		accessorKey: "sourceOfAlert",
		header: "Source",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: SOURCE_FILTER_OPTIONS.filter(
				(option) => option.value !== "all"
			),
		},
		cell: ({ row }) => {
			const source = row.getValue("sourceOfAlert") as string;
			return (
				<div className="min-w-[160px]">
					<Badge variant="outline" className="text-xs">
						{source}
					</Badge>
				</div>
			);
		},
	},
	{
		id: "forwardedFrom",
		header: "Forwarded From",
		enableColumnFilter: false,
		cell: ({ row }) => {
			// A 6767 alert forwarded into a district's call log is stamped with
			// alertFrom = "6767 Forward" by the backend.
			const from = (row.original.alertFrom ?? "").toLowerCase();
			return from.includes("6767") ? (
				<Badge variant="secondary" className="text-xs">
					6767
				</Badge>
			) : (
				<span className="text-sm text-muted-foreground">—</span>
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
				<div className="text-sm">{district || "Not specified"}</div>
			);
		},
	},
	{
		accessorKey: "status",
		header: "Status",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: STATUS_FILTER_OPTIONS.filter(
				(option) =>
					option.value !== "all" && option.value !== "other"
			).map((option) => ({
				value:
					option.value === "alive"
						? "Alive"
						: option.value === "dead"
						? "Dead"
						: "Unknown",
				label: option.label,
			})),
		},
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<Badge
					variant={
						status === "Alive" ? "default" : "destructive"
					}
					className={
						status === "Alive"
							? "bg-green-100 text-green-800"
							: "bg-red-100 text-red-800"
					}
				>
					{status}
				</Badge>
			);
		},
	},
	{
		accessorKey: "response",
		header: "Response",
		meta: {
			filterPlaceholder: "Response",
		},
		cell: ({ row }) => {
			const response = row.getValue("response") as string;
			return (
				<Badge
					variant="secondary"
					className="text-xs"
				>
					{response || "Pending"}
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
		cell: ({ row }) => {
			const isVerified = row.getValue("isVerified") as boolean;
			return (
				<Badge
					variant={isVerified ? "default" : "destructive"}
					className={
						isVerified
							? "bg-green-100 text-green-800"
							: "bg-yellow-100 text-yellow-800"
					}
				>
					{isVerified ? "Yes" : "Pending"}
				</Badge>
			);
		},
	},
	{
		id: "actions",
		enableColumnFilter: false,
		cell: ({ row }) => {
			const alertItem = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-8 w-8 p-0"
						>
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() =>
								navigator.clipboard.writeText(
									alertItem.id.toString()
								)
							}
						>
							Copy alert ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() =>
								callbacks.onViewDetails(alertItem)
							}
						>
							<Eye className="h-4 w-4 mr-2" />
							View details
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								callbacks.onEditAlert(alertItem)
							}
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit alert
						</DropdownMenuItem>
						{!alertItem.isVerified && (
							<DropdownMenuItem
								onClick={() =>
									callbacks.onVerifyAlert(alertItem)
								}
								className="text-green-600 focus:text-green-600"
							>
								<Shield className="h-4 w-4 mr-2" />
								Verify alert
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-red-600 focus:text-red-600"
							onClick={() =>
								callbacks.onDeleteAlert(alertItem.id)
							}
						>
							Delete alert
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Export to PDF</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
