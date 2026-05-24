"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuthService, User } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
	Plus,
	Edit,
	Trash2,
	Search,
	AlertCircle,
	Users as UsersIcon,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/dashboard/loading-spinner";
import { ErrorAlert } from "@/components/dashboard/error-alert";

interface UserFormData {
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

const EMPTY_FORM: UserFormData = {
	username: "",
	password: "",
	firstName: "",
	lastName: "",
	otherName: "",
	email: "",
	affiliation: "",
	userType: "",
	level: "",
};

const USER_TYPES = ["District", "REOC", "MoH", "Health Facility"];
const ACCESS_LEVELS = ["Admin", "District", "REOC", "Viewer"];

const inputCls =
	"h-9 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const triggerCls =
	"h-9 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus:ring-0 focus:ring-offset-0";
const labelCls =
	"mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground";

function levelAccent(level: string): "red" | "yellow" | "green" | "neutral" {
	switch (level?.toLowerCase()) {
		case "admin":
			return "red";
		case "district":
			return "yellow";
		case "reoc":
			return "green";
		default:
			return "neutral";
	}
}

const accentBar = {
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	green: "bg-accent-green",
	neutral: "bg-foreground/30",
} as const;

const accentText = {
	red: "text-accent-red",
	yellow: "text-foreground",
	green: "text-accent-green",
	neutral: "text-muted-foreground",
} as const;

function formatDate(dateString: string) {
	if (!dateString || dateString === "0001-01-01T00:00:00Z") return "—";
	return new Date(dateString).toLocaleDateString("en-GB", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	});
}

function getDisplayName(user: User) {
	const names = [user.firstName, user.otherName, user.lastName].filter(Boolean);
	return names.length > 0 ? names.join(" ") : user.username;
}

function getInitials(user: User) {
	const first = user.firstName?.[0] ?? "";
	const last = user.lastName?.[0] ?? "";
	const initials = `${first}${last}`.trim().toUpperCase();
	return initials || user.username.slice(0, 2).toUpperCase();
}

