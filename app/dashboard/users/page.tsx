"use client";

import {
	type ReactNode,
	useMemo,
	useState,
	useEffect,
	useCallback,
} from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	AuthService,
	User,
	type UpdateUserPayload,
	type UsersPage,
	ROLE_DISTRICT_BIOSTAT,
} from "@/lib/auth";
import { useDistrictOptions } from "@/hooks/use-district-options";
import {
	Plus,
	Edit,
	Trash2,
	Search,
	AlertCircle,
	CheckCircle2,
	Users,
	Loader2,
	ListFilter,
	X,
} from "lucide-react";

/** True when an access level is the district-scoped role that needs a district. */
function isDistrictScopedLevel(level?: string | null): boolean {
	return (level ?? "").trim().toLowerCase() === ROLE_DISTRICT_BIOSTAT;
}

interface NewUserData {
	username: string;
	password: string;
	firstName: string;
	lastName: string;
	otherName: string;
	email: string;
	affiliation: string;
	userType: string;
	level: string;
	district: string;
}

interface UserHeaderFilters {
	username: string;
	name: string;
	email: string;
	affiliation: string;
	userType: string;
	level: string;
	createdFrom: string;
	createdTo: string;
}

const INITIAL_USER_HEADER_FILTERS: UserHeaderFilters = {
	username: "",
	name: "",
	email: "",
	affiliation: "",
	userType: "all",
	level: "all",
	createdFrom: "",
	createdTo: "",
};

