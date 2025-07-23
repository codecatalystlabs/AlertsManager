"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthService } from "@/lib/auth";
import {
	AlertTriangle,
	Clock,
	CheckCircle,
	XCircle,
	TrendingUp,
	Users,
	Phone,
	Filter,
	Download,
	ArrowUpDown,
	MoreHorizontal,
	Eye,
	Edit,
	Trash2,
	AlertCircle,
	Loader2,
	RefreshCw,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Enhanced Alert interface
interface DashboardAlert {
	id: string;
	personCalling: string;
	source: string;
	phone: string;
	date: string;
	reportedBefore: string;
	village: string;
	parish: string;
	subcounty: string;
	district: string;
	caseName: string;
	age: number;
	sex: "Male" | "Female";
	nextOfKin: string;
	status: "Verified" | "Pending" | "Investigating" | "Resolved";
	priority: "High" | "Medium" | "Low";
	duration: string;
}

interface AlertCounts {
	verified: number;
	notVerified: number;
	total: number;
}

// Mock data for alerts table (this would come from a real API)
const recentAlerts: DashboardAlert[] = [
	{
		id: "3650",
		personCalling: "Mukisa Badru",
		source: "VHT",
		phone: "0774776921",
		date: "2025-06-16",
		reportedBefore: "Yes",
		village: "Kaserere",
		parish: "St. Peters",
		subcounty: "Central",
		district: "Buvuma District",
		caseName: "Mukisa Badru",
		age: 35,
		sex: "Male",
		nextOfKin: "0756291949",
		status: "Verified",
		priority: "High",
		duration: "00:05:23",
	},
	{
		id: "3649",
		personCalling: "Kyasibangi",
		source: "Facility",
		phone: "0775677566",
		date: "2025-06-12",
		reportedBefore: "No",
		village: "Nyabughesera ward",
		parish: "Holy Cross",
		subcounty: "Bundibugyo",
		district: "Bundibugyo District",
		caseName: "Kyasibangi",
		age: 14,
		sex: "Male",
		nextOfKin: "0787248737",
		status: "Pending",
		priority: "Medium",
		duration: "00:03:45",
	},
	{
		id: "3648",
		personCalling: "Grace Nakato",
		source: "Community",
		phone: "0701234567",
		date: "2025-06-11",
		reportedBefore: "No",
		village: "Kyamagabo",
		parish: "St. Mary",
		subcounty: "Kyegegwa",
		district: "Kyegegwa District",
		caseName: "Monday Steven",
		age: 28,
		sex: "Male",
		nextOfKin: "0780115709",
		status: "Investigating",
		priority: "High",
		duration: "00:07:12",
	},
	{
		id: "3647",
		personCalling: "Peter Ssali",
		source: "Health Worker",
		phone: "0756789012",
		date: "2025-06-10",
		reportedBefore: "Yes",
		village: "Kivulu",
		parish: "Sacred Heart",
		subcounty: "Central",
		district: "Kampala District",
		caseName: "Yawe Brasio",
		age: 11,
		sex: "Male",
		nextOfKin: "0775311067",
		status: "Resolved",
		priority: "Low",
		duration: "00:04:56",
	},
];

// Table columns definition
const columns: ColumnDef<DashboardAlert>[] = [
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
					className="text-white hover:text-white hover:bg-white/10"
				>
					Alert ID
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => (
			<div className="font-medium">#{row.getValue("id")}</div>
		),
	},
	{
		accessorKey: "personCalling",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() =>
						column.toggleSorting(
							column.getIsSorted() === "asc"
						)
					}
					className="text-white hover:text-white hover:bg-white/10"
				>
					Person Calling
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => (
			<div className="font-medium">
				{row.getValue("personCalling")}
			</div>
		),
	},
	{
		accessorKey: "source",
		header: "Source",
		cell: ({ row }) => {
			const source = row.getValue("source") as string;
			return (
				<Badge
					variant="outline"
					className="bg-blue-50 text-blue-700 border-blue-200"
				>
					{source}
				</Badge>
			);
		},
	},
	{
		accessorKey: "phone",
		header: "Phone",
		cell: ({ row }) => (
			<div className="flex items-center">
				<Phone className="mr-2 h-4 w-4 text-gray-500" />
				{row.getValue("phone")}
			</div>
		),
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
					className="text-white hover:text-white hover:bg-white/10"
				>
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
	},
	{
		accessorKey: "district",
		header: "District",
		cell: ({ row }) => (
			<div className="font-medium">{row.getValue("district")}</div>
		),
	},
	{
		accessorKey: "caseName",
		header: "Case Name",
		cell: ({ row }) => (
			<div className="font-medium">{row.getValue("caseName")}</div>
		),
	},
	{
		accessorKey: "age",
		header: "Age",
		cell: ({ row }) => (
			<div className="text-center">{row.getValue("age")} years</div>
		),
	},
	{
		accessorKey: "sex",
		header: "Sex",
		cell: ({ row }) => {
			const sex = row.getValue("sex") as string;
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
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			const colors = {
				Verified: "bg-green-100 text-green-800",
				Pending: "bg-yellow-100 text-yellow-800",
				Investigating: "bg-blue-100 text-blue-800",
				Resolved: "bg-gray-100 text-gray-800",
			};
			return (
				<Badge className={colors[status as keyof typeof colors]}>
					{status}
				</Badge>
			);
		},
	},
	{
		accessorKey: "priority",
		header: "Priority",
		cell: ({ row }) => {
			const priority = row.getValue("priority") as string;
			const colors = {
				High: "bg-red-100 text-red-800",
				Medium: "bg-orange-100 text-orange-800",
				Low: "bg-green-100 text-green-800",
			};
			return (
				<Badge className={colors[priority as keyof typeof colors]}>
					{priority}
				</Badge>
			);
		},
	},
	{
		accessorKey: "duration",
		header: "Duration",
		cell: ({ row }) => (
			<div className="flex items-center">
				<Clock className="mr-2 h-4 w-4 text-gray-500" />
				{row.getValue("duration")}
			</div>
		),
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
								navigator.clipboard.writeText(alert.id)
							}
						>
							Copy Alert ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<Eye className="mr-2 h-4 w-4" />
							View Details
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Edit className="mr-2 h-4 w-4" />
							Edit Alert
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-red-600 focus:text-red-600"
							onClick={async () => {
								if (
									confirm(
										`Are you sure you want to delete alert #${alert.id}? This action cannot be undone.`
									)
								) {
									try {
										// Note: This would need to be implemented with real alert IDs
										// await AuthService.deleteAlert(parseInt(alert.id));
										console.log(
											"Delete functionality would be implemented here for alert:",
											alert.id
										);
										alert(
											"Delete functionality is available in the Alerts Management page."
										);
									} catch (error) {
										console.error(
											"Error deleting alert:",
											error
										);
										alert(
											"Failed to delete alert. Please try again."
										);
									}
								}
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete Alert
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];

export default function DashboardPage() {
	const [alertCounts, setAlertCounts] = useState<AlertCounts>({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [districtFilter, setDistrictFilter] = useState<string>("");
	const [priorityFilter, setPriorityFilter] = useState<string>("");

	const fetchAlertCounts = async () => {
		try {
			setLoading(true);
			setError(null);
			const counts = await AuthService.fetchAlertCounts();
			setAlertCounts(counts);
		} catch (err) {
			console.error("Error fetching alert counts:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to fetch alert counts"
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAlertCounts();
	}, []);

	// Filter data based on selected filters
	const filteredData = recentAlerts.filter((alert) => {
		const matchesStatus =
			!statusFilter ||
			statusFilter === "all" ||
			alert.status === statusFilter;
		const matchesDistrict =
			!districtFilter ||
			districtFilter === "all" ||
			alert.district === districtFilter;
		const matchesPriority =
			!priorityFilter ||
			priorityFilter === "all" ||
			alert.priority === priorityFilter;

		return matchesStatus && matchesDistrict && matchesPriority;
	});

	const exportToExcel = () => {
		const headers = [
			"Alert ID",
			"Person Calling",
			"Source",
			"Phone",
			"Date",
			"District",
			"Case Name",
			"Age",
			"Sex",
			"Status",
			"Priority",
		];

		const csvContent = [
			headers.join(","),
			...filteredData.map((alert) =>
				[
					alert.id,
					alert.personCalling,
					alert.source,
					alert.phone,
					alert.date,
					alert.district,
					alert.caseName,
					alert.age,
					alert.sex,
					alert.status,
					alert.priority,
				].join(",")
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dashboard_alerts_${
			new Date().toISOString().split("T")[0]
		}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<Loader2 className="h-12 w-12 animate-spin text-uganda-red mx-auto mb-4" />
					<p className="text-gray-600">
						Loading dashboard data...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow rounded-2xl p-8 text-white relative overflow-hidden">
				<div className="absolute inset-0 bg-black/10"></div>
				<div className="relative">
					<div className="flex justify-between items-start">
						<div>
							<h1 className="text-3xl font-bold mb-2">
								Welcome to Health Alert Dashboard
							</h1>
							<p className="text-white/90 text-lg">
								Monitor and manage health alerts across
								Uganda in real-time
							</p>
							<div className="mt-6 flex items-center space-x-6">
								<div className="flex items-center space-x-2">
									<div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
									<span className="text-sm">
										System Active
									</span>
								</div>
								<div className="flex items-center space-x-2">
									<Clock className="h-4 w-4" />
									<span className="text-sm">
										Last updated:{" "}
										{new Date().toLocaleTimeString()}
									</span>
								</div>
							</div>
						</div>
						<Button
							onClick={fetchAlertCounts}
							variant="outline"
							className="border-white/30 text-white hover:bg-white/10"
							size="sm"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Refresh
						</Button>
					</div>
				</div>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert className="border-red-200 bg-red-50">
					<AlertCircle className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-700">
						{error}
					</AlertDescription>
				</Alert>
			)}

			{/* Enhanced Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/50 hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-green-600 text-sm font-medium mb-1">
									Verified Alerts
								</p>
								<p className="text-3xl font-bold text-green-700">
									{alertCounts.verified.toLocaleString()}
								</p>
								<div className="flex items-center mt-2">
									<CheckCircle className="h-4 w-4 text-green-600 mr-1" />
									<span className="text-xs text-green-600">
										All verified cases
									</span>
								</div>
							</div>
							<div className="h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
								<CheckCircle className="h-8 w-8 text-white" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200/50 hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-red-600 text-sm font-medium mb-1">
									Not Verified Alerts
								</p>
								<p className="text-3xl font-bold text-red-700">
									{alertCounts.notVerified.toLocaleString()}
								</p>
								<div className="flex items-center mt-2">
									<AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
									<span className="text-xs text-red-600">
										Requires attention
									</span>
								</div>
							</div>
							<div className="h-16 w-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
								<AlertTriangle className="h-8 w-8 text-white" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/50 hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-blue-600 text-sm font-medium mb-1">
									Total Alerts
								</p>
								<p className="text-3xl font-bold text-blue-700">
									{alertCounts.total.toLocaleString()}
								</p>
								<div className="flex items-center mt-2">
									<TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
									<span className="text-xs text-blue-600">
										All time total
									</span>
								</div>
							</div>
							<div className="h-16 w-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
								<AlertTriangle className="h-8 w-8 text-white" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/50 hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-purple-600 text-sm font-medium mb-1">
									Verification Rate
								</p>
								<p className="text-3xl font-bold text-purple-700">
									{alertCounts.total > 0
										? Math.round(
												(alertCounts.verified /
													alertCounts.total) *
													100
										  )
										: 0}
									%
								</p>
								<div className="flex items-center mt-2">
									<TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
									<span className="text-xs text-purple-600">
										{alertCounts.verified} of{" "}
										{alertCounts.total} verified
									</span>
								</div>
							</div>
							<div className="h-16 w-16 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
								<CheckCircle className="h-8 w-8 text-white" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Additional Stats Row */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-purple-600 text-sm font-medium">
									Total Calls Today
								</p>
								<p className="text-2xl font-bold text-purple-700">
									0
								</p>
							</div>
							<Phone className="h-8 w-8 text-purple-500" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-indigo-600 text-sm font-medium">
									Active Cases
								</p>
								<p className="text-2xl font-bold text-indigo-700">
									{121}
								</p>
							</div>
							<Users className="h-8 w-8 text-indigo-500" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-teal-600 text-sm font-medium">
									Resolved Today
								</p>
								<p className="text-2xl font-bold text-teal-700">
									0
								</p>
							</div>
							<CheckCircle className="h-8 w-8 text-teal-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filter and Export Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span className="flex items-center">
							<Filter className="mr-2 h-5 w-5" />
							Filter Alerts
						</span>
						<div className="flex space-x-2">
							<Button
								onClick={exportToExcel}
								variant="outline"
								size="sm"
							>
								<Download className="mr-2 h-4 w-4" />
								Export CSV
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<Label>Status</Label>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder="All statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Statuses
									</SelectItem>
									<SelectItem value="Verified">
										Verified
									</SelectItem>
									<SelectItem value="Pending">
										Pending
									</SelectItem>
									<SelectItem value="Investigating">
										Investigating
									</SelectItem>
									<SelectItem value="Resolved">
										Resolved
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>District</Label>
							<Select
								value={districtFilter}
								onValueChange={setDistrictFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder="All districts" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Districts
									</SelectItem>
									<SelectItem value="Buvuma District">
										Buvuma District
									</SelectItem>
									<SelectItem value="Bundibugyo District">
										Bundibugyo District
									</SelectItem>
									<SelectItem value="Kyegegwa District">
										Kyegegwa District
									</SelectItem>
									<SelectItem value="Kampala District">
										Kampala District
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Priority</Label>
							<Select
								value={priorityFilter}
								onValueChange={setPriorityFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder="All priorities" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Priorities
									</SelectItem>
									<SelectItem value="High">
										High
									</SelectItem>
									<SelectItem value="Medium">
										Medium
									</SelectItem>
									<SelectItem value="Low">
										Low
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Recent Alerts Table */}
			<Card>
				<CardHeader>
					<CardTitle>
						Recent Alerts ({filteredData.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-gray-200 overflow-hidden">
						<div className="bg-gradient-to-r from-uganda-red to-uganda-yellow p-4">
							<h3 className="text-white font-semibold">
								Alert Details
							</h3>
						</div>
						<DataTable
							columns={columns}
							data={filteredData}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
