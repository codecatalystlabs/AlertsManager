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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
	const isAdmin = Boolean(user.role?.isSystem || user.isSuperAdmin);
	const missing = [
		!user.firstName && "first name",
		!user.lastName && "last name",
		!user.email && "email",
		!user.affiliation && "affiliation",
	].filter(Boolean) as string[];

	return (
		<div className="mx-auto w-full max-w-6xl p-4">
			<div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
				{/* ---- Credential card ---- */}
				<aside className="space-y-4 lg:sticky lg:top-4">
					<div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg">
						<div className="flex h-1.5">
							<span className="flex-1 bg-slate-900" />
							<span className="flex-1 bg-uganda-yellow" />
							<span className="flex-1 bg-uganda-red" />
						</div>
						<div className="p-5">
							<div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
								<span className="text-slate-500">Health alert credential</span>
								<span className="text-uganda-yellow">
									MOH-UG-{String(user.id).padStart(4, "0")}
								</span>
							</div>

							<div className="mt-5 flex items-center gap-4">
								<div className="relative shrink-0">
									<Avatar className="h-16 w-16 rounded-2xl">
										<AvatarImage src="" alt={fullName} />
										<AvatarFallback className="rounded-2xl bg-uganda-yellow text-xl font-bold text-slate-950">
											{userInitials(user)}
										</AvatarFallback>
									</Avatar>
									<span
										className={cn(
											"absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950",
											user.isActive === false ? "bg-slate-500" : "bg-emerald-500"
										)}
										title={user.isActive === false ? "Inactive" : "Active"}
									/>
								</div>
								<div className="min-w-0">
									<h1 className="truncate text-lg font-semibold leading-tight tracking-tight">
										{fullName}
									</h1>
									<p className="mt-0.5 truncate font-mono text-xs text-slate-400">
										@{user.username}
									</p>
								</div>
							</div>

							<dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 text-sm">
								{[
									["Role", roleName, isAdmin ? "text-rose-400" : "text-white"],
									["Jurisdiction", areaLabel(user), "text-white"],
									["Affiliation", user.affiliation || "—", "text-white"],
									["Since", formatDate(user.createdAt), "text-white"],
								].map(([k, v, tone]) => (
									<div key={k} className="bg-slate-900 px-3 py-2.5">
										<dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
											{k}
										</dt>
										<dd className={cn("mt-0.5 truncate font-semibold", tone)}>{v}</dd>
									</div>
								))}
							</dl>

							<p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
								<Lock className="mt-0.5 h-3 w-3 shrink-0" />
								Role, jurisdiction and username are managed by a system administrator.
							</p>
						</div>
					</div>

					<CompletenessCard completeness={completeness} missing={missing} onEdit={handleEdit} />
				</aside>

				{/* ---- Tabs ---- */}
				<main className="min-w-0 space-y-3">
					{(error || success) && (
						<div
							className={cn(
								"flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
								error ? "surface-danger text-destructive" : "surface-success text-success"
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

					<Tabs defaultValue="profile" className="space-y-3">
						<TabsList>
							<TabsTrigger value="profile">Profile</TabsTrigger>
							<TabsTrigger value="security">Security</TabsTrigger>
							<TabsTrigger value="activity">Activity</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" className="mt-0 space-y-4">
							<section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
								<div className="flex items-center justify-between gap-3 border-b px-5 py-4">
									<div>
										<h2 className="text-base font-semibold text-slate-950">Personal details</h2>
										<p className="text-xs text-slate-500">How colleagues and the system identify you.</p>
									</div>
									{isEditing ? (
										<div className="flex gap-2">
											<Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
												<X className="h-4 w-4" />
												Cancel
											</Button>
											<Button type="button" size="sm" onClick={handleSave} disabled={saving}>
												{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
												Save
											</Button>
										</div>
									) : (
										<Button type="button" variant="outline" size="sm" onClick={handleEdit}>
											<Edit3 className="h-4 w-4" />
											Edit
										</Button>
									)}
								</div>

								<div className="divide-y">
									<DetailRow label="First name" value={user.firstName} editing={isEditing}
										input={<EditableField id="firstName" error={fieldErrors.firstName} label="First name" value={form.firstName} placeholder="First name" onChange={handleFieldChange} />} />
									<DetailRow label="Last name" value={user.lastName} editing={isEditing}
										input={<EditableField id="lastName" error={fieldErrors.lastName} label="Last name" value={form.lastName} placeholder="Last name" onChange={handleFieldChange} />} />
									<DetailRow label="Other name" value={user.otherName} optional editing={isEditing}
										input={<EditableField id="otherName" error={fieldErrors.otherName} label="Other name" value={form.otherName} placeholder="Other name" onChange={handleFieldChange} />} />
									<DetailRow label="Email" value={user.email} editing={isEditing}
										input={<EditableField id="email" type="email" error={fieldErrors.email} label="Email address" value={form.email} placeholder="Email address" onChange={handleFieldChange} />} />
									<DetailRow label="Affiliation" value={user.affiliation} editing={isEditing}
										input={<EditableField id="affiliation" error={fieldErrors.affiliation} label="Affiliation" value={form.affiliation} placeholder="Affiliation" onChange={handleFieldChange} />} />
									<DetailRow label="User type" value={user.userType} locked="Set by admin" />
									<DetailRow label="Username" value={user.username ? `@${user.username}` : ""} locked="Set by admin" mono />
								</div>
								<p className="border-t bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500">
									Email changes require re-verification.
								</p>
							</section>

							<YourAccessCard user={user} />
						</TabsContent>

						<TabsContent value="security" className="mt-0">
							<ChangePasswordCard />
						</TabsContent>

						<TabsContent value="activity" className="mt-0">
							<section className="rounded-2xl border bg-white p-5 shadow-sm">
								<h2 className="text-base font-semibold text-slate-950">Account activity</h2>
								<p className="text-xs text-slate-500">Key moments in the life of this account.</p>
								<ol className="relative mt-5 space-y-5 border-l border-slate-200 pl-6">
									{[
										["Last sign-in", user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not recorded", KeyRound],
										["Profile last updated", formatDate(user.updatedAt), Edit3],
										["Account created", formatDate(user.createdAt), CalendarDays],
									].map(([label, when, Icon]) => {
										const I = Icon as ComponentType<{ className?: string }>;
										return (
											<li key={label as string} className="relative">
												<span className="absolute -left-[2.15rem] flex h-6 w-6 items-center justify-center rounded-full border bg-white">
													<I className="h-3 w-3 text-slate-500" />
												</span>
												<p className="text-sm font-medium text-slate-900">{label as string}</p>
												<p className="text-xs text-slate-500">{when as string}</p>
											</li>
										);
									})}
								</ol>
							</section>
						</TabsContent>
					</Tabs>
				</main>
			</div>
		</div>
	);
}

/** One labelled row of the details list: read-only text, or an input while editing. */
function DetailRow({
	label,
	value,
	optional,
	locked,
	mono,
	editing,
	input,
}: {
	label: string;
	value?: string;
	optional?: boolean;
	locked?: string;
	mono?: boolean;
	editing?: boolean;
	input?: React.ReactNode;
}) {
	const showInput = editing && input;
	return (
		<div className={cn("grid items-center gap-1 px-5 sm:grid-cols-[9rem_1fr_auto] sm:gap-4", showInput ? "py-3" : "py-3.5")}>
			<span className="text-xs text-slate-500">{label}</span>
			<div className="min-w-0">
				{showInput ? (
					input
				) : value ? (
					<span className={cn("block truncate text-sm font-semibold text-slate-900", mono && "font-mono")}>{value}</span>
				) : (
					<span className="text-sm italic text-slate-400">{locked ? "Not assigned" : "Not added"}</span>
				)}
			</div>
			{(locked || optional) && !showInput && (
				<span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
					{locked ?? "Optional"}
				</span>
			)}
		</div>
	);
}

/** Ring + the next thing worth filling in. */
function CompletenessCard({
	completeness,
	missing,
	onEdit,
}: {
	completeness: number;
	missing: string[];
	onEdit: () => void;
}) {
	const r = 18;
	const c = 2 * Math.PI * r;
	return (
		<div className="rounded-2xl border bg-white p-4 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="relative h-11 w-11 shrink-0">
					<svg viewBox="0 0 44 44" className="-rotate-90">
						<circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-slate-100" />
						<circle
							cx="22" cy="22" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
							className="stroke-uganda-red"
							strokeDasharray={c}
							strokeDashoffset={c * (1 - completeness / 100)}
						/>
					</svg>
					<span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-900">
						{completeness}%
					</span>
				</div>
				<div>
					<p className="text-sm font-semibold text-slate-950">
						{completeness === 100 ? "Profile complete" : "Finish your profile"}
					</p>
					<p className="text-xs text-slate-500">
						Complete profiles help district teams reach you during an outbreak.
					</p>
				</div>
			</div>
			{missing.length > 0 && (
				<button
					type="button"
					onClick={onEdit}
					className="mt-3 flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
				>
					<span>Add your {missing[0]}</span>
					<span className="font-semibold text-uganda-red">+</span>
				</button>
			)}
		</div>
	);
}

/**
 * What this account may do and see: its role, its area and the permissions
 * the role grants, by name. Role and area are set by an administrator.
 */
function YourAccessCard({ user }: { user: User }) {
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
			<PasswordInput
				id={id}
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
