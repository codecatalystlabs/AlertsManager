import { type ColumnDef } from "@tanstack/react-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
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
	{ value: "dead", label: "Dead" },
	{ value: "unknown", label: "Unknown" },
] as const;

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

export const createCallLogsTableColumns = (
	callbacks: CallLogsTableCallbacks
): ColumnDef<AlertLog>[] => [
	{
		accessorKey: "id",
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
		cell: ({ row }) => {
			const source = row.getValue("sourceOfAlert") as string;
			return (
				<Badge
					variant="outline"
					className="text-xs"
				>
					{source}
				</Badge>
			);
		},
	},
	{
		accessorKey: "alertCaseDistrict",
		header: "District",
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
