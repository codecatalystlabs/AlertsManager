import { type ColumnDef } from "@tanstack/react-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	ArrowUpDown,
	MoreHorizontal,
	Eye,
	Edit,
	Trash2,
	Loader2,
} from "lucide-react";
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ALERTS_CONFIG = {
	PAGE_TITLE: "Alerts Management",
	PAGE_DESCRIPTION: "Monitor and manage health alerts across Uganda",
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

export interface AlertsTableCallbacks {
	onDelete: (alertId: number) => Promise<void>;
	onView?: (alert: AlertType) => void;
	onEdit?: (alert: AlertType) => void;
	deletingId: number | null;
}

export const createAlertsTableColumns = (
	callbacks: AlertsTableCallbacks
): ColumnDef<AlertType>[] => [
	{
		accessorKey: "id",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="hover:bg-uganda-yellow/10"
					onClick={() =>
						column.toggleSorting(
							column.getIsSorted() === "asc"
						)
					}
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
		accessorKey: "status",
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
					Status
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<Badge
					variant="secondary"
					className={
						status === "Alive"
							? "bg-green-100 text-green-800 hover:bg-green-200"
							: status === "Dead"
							? "bg-red-100 text-red-800 hover:bg-red-200"
							: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
					}
				>
					{status}
				</Badge>
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
				<div className="text-sm"> {date.toLocaleDateString()} </div>
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
		header: "Reporter",
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
		header: "Source of Alert",
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
					Alert Case Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return (
				<div className="font-medium">
					{row.getValue("alertCaseName")}
				</div>
			);
		},
	},
	{
		accessorKey: "alertCaseAge",
		header: "Age",
		cell: ({ row }) => (
			<div className="text-center">
				{row.getValue("alertCaseAge")} years
			</div>
		),
	},
	{
		accessorKey: "alertCaseSex",
		header: "Sex",
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
		header: "Actions",
		cell: ({ row }) => {
			const alert = row.original;

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
								navigator.clipboard.writeText(
									alert.id?.toString() || ""
								)
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
						{callbacks.onEdit && (
							<DropdownMenuItem
								className="flex items-center gap-2"
								onClick={() => callbacks.onEdit!(alert)}
							>
								<Edit className="h-4 w-4" />
								Edit Alert
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<DropdownMenuItem
									className="flex items-center gap-2 text-red-600 focus:text-red-600"
									onSelect={(e) =>
										e.preventDefault()
									}
								>
									<Trash2 className="h-4 w-4" />
									Delete Alert
								</DropdownMenuItem>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Are you absolutely sure ?{" "}
									</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be
										undone.This will permanently
										delete the alert ALT
										{String(alert.id).padStart(
											3,
											"0"
										)}{" "}
										and remove it from our
										servers.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel{" "}
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={() =>
											alert.id &&
											callbacks.onDelete(
												alert.id
											)
										}
										className="bg-red-600 hover:bg-red-700"
										disabled={
											callbacks.deletingId ===
											alert.id
										}
									>
										{callbacks.deletingId ===
										alert.id ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Deleting...
											</>
										) : (
											"Delete Alert"
										)}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
