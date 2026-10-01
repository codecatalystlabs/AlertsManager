"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
	Lock,
	MapPinOff,
	Pencil,
	Plus,
	Search,
	UserCheck,
	UserRound,
	UserX,
	Users,
	UserMinus,
	X,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatCard, accentInk } from "@/components/ui/stat-card";
import { useToast } from "@/hooks/use-toast";
import { can, PERM } from "@/lib/access";
import { canAssignRole } from "@/lib/access-admin";
import {
	fetchUsers,
	fetchUserStats,
	setUserActive,
	type ManagedUser,
	type Role,
	type UserQuery,
	type UserStats,
	type UsersPage,
} from "@/lib/access-api";
import type { User } from "@/lib/auth";
import { formatDateTime, formatTimeAgo } from "@/lib/format-date";
import { AreaCell, RoleBadge, StatusBadge } from "@/components/access/access-bits";
import { UserFormDialog } from "@/components/access/user-form-dialog";

/** The Users tab's filters; owned by the page so the Roles tab can set them. */
export interface UsersFilter {
	search: string;
	roleId: number | "none" | "all";
	status: "all" | "active" | "inactive";
	area: "all" | "missing";
}

export const NO_USERS_FILTER: UsersFilter = { search: "", roleId: "all", status: "all", area: "all" };

const EMPTY_PAGE: UsersPage = { users: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };

interface UsersPanelProps {
	actor: User | null;
	roles: Role[];
	filter: UsersFilter;
	onFilterChange: (filter: UsersFilter) => void;
	/** Account changes move role head-counts; the page reloads the roles. */
	onAccountsChanged: () => void;
}

/**
 * The Users tab: who has an account, what role and area each holds, and — for
 * an administrator allowed to manage them — creating, editing, deactivating
 * and reactivating accounts. Returns nothing for an account that may not see
 * users.
 */
