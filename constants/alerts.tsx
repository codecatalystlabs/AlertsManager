import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";
import { DeleteAlertDialog } from "@/components/alerts/delete-alert-dialog";

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

export const VERIFICATION_FILTER_OPTIONS = [
	{ value: "all", label: "All Verification" },
	{ value: "verified", label: "Verified" },
	{ value: "pending", label: "Pending Verification" },
] as const;

export interface AlertsTableCallbacks {
	onDelete: (alertId: number) => Promise<void>;
	onView?: (alert: AlertType) => void;
	onEdit?: (alert: AlertType) => void;
	deletingId: number | null;
	/** Whether the current user may delete alerts (admin/EOC only). */
	canDelete?: boolean;
}

export const createAlertsTableColumns = (
	callbacks: AlertsTableCallbacks
): ColumnDef<AlertType>[] => [
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
		filterFn: exactStringFilter,
		meta: {
			filterLabel: "Status",
			filterVariant: "select",
			filterOptions: STATUS_OPTIONS.filter(
				(option) => option.value !== "all"
			),
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
		header: "Source of Alert",
		filterFn: exactStringFilter,
		meta: {
			filterVariant: "select",
			filterOptions: SOURCE_OF_ALERT_OPTIONS.map((source) => ({
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
		cell: ({ row }) => {
			const isVerified = row.getValue("isVerified") as boolean;
			return (
				<Badge
					className={
						isVerified
							? "rounded-full border-transparent bg-success text-white hover:bg-success"
							: "rounded-full border-transparent bg-warning text-warning-foreground hover:bg-warning"
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
		enableColumnFilter: false,
		cell: ({ row }) => (
			<AlertRowActions alert={row.original} callbacks={callbacks} />
		),
	},
];

/**
 * Row action menu for a single alert. The delete confirmation lives OUTSIDE the
 * dropdown (controlled by local state) so the destructive button renders and
 * focuses correctly — an AlertDialog nested in DropdownMenuContent breaks that.
 */
function AlertRowActions({
	alert,
	callbacks,
}: {
	alert: AlertType;
	callbacks: AlertsTableCallbacks;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const isDeleting = callbacks.deletingId === alert.id;

	const handleConfirmDelete = async () => {
		if (!alert.id) return;
		await callbacks.onDelete(alert.id);
		setDeleteOpen(false);
	};

	return (
		<>
			<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
					{callbacks.onEdit && (
						<DropdownMenuItem
							className="flex items-center gap-2"
							onClick={() => callbacks.onEdit!(alert)}
						>
							<Edit className="h-4 w-4" />
							Edit Alert
						</DropdownMenuItem>
					)}
					{callbacks.canDelete && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="flex items-center gap-2 text-destructive focus:text-destructive"
								onSelect={(e) => {
									// Close the menu ourselves, then open the dialog —
									// avoids the focus hand-off race between the two.
									e.preventDefault();
									setMenuOpen(false);
									setDeleteOpen(true);
								}}
							>
								<Trash2 className="h-4 w-4" />
								Delete Alert
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{callbacks.canDelete && (
				<DeleteAlertDialog
					open={deleteOpen}
					onOpenChange={setDeleteOpen}
					alertCode={`ALT${String(alert.id).padStart(3, "0")}`}
					caseName={alert.alertCaseName}
					isDeleting={isDeleting}
					onConfirm={() => void handleConfirmDelete()}
				/>
			)}
		</>
	);
}
