import { type ColumnDef } from "@tanstack/react-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import {
	ArrowUpDown,
	MoreHorizontal,
	Eye,
	Edit,
	Shield,
	Copy,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

export type CallLogsStatFilter = "alive" | "other" | "verified" | "pending";

export interface CallLogsFilterState {
	status: string;
	source: string;
	search: string;
	verification: string;
}

export const CALL_LOGS_INITIAL_FILTERS: CallLogsFilterState = {
	status: "all",
	source: "all",
	search: "",
	verification: "all",
};

export const STAT_FILTER_PRESETS: Record<
	CallLogsStatFilter,
	CallLogsFilterState
> = {
	alive: { status: "alive", source: "all", search: "", verification: "all" },
	other: { status: "other", source: "all", search: "", verification: "all" },
	verified: { status: "all", source: "all", search: "", verification: "verified" },
	pending: { status: "all", source: "all", search: "", verification: "pending" },
};

export function getActiveStatFromFilters(
	filters: CallLogsFilterState
): CallLogsStatFilter | null {
	if (filters.search || filters.source !== "all") return null;
	if (filters.status === "alive" && filters.verification === "all") return "alive";
	if (filters.status === "other" && filters.verification === "all") return "other";
	if (filters.status === "all" && filters.verification === "verified")
		return "verified";
	if (filters.status === "all" && filters.verification === "pending")
		return "pending";
	return null;
}

export const SOURCE_FILTER_OPTIONS = [
	{ value: "all", label: "All Sources" },
	{ value: "community", label: "Community" },
	{ value: "facility", label: "Health Facility" },
	{ value: "vht", label: "VHT" },
	{ value: "other", label: "Other" },
] as const;

export interface CallLogsTableCallbacks {
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	onVerifyAlert: (alert: AlertLog) => void;
	onDeleteAlert: (alertId: number) => Promise<void>;
}

/** Sortable header button — mono uppercase to match editorial table heads. */
function SortHeader({
	children,
	onClick,
}: {
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
		>
			{children}
			<ArrowUpDown className="h-3 w-3" strokeWidth={1.75} />
		</button>
	);
}

/** Status / outcome chip — accent dot + mono label, no rounded pill. */
function StatusChip({
	label,
	accent,
}: {
	label: string;
	accent: "green" | "red" | "yellow" | "neutral";
}) {
	const dot = {
		green: "bg-accent-green",
		red: "bg-accent-red",
		yellow: "bg-accent-yellow",
		neutral: "bg-foreground/30",
	}[accent];
	const text = {
		green: "text-accent-green",
		red: "text-accent-red",
		yellow: "text-foreground",
		neutral: "text-muted-foreground",
	}[accent];
	return (
		<span className="inline-flex items-center gap-2 whitespace-nowrap">
			<span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
			<span
				className={cn(
					"mono text-[10px] uppercase tracking-widest font-bold",
					text
				)}
			>
				{label}
			</span>
		</span>
	);
}

function statusAccent(status: string): "green" | "red" | "yellow" | "neutral" {
	switch ((status ?? "").toLowerCase()) {
		case "alive":
			return "green";
		case "dead":
			return "red";
		case "pending":
		case "unknown":
			return "yellow";
		default:
			return "neutral";
	}
}

