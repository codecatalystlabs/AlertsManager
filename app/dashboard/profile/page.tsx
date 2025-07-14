"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService, User } from "@/lib/auth";
import {
	User as UserIcon,
	Mail,
	Building,
	Shield,
	Calendar,
	Edit,
	Save,
	X,
	Phone,
	MapPin,
} from "lucide-react";

export default function ProfilePage() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editedUser, setEditedUser] = useState<User | null>(null);

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				setLoading(true);
				setError(null);

				// Try to get user from localStorage first
				const storedUser = AuthService.getUser();
				if (storedUser) {
					setUser(storedUser);
				}

				// Fetch fresh data from API
				const userData = await AuthService.fetchUserProfile();
				setUser(userData);
				setEditedUser(userData);
			} catch (err) {
				console.error("Error fetching user profile:", err);
				setError(
					err instanceof Error
						? err.message
						: "Failed to load profile"
				);

				// Fallback to stored user data if API fails
				const storedUser = AuthService.getUser();
				if (storedUser) {
					setUser(storedUser);
					setEditedUser(storedUser);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchUserProfile();
	}, []);

	const handleEdit = () => {
		setIsEditing(true);
		setEditedUser(user);
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditedUser(user);
	};

	const handleSave = async () => {
		if (!editedUser) return;

		try {
			// Here you would typically call an API to update the user
			// For now, we'll just update the local state
			setUser(editedUser);
			setIsEditing(false);
			AuthService.setUser(editedUser);
		} catch (err) {
			console.error("Error saving profile:", err);
			setError("Failed to save profile changes");
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString || dateString === "0001-01-01T00:00:00Z") {
			return "Not set";
		}
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getInitials = (user: User) => {
		const first = user.firstName || user.username.charAt(0);
		const last = user.lastName || user.username.charAt(1);
		return (first.charAt(0) + last.charAt(0)).toUpperCase();
	};

	const getFullName = (user: User) => {
		const names = [user.firstName, user.otherName, user.lastName].filter(
			Boolean
		);
		return names.length > 0 ? names.join(" ") : user.username;
	};

	const getRoleBadgeColor = (level: string) => {
		switch (level.toLowerCase()) {
			case "admin":
				return "bg-red-100 text-red-800";
			case "operator":
				return "bg-blue-100 text-blue-800";
			case "viewer":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uganda-red"></div>
				</div>
			</div>
		);
	}

	if (error && !user) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center">
							<div className="text-red-500 mb-4">
								<UserIcon className="h-16 w-16 mx-auto" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Error Loading Profile
							</h3>
							<p className="text-gray-600 mb-4">{error}</p>
							<Button
								onClick={() => window.location.reload()}
								className="bg-uganda-red hover:bg-uganda-red/90"
							>
								Retry
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center text-gray-500">
							No user data available
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-4xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Profile
				</h1>
				<p className="text-gray-600">
					Manage your account information and settings
				</p>
			</div>

			{error && (
				<Card className="mb-6 border-red-200 bg-red-50">
					<CardContent className="p-4">
						<div className="flex items-center text-red-700">
							<X className="h-5 w-5 mr-2" />
							{error}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Profile Overview */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-lg">
							Profile Overview
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="text-center">
							<Avatar className="h-24 w-24 mx-auto mb-4">
								<AvatarImage
									src=""
									alt={getFullName(user)}
								/>
								<AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-uganda-yellow to-uganda-red text-white">
									{getInitials(user)}
								</AvatarFallback>
							</Avatar>
							<h3 className="text-xl font-semibold text-gray-900">
								{getFullName(user)}
							</h3>
							<p className="text-gray-600 mb-2">
								@{user.username}
							</p>
							<Badge
								className={getRoleBadgeColor(
									user.level
								)}
							>
								{user.level || "User"}
							</Badge>
						</div>

						<Separator />

						<div className="space-y-4">
							<div className="flex items-center space-x-3">
								<Mail className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-sm font-medium text-gray-900">
										Email
									</p>
									<p className="text-sm text-gray-600">
										{user.email || "Not provided"}
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-3">
								<Building className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-sm font-medium text-gray-900">
										Affiliation
									</p>
									<p className="text-sm text-gray-600">
										{user.affiliation ||
											"Not provided"}
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-3">
								<Shield className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-sm font-medium text-gray-900">
										User Type
									</p>
									<p className="text-sm text-gray-600">
										{user.userType ||
											"Not specified"}
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Profile Details */}
				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-lg">
							Profile Details
						</CardTitle>
						<div className="flex space-x-2">
							{isEditing ? (
								<>
									<Button
										variant="outline"
										size="sm"
										onClick={handleCancelEdit}
									>
										<X className="h-4 w-4 mr-2" />
										Cancel
									</Button>
									<Button
										size="sm"
										onClick={handleSave}
										className="bg-uganda-red hover:bg-uganda-red/90"
									>
										<Save className="h-4 w-4 mr-2" />
										Save
									</Button>
								</>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={handleEdit}
								>
									<Edit className="h-4 w-4 mr-2" />
									Edit
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="firstName">
									First Name
								</Label>
								{isEditing ? (
									<Input
										id="firstName"
										value={
											editedUser?.firstName ||
											""
										}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															firstName:
																e
																	.target
																	.value,
													  }
													: null
											)
										}
										placeholder="Enter first name"
									/>
								) : (
									<p className="text-sm text-gray-900 mt-1">
										{user.firstName ||
											"Not provided"}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="lastName">
									Last Name
								</Label>
								{isEditing ? (
									<Input
										id="lastName"
										value={
											editedUser?.lastName ||
											""
										}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															lastName:
																e
																	.target
																	.value,
													  }
													: null
											)
										}
										placeholder="Enter last name"
									/>
								) : (
									<p className="text-sm text-gray-900 mt-1">
										{user.lastName ||
											"Not provided"}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="otherName">
									Other Name
								</Label>
								{isEditing ? (
									<Input
										id="otherName"
										value={
											editedUser?.otherName ||
											""
										}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															otherName:
																e
																	.target
																	.value,
													  }
													: null
											)
										}
										placeholder="Enter other name"
									/>
								) : (
									<p className="text-sm text-gray-900 mt-1">
										{user.otherName ||
											"Not provided"}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="username">
									Username
								</Label>
								<p className="text-sm text-gray-900 mt-1">
									{user.username}
								</p>
							</div>

							<div>
								<Label htmlFor="email">
									Email Address
								</Label>
								{isEditing ? (
									<Input
										id="email"
										type="email"
										value={
											editedUser?.email || ""
										}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															email: e
																.target
																.value,
													  }
													: null
											)
										}
										placeholder="Enter email address"
									/>
								) : (
									<p className="text-sm text-gray-900 mt-1">
										{user.email || "Not provided"}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="affiliation">
									Affiliation
								</Label>
								{isEditing ? (
									<Input
										id="affiliation"
										value={
											editedUser?.affiliation ||
											""
										}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															affiliation:
																e
																	.target
																	.value,
													  }
													: null
											)
										}
										placeholder="Enter affiliation"
									/>
								) : (
									<p className="text-sm text-gray-900 mt-1">
										{user.affiliation ||
											"Not provided"}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="userType">
									User Type
								</Label>
								<p className="text-sm text-gray-900 mt-1">
									{user.userType || "Not specified"}
								</p>
							</div>

							<div>
								<Label htmlFor="level">
									Access Level
								</Label>
								<div className="mt-1">
									<Badge
										className={getRoleBadgeColor(
											user.level
										)}
									>
										{user.level || "User"}
									</Badge>
								</div>
							</div>
						</div>

						<Separator />

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label>Account Created</Label>
								<div className="flex items-center space-x-2 mt-1">
									<Calendar className="h-4 w-4 text-gray-400" />
									<p className="text-sm text-gray-900">
										{formatDate(user.createdAt)}
									</p>
								</div>
							</div>

							<div>
								<Label>Last Updated</Label>
								<div className="flex items-center space-x-2 mt-1">
									<Calendar className="h-4 w-4 text-gray-400" />
									<p className="text-sm text-gray-900">
										{formatDate(user.updatedAt)}
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
