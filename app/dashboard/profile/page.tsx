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
	KeyRound,
	Loader2,
	Lock,
	Mail,
	MapPin,
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
import { AuthService, type User } from "@/lib/auth";
import { areaLabel, canAny, isDistrictScoped, isRegionScoped, PERM } from "@/lib/access";
import {
	AccessApiError,
	changeMyPassword,
	fetchPermissionCatalogue,
	updateMyProfile,
	type PermissionGroup,
} from "@/lib/access-api";
import { groupHeld } from "@/components/access/permission-labels";
import { FieldError } from "@/components/access/access-bits";
import { cn } from "@/lib/utils";
import { userFullName, userInitials } from "@/lib/user-name";

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

/** The built-in administrator stands out; every other role looks alike. */
function roleBadgeClass(user: User): string {
	return user.role?.isSystem || user.isSuperAdmin
		? "border-destructive/30 bg-destructive/15 text-destructive"
		: "border-border bg-muted text-foreground";
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
	error,
	onChange,
}: {
	id: keyof ProfileForm;
	label: string;
	value: string;
	placeholder: string;
	type?: string;
	/** The server's message for this field, if it refused it. */
	error?: string;
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
				aria-invalid={Boolean(error)}
			/>
			<FieldError message={error} />
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
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
		setFieldErrors((current) => {
			if (!current[field]) return current;
			const next = { ...current };
			delete next[field];
			return next;
		});
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
		setFieldErrors({});
		setSuccess(null);
	};

	const handleSave = async () => {
		if (!user) return;
		setSaving(true);
		setError(null);
		setSuccess(null);
		setFieldErrors({});

		try {
			// Only the caller's own details: username, role, area and user type
			// are set by an administrator.
			const updatedUser = await updateMyProfile(form);
			setUser(updatedUser);
			setForm(userToForm(updatedUser));
			setIsEditing(false);
			setSuccess("Profile updated.");
		} catch (err) {
			console.error("Error saving profile:", err);
			if (err instanceof AccessApiError && Object.keys(err.fields).length) {
				setFieldErrors(err.fields);
				setError(err.message);
			} else {
				setError(
					err instanceof Error
						? err.message
						: "Failed to save profile changes"
				);
			}
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto w-full max-w-6xl p-4">
				<div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
					<div className="h-64 animate-pulse rounded-md border bg-slate-100" />
					<div className="h-64 animate-pulse rounded-md border bg-slate-100" />
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="mx-auto w-full max-w-3xl p-4">
				<Card className="surface-danger">
					<CardContent className="flex items-start gap-3">
						<AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
						<div>
							<h1 className="font-semibold text-destructive">
								Profile unavailable
							</h1>
							<p className="text-sm text-destructive">
								{error || "No user data is available for this session."}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const fullName = userFullName(user);
	const roleName = user.role?.name || user.level || "No role";

	return (
		<div className="mx-auto w-full max-w-6xl space-y-4 p-4">
			<section className="overflow-hidden rounded-md border bg-white shadow-sm">
				<div className="border-b bg-slate-950 px-4 py-4 text-white sm:px-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-center gap-4">
							<Avatar className="h-16 w-16 border border-white/20">
								<AvatarImage src="" alt={fullName} />
								<AvatarFallback className="bg-uganda-yellow text-lg font-bold text-slate-950">
									{userInitials(user)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="truncate text-xl font-semibold tracking-tight">
										{fullName}
									</h1>
									<Badge
										className={cn(
											"border",
											roleBadgeClass(user)
										)}
									>
										{roleName}
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
							? "surface-danger text-destructive"
							: "surface-success text-success"
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
					<CardContent>
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
										error={fieldErrors.firstName}
										label="First name"
										value={form.firstName}
										placeholder="First name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="lastName"
										error={fieldErrors.lastName}
										label="Last name"
										value={form.lastName}
										placeholder="Last name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="otherName"
										error={fieldErrors.otherName}
										label="Other name"
										value={form.otherName}
										placeholder="Other name"
										onChange={handleFieldChange}
									/>
									<EditableField
										id="email"
										error={fieldErrors.email}
										label="Email address"
										type="email"
										value={form.email}
										placeholder="Email address"
										onChange={handleFieldChange}
									/>
									<div className="sm:col-span-2">
										<EditableField
											id="affiliation"
											error={fieldErrors.affiliation}
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
					<YourAccessCard user={user} completeness={completeness} />
					<ChangePasswordCard />

					<Card className="shadow-sm">
						<CardContent>
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

/**
 * What this account may do and see: its role, its area and the permissions
 * the role grants, by name. Role and area are set by an administrator.
 */
function YourAccessCard({ user, completeness }: { user: User; completeness: number }) {
	const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
	// The catalogue's labels need users.view or roles.manage; everyone else
	// gets readable fallback labels (components/access/permission-labels.ts).
	const mayReadCatalogue = canAny(user, PERM.usersView, PERM.rolesManage);
	useEffect(() => {
		if (!mayReadCatalogue) return;
		let cancelled = false;
		fetchPermissionCatalogue()
			.then((g) => !cancelled && setGroups(g))
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [mayReadCatalogue]);

	const held = useMemo(() => groupHeld(user.permissions ?? [], groups), [user.permissions, groups]);
	const scoped = isDistrictScoped(user) || isRegionScoped(user);

	return (
		<Card className="shadow-sm">
			<CardContent>
				<div className="mb-3 flex items-center gap-2">
					<ShieldCheck className="h-4 w-4 text-success" />
					<h2 className="text-sm font-semibold text-slate-950">Your access</h2>
				</div>
				<div className="space-y-3">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</p>
						<Badge className={cn("mt-1 border", roleBadgeClass(user))}>
							{user.role?.name || "No role"}
						</Badge>
					</div>
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							{isDistrictScoped(user) ? "District" : isRegionScoped(user) ? "Region" : "Area"}
						</p>
						<p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900">
							<MapPin className="h-3.5 w-3.5 text-uganda-red" />
							{areaLabel(user)}
						</p>
						{scoped && (
							<p className="mt-0.5 text-xs text-slate-500">
								You see signals, feeds and reports for this area only.
							</p>
						)}
					</div>
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							What you can do
						</p>
						{user.isSuperAdmin ? (
							<p className="mt-1 text-sm text-slate-900">All permissions (built-in administrator)</p>
						) : held.length === 0 ? (
							<p className="mt-1 text-sm text-slate-500">No permissions.</p>
						) : (
							<dl className="mt-1 space-y-1.5">
								{held.map((g) => (
									<div key={g.group}>
										<dt className="text-xs font-medium text-slate-700">{g.group}</dt>
										<dd className="text-xs text-slate-500">{g.labels.join(" · ")}</dd>
									</div>
								))}
							</dl>
						)}
					</div>
					<p className="flex items-start gap-1.5 text-xs text-slate-500">
						<Lock className="mt-0.5 h-3 w-3 shrink-0" />
						Your username, role, area and user type are set by an administrator.
					</p>
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">User type</p>
						<p className="mt-1 text-sm font-medium text-slate-900">{user.userType || "Not specified"}</p>
					</div>
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							Profile completeness
						</p>
						<div className="mt-2 h-2 rounded-full bg-slate-100">
							<div className="h-2 rounded-full bg-success" style={{ width: `${completeness}%` }} />
						</div>
						<p className="mt-1 text-xs text-slate-500">{completeness}% complete</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

const MIN_PASSWORD = 8;

/** Change one's own password; the current one is required. */
function ChangePasswordCard() {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [done, setDone] = useState(false);

	const submit = async () => {
		const e: Record<string, string> = {};
		if (!current) e.currentPassword = "Enter your current password";
		if (next.length < MIN_PASSWORD) e.newPassword = `At least ${MIN_PASSWORD} characters`;
		else if (next === current) e.newPassword = "Choose a password different from the current one";
		if (confirm !== next) e.confirm = "The two new passwords do not match";
		setErrors(e);
		setDone(false);
		if (Object.keys(e).length) return;

		setSaving(true);
		try {
			await changeMyPassword(current, next);
			setCurrent("");
			setNext("");
			setConfirm("");
			setDone(true);
		} catch (err) {
			if (err instanceof AccessApiError && Object.keys(err.fields).length) setErrors(err.fields);
			else setErrors({ form: err instanceof Error ? err.message : "Could not change the password" });
		} finally {
			setSaving(false);
		}
	};

	const field = (id: string, label: string, value: string, set: (v: string) => void, autoComplete: string) => (
		<div className="space-y-1">
			<Label htmlFor={id} className="text-xs font-semibold text-slate-700">
				{label}
			</Label>
			<Input
				id={id}
				type="password"
				autoComplete={autoComplete}
				value={value}
				onChange={(ev) => {
					set(ev.target.value);
					setDone(false);
				}}
				className="h-9"
				aria-invalid={Boolean(errors[id])}
			/>
			<FieldError message={errors[id]} />
		</div>
	);

	return (
		<Card className="shadow-sm">
			<CardContent>
				<div className="mb-3 flex items-center gap-2">
					<KeyRound className="h-4 w-4 text-slate-500" />
					<h2 className="text-sm font-semibold text-slate-950">Change password</h2>
				</div>
				<form
					className="space-y-3"
					onSubmit={(ev) => {
						ev.preventDefault();
						void submit();
					}}
				>
					{field("currentPassword", "Current password", current, setCurrent, "current-password")}
					{field("newPassword", "New password", next, setNext, "new-password")}
					{field("confirm", "Confirm new password", confirm, setConfirm, "new-password")}
					<p className="text-xs text-slate-500">At least {MIN_PASSWORD} characters.</p>
					<FieldError message={errors.form} />
					{done && (
						<p className="flex items-center gap-1.5 text-xs text-success">
							<Check className="h-3.5 w-3.5" />
							Password changed.
						</p>
					)}
					<Button type="submit" size="sm" className="w-full" disabled={saving}>
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}
						Change password
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