export const createCallLogsTableColumns = (
	callbacks: CallLogsTableCallbacks
): ColumnDef<AlertLog>[] => [
	{
		accessorKey: "id",
		header: ({ column }) => (
			<SortHeader
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				Alert ID
			</SortHeader>
		),
		cell: ({ row }) => (
			<div className="mono text-[11px] tracking-tight text-foreground tabular-nums">
				ALT{String(row.getValue("id")).padStart(3, "0")}
			</div>
		),
		size: 90,
	},
	{
		accessorKey: "date",
		header: ({ column }) => (
			<SortHeader
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				Date
			</SortHeader>
		),
		cell: ({ row }) => {
			const date = new Date(row.getValue("date"));
			return (
				<div className="mono text-xs text-foreground/80 tabular-nums whitespace-nowrap">
					{date.toLocaleDateString("en-GB", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					})}
				</div>
			);
		},
		size: 110,
	},
	{
		accessorKey: "time",
		header: "Time",
		cell: ({ row }) => {
			const time = new Date(row.getValue("time"));
			return (
				<div className="mono text-xs text-foreground/80 tabular-nums whitespace-nowrap">
					{time.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</div>
			);
		},
		size: 80,
	},
	{
		accessorKey: "personReporting",
		header: ({ column }) => (
			<SortHeader
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				Reporter
			</SortHeader>
		),
		cell: ({ row }) => {
			const reporter = row.getValue("personReporting") as string;
			return (
				<div className="font-medium text-sm text-foreground truncate max-w-[180px]">
					{reporter || (
						<span className="text-muted-foreground/50">—</span>
					)}
				</div>
			);
		},
		size: 180,
	},
	{
		accessorKey: "contactNumber",
		header: "Contact",
		cell: ({ row }) => {
			const contact = row.getValue("contactNumber") as string;
			return (
				<div className="mono text-xs text-foreground/80 tabular-nums whitespace-nowrap">
					{contact || (
						<span className="text-muted-foreground/50">—</span>
					)}
				</div>
			);
		},
		size: 130,
	},
	{
		accessorKey: "sourceOfAlert",
		header: "Source",
		cell: ({ row }) => {
			const source = (row.getValue("sourceOfAlert") as string) || "—";
			return (
				<div className="text-xs text-foreground/80 whitespace-nowrap">
					{source}
				</div>
			);
		},
		size: 140,
	},
	{
		accessorKey: "alertCaseDistrict",
		header: "District",
		cell: ({ row }) => {
			const district = row.getValue("alertCaseDistrict") as string;
			return (
				<div className="text-sm text-foreground/80 whitespace-nowrap">
					{district || (
						<span className="text-muted-foreground/50">—</span>
					)}
				</div>
			);
		},
		size: 120,
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = (row.getValue("status") as string) || "—";
			return <StatusChip label={status} accent={statusAccent(status)} />;
		},
		size: 110,
	},
	{
		accessorKey: "response",
		header: "Response",
		cell: ({ row }) => {
			const response = (row.getValue("response") as string) || "Pending";
			return (
				<div className="text-xs text-foreground/80 whitespace-nowrap">
					{response}
				</div>
			);
		},
		size: 160,
	},
	{
		accessorKey: "isVerified",
		header: "Verified",
		cell: ({ row }) => {
			const isVerified = row.getValue("isVerified") as boolean;
			return (
				<StatusChip
					label={isVerified ? "Verified" : "Pending"}
					accent={isVerified ? "green" : "yellow"}
				/>
			);
		},
		size: 110,
	},
	{
		id: "actions",
		header: () => (
			<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground sr-only">
				Actions
			</span>
		),
		cell: ({ row }) => {
			const alertItem = row.original;

			return (
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => callbacks.onViewDetails(alertItem)}
						className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
						aria-label="View details"
						title="View details"
					>
						<Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => callbacks.onEditAlert(alertItem)}
						className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
						aria-label="Edit alert"
						title="Edit alert"
					>
						<Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
								aria-label="More actions"
							>
								<MoreHorizontal
									className="h-4 w-4"
									strokeWidth={1.75}
								/>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="rounded-sm w-48"
						>
							<DropdownMenuLabel className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
								Actions
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(
										alertItem.id.toString()
									)
								}
								className="text-sm gap-2 rounded-sm"
							>
								<Copy
									className="h-3.5 w-3.5"
									strokeWidth={1.75}
								/>
								Copy alert ID
							</DropdownMenuItem>
							{!alertItem.isVerified && (
								<DropdownMenuItem
									onClick={() =>
										callbacks.onVerifyAlert(alertItem)
									}
									className="text-sm gap-2 rounded-sm text-accent-green focus:text-accent-green"
								>
									<Shield
										className="h-3.5 w-3.5"
										strokeWidth={1.75}
									/>
									Verify alert
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-sm gap-2 rounded-sm text-accent-red focus:text-accent-red"
								onClick={() =>
									callbacks.onDeleteAlert(alertItem.id)
								}
							>
								<Trash2
									className="h-3.5 w-3.5"
									strokeWidth={1.75}
								/>
								Delete alert
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
		size: 130,
	},
];