export function UsersPanel({ actor, roles, filter, onFilterChange, onAccountsChanged }: UsersPanelProps) {
	const { toast } = useToast();
	const canView = can(actor, PERM.usersView);
	const canManage = can(actor, PERM.usersManage);

	// The page number belongs to the filter it was chosen under: a new filter
	// starts again at page 1 without a second fetch.
	const filterKey = JSON.stringify(filter);
	const [paging, setPaging] = useState({ key: filterKey, page: 1 });
	const page = paging.key === filterKey ? paging.page : 1;
	const setPage = useCallback((p: number) => setPaging({ key: filterKey, page: p }), [filterKey]);
	const [pageSize, setPageSize] = useState(10);
	const [data, setData] = useState<UsersPage>(EMPTY_PAGE);
	const [stats, setStats] = useState<UserStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [version, setVersion] = useState(0);
	const [searchText, setSearchText] = useState(filter.search);

	const [editing, setEditing] = useState<ManagedUser | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [deactivating, setDeactivating] = useState<ManagedUser | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);

	// Search is debounced; the other filters apply at once.
	useEffect(() => {
		if (searchText === filter.search) return;
		const t = setTimeout(() => onFilterChange({ ...filter, search: searchText }), 350);
		return () => clearTimeout(t);
	}, [searchText, filter, onFilterChange]);
	useEffect(() => setSearchText(filter.search), [filter.search]);

	useEffect(() => {
		if (!canView) return;
		let cancelled = false;
		setLoading(true);
		const query: UserQuery = {
			page,
			limit: pageSize,
			search: filter.search,
			roleId: filter.roleId,
			status: filter.status,
			area: filter.area,
		};
		Promise.all([fetchUsers(query), fetchUserStats()])
			.then(([users, s]) => {
				if (cancelled) return;
				setData(users);
				setStats(s);
				setError(null);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [canView, page, pageSize, filter, version]);

	const refresh = useCallback(() => {
		setVersion((v) => v + 1);
		onAccountsChanged();
	}, [onAccountsChanged]);

	const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

	/** Whether the actor may manage this account at all (the server's rule). */
	const mayManage = useCallback(
		(u: ManagedUser) => {
			if (!canManage) return false;
			const role = u.role ? rolesById.get(u.role.id) : undefined;
			return !role || canAssignRole(actor, role);
		},
		[canManage, rolesById, actor]
	);

	const setActive = useCallback(
		async (u: ManagedUser, active: boolean) => {
			setBusyId(u.id);
			try {
				await setUserActive(u.id, active);
				toast({ title: active ? `${u.username} reactivated` : `${u.username} deactivated` });
				refresh();
			} catch (err) {
				toast({
					title: active ? "Could not reactivate" : "Could not deactivate",
					description: err instanceof Error ? err.message : undefined,
					variant: "destructive",
				});
			} finally {
				setBusyId(null);
				setDeactivating(null);
			}
		},
		[refresh, toast]
	);

	const columns = useMemo<ColumnDef<ManagedUser>[]>(
		() => [
			{
				id: "name",
				header: "Name",
				cell: ({ row }) => {
					const u = row.original;
					const name = [u.firstName, u.otherName, u.lastName].filter(Boolean).join(" ");
					return (
						<div className="min-w-[10rem]">
							<p className="truncate font-medium">{name || u.username}</p>
							<p className="truncate text-xs text-muted-foreground">
								@{u.username}
								{actor?.id === u.id && " · you"}
							</p>
						</div>
					);
				},
			},
			{
				id: "email",
				header: "Email",
				cell: ({ row }) => <span className="whitespace-nowrap text-xs">{row.original.email}</span>,
			},
			{
				id: "role",
				header: "Role",
				cell: ({ row }) => <RoleBadge role={row.original.role} legacyLevel={row.original.level} />,
			},
			{
				id: "area",
				header: "Area",
				cell: ({ row }) => <AreaCell user={row.original} />,
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => <StatusBadge active={row.original.isActive} />,
			},
			{
				id: "lastLogin",
				header: "Last sign-in",
				cell: ({ row }) => {
					const at = row.original.lastLoginAt;
					return (
						<span className="whitespace-nowrap text-xs text-muted-foreground" title={at ? formatDateTime(at) : undefined}>
							{at ? formatTimeAgo(at) : "Never"}
						</span>
					);
				},
			},
			...(canManage
				? [
						{
							id: "actions",
							header: () => <span className="sr-only">Actions</span>,
							cell: ({ row }) => {
								const u = row.original;
								if (!mayManage(u)) {
									return (
										<span
											className="inline-flex text-muted-foreground"
											title="This account holds permissions you do not have, so you cannot manage it."
										>
											<Lock className="h-3.5 w-3.5" />
										</span>
									);
								}
								const self = actor?.id === u.id;
								return (
									<div className="flex justify-end gap-1">
										<Button
											size="sm"
											variant="outline"
											className="h-6 w-6 p-0"
											onClick={() => {
												setEditing(u);
												setFormOpen(true);
											}}
											aria-label={`Edit ${u.username}`}
											title="Edit"
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										{!self &&
											(u.isActive ? (
												<Button
													size="sm"
													variant="outline"
													className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
													onClick={() => setDeactivating(u)}
													disabled={busyId === u.id}
													aria-label={`Deactivate ${u.username}`}
													title="Deactivate"
												>
													<UserX className="h-3.5 w-3.5" />
												</Button>
											) : (
												<Button
													size="sm"
													variant="outline"
													className="h-6 w-6 p-0 text-success hover:text-success/80"
													onClick={() => void setActive(u, true)}
													disabled={busyId === u.id}
													aria-label={`Reactivate ${u.username}`}
													title="Reactivate"
												>
													<UserCheck className="h-3.5 w-3.5" />
												</Button>
											))}
									</div>
								);
							},
						} satisfies ColumnDef<ManagedUser>,
					]
				: []),
		],
		[actor, canManage, mayManage, busyId, setActive]
	);

	if (!canView) return null;

	const filtered =
		filter.search !== "" || filter.roleId !== "all" || filter.status !== "all" || filter.area !== "all";
	const toggle = (patch: Partial<UsersFilter>, isOn: boolean) =>
		onFilterChange(isOn ? NO_USERS_FILTER : { ...NO_USERS_FILTER, ...patch });

	return (
		<div className="space-y-2.5">
			<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
				<StatCard
					title="Accounts"
					value={stats?.total.toLocaleString() ?? "—"}
					icon={Users}
					ink={accentInk("primary")}
					isLoading={!stats}
					onClick={() => onFilterChange(NO_USERS_FILTER)}
					hint="Every account. Click to clear the filters."
				/>
				<StatCard
					title="Active"
					value={stats?.active.toLocaleString() ?? "—"}
					icon={UserRound}
					ink={accentInk("success")}
					isLoading={!stats}
					isActive={filter.status === "active"}
					onClick={() => toggle({ status: "active" }, filter.status === "active")}
				/>
				<StatCard
					title="Inactive"
					value={stats?.inactive.toLocaleString() ?? "—"}
					icon={UserMinus}
					ink={accentInk("muted")}
					isLoading={!stats}
					isActive={filter.status === "inactive"}
					onClick={() => toggle({ status: "inactive" }, filter.status === "inactive")}
					hint="Deactivated accounts keep their history but cannot sign in."
				/>
				<StatCard
					title="No role"
					value={stats?.noRole.toLocaleString() ?? "—"}
					subText="Cannot sign in"
					icon={UserX}
					ink={accentInk("warning")}
					isLoading={!stats}
					isActive={filter.roleId === "none"}
					onClick={() => toggle({ roleId: "none" }, filter.roleId === "none")}
					hint="Accounts without a role are refused at sign-in. Assign each a role."
				/>
				<StatCard
					title="No area"
					value={stats?.missingArea.toLocaleString() ?? "—"}
					subText="Sees nothing"
					icon={MapPinOff}
					ink={accentInk("warning")}
					isLoading={!stats}
					isActive={filter.area === "missing"}
					onClick={() => toggle({ area: "missing" }, filter.area === "missing")}
					hint="Their role is limited to one region or district, but none is assigned."
				/>
			</div>

			<Card>
				<CardContent className="space-y-2 p-2.5">
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative min-w-[12rem] flex-1">
							<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Search name, username, email, affiliation"
								className="h-8 pl-7"
								aria-label="Search accounts"
							/>
						</div>
						<Select
							value={String(filter.roleId)}
							onValueChange={(v) =>
								onFilterChange({
									...filter,
									roleId: v === "all" || v === "none" ? v : Number(v),
								})
							}
						>
							<SelectTrigger className="h-8 w-44" aria-label="Filter by role">
								<SelectValue placeholder="All roles" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All roles</SelectItem>
								<SelectItem value="none">No role</SelectItem>
								{roles.map((r) => (
									<SelectItem key={r.id} value={String(r.id)}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={filter.status}
							onValueChange={(v) => onFilterChange({ ...filter, status: v as UsersFilter["status"] })}
						>
							<SelectTrigger className="h-8 w-32" aria-label="Filter by status">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Any status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
						{filter.area === "missing" && (
							<Button
								variant="outline"
								size="sm"
								className="h-8 gap-1 border-warning/40 text-warning"
								onClick={() => onFilterChange({ ...filter, area: "all" })}
							>
								No area assigned
								<X className="h-3.5 w-3.5" />
							</Button>
						)}
						{filtered && (
							<Button variant="ghost" size="sm" className="h-8" onClick={() => onFilterChange(NO_USERS_FILTER)}>
								Clear filters
							</Button>
						)}
						{canManage && (
							<Button
								size="sm"
								className="ml-auto h-8 gap-1.5 bg-uganda-red hover:bg-uganda-red/90"
								onClick={() => {
									setEditing(null);
									setFormOpen(true);
								}}
							>
								<Plus className="h-4 w-4" />
								New account
							</Button>
						)}
					</div>

					{error ? (
						<div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							<span>{error}</span>
							<Button variant="outline" size="sm" className="h-7" onClick={() => setVersion((v) => v + 1)}>
								Try again
							</Button>
						</div>
					) : (
						<DataTable
							id="users"
							columns={columns}
							data={data.users}
							hideToolbar
							pageSize={pageSize}
							manualPagination
							pageCount={data.pagination.pages}
							totalRowCount={data.pagination.total}
							pageIndex={page - 1}
							onPageChange={(i) => setPage(i + 1)}
							onPageSizeChange={(size) => {
								setPageSize(size);
								setPage(1);
							}}
							isLoading={loading}
							getRowClassName={(row) => (row.original.isActive ? undefined : "opacity-60")}
						/>
					)}
				</CardContent>
			</Card>

			<UserFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				user={editing}
				roles={roles}
				actor={actor}
				onSaved={refresh}
			/>

			<AlertDialog open={deactivating !== null} onOpenChange={(open) => !open && setDeactivating(null)}>
				<AlertDialogContent className="max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate {deactivating?.username}?</AlertDialogTitle>
						<AlertDialogDescription>
							They are signed out on their next request and cannot sign in again until the account is
							reactivated. Their history — every signal they logged, triaged or verified — stays as it
							is.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busyId !== null}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={busyId !== null}
							onClick={(e) => {
								e.preventDefault();
								if (deactivating) void setActive(deactivating, false);
							}}
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
