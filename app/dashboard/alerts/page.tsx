"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowUpDown,
	MoreHorizontal,
	Eye,
	Edit,
	Trash2,
	Download,
	Filter,
	Plus,
	Loader2,
	RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { DataTable } from "@/components/ui/data-table";
import { AuthService, Alert as AlertType } from "@/lib/auth";
import { useRouter } from "next/navigation";

const columns: ColumnDef<AlertType>[] = [
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
				<div className="text-sm">{district || "Not specified"}</div>
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
];

export default function AlertsPage() {
	const [alerts, setAlerts] = useState<AlertType[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [districtFilter, setDistrictFilter] = useState<string>("");
	const [sourceFilter, setSourceFilter] = useState<string>("");
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const router = useRouter();

	const fetchAlerts = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await AuthService.makeAuthenticatedRequest(
				`${
					process.env.NEXT_PUBLIC_API_BASE_URL ||
					"http://localhost:8089/api/v1"
				}/alerts`
			);

			if (!response.ok) {
				throw new Error("Failed to fetch alerts");
			}

			const data = await response.json();
			setAlerts(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "An error occurred while fetching alerts"
			);
			setAlerts([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAlerts();
	}, []);

	const handleDeleteAlert = async (alertId: number) => {
		try {
			setDeletingId(alertId);
			await AuthService.deleteAlert(alertId);

			// Remove the alert from the local state
			setAlerts(alerts.filter((alert) => alert.id !== alertId));

			// Optionally refresh the data
			// await fetchAlerts()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to delete alert"
			);
		} finally {
			setDeletingId(null);
		}
	};

	// Create columns with actions that have access to the delete function
	const columnsWithActions: ColumnDef<AlertType>[] = [
		...columns,
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
								<span className="sr-only">
									Open menu
								</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>
								Actions
							</DropdownMenuLabel>
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
							<DropdownMenuItem className="flex items-center gap-2">
								<Eye className="h-4 w-4" />
								View Details
							</DropdownMenuItem>
							<DropdownMenuItem className="flex items-center gap-2">
								<Edit className="h-4 w-4" />
								Edit Alert
							</DropdownMenuItem>
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
											Are you absolutely sure?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be
											undone. This will
											permanently delete the
											alert ALT
											{String(
												alert.id
											).padStart(3, "0")}{" "}
											and remove it from our
											servers.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={() =>
												alert.id &&
												handleDeleteAlert(
													alert.id
												)
											}
											className="bg-red-600 hover:bg-red-700"
											disabled={
												deletingId ===
												alert.id
											}
										>
											{deletingId ===
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

	// Filter data based on selected filters
	const filteredData = alerts.filter((alert) => {
		const matchesStatus =
			!statusFilter ||
			statusFilter === "all" ||
			alert.status === statusFilter;
		const matchesDistrict =
			!districtFilter ||
			districtFilter === "all" ||
			alert.alertCaseDistrict === districtFilter;
		const matchesSource =
			!sourceFilter ||
			sourceFilter === "all" ||
			alert.sourceOfAlert === sourceFilter;

		return matchesStatus && matchesDistrict && matchesSource;
	});

	const exportToExcel = () => {
		// Create CSV content
		const headers = [
			"Alert ID",
			"Status",
			"Date",
			"Time",
			"Reporter",
			"Source of Alert",
			"District",
			"Contact Number",
			"Alert Case Name",
			"Age",
			"Sex",
			"Verified",
		];

		const csvContent = [
			headers.join(","),
			...filteredData.map((alert) =>
				[
					`ALT${String(alert.id).padStart(3, "0")}`,
					alert.status,
					new Date(alert.date).toLocaleDateString(),
					new Date(alert.time).toLocaleTimeString(),
					alert.personReporting,
					alert.sourceOfAlert,
					alert.alertCaseDistrict,
					alert.contactNumber,
					alert.alertCaseName,
					alert.alertCaseAge,
					alert.alertCaseSex,
					alert.isVerified ? "Yes" : "Pending",
				].join(",")
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `alerts_export_${
			new Date().toISOString().split("T")[0]
		}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<Loader2 className="h-12 w-12 animate-spin text-uganda-red mx-auto" />
						<p className="mt-4 text-gray-600">
							Loading alerts...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-uganda-black">
						Alerts Management
					</h1>
					<p className="text-gray-600 mt-1">
						Monitor and manage health alerts across Uganda
					</p>
				</div>
				<div className="flex space-x-2">
					<Button
						onClick={fetchAlerts}
						variant="outline"
						className="gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</Button>
					<Button
						onClick={() => router.push("/add-alert")}
						className="bg-uganda-red hover:bg-uganda-red/90 gap-2"
					>
						<Plus className="w-4 h-4" />
						Create Alert
					</Button>
					<Button
						onClick={exportToExcel}
						className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90"
					>
						<Download className="w-4 h-4 mr-2" />
						Export to Excel
					</Button>
				</div>
			</div>

			{error && (
				<Alert className="border-red-200 bg-red-50">
					<Trash2 className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-700">
						{error}
					</AlertDescription>
				</Alert>
			)}

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-green-600 text-sm font-medium">
									Active Cases
								</p>
								<p className="text-2xl font-bold text-green-700">
									{
										alerts.filter(
											(a) =>
												a.status === "Alive"
										).length
									}
								</p>
							</div>
							<div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-lg">
									A
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-red-600 text-sm font-medium">
									Critical Cases
								</p>
								<p className="text-2xl font-bold text-red-700">
									{
										alerts.filter(
											(a) =>
												a.status === "Dead"
										).length
									}
								</p>
							</div>
							<div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-lg">
									C
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-yellow-600 text-sm font-medium">
									Pending
								</p>
								<p className="text-2xl font-bold text-yellow-700">
									{
										alerts.filter(
											(a) =>
												a.status ===
													"Unknown" ||
												a.status ===
													"Pending"
										).length
									}
								</p>
							</div>
							<div className="h-12 w-12 bg-yellow-500 rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-lg">
									P
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-blue-600 text-sm font-medium">
									Total Alerts
								</p>
								<p className="text-2xl font-bold text-blue-700">
									{alerts.length}
								</p>
							</div>
							<div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-lg">
									T
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Advanced Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5 text-uganda-red" />
						Advanced Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="status-filter">
								Filter by Status
							</Label>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger id="status-filter">
									<SelectValue placeholder="All Statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Statuses
									</SelectItem>
									<SelectItem value="Alive">
										Alive
									</SelectItem>
									<SelectItem value="Dead">
										Dead
									</SelectItem>
									<SelectItem value="Unknown">
										Unknown
									</SelectItem>
									<SelectItem value="Pending">
										Pending
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="district-filter">
								Filter by District
							</Label>
							<Select
								value={districtFilter}
								onValueChange={setDistrictFilter}
							>
								<SelectTrigger id="district-filter">
									<SelectValue placeholder="All Districts" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Districts
									</SelectItem>
									{/* Get unique districts from alerts */}
									{Array.from(
										new Set(
											alerts
												.map(
													(alert) =>
														alert.alertCaseDistrict
												)
												.filter(Boolean)
										)
									).map((district) => (
										<SelectItem
											key={district}
											value={district}
										>
											{district}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="source-filter">
								Filter by Source
							</Label>
							<Select
								value={sourceFilter}
								onValueChange={setSourceFilter}
							>
								<SelectTrigger id="source-filter">
									<SelectValue placeholder="All Sources" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Sources
									</SelectItem>
									{/* Get unique sources from alerts */}
									{Array.from(
										new Set(
											alerts
												.map(
													(alert) =>
														alert.sourceOfAlert
												)
												.filter(Boolean)
										)
									).map((source) => (
										<SelectItem
											key={source}
											value={source}
										>
											{source}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="date-filter">
								Filter by Date
							</Label>
							<Input
								id="date-filter"
								type="date"
								className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			<Card>
				<CardHeader>
					<CardTitle>
						All Alerts ({filteredData.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columnsWithActions}
						data={filteredData}
						searchKey="alertCaseName"
						searchPlaceholder="Search by case name..."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
