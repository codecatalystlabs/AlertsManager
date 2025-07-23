"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowUpDown,
	MoreHorizontal,
	Phone,
	Download,
	Filter,
	PhoneCall,
	PhoneIncoming,
	PhoneOutgoing,
	AlertCircle,
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
import { DataTable } from "@/components/ui/data-table";
import { AuthService } from "@/lib/auth";

interface AlertLog {
	id: number;
	status: string;
	date: string;
	time: string;
	callTaker: string;
	cifNo: string;
	personReporting: string;
	village: string;
	subCounty: string;
	contactNumber: string;
	sourceOfAlert: string;
	alertCaseName: string;
	alertCaseAge: number;
	alertCaseSex: string;
	alertCasePregnantDuration: number;
	alertCaseVillage: string;
	alertCaseParish: string;
	alertCaseSubCounty: string;
	alertCaseDistrict: string;
	alertCaseNationality: string;
	pointOfContactName: string;
	pointOfContactRelationship: string;
	pointOfContactPhone: string;
	history: string;
	healthFacilityVisit: string;
	traditionalHealerVisit: string;
	symptoms: string;
	actions: string;
	caseVerificationDesk: string;
	fieldVerification: string;
	fieldVerificationDecision: string;
	feedback: string;
	labResult: string;
	labResultDate: string | null;
	isHighlighted: boolean;
	assignedTo: string;
	alertReportedBefore: string;
	alertFrom: string;
	verified: string;
	comments: string;
	verificationDate: string;
	verificationTime: string;
	response: string;
	narrative: string;
	facilityType: string;
	facility: string;
	isVerified: boolean;
	verifiedBy: string;
	region: string;
	createdAt: string;
	updatedAt: string;
}

export default function CallLogsPage() {
	const [alerts, setAlerts] = useState<AlertLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");
	const [searchTerm, setSearchTerm] = useState("");

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

	const handleDeleteAlert = async (alertId: number) => {
		if (
			confirm(
				`Are you sure you want to delete alert ALT${String(
					alertId
				).padStart(3, "0")}? This action cannot be undone.`
			)
		) {
			try {
				await AuthService.deleteAlert(alertId);
				// Refresh the alerts list
				await fetchAlerts();
			} catch (error) {
				console.error("Error deleting alert:", error);
				window.alert("Failed to delete alert. Please try again.");
			}
		}
	};

	// Create columns with access to the delete function
	const columns: ColumnDef<AlertLog>[] = [
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
					<div className="text-sm">
						{date.toLocaleDateString()}
					</div>
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
				const district = row.getValue(
					"alertCaseDistrict"
				) as string;
				return (
					<div className="text-sm">
						{district || "Not specified"}
					</div>
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
							status === "Alive"
								? "default"
								: "destructive"
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
										alertItem.id.toString()
									)
								}
							>
								Copy alert ID
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								View details
							</DropdownMenuItem>
							<DropdownMenuItem>
								Edit alert
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-red-600 focus:text-red-600"
								onClick={() =>
									handleDeleteAlert(alertItem.id)
								}
							>
								Delete alert
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								Export to PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	useEffect(() => {
		fetchAlerts();
	}, []);

	const filteredAlerts = alerts.filter((alert) => {
		const matchesStatus =
			statusFilter === "all" ||
			alert.status.toLowerCase() === statusFilter.toLowerCase();
		const matchesSource =
			sourceFilter === "all" ||
			alert.sourceOfAlert.toLowerCase() === sourceFilter.toLowerCase();
		const matchesSearch =
			searchTerm === "" ||
			alert.personReporting
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			alert.contactNumber.includes(searchTerm) ||
			alert.alertCaseDistrict
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			alert.id.toString().includes(searchTerm);

		return matchesStatus && matchesSource && matchesSearch;
	});

	const exportToExcel = () => {
		// TODO: Implement Excel export functionality
		console.log("Export to Excel functionality to be implemented");
	};

	const getStatusCounts = () => {
		const alive = alerts.filter(
			(alert) => alert.status === "Alive"
		).length;
		const other = alerts.filter(
			(alert) => alert.status !== "Alive"
		).length;
		const verified = alerts.filter((alert) => alert.isVerified).length;
		const pending = alerts.filter((alert) => !alert.isVerified).length;

		return { alive, other, verified, pending };
	};

	const { alive, other, verified, pending } = getStatusCounts();

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<Loader2 className="h-12 w-12 animate-spin text-uganda-red mx-auto" />
						<p className="mt-4 text-gray-600">
							Loading call logs...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-uganda-black">
						Call Logs & Alert Management
					</h1>
					<p className="text-gray-600">
						Monitor and manage health alert calls
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
						onClick={exportToExcel}
						className="bg-uganda-red hover:bg-uganda-red/90 gap-2"
					>
						<Download className="h-4 w-4" />
						Export to Excel
					</Button>
				</div>
			</div>

			{error && (
				<Alert className="border-red-200 bg-red-50">
					<AlertCircle className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-700">
						{error}
					</AlertDescription>
				</Alert>
			)}

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-6">
						<div className="flex items-center">
							<PhoneIncoming className="h-8 w-8 text-green-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Cases Alive
								</p>
								<p className="text-2xl font-bold text-green-600">
									{alive}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-red-500">
					<CardContent className="p-6">
						<div className="flex items-center">
							<PhoneOutgoing className="h-8 w-8 text-red-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Other Status
								</p>
								<p className="text-2xl font-bold text-red-600">
									{other}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-6">
						<div className="flex items-center">
							<PhoneCall className="h-8 w-8 text-blue-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Verified
								</p>
								<p className="text-2xl font-bold text-blue-600">
									{verified}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-yellow-500">
					<CardContent className="p-6">
						<div className="flex items-center">
							<Phone className="h-8 w-8 text-yellow-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Pending Verification
								</p>
								<p className="text-2xl font-bold text-yellow-600">
									{pending}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters & Search
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="search">Search</Label>
							<Input
								id="search"
								placeholder="Search by reporter, contact, district..."
								value={searchTerm}
								onChange={(e) =>
									setSearchTerm(e.target.value)
								}
								className="w-full"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="status-filter">Status</Label>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Status
									</SelectItem>
									<SelectItem value="alive">
										Alive
									</SelectItem>
									<SelectItem value="dead">
										Dead
									</SelectItem>
									<SelectItem value="unknown">
										Unknown
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="source-filter">Source</Label>
							<Select
								value={sourceFilter}
								onValueChange={setSourceFilter}
							>
								<SelectTrigger>
									<SelectValue placeholder="Filter by source" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Sources
									</SelectItem>
									<SelectItem value="community">
										Community
									</SelectItem>
									<SelectItem value="facility">
										Health Facility
									</SelectItem>
									<SelectItem value="vht">
										VHT
									</SelectItem>
									<SelectItem value="other">
										Other
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-end">
							<Button
								variant="outline"
								onClick={() => {
									setStatusFilter("all");
									setSourceFilter("all");
									setSearchTerm("");
								}}
								className="w-full"
							>
								Clear Filters
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			<Card>
				<CardHeader>
					<CardTitle>
						Alert Logs ({filteredAlerts.length} records)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={filteredAlerts}
						searchKey="personReporting"
						searchPlaceholder="Search reporters..."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