function textIncludes(value: string, filter: string): boolean {
	return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function matchesCreatedRange(
	createdAt: string,
	fromDate: string,
	toDate: string
): boolean {
	if (!fromDate && !toDate) return true;

	const createdTime = new Date(createdAt).getTime();
	if (Number.isNaN(createdTime)) return false;

	const fromTime = fromDate ? new Date(fromDate).getTime() : null;
	const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

	if (fromTime !== null && createdTime < fromTime) return false;
	if (toTime !== null && createdTime > toTime) return false;
	return true;
}

function hasUserHeaderFilters(filters: UserHeaderFilters): boolean {
	return (
		filters.username.trim().length > 0 ||
		filters.name.trim().length > 0 ||
		filters.email.trim().length > 0 ||
		filters.affiliation.trim().length > 0 ||
		filters.userType !== "all" ||
		filters.level !== "all" ||
		Boolean(filters.createdFrom || filters.createdTo)
	);
}

function HeaderFilter({
	label,
	isActive,
	onClear,
	children,
}: {
	label: string;
	isActive: boolean;
	onClear: () => void;
	children: ReactNode;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-white hover:bg-white/10 hover:text-white"
					aria-label={`Filter ${label}`}
					title={`Filter ${label}`}
				>
					<ListFilter
						className={
							isActive
								? "h-3.5 w-3.5 text-uganda-yellow"
								: "h-3.5 w-3.5"
						}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-3 text-foreground">
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-xs font-semibold uppercase tracking-wide">
							Filter {label}
						</p>
						{isActive && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								aria-label={`Clear ${label} filter`}
								onClick={onClear}
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
					{children}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [headerFilters, setHeaderFilters] = useState<UserHeaderFilters>({
		...INITIAL_USER_HEADER_FILTERS,
	});
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [isEditUserOpen, setIsEditUserOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [isRegistering, setIsRegistering] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [editPassword, setEditPassword] = useState("");
	const [registrationError, setRegistrationError] = useState<string | null>(
		null
	);
	const [registrationSuccess, setRegistrationSuccess] = useState<
		string | null
	>(null);
	const [newUser, setNewUser] = useState<NewUserData>({
		username: "",
		password: "",
		firstName: "",
		lastName: "",
		otherName: "",
		email: "",
		affiliation: "",
		userType: "",
		level: "",
		district: "",
	});

	// Full district list (admin-units) for the district-scoped-role picker.
	const { districts: districtOptions } = useDistrictOptions();

	// Full list — used only for the summary stat cards (Total / Admin / District).
	const loadStats = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const usersData = await AuthService.fetchAllUsers();
			setUsers(usersData);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch users"
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	// Server-side paginated table state.
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [pageData, setPageData] = useState<UsersPage>({
		users: [],
		pagination: { page: 1, limit: 10, total: 0, pages: 1 },
	});
	const [tableLoading, setTableLoading] = useState(true);
	const [debouncedSearch, setDebouncedSearch] = useState("");

	// Debounce the search box so each keystroke doesn't hit the API.
	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
		return () => clearTimeout(t);
	}, [searchTerm]);

	const loadPage = useCallback(async () => {
		try {
			setTableLoading(true);
			const data = await AuthService.fetchUsers({
				page,
				limit: pageSize,
				search: debouncedSearch,
			});
			setPageData(data);
		} catch (err) {
			console.error("Error fetching users page:", err);
		} finally {
			setTableLoading(false);
		}
	}, [page, pageSize, debouncedSearch]);

	useEffect(() => {
		loadPage();
	}, [loadPage]);

	const userTypeOptions = useMemo(
		() =>
			Array.from(new Set(users.map((user) => user.userType).filter(Boolean))).sort(),
		[users]
	);
	const levelOptions = useMemo(
		() =>
			Array.from(new Set(users.map((user) => user.level).filter(Boolean))).sort(),
		[users]
	);
	const hasHeaderFilters = hasUserHeaderFilters(headerFilters);
	const updateHeaderFilter = (
		patch: Partial<UserHeaderFilters>
	): void => {
		setHeaderFilters((current) => ({ ...current, ...patch }));
	};

	const filteredUsers = users.filter((user) => {
		const displayName = getDisplayName(user);
		const search = searchTerm.trim().toLowerCase();
		const matchesSearch =
			!search ||
			user.username.toLowerCase().includes(search) ||
			user.email.toLowerCase().includes(search) ||
			user.affiliation.toLowerCase().includes(search);

		return (
			matchesSearch &&
			textIncludes(user.username, headerFilters.username) &&
			textIncludes(displayName, headerFilters.name) &&
			textIncludes(user.email, headerFilters.email) &&
			textIncludes(user.affiliation, headerFilters.affiliation) &&
			(headerFilters.userType === "all" ||
				user.userType === headerFilters.userType) &&
			(headerFilters.level === "all" ||
				user.level === headerFilters.level) &&
			matchesCreatedRange(
				user.createdAt,
				headerFilters.createdFrom,
				headerFilters.createdTo
			)
		);
	});

	const handleAddUser = async () => {
		if (
			!newUser.username ||
			!newUser.password ||
			!newUser.firstName ||
			!newUser.lastName ||
			!newUser.email ||
			!newUser.affiliation
		) {
			setRegistrationError("Please fill in all required fields");
			return;
		}

		if (isDistrictScopedLevel(newUser.level) && !newUser.district) {
			setRegistrationError(
				"A District Biostat must be assigned a district"
			);
			return;
		}

		try {
			setIsRegistering(true);
			setRegistrationError(null);
			setRegistrationSuccess(null);

			const registeredUser = await AuthService.registerUser({
				username: newUser.username,
				password: newUser.password,
				firstName: newUser.firstName,
				lastName: newUser.lastName,
				otherName: newUser.otherName || undefined,
				email: newUser.email,
				affiliation: newUser.affiliation,
				userType: newUser.userType || undefined,
				level: newUser.level || undefined,
				// Only meaningful for district-scoped roles; null otherwise.
				district: isDistrictScopedLevel(newUser.level)
					? newUser.district || undefined
					: null,
			});

			setUsers([...users, registeredUser]);
			// Refresh the paginated table + stat counts to include the new user.
			void loadPage();
			void loadStats();
			setNewUser({
				username: "",
				password: "",
				firstName: "",
				lastName: "",
				otherName: "",
				email: "",
				affiliation: "",
				userType: "",
				level: "",
				district: "",
			});
			setRegistrationSuccess("User registered successfully!");
			setTimeout(() => {
				setIsAddUserOpen(false);
				setRegistrationSuccess(null);
			}, 2000);
		} catch (err) {
			console.error("Error registering user:", err);
			setRegistrationError(
				err instanceof Error
					? err.message
					: "Failed to register user"
			);
		} finally {
			setIsRegistering(false);
		}
	};

	const handleOpenEdit = (user: User) => {
		setEditingUser({ ...user });
		setEditPassword("");
		setUpdateError(null);
		setIsEditUserOpen(true);
	};

	const buildUpdatePayload = (user: User): UpdateUserPayload => ({
		username: user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		otherName: user.otherName ?? "",
		email: user.email,
		affiliation: user.affiliation,
		userType: user.userType ?? "",
		level: user.level ?? "",
		// Persist the district only for district-scoped roles; clear it otherwise.
		district: isDistrictScopedLevel(user.level) ? user.district ?? "" : null,
		password: editPassword,
	});

	const handleUpdateUser = async () => {
		if (!editingUser) return;

		if (
			!editingUser.username ||
			!editingUser.firstName ||
			!editingUser.lastName ||
			!editingUser.email ||
			!editingUser.affiliation
		) {
			setUpdateError("Please fill in all required fields");
			return;
		}

		if (
			isDistrictScopedLevel(editingUser.level) &&
			!editingUser.district
		) {
			setUpdateError("A District Biostat must be assigned a district");
			return;
		}

		try {
			setIsUpdating(true);
			setUpdateError(null);

			const updatedUser = await AuthService.updateUser(
				editingUser.id,
				buildUpdatePayload(editingUser)
			);

			setUsers((prev) =>
				prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
			);
			// Reflect the edit in the paginated table + stat counts.
			void loadPage();
			void loadStats();
			setIsEditUserOpen(false);
			setEditingUser(null);
			setEditPassword("");
		} catch (err) {
			console.error("Error updating user:", err);
			setUpdateError(
				err instanceof Error ? err.message : "Failed to update user"
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDeleteUser = (userId: number) => {
		if (confirm("Are you sure you want to delete this user?")) {
			// For now, just remove from local state (no delete API yet).
			setUsers(users.filter((user) => user.id !== userId));
			setPageData((prev) => ({
				...prev,
				users: prev.users.filter((user) => user.id !== userId),
			}));
		}
	};

	const getRoleBadgeColor = (level: string) => {
		if (!level) return "bg-gray-100 text-gray-800";

		switch (level.toLowerCase()) {
			case "admin":
				return "bg-red-100 text-red-800";
			case "district":
				return "bg-blue-100 text-blue-800";
			case "reoc":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString || dateString === "0001-01-01T00:00:00Z") {
			return "Not set";
		}
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	function getDisplayName(user: User): string {
		const names = [user.firstName, user.otherName, user.lastName].filter(
			Boolean
		);
		return names.length > 0 ? names.join(" ") : user.username;
	}

	// Columns for the shared DataTable (same component used by alerts/call-logs).
	const userColumns: ColumnDef<User>[] = [
		{
			accessorKey: "username",
			header: "Username",
			cell: ({ row }) => (
				<span className="font-medium">{row.original.username}</span>
			),
		},
		{
			id: "name",
			header: "Name",
			cell: ({ row }) => getDisplayName(row.original),
		},
		{ accessorKey: "email", header: "Email" },
		{ accessorKey: "affiliation", header: "Affiliation" },
		{
			accessorKey: "userType",
			header: "User Type",
			cell: ({ row }) => row.original.userType || "-",
		},
		{
			accessorKey: "level",
			header: "Level",
			cell: ({ row }) =>
				row.original.level ? (
					<Badge className={getRoleBadgeColor(row.original.level)}>
						{row.original.level}
					</Badge>
				) : (
					"-"
				),
		},
		{
			id: "district",
			header: "District",
			cell: ({ row }) => row.original.district || "-",
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			cell: ({ row }) => formatDate(row.original.createdAt),
		},
		{
			id: "actions",
			header: "Actions",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex space-x-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleOpenEdit(row.original)}
						aria-label={`Edit ${row.original.username}`}
					>
						<Edit className="w-4 h-4" />
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="text-red-600 hover:text-red-700"
						onClick={() => handleDeleteUser(row.original.id)}
						aria-label={`Delete ${row.original.username}`}
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			),
		},
	];

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<Loader2 className="h-12 w-12 animate-spin text-uganda-red mx-auto mb-4" />
						<p className="text-gray-600">Loading users...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center">
							<div className="text-red-500 mb-4">
								<AlertCircle className="h-16 w-16 mx-auto" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Error Loading Users
							</h3>
							<p className="text-gray-600 mb-4">{error}</p>
							<Button
								onClick={loadStats}
								className="bg-uganda-red hover:bg-uganda-red/90"
							>
								Try Again
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					User Management
				</h1>
				<p className="text-gray-600">
					Manage user accounts and permissions
				</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Users
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{users.length}
						</div>
						<p className="text-xs text-muted-foreground">
							Registered in the system
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Admin Users
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								users.filter(
									(user) =>
										user.level?.toLowerCase() ===
										"admin"
								).length
							}
						</div>
						<p className="text-xs text-muted-foreground">
							With admin privileges
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							District Users
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								users.filter(
									(user) =>
										user.level?.toLowerCase() ===
										"district"
								).length
							}
						</div>
						<p className="text-xs text-muted-foreground">
							District level access
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Search and Add User */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Users</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex justify-between items-center mb-4">
						<div className="flex items-center gap-2">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search users..."
									value={searchTerm}
									onChange={(e) =>
										setSearchTerm(e.target.value)
									}
									className="pl-10 w-64"
								/>
							</div>
							{hasHeaderFilters && (
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10"
									aria-label="Clear table filters"
									title="Clear table filters"
									onClick={() =>
										setHeaderFilters({
											...INITIAL_USER_HEADER_FILTERS,
										})
									}
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
						<Dialog
							open={isAddUserOpen}
							onOpenChange={setIsAddUserOpen}
						>
							<DialogTrigger asChild>
								<Button className="bg-uganda-red hover:bg-uganda-red/90">
									<Plus className="w-4 h-4 mr-2" />
									Add User
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>
										Register New User
									</DialogTitle>
								</DialogHeader>
								<div className="space-y-3">
									{registrationError && (
										<Alert className="border-red-200 bg-red-50">
											<AlertCircle className="h-4 w-4 text-red-600" />
											<AlertDescription className="text-red-700">
												{registrationError}
											</AlertDescription>
										</Alert>
									)}

									{registrationSuccess && (
										<Alert className="border-green-200 bg-green-50">
											<CheckCircle2 className="h-4 w-4 text-green-600" />
											<AlertDescription className="text-green-700">
												{
													registrationSuccess
												}
											</AlertDescription>
										</Alert>
									)}

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="username">
												Username *
											</Label>
											<Input
												id="username"
												value={
													newUser.username
												}
												onChange={(e) =>
													setNewUser({
														...newUser,
														username:
															e
																.target
																.value,
													})
												}
												placeholder="Enter username"
												disabled={
													isRegistering
												}
											/>
										</div>
										<div>
											<Label htmlFor="password">
												Password *
											</Label>
											<Input
												id="password"
												type="password"
												value={
													newUser.password
												}
												onChange={(e) =>
													setNewUser({
														...newUser,
														password:
															e
																.target
																.value,
													})
												}
												placeholder="Enter password"
												disabled={
													isRegistering
												}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="firstName">
												First Name *
											</Label>
											<Input
												id="firstName"
												value={
													newUser.firstName
												}
												onChange={(e) =>
													setNewUser({
														...newUser,
														firstName:
															e
																.target
																.value,
													})
												}
												placeholder="Enter first name"
												disabled={
													isRegistering
												}
											/>
										</div>
										<div>
											<Label htmlFor="lastName">
												Last Name *
											</Label>
											<Input
												id="lastName"
												value={
													newUser.lastName
												}
												onChange={(e) =>
													setNewUser({
														...newUser,
														lastName:
															e
																.target
																.value,
													})
												}
												placeholder="Enter last name"
												disabled={
													isRegistering
												}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="otherName">
											Other Name
										</Label>
										<Input
											id="otherName"
											value={newUser.otherName}
											onChange={(e) =>
												setNewUser({
													...newUser,
													otherName:
														e.target
															.value,
												})
											}
											placeholder="Enter other name (optional)"
											disabled={isRegistering}
										/>
									</div>

									<div>
										<Label htmlFor="email">
											Email Address *
										</Label>
										<Input
											id="email"
											type="email"
											value={newUser.email}
											onChange={(e) =>
												setNewUser({
													...newUser,
													email: e.target
														.value,
												})
											}
											placeholder="Enter email address"
											disabled={isRegistering}
										/>
									</div>
									</div>

									<div>
										<Label htmlFor="affiliation">
											Affiliation *
										</Label>
										<Input
											id="affiliation"
											value={
												newUser.affiliation
											}
											onChange={(e) =>
												setNewUser({
													...newUser,
													affiliation:
														e.target
															.value,
												})
											}
											placeholder="Enter affiliation"
											disabled={isRegistering}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="userType">
												User Type
											</Label>
											<Select
												value={
													newUser.userType
												}
												onValueChange={(
													value
												) =>
													setNewUser({
														...newUser,
														userType:
															value,
													})
												}
												disabled={
													isRegistering
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select user type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="District">
														District
													</SelectItem>
													<SelectItem value="REOC">
														REOC
													</SelectItem>
													<SelectItem value="MoH">
														MoH
													</SelectItem>
													<SelectItem value="Health Facility">
														Health
														Facility
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label htmlFor="level">
												Access Level
											</Label>
											<Select
												value={
													newUser.level
												}
												onValueChange={(
													value
												) =>
													setNewUser({
														...newUser,
														level: value,
													})
												}
												disabled={
													isRegistering
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select access level" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="Admin">
														Admin
													</SelectItem>
													<SelectItem value="District Biostat">
														District Biostat
													</SelectItem>
													<SelectItem value="District">
														District
													</SelectItem>
													<SelectItem value="REOC">
														REOC
													</SelectItem>
													<SelectItem value="Viewer">
														Viewer
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									{isDistrictScopedLevel(newUser.level) && (
										<div>
											<Label htmlFor="district">
												District{" "}
												<span className="text-uganda-red">
													*
												</span>
											</Label>
											<Select
												value={newUser.district}
												onValueChange={(value) =>
													setNewUser({
														...newUser,
														district: value,
													})
												}
												disabled={isRegistering}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select the district this user is limited to" />
												</SelectTrigger>
												<SelectContent>
													{districtOptions.map(
														(district) => (
															<SelectItem
																key={district}
																value={district}
															>
																{district}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
											<p className="mt-1 text-xs text-muted-foreground">
												A District Biostat can only see
												data for this district.
											</p>
										</div>
									)}

									<div className="flex justify-end space-x-2">
										<Button
											variant="outline"
											onClick={() =>
												setIsAddUserOpen(
													false
												)
											}
											disabled={isRegistering}
										>
											Cancel
										</Button>
										<Button
											onClick={handleAddUser}
											disabled={isRegistering}
											className="bg-uganda-red hover:bg-uganda-red/90"
										>
											{isRegistering ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													Registering...
												</>
											) : (
												<>
													<Plus className="w-4 h-4 mr-2" />
													Register User
												</>
											)}
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>

						<Dialog
							open={isEditUserOpen}
							onOpenChange={(open) => {
								setIsEditUserOpen(open);
								if (!open) {
									setEditingUser(null);
									setUpdateError(null);
									setEditPassword("");
								}
							}}
						>
							<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>Edit User</DialogTitle>
								</DialogHeader>
								{editingUser && (
									<div className="space-y-4">
										{updateError && (
											<Alert className="border-red-200 bg-red-50">
												<AlertCircle className="h-4 w-4 text-red-600" />
												<AlertDescription className="text-red-700">
													{updateError}
												</AlertDescription>
											</Alert>
										)}

										<div>
											<Label htmlFor="editUsername">Username *</Label>
											<Input
												id="editUsername"
												value={editingUser.username}
												onChange={(e) =>
													setEditingUser({
														...editingUser,
														username: e.target.value,
													})
												}
												disabled={isUpdating}
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="editFirstName">
													First Name *
												</Label>
												<Input
													id="editFirstName"
													value={editingUser.firstName}
													onChange={(e) =>
														setEditingUser({
															...editingUser,
															firstName:
																e.target.value,
														})
													}
													disabled={isUpdating}
												/>
											</div>
											<div>
												<Label htmlFor="editLastName">
													Last Name *
												</Label>
												<Input
													id="editLastName"
													value={editingUser.lastName}
													onChange={(e) =>
														setEditingUser({
															...editingUser,
															lastName:
																e.target.value,
														})
													}
													disabled={isUpdating}
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="editOtherName">
												Other Name
											</Label>
											<Input
												id="editOtherName"
												value={editingUser.otherName || ""}
												onChange={(e) =>
													setEditingUser({
														...editingUser,
														otherName: e.target.value,
													})
												}
												disabled={isUpdating}
											/>
										</div>

										<div>
											<Label htmlFor="editEmail">
												Email Address *
											</Label>
											<Input
												id="editEmail"
												type="email"
												value={editingUser.email}
												onChange={(e) =>
													setEditingUser({
														...editingUser,
														email: e.target.value,
													})
												}
												disabled={isUpdating}
											/>
										</div>

										<div>
											<Label htmlFor="editAffiliation">
												Affiliation *
											</Label>
											<Input
												id="editAffiliation"
												value={editingUser.affiliation}
												onChange={(e) =>
													setEditingUser({
														...editingUser,
														affiliation: e.target.value,
													})
												}
												disabled={isUpdating}
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label>User Type</Label>
												<Select
													value={editingUser.userType || ""}
													onValueChange={(value) =>
														setEditingUser({
															...editingUser,
															userType: value,
														})
													}
													disabled={isUpdating}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select user type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="District">
															District
														</SelectItem>
														<SelectItem value="REOC">
															REOC
														</SelectItem>
														<SelectItem value="MoH">
															MoH
														</SelectItem>
														<SelectItem value="Health Facility">
															Health Facility
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div>
												<Label>Access Level</Label>
												<Select
													value={editingUser.level || ""}
													onValueChange={(value) =>
														setEditingUser({
															...editingUser,
															level: value,
														})
													}
													disabled={isUpdating}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select access level" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="Admin">
															Admin
														</SelectItem>
														<SelectItem value="District Biostat">
															District Biostat
														</SelectItem>
														<SelectItem value="District">
															District
														</SelectItem>
														<SelectItem value="REOC">
															REOC
														</SelectItem>
														<SelectItem value="Viewer">
															Viewer
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>

										{isDistrictScopedLevel(editingUser.level) && (
											<div>
												<Label>
													District{" "}
													<span className="text-uganda-red">
														*
													</span>
												</Label>
												<Select
													value={editingUser.district || ""}
													onValueChange={(value) =>
														setEditingUser({
															...editingUser,
															district: value,
														})
													}
													disabled={isUpdating}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select the district this user is limited to" />
													</SelectTrigger>
													<SelectContent>
														{districtOptions.map(
															(district) => (
																<SelectItem
																	key={district}
																	value={district}
																>
																	{district}
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
												<p className="mt-1 text-xs text-muted-foreground">
													A District Biostat can only see data
													for this district.
												</p>
											</div>
										)}

										<Separator />

										<div>
											<Label htmlFor="editPassword">
												New password
											</Label>
											<Input
												id="editPassword"
												type="password"
												autoComplete="new-password"
												value={editPassword}
												onChange={(e) =>
													setEditPassword(e.target.value)
												}
												placeholder="Leave blank to keep current password"
												disabled={isUpdating}
											/>
											<p className="text-xs text-muted-foreground mt-1">
												Only fill in if you want to change this
												user&apos;s password.
											</p>
										</div>

										<div className="flex justify-end space-x-2">
											<Button
												variant="outline"
												onClick={() => setIsEditUserOpen(false)}
												disabled={isUpdating}
											>
												Cancel
											</Button>
											<Button
												onClick={handleUpdateUser}
												disabled={isUpdating}
												className="bg-uganda-red hover:bg-uganda-red/90"
											>
												{isUpdating ? (
													<>
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
														Saving...
													</>
												) : (
													<>
														<Edit className="w-4 h-4 mr-2" />
														Save Changes
													</>
												)}
											</Button>
										</div>
									</div>
								)}
							</DialogContent>
						</Dialog>
					</div>

					<DataTable
						columns={userColumns}
						data={pageData.users}
						pageSize={pageSize}
						manualPagination
						pageCount={pageData.pagination.pages}
						totalRowCount={pageData.pagination.total}
						pageIndex={page - 1}
						onPageChange={(pageIndex) => setPage(pageIndex + 1)}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setPage(1);
						}}
						isLoading={tableLoading}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
