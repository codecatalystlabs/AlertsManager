import { type ColumnDef } from "@tanstack/react-table";
import { Alert as AlertType } from "@/lib/auth";
import {
	ArrowUpDown,
	MoreHorizontal,
	Eye,
	Edit,
	Trash2,
	Loader2,
	Copy,
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
import { cn } from "@/lib/utils";

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
}

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

export const createAlertsTableColumns = (
	callbacks: AlertsTableCallbacks
): ColumnDef<AlertType>[] => [
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
		accessorKey: "status",
		header: ({ column }) => (
			<SortHeader
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				Status
			</SortHeader>
		),
		cell: ({ row }) => {
			const status = (row.getValue("status") as string) || "—";
			return <StatusChip label={status} accent={statusAccent(status)} />;
		},
		size: 110,
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
		header: "Reporter",
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
		accessorKey: "alertCaseName",
		header: ({ column }) => (
			<SortHeader
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				Case name
			</SortHeader>
		),
		cell: ({ row }) => (
			<div className="font-medium text-sm text-foreground truncate max-w-[200px]">
				{row.getValue("alertCaseName") || (
					<span className="text-muted-foreground/50">—</span>
				)}
			</div>
		),
		size: 200,
	},
	{
		accessorKey: "alertCaseAge",
		header: "Age",
		cell: ({ row }) => (
			<div className="mono text-xs text-foreground/80 tabular-nums whitespace-nowrap">
				{row.getValue("alertCaseAge")} <span className="text-muted-foreground">yr</span>
			</div>
		),
		size: 70,
	},
	{
		accessorKey: "alertCaseSex",
		header: "Sex",
		cell: ({ row }) => {
			const sex = row.getValue("alertCaseSex") as string;
			return (
				<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
					{sex === "Male" ? "M" : sex === "Female" ? "F" : "—"}
				</span>
			);
		},
		size: 60,
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
			<span className="sr-only">Actions</span>
		),
		cell: ({ row }) => {
			const alert = row.original;
			return (
				<div className="flex items-center justify-end gap-1">
					{callbacks.onView && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => callbacks.onView!(alert)}
							className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
							aria-label="View details"
							title="View details"
						>
							<Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
						</Button>
					)}
					{callbacks.onEdit && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => callbacks.onEdit!(alert)}
							className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
							aria-label="Edit alert"
							title="Edit alert"
						>
							<Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
						</Button>
					)}
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
										alert.id?.toString() || ""
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
							<DropdownMenuSeparator />
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<DropdownMenuItem
										className="text-sm gap-2 rounded-sm text-accent-red focus:text-accent-red"
										onSelect={(e) => e.preventDefault()}
									>
										<Trash2
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										Delete alert
									</DropdownMenuItem>
								</AlertDialogTrigger>
								<AlertDialogContent className="rounded-sm">
									<AlertDialogHeader>
										<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-1">
											Irreversible
										</p>
										<AlertDialogTitle className="serif text-2xl font-medium tracking-tight">
											Delete alert ALT
											{String(alert.id).padStart(
												3,
												"0"
											)}
											?
										</AlertDialogTitle>
										<AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
											This permanently removes the
											alert from the surveillance
											system. This action cannot be
											undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter className="gap-2 sm:gap-3">
										<AlertDialogCancel className="text-xs mono uppercase tracking-widest font-bold rounded-sm h-9">
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={() =>
												alert.id &&
												callbacks.onDelete(alert.id)
											}
											className="bg-accent-red text-background hover:bg-accent-red/90 text-xs mono uppercase tracking-widest font-bold rounded-sm h-9"
											disabled={
												callbacks.deletingId ===
												alert.id
											}
										>
											{callbacks.deletingId ===
											alert.id ? (
												<>
													<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
													Deleting
												</>
											) : (
												"Delete alert"
											)}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
		size: 120,
	},
];
