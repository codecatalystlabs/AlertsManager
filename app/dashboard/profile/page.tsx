"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService, User } from "@/lib/auth";
import { LoadingSpinner } from "@/components/dashboard/loading-spinner";
import { ErrorAlert } from "@/components/dashboard/error-alert";
import {
	Mail,
	Building,
	Shield,
	Calendar,
	Edit,
	Save,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "red" | "yellow" | "green" | "neutral";

function levelAccent(level: string): Accent {
	switch ((level ?? "").toLowerCase()) {
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

const accentBar: Record<Accent, string> = {
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	green: "bg-accent-green",
	neutral: "bg-foreground/30",
};

const accentText: Record<Accent, string> = {
	red: "text-accent-red",
	yellow: "text-foreground",
	green: "text-accent-green",
	neutral: "text-muted-foreground",
};

const inputCls =
	"h-10 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const labelCls =
	"mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground";

function formatDate(dateString: string) {
	if (!dateString || dateString === "0001-01-01T00:00:00Z") return "—";
	return new Date(dateString).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function getInitials(user: User) {
	const first = user.firstName?.[0] || user.username[0];
	const last = user.lastName?.[0] || user.username[1] || "";
	return `${first}${last}`.trim().toUpperCase();
}

function getFullName(user: User) {
	const names = [user.firstName, user.otherName, user.lastName].filter(Boolean);
	return names.length > 0 ? names.join(" ") : user.username;
}

function Field({
	label,
	value,
	mono,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="space-y-1.5">
			<p className={labelCls}>{label}</p>
			<p
				className={cn(
					"text-sm text-foreground/90 leading-relaxed",
					mono && "mono tabular-nums text-xs"
				)}
			>
				{value}
			</p>
		</div>
	);
}

export default function ProfilePage() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editedUser, setEditedUser] = useState<User | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				setLoading(true);
				setError(null);
				const storedUser = AuthService.getUser();
				if (storedUser) setUser(storedUser);

				const userData = await AuthService.fetchUserProfile();
				setUser(userData);
				setEditedUser(userData);
			} catch (err) {
				console.error("Error fetching user profile:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load profile"
				);
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
		if (!editedUser || !user) return;
		setIsSaving(true);
		setError(null);
		try {
			const updated = await AuthService.updateUser(user.id, {
				firstName: editedUser.firstName,
				lastName: editedUser.lastName,
				otherName: editedUser.otherName,
				email: editedUser.email,
				affiliation: editedUser.affiliation,
			});
			const merged = { ...user, ...updated };
			setUser(merged);
			setEditedUser(merged);
			AuthService.setUser(merged);
			setIsEditing(false);
		} catch (err) {
			console.error("Error saving profile:", err);
			setError(
				err instanceof Error ? err.message : "Failed to save changes"
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (loading) {
		return <LoadingSpinner message="Loading profile…" />;
	}

	if (!user) {
		return (
			<div className="space-y-12">
				<ErrorAlert
					error={error ?? "No user data available."}
					onRetry={() => window.location.reload()}
				/>
			</div>
		);
	}

	const accent = levelAccent(user.level);

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
							Your <em className="italic text-accent-red">profile</em>
						</h1>
						<p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
							Manage your account information, contact details, and
							access level.
						</p>
					</div>
					<div className="flex items-center gap-3 shrink-0">
						{isEditing ? (
							<>
								<Button
									variant="ghost"
									onClick={handleCancelEdit}
									disabled={isSaving}
									className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
								>
									<X className="h-3.5 w-3.5" strokeWidth={1.75} />
									<span className="mono uppercase tracking-widest font-bold">
										Cancel
									</span>
								</Button>
								<Button
									onClick={handleSave}
									disabled={isSaving}
									className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
								>
									<Save className="h-3.5 w-3.5" strokeWidth={1.75} />
									<span className="mono uppercase tracking-widest font-bold">
										{isSaving ? "Saving…" : "Save changes"}
									</span>
								</Button>
							</>
						) : (
							<Button
								onClick={handleEdit}
								className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto"
							>
								<Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
								<span className="mono uppercase tracking-widest font-bold">
									Edit profile
								</span>
							</Button>
						)}
					</div>
				</div>
			</header>

			{error && user && (
				<ErrorAlert error={error} onRetry={() => setError(null)} />
			)}

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Identity card */}
				<aside className="lg:col-span-4">
					<section className="editorial-card animate-reveal [animation-delay:100ms]">
						<div className="px-6 py-7 flex flex-col items-center text-center border-b border-foreground/[0.08]">
							<div className="flex h-20 w-20 items-center justify-center rounded-sm bg-foreground text-background mono text-xl font-semibold tracking-tight mb-4">
								{getInitials(user)}
							</div>
							<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
								{getFullName(user)}
							</h2>
							<p className="mt-1 mono text-[11px] uppercase tracking-tight text-muted-foreground">
								@{user.username}
							</p>
							<div className="mt-4 inline-flex items-center gap-2">
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
									{user.level || "User"}
								</span>
							</div>
						</div>

						<ul className="px-6 py-5 space-y-5">
							<li className="flex items-start gap-3">
								<Mail
									className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
									strokeWidth={1.75}
								/>
								<div className="min-w-0">
									<p className={labelCls}>Email</p>
									<p className="mt-1 text-sm text-foreground/90 truncate">
										{user.email || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<Building
									className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
									strokeWidth={1.75}
								/>
								<div className="min-w-0">
									<p className={labelCls}>Affiliation</p>
									<p className="mt-1 text-sm text-foreground/90">
										{user.affiliation || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<Shield
									className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
									strokeWidth={1.75}
								/>
								<div className="min-w-0">
									<p className={labelCls}>User type</p>
									<p className="mt-1 text-sm text-foreground/90">
										{user.userType || (
											<span className="text-muted-foreground/60">
												Not specified
											</span>
										)}
									</p>
								</div>
							</li>
						</ul>
					</section>
				</aside>

				{/* Details card */}
				<section className="lg:col-span-8 editorial-card animate-reveal [animation-delay:200ms]">
					<header className="px-6 py-5 flex items-baseline justify-between gap-4 border-b border-foreground/[0.08]">
						<div>
							<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
								§ · Account
							</p>
							<h3 className="serif text-xl font-medium tracking-tight text-foreground">
								Profile details
							</h3>
						</div>
						{isEditing && (
							<span className="mono text-[10px] uppercase tracking-widest text-accent-yellow shrink-0">
								Editing
							</span>
						)}
					</header>

					<div className="p-6 space-y-8">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
							{/* First name */}
							<div className="space-y-2">
								<Label htmlFor="firstName" className={labelCls}>
									First name
								</Label>
								{isEditing ? (
									<Input
										id="firstName"
										value={editedUser?.firstName || ""}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															firstName: e.target.value,
														}
													: null
											)
										}
										placeholder="Enter first name"
										className={inputCls}
									/>
								) : (
									<p className="text-sm text-foreground/90">
										{user.firstName || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								)}
							</div>

							{/* Last name */}
							<div className="space-y-2">
								<Label htmlFor="lastName" className={labelCls}>
									Last name
								</Label>
								{isEditing ? (
									<Input
										id="lastName"
										value={editedUser?.lastName || ""}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															lastName: e.target.value,
														}
													: null
											)
										}
										placeholder="Enter last name"
										className={inputCls}
									/>
								) : (
									<p className="text-sm text-foreground/90">
										{user.lastName || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								)}
							</div>

							{/* Other name */}
							<div className="space-y-2">
								<Label htmlFor="otherName" className={labelCls}>
									Other name
								</Label>
								{isEditing ? (
									<Input
										id="otherName"
										value={editedUser?.otherName || ""}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															otherName: e.target.value,
														}
													: null
											)
										}
										placeholder="Enter other name"
										className={inputCls}
									/>
								) : (
									<p className="text-sm text-foreground/90">
										{user.otherName || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								)}
							</div>

							{/* Username (read-only) */}
							<Field
								label="Username"
								value={
									<span className="mono">@{user.username}</span>
								}
							/>

							{/* Email */}
							<div className="space-y-2">
								<Label htmlFor="email" className={labelCls}>
									Email address
								</Label>
								{isEditing ? (
									<Input
										id="email"
										type="email"
										value={editedUser?.email || ""}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															email: e.target.value,
														}
													: null
											)
										}
										placeholder="name@health.go.ug"
										className={inputCls}
									/>
								) : (
									<p className="text-sm text-foreground/90 truncate">
										{user.email || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								)}
							</div>

							{/* Affiliation */}
							<div className="space-y-2">
								<Label htmlFor="affiliation" className={labelCls}>
									Affiliation
								</Label>
								{isEditing ? (
									<Input
										id="affiliation"
										value={editedUser?.affiliation || ""}
										onChange={(e) =>
											setEditedUser((prev) =>
												prev
													? {
															...prev,
															affiliation: e.target.value,
														}
													: null
											)
										}
										placeholder="Mbarara District Health Office"
										className={inputCls}
									/>
								) : (
									<p className="text-sm text-foreground/90">
										{user.affiliation || (
											<span className="text-muted-foreground/60">
												Not provided
											</span>
										)}
									</p>
								)}
							</div>

							{/* User type (read-only) */}
							<Field
								label="User type"
								value={
									user.userType || (
										<span className="text-muted-foreground/60">
											Not specified
										</span>
									)
								}
							/>

							{/* Access level (read-only) */}
							<div className="space-y-2">
								<p className={labelCls}>Access level</p>
								<span className="inline-flex items-center gap-2">
									<span
										className={cn(
											"h-1.5 w-1.5 rounded-full",
											accentBar[accent]
										)}
									/>
									<span
										className={cn(
											"mono text-[11px] uppercase tracking-widest font-bold",
											accentText[accent]
										)}
									>
										{user.level || "User"}
									</span>
								</span>
							</div>
						</div>

						<div className="pt-6 border-t border-foreground/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
							<div className="space-y-2">
								<p className={labelCls}>Account created</p>
								<p className="flex items-center gap-2 text-sm text-foreground/90 mono tabular-nums">
									<Calendar
										className="h-3.5 w-3.5 text-muted-foreground"
										strokeWidth={1.75}
									/>
									{formatDate(user.createdAt)}
								</p>
							</div>
							<div className="space-y-2">
								<p className={labelCls}>Last updated</p>
								<p className="flex items-center gap-2 text-sm text-foreground/90 mono tabular-nums">
									<Calendar
										className="h-3.5 w-3.5 text-muted-foreground"
										strokeWidth={1.75}
									/>
									{formatDate(user.updatedAt)}
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
