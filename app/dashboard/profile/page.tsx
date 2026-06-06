"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	AtSign,
	Building2,
	CalendarDays,
	Check,
	Edit3,
	IdCard,
	Loader2,
	Mail,
	Save,
	ShieldCheck,
	UserRound,
	X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService, type UpdateUserPayload, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";

type ProfileForm = Pick<
	User,
	"firstName" | "lastName" | "otherName" | "email" | "affiliation"
>;

const EMPTY_FORM: ProfileForm = {
	firstName: "",
	lastName: "",
	otherName: "",
	email: "",
	affiliation: "",
};

function userToForm(user: User): ProfileForm {
	return {
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		otherName: user.otherName ?? "",
		email: user.email ?? "",
		affiliation: user.affiliation ?? "",
	};
}

function formatDate(dateString: string): string {
	if (!dateString || dateString === "0001-01-01T00:00:00Z") {
		return "Not set";
	}

	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function getFullName(user: User): string {
	const names = [user.firstName, user.otherName, user.lastName].filter(Boolean);
	return names.length > 0 ? names.join(" ") : user.username;
}

function getInitials(user: User): string {
	const first = user.firstName || user.username.charAt(0);
	const last = user.lastName || user.username.charAt(1);
	return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getRoleBadgeClass(level: string): string {
	switch (level.toLowerCase()) {
		case "admin":
			return "border-red-200 bg-red-50 text-red-700";
		case "district":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "reoc":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function ReadOnlyField({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value?: string;
	icon: ComponentType<{ className?: string }>;
}) {
	return (
		<div className="flex min-w-0 gap-3 rounded-md border bg-white px-3 py-2.5">
			<Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
			<div className="min-w-0">
				<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
					{label}
				</p>
				<p className="truncate text-sm font-medium text-slate-900">
					{value || "Not provided"}
				</p>
			</div>
		</div>
	);
}

function EditableField({
	id,
	label,
	value,
	placeholder,
	type = "text",
	onChange,
}: {
	id: keyof ProfileForm;
	label: string;
	value: string;
	placeholder: string;
	type?: string;
	onChange: (field: keyof ProfileForm, value: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-xs font-semibold text-slate-700">
				{label}
			</Label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(id, event.target.value)}
				placeholder={placeholder}
				className="h-9"
			/>
		</div>
	);
}

export default function ProfilePage() {
	const [user, setUser] = useState<User | null>(null);
	const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				setLoading(true);
				setError(null);

				const storedUser = AuthService.getUser();
				if (storedUser) {
					setUser(storedUser);
					setForm(userToForm(storedUser));
				}

				const userData = await AuthService.fetchUserProfile();
				setUser(userData);
				setForm(userToForm(userData));
			} catch (err) {
				console.error("Error fetching user profile:", err);
				const storedUser = AuthService.getUser();
				if (storedUser) {
					setUser(storedUser);
					setForm(userToForm(storedUser));
					setError(
						"Showing saved profile details. Could not refresh from the server."
					);
				} else {
					setError(
						err instanceof Error ? err.message : "Failed to load profile"
					);
				}
			} finally {
				setLoading(false);
			}
		};

		void fetchUserProfile();
	}, []);

	const completeness = useMemo(() => {
		if (!user) return 0;
		const fields = [
			user.firstName,
			user.lastName,
			user.email,
			user.affiliation,
			user.level,
			user.userType,
		];
		return Math.round((fields.filter(Boolean).length / fields.length) * 100);
	}, [user]);

	const handleFieldChange = (field: keyof ProfileForm, value: string) => {
		setForm((current) => ({ ...current, [field]: value }));
		setSuccess(null);
	};

	const handleEdit = () => {
		if (!user) return;
		setForm(userToForm(user));
		setIsEditing(true);
		setSuccess(null);
	};

	const handleCancel = () => {
		if (user) setForm(userToForm(user));
		setIsEditing(false);
		setSuccess(null);
	};

	const handleSave = async () => {
		if (!user) return;
		setSaving(true);
		setError(null);
		setSuccess(null);

		const payload: UpdateUserPayload = {
			username: user.username,
			firstName: form.firstName,
			lastName: form.lastName,
			otherName: form.otherName,
			email: form.email,
			affiliation: form.affiliation,
			userType: user.userType ?? "",
			level: user.level ?? "",
			password: "",
		};

		try {
			const updatedUser = await AuthService.updateUser(user.id, payload);
			setUser(updatedUser);
			setForm(userToForm(updatedUser));
			AuthService.setUser(updatedUser);
			setIsEditing(false);
			setSuccess("Profile updated.");
		} catch (err) {
			console.error("Error saving profile:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to save profile changes"
			);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
				<div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
					<div className="h-64 animate-pulse rounded-md border bg-slate-100" />
					<div className="h-64 animate-pulse rounded-md border bg-slate-100" />
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
				<Card className="border-red-200 bg-red-50">
					<CardContent className="flex items-start gap-3 p-4">
						<AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
						<div>
							<h1 className="font-semibold text-red-950">
								Profile unavailable
							</h1>
							<p className="text-sm text-red-800">
								{error || "No user data is available for this session."}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const fullName = getFullName(user);
	const level = user.level || "User";

	return (
		<div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
			<section className="overflow-hidden rounded-md border bg-white shadow-sm">
				<div className="border-b bg-slate-950 px-4 py-4 text-white sm:px-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-center gap-4">
							<Avatar className="h-16 w-16 border border-white/20">
								<AvatarImage src="" alt={fullName} />
								<AvatarFallback className="bg-uganda-yellow text-lg font-bold text-slate-950">
									{getInitials(user)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="truncate text-2xl font-semibold tracking-tight">
										{fullName}
									</h1>
									<Badge
										className={cn(
											"border",
											getRoleBadgeClass(level)
										)}
									>
										{level}
									</Badge>
								</div>
								<p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
									<AtSign className="h-3.5 w-3.5" />
									{user.username}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							{isEditing ? (
								<>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
										onClick={handleCancel}
										disabled={saving}
									>
										<X className="h-4 w-4" />
										Cancel
									</Button>
									<Button
										type="button"
										size="sm"
										className="bg-uganda-yellow text-slate-950 hover:bg-uganda-yellow/90"
										onClick={handleSave}
										disabled={saving}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Save className="h-4 w-4" />
										)}
										Save changes
									</Button>
								</>
							) : (
								<Button
									type="button"
									size="sm"
									className="bg-white text-slate-950 hover:bg-slate-100"
									onClick={handleEdit}
								>
									<Edit3 className="h-4 w-4" />
									Edit profile
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
					<ReadOnlyField label="Email" value={user.email} icon={Mail} />
					<ReadOnlyField
						label="Affiliation"
						value={user.affiliation}
						icon={Building2}
					/>
					<ReadOnlyField
						label="User type"
						value={user.userType || "Not specified"}
						icon={IdCard}
					/>
					<ReadOnlyField
						label="Account created"
						value={formatDate(user.createdAt)}
						icon={CalendarDays}
					/>
				</div>
			</section>

			{(error || success) && (
				<div
					className={cn(
						"flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
						error
							? "border-red-200 bg-red-50 text-red-800"
							: "border-emerald-200 bg-emerald-50 text-emerald-800"
					)}
				>
					{error ? (
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
					) : (
						<Check className="mt-0.5 h-4 w-4 shrink-0" />
					)}
					<span>{error || success}</span>
				</div>
			)}

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<Card className="shadow-sm">
					<CardContent className="p-4 sm:p-5">
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-semibold text-slate-950">
									Personal Information
								</h2>
								<p className="text-sm text-slate-500">
									Name, contact, and organizational details.
								</p>
							</div>
							{!isEditing && (
								<Badge
									variant="outline"
									className="hidden sm:inline-flex"
								>
									Read-only
								</Badge>
							)}
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							{isEditing ? (
								<>
									<EditableField
										id="firstName"
										label="First name"
										value={form.firstName}
										placeholder="First name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="lastName"
										label="Last name"
										value={form.lastName}
										placeholder="Last name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="otherName"
										label="Other name"
										value={form.otherName}
										placeholder="Other name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="email"
										label="Email address"
										type="email"
										value={form.email}
										placeholder="Email address"
										onChange={handleFieldChange}
									/>
									<div className="sm:col-span-2">
										<EditableField
											id="affiliation"
											label="Affiliation"
											value={form.affiliation}
											placeholder="Affiliation"
											onChange={handleFieldChange}
										/>
									</div>
								</>
							) : (
								<>
									<ReadOnlyField
										label="First name"
										value={user.firstName}
										icon={UserRound}
									/>
									<ReadOnlyField
										label="Last name"
										value={user.lastName}
										icon={UserRound}
									/>
									<ReadOnlyField
										label="Other name"
										value={user.otherName}
										icon={UserRound}
									/>
									<ReadOnlyField
										label="Email address"
										value={user.email}
										icon={Mail}
									/>
									<div className="sm:col-span-2">
										<ReadOnlyField
											label="Affiliation"
											value={user.affiliation}
											icon={Building2}
										/>
									</div>
								</>
							)}
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card className="shadow-sm">
						<CardContent className="p-4">
							<div className="mb-3 flex items-center gap-2">
								<ShieldCheck className="h-4 w-4 text-emerald-600" />
								<h2 className="text-sm font-semibold text-slate-950">
									Access Summary
								</h2>
							</div>
							<div className="space-y-3">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
										Access level
									</p>
									<Badge
										className={cn(
											"mt-1 border",
											getRoleBadgeClass(level)
										)}
									>
										{level}
									</Badge>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
										User type
									</p>
									<p className="mt-1 text-sm font-medium text-slate-900">
										{user.userType || "Not specified"}
									</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
										Profile completeness
									</p>
									<div className="mt-2 h-2 rounded-full bg-slate-100">
										<div
											className="h-2 rounded-full bg-emerald-500"
											style={{ width: `${completeness}%` }}
										/>
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{completeness}% complete
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm">
						<CardContent className="p-4">
							<h2 className="mb-3 text-sm font-semibold text-slate-950">
								Account Timeline
							</h2>
							<div className="space-y-3">
								<ReadOnlyField
									label="Created"
									value={formatDate(user.createdAt)}
									icon={CalendarDays}
								/>
								<ReadOnlyField
									label="Last updated"
									value={formatDate(user.updatedAt)}
									icon={CalendarDays}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