export default function UsersPage() {
	const { toast } = useToast();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Add user dialog
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [newUser, setNewUser] = useState<UserFormData>(EMPTY_FORM);

	// Edit user dialog
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [editForm, setEditForm] = useState<UserFormData>(EMPTY_FORM);
	const [editError, setEditError] = useState<string | null>(null);

	// Delete confirmation
	const [deletingUser, setDeletingUser] = useState<User | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const fetchUsers = useCallback(async () => {
		try {
			setError(null);
			const usersData = await AuthService.fetchAllUsers();
			setUsers(usersData);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch users");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await fetchUsers();
		} finally {
			setIsRefreshing(false);
		}
	};

	const filteredUsers = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) =>
				u.username.toLowerCase().includes(q) ||
				(u.email ?? "").toLowerCase().includes(q) ||
				(u.affiliation ?? "").toLowerCase().includes(q) ||
				getDisplayName(u).toLowerCase().includes(q)
		);
	}, [users, searchTerm]);

	const stats = useMemo(() => {
		const admin = users.filter((u) => u.level?.toLowerCase() === "admin").length;
		const district = users.filter(
			(u) => u.level?.toLowerCase() === "district"
		).length;
		const reoc = users.filter((u) => u.level?.toLowerCase() === "reoc").length;
		return { total: users.length, admin, district, reoc };
	}, [users]);

	// --- Add user ---
	const handleAddUser = async () => {
		if (
			!newUser.username ||
			!newUser.password ||
			!newUser.firstName ||
			!newUser.lastName ||
			!newUser.email ||
			!newUser.affiliation
		) {
			setFormError("Please fill in all required fields.");
			return;
		}
		try {
			setIsSubmitting(true);
			setFormError(null);
			const registered = await AuthService.registerUser({
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
			setUsers((prev) => [...prev, registered]);
			toast({
				title: "User registered",
				description: `${getDisplayName(registered)} added to the system.`,
			});
			setNewUser(EMPTY_FORM);
			setIsAddUserOpen(false);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Failed to register user");
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Edit user ---
	const openEditDialog = (user: User) => {
		setEditingUser(user);
		setEditForm({
			username: user.username ?? "",
			password: "",
			firstName: user.firstName ?? "",
			lastName: user.lastName ?? "",
			otherName: user.otherName ?? "",
			email: user.email ?? "",
			affiliation: user.affiliation ?? "",
			userType: user.userType ?? "",
			level: user.level ?? "",
		});
		setEditError(null);
	};

	const handleSaveEdit = async () => {
		if (!editingUser) return;
		if (
			!editForm.username ||
			!editForm.firstName ||
			!editForm.lastName ||
			!editForm.email ||
			!editForm.affiliation
		) {
			setEditError("Please fill in all required fields.");
			return;
		}
		try {
			setIsSubmitting(true);
			setEditError(null);
			const updated = await AuthService.updateUser(editingUser.id, {
				username: editForm.username,
				firstName: editForm.firstName,
				lastName: editForm.lastName,
				otherName: editForm.otherName,
				email: editForm.email,
				affiliation: editForm.affiliation,
				userType: editForm.userType,
				level: editForm.level,
				password: editForm.password || undefined,
			});
			setUsers((prev) =>
				prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u))
			);
			toast({
				title: "User updated",
				description: `${getDisplayName(updated)} saved successfully.`,
			});
			setEditingUser(null);
		} catch (err) {
			setEditError(err instanceof Error ? err.message : "Failed to update user");
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Delete user ---
	const handleConfirmDelete = async () => {
		if (!deletingUser) return;
		try {
			setDeletingId(deletingUser.id);
			await AuthService.deleteUser(deletingUser.id);
			setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
			toast({
				title: "User deleted",
				description: `${getDisplayName(deletingUser)} removed.`,
			});
			setDeletingUser(null);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Delete failed",
				description:
					err instanceof Error ? err.message : "Could not delete user",
			});
		} finally {
			setDeletingId(null);
		}
	};

	if (loading) {
		return <LoadingSpinner message="Loading users…" />;
	}

	return (
		<div className="space-y-12">
			{/* Header */}
			<header className="animate-reveal">
				<div className="flex items-center gap-3 mb-5">
					<span className="h-1 w-8 bg-accent-red rounded-full" />
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Administration · Identity
					</span>
				</div>
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
					<div className="max-w-2xl">
						<h1 className="serif text-4xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
							User <em className="italic text-accent-red">management</em>
						</h1>
						<p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
							Operators of the national surveillance system — district
							focal points, REOC analysts, and Ministry administrators.
						</p>
					</div>
					<div className="flex items-center gap-3 shrink-0">
						<Button
							onClick={handleRefresh}
							disabled={isRefreshing}
							variant="ghost"
							className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${
									isRefreshing ? "animate-spin" : ""
								}`}
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								{isRefreshing ? "Refreshing" : "Refresh"}
							</span>
						</Button>
						<Button
							onClick={() => {
								setFormError(null);
								setNewUser(EMPTY_FORM);
								setIsAddUserOpen(true);
							}}
							className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
						>
							<Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
							<span className="mono uppercase tracking-widest font-bold">
								Add User
							</span>
						</Button>
					</div>
				</div>
			</header>

			{error && (
				<ErrorAlert error={error} onRetry={handleRefresh} retrying={isRefreshing} />
			)}

			{/* Stats */}
			<section className="animate-reveal [animation-delay:100ms]">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
					{[
						{
							eyebrow: "Ω · Total",
							title: "All users",
							value: stats.total,
							accent: "neutral" as const,
						},
						{
							eyebrow: "α · Privileges",
							title: "Admin",
							value: stats.admin,
							accent: "red" as const,
						},
						{
							eyebrow: "β · Field",
							title: "District",
							value: stats.district,
							accent: "yellow" as const,
						},
						{
							eyebrow: "γ · Analysts",
							title: "REOC",
							value: stats.reoc,
							accent: "green" as const,
						},
					].map((card) => (
						<div key={card.title} className="relative bg-card px-6 py-7">
							<span
								className={cn(
									"absolute left-0 top-7 bottom-7 w-[2px] rounded-full",
									accentBar[card.accent]
								)}
								aria-hidden="true"
							/>
							<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
								{card.eyebrow}
							</p>
							<p className="text-xs font-medium text-foreground/80 mb-3">
								{card.title}
							</p>
							<p className="mono text-3xl font-medium tracking-tighter text-foreground tabular-nums leading-none">
								{card.value.toLocaleString()}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* Search + table */}
			<section className="animate-reveal [animation-delay:200ms] editorial-card">
				<header className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/[0.08]">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ · Roster
						</p>
						<h2 className="serif text-xl font-medium tracking-tight text-foreground">
							All users
						</h2>
					</div>
					<div className="flex items-center gap-3">
						<div className="relative">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5"
								strokeWidth={1.75}
							/>
							<Input
								placeholder="Search by name, email, or affiliation…"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className={`${inputCls} pl-9 w-72`}
							/>
						</div>
						<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums shrink-0">
							{filteredUsers.length.toLocaleString()} / {users.length.toLocaleString()}
						</p>
					</div>
				</header>

				<div className="p-6">
					{filteredUsers.length === 0 ? (
						<div className="py-16 text-center">
							<UsersIcon
								className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40"
								strokeWidth={1.5}
							/>
							<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
								{searchTerm
									? "No users match this search."
									: "No users in the roster yet."}
							</p>
						</div>
					) : (
						<div className="overflow-x-auto rounded-sm border border-foreground/[0.08]">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-foreground/[0.08] bg-background">
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											User
										</th>
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Email
										</th>
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Affiliation
										</th>
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Type
										</th>
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Level
										</th>
										<th className="px-4 py-3 text-left mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Created
										</th>
										<th className="px-4 py-3 text-right mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredUsers.map((user) => {
										const accent = levelAccent(user.level);
										return (
											<tr
												key={user.id}
												className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02] transition-colors"
											>
												<td className="px-4 py-4">
													<div className="flex items-center gap-3">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-foreground text-background mono text-[11px] font-semibold">
															{getInitials(user)}
														</div>
														<div className="min-w-0">
															<p className="font-medium text-foreground truncate">
																{getDisplayName(user)}
															</p>
															<p className="mono text-[10px] uppercase tracking-tight text-muted-foreground truncate">
																@{user.username}
															</p>
														</div>
													</div>
												</td>
												<td className="px-4 py-4 text-sm text-foreground/80">
													{user.email || "—"}
												</td>
												<td className="px-4 py-4 text-sm text-foreground/80">
													{user.affiliation || "—"}
												</td>
												<td className="px-4 py-4 text-sm text-foreground/80">
													{user.userType || "—"}
												</td>
												<td className="px-4 py-4">
													{user.level ? (
														<span className="inline-flex items-center gap-2">
															<span
																className={cn(
																	"h-1.5 w-1.5 rounded-full",
																	accentBar[accent]
																)}
															/>
															<span
																className={cn(
																	"mono text-[10px] uppercase tracking-widest font-bold",
																	accentText[accent]
																)}
															>
																{user.level}
															</span>
														</span>
													) : (
														<span className="text-muted-foreground/50">—</span>
													)}
												</td>
												<td className="px-4 py-4 mono text-[11px] text-muted-foreground tabular-nums">
													{formatDate(user.createdAt)}
												</td>
												<td className="px-4 py-4">
													<div className="flex items-center justify-end gap-1">
														<Button
															size="sm"
															variant="ghost"
															className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
															onClick={() => openEditDialog(user)}
															aria-label={`Edit ${user.username}`}
														>
															<Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="h-8 w-8 p-0 text-muted-foreground hover:text-accent-red hover:bg-accent-red/5 rounded-sm"
															onClick={() => setDeletingUser(user)}
															disabled={deletingId === user.id}
															aria-label={`Delete ${user.username}`}
														>
															{deletingId === user.id ? (
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															) : (
																<Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
															)}
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</section>

			{/* Add User Dialog */}
			<Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
				<DialogContent className="sm:max-w-2xl rounded-sm">
					<DialogHeader>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
							New record
						</p>
						<DialogTitle className="serif text-2xl font-medium tracking-tight">
							Register a new user
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground">
							Required fields are marked with an asterisk.
						</DialogDescription>
					</DialogHeader>

					{formError && (
						<div className="editorial-card border-l-2 border-l-accent-red px-4 py-3 flex items-start gap-3">
							<AlertCircle
								className="h-4 w-4 text-accent-red mt-0.5 shrink-0"
								strokeWidth={1.75}
							/>
							<p className="text-sm text-foreground/80">{formError}</p>
						</div>
					)}

					<UserForm
						form={newUser}
						setForm={setNewUser}
						disabled={isSubmitting}
						showPassword
					/>

					<DialogFooter className="gap-2 sm:gap-3">
						<Button
							variant="ghost"
							onClick={() => setIsAddUserOpen(false)}
							disabled={isSubmitting}
							className="text-xs mono uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm h-9 px-4"
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddUser}
							disabled={isSubmitting}
							className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-9"
						>
							{isSubmitting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
							)}
							<span className="mono uppercase tracking-widest font-bold">
								{isSubmitting ? "Registering" : "Register"}
							</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog
				open={!!editingUser}
				onOpenChange={(open) => !open && setEditingUser(null)}
			>
				<DialogContent className="sm:max-w-2xl rounded-sm">
					<DialogHeader>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
							Edit record
						</p>
						<DialogTitle className="serif text-2xl font-medium tracking-tight">
							{editingUser ? getDisplayName(editingUser) : ""}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground">
							Leave the password blank to keep the current one.
						</DialogDescription>
					</DialogHeader>

					{editError && (
						<div className="editorial-card border-l-2 border-l-accent-red px-4 py-3 flex items-start gap-3">
							<AlertCircle
								className="h-4 w-4 text-accent-red mt-0.5 shrink-0"
								strokeWidth={1.75}
							/>
							<p className="text-sm text-foreground/80">{editError}</p>
						</div>
					)}

					<UserForm
						form={editForm}
						setForm={setEditForm}
						disabled={isSubmitting}
						showPassword
						passwordOptional
					/>

					<DialogFooter className="gap-2 sm:gap-3">
						<Button
							variant="ghost"
							onClick={() => setEditingUser(null)}
							disabled={isSubmitting}
							className="text-xs mono uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm h-9 px-4"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSaveEdit}
							disabled={isSubmitting}
							className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-9"
						>
							{isSubmitting && (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							)}
							<span className="mono uppercase tracking-widest font-bold">
								{isSubmitting ? "Saving" : "Save changes"}
							</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirm */}
			<AlertDialog
				open={!!deletingUser}
				onOpenChange={(open) => !open && setDeletingUser(null)}
			>
				<AlertDialogContent className="rounded-sm">
					<AlertDialogHeader>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-1">
							Irreversible
						</p>
						<AlertDialogTitle className="serif text-2xl font-medium tracking-tight">
							Delete{" "}
							{deletingUser ? getDisplayName(deletingUser) : "this user"}?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
							This removes the account from the surveillance system. Any
							alerts they filed remain intact, but they will lose access
							immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="gap-2 sm:gap-3">
						<AlertDialogCancel className="text-xs mono uppercase tracking-widest font-bold rounded-sm h-9">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-accent-red text-background hover:bg-accent-red/90 text-xs mono uppercase tracking-widest font-bold rounded-sm h-9"
						>
							Delete user
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function UserForm({
	form,
	setForm,
	disabled,
	showPassword,
	passwordOptional,
}: {
	form: UserFormData;
	setForm: (f: UserFormData) => void;
	disabled?: boolean;
	showPassword?: boolean;
	passwordOptional?: boolean;
}) {
	const set = (patch: Partial<UserFormData>) => setForm({ ...form, ...patch });

	return (
		<div className="space-y-5 py-2">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="username" className={labelCls}>
						Username *
					</Label>
					<Input
						id="username"
						value={form.username}
						onChange={(e) => set({ username: e.target.value })}
						placeholder="surveillance.officer"
						disabled={disabled}
						className={inputCls}
					/>
				</div>
				{showPassword && (
					<div className="space-y-2">
						<Label htmlFor="password" className={labelCls}>
							Password {passwordOptional ? "" : "*"}
						</Label>
						<Input
							id="password"
							type="password"
							value={form.password}
							onChange={(e) => set({ password: e.target.value })}
							placeholder={
								passwordOptional ? "Leave blank to keep current" : "••••••••"
							}
							disabled={disabled}
							className={inputCls}
						/>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="firstName" className={labelCls}>
						First name *
					</Label>
					<Input
						id="firstName"
						value={form.firstName}
						onChange={(e) => set({ firstName: e.target.value })}
						disabled={disabled}
						className={inputCls}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="lastName" className={labelCls}>
						Last name *
					</Label>
					<Input
						id="lastName"
						value={form.lastName}
						onChange={(e) => set({ lastName: e.target.value })}
						disabled={disabled}
						className={inputCls}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="otherName" className={labelCls}>
						Other name
					</Label>
					<Input
						id="otherName"
						value={form.otherName}
						onChange={(e) => set({ otherName: e.target.value })}
						disabled={disabled}
						className={inputCls}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email" className={labelCls}>
						Email *
					</Label>
					<Input
						id="email"
						type="email"
						value={form.email}
						onChange={(e) => set({ email: e.target.value })}
						placeholder="name@health.go.ug"
						disabled={disabled}
						className={inputCls}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="affiliation" className={labelCls}>
					Affiliation *
				</Label>
				<Input
					id="affiliation"
					value={form.affiliation}
					onChange={(e) => set({ affiliation: e.target.value })}
					placeholder="Mbarara District Health Office"
					disabled={disabled}
					className={inputCls}
				/>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="userType" className={labelCls}>
						User type
					</Label>
					<Select
						value={form.userType}
						onValueChange={(v) => set({ userType: v })}
						disabled={disabled}
					>
						<SelectTrigger id="userType" className={triggerCls}>
							<SelectValue placeholder="Select user type" />
						</SelectTrigger>
						<SelectContent>
							{USER_TYPES.map((t) => (
								<SelectItem key={t} value={t}>
									{t}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="level" className={labelCls}>
						Access level
					</Label>
					<Select
						value={form.level}
						onValueChange={(v) => set({ level: v })}
						disabled={disabled}
					>
						<SelectTrigger id="level" className={triggerCls}>
							<SelectValue placeholder="Select access level" />
						</SelectTrigger>
						<SelectContent>
							{ACCESS_LEVELS.map((l) => (
								<SelectItem key={l} value={l}>
									{l}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
