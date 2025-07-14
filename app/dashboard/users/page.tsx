"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { AuthService, User } from "@/lib/auth";
import {
	Plus,
	Edit,
	Trash2,
	Search,
	AlertCircle,
	CheckCircle2,
	Users,
	Loader2,
} from "lucide-react";

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
}

export default function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
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
	});

	const fetchUsers = async () => {
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
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const filteredUsers = users.filter(
		(user) =>
			user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.affiliation.toLowerCase().includes(searchTerm.toLowerCase())
	);

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
			});

			setUsers([...users, registeredUser]);
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

	const handleDeleteUser = (userId: number) => {
		if (confirm("Are you sure you want to delete this user?")) {
			// For now, just remove from local state
			// In a real app, you would call an API to delete the user
			setUsers(users.filter((user) => user.id !== userId));
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

	const getDisplayName = (user: User) => {
		const names = [user.firstName, user.otherName, user.lastName].filter(
			Boolean
		);
		return names.length > 0 ? names.join(" ") : user.username;
	};

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
								onClick={fetchUsers}
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
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>
										Register New User
									</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
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
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-uganda-red text-white">
									<th className="px-4 py-3 text-left">
										Username
									</th>
									<th className="px-4 py-3 text-left">
										Name
									</th>
									<th className="px-4 py-3 text-left">
										Email
									</th>
									<th className="px-4 py-3 text-left">
										Affiliation
									</th>
									<th className="px-4 py-3 text-left">
										User Type
									</th>
									<th className="px-4 py-3 text-left">
										Level
									</th>
									<th className="px-4 py-3 text-left">
										Created
									</th>
									<th className="px-4 py-3 text-left">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.map((user, index) => (
									<tr
										key={user.id}
										className={
											index % 2 === 0
												? "bg-gray-50"
												: "bg-white"
										}
									>
										<td className="px-4 py-3 font-medium">
											{user.username}
										</td>
										<td className="px-4 py-3">
											{getDisplayName(user)}
										</td>
										<td className="px-4 py-3">
											{user.email}
										</td>
										<td className="px-4 py-3">
											{user.affiliation}
										</td>
										<td className="px-4 py-3">
											{user.userType || "-"}
										</td>
										<td className="px-4 py-3">
											{user.level ? (
												<Badge
													className={getRoleBadgeColor(
														user.level
													)}
												>
													{user.level}
												</Badge>
											) : (
												"-"
											)}
										</td>
										<td className="px-4 py-3">
											{formatDate(
												user.createdAt
											)}
										</td>
										<td className="px-4 py-3">
											<div className="flex space-x-2">
												<Button
													size="sm"
													variant="outline"
												>
													<Edit className="w-4 h-4" />
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="text-red-600 hover:text-red-700"
													onClick={() =>
														handleDeleteUser(
															user.id
														)
													}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{filteredUsers.length === 0 && (
						<div className="text-center py-8">
							<Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600">
								{searchTerm
									? "No users found matching your search."
									: "No users found."}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
