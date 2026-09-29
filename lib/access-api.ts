/**
 * Client for account and role administration and for the caller's own account
 * (the alertsMIS /users, /roles, /permissions and /access endpoints).
 *
 * Every failure becomes an AccessApiError carrying the HTTP status and, for a
 * 422, the message per field, so a form can mark the field to fix instead of
 * showing one generic line.
 */
import { AuthService, type User } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import type { Scope } from "@/lib/access";

const API = getClientApiBaseUrl();

export interface RoleRef {
	id: number;
	name: string;
	scope: Scope;
	isSystem: boolean;
}

/** An account as the administration screens see it. */
export interface ManagedUser {
	id: number;
	username: string;
	firstName: string;
	lastName: string;
	otherName: string;
	email: string;
	affiliation: string;
	userType: string;
	role: RoleRef | null;
	/** Mirror of the role's name, or the legacy label of an account with none. */
	level: string;
	district: string | null;
	region: string | null;
	isActive: boolean;
	lastLoginAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Role {
	id: number;
	name: string;
	description: string;
	scope: Scope;
	isSystem: boolean;
	permissions: string[];
	userCount: number;
	/** Holders with no region/district for the role's scope: they see nothing. */
	usersMissingArea: number;
	createdAt: string;
	updatedAt: string;
}

export interface PermissionDefinition {
	code: string;
	group: string;
	label: string;
	description: string;
	requires?: string[];
	sensitive?: boolean;
}

export interface PermissionGroup {
	name: string;
	permissions: PermissionDefinition[];
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
}

export interface UsersPage {
	users: ManagedUser[];
	pagination: Pagination;
}

export interface UserStats {
	total: number;
	active: number;
	inactive: number;
	/** Cannot sign in until a role is assigned. */
	noRole: number;
	/** Scoped role, no area: signs in and sees nothing. */
	missingArea: number;
	byRole: { roleId: number; name: string; count: number }[];
}

export interface AuditEntry {
	id: number;
	action: string;
	table: "users" | "roles" | string;
	recordId: number;
	actorId: number | null;
	actor: string;
	detail: Record<string, unknown>;
	timestamp: string;
}

export interface AuditPage {
	entries: AuditEntry[];
	pagination: Pagination;
}

export interface UserInput {
	username: string;
	/** Required on create; blank on edit leaves it unchanged. */
	password?: string;
	firstName: string;
	lastName: string;
	otherName: string;
	email: string;
	affiliation: string;
	userType: string;
	roleId: number | null;
	region?: string | null;
	district?: string | null;
}

export interface RoleInput {
	name: string;
	description: string;
	scope: Scope;
	permissions: string[];
}

export interface ProfileInput {
	firstName: string;
	lastName: string;
	otherName: string;
	email: string;
	affiliation: string;
}

/** A refused or failed request. fields holds per-field messages from a 422. */
export class AccessApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly fields: Record<string, string> = {}
	) {
		super(message);
		this.name = "AccessApiError";
	}
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await AuthService.makeAuthenticatedRequest(`${API}${path}`, init);
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		/* empty or non-JSON body */
	}
	if (!response.ok) {
		const b = (body ?? {}) as { error?: string; message?: string; fields?: Record<string, string> };
		const fallback =
			response.status === 403
				? "You do not have permission to do that."
				: `Request failed (${response.status})`;
		throw new AccessApiError(b.error || b.message || fallback, response.status, b.fields ?? {});
	}
	return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
	method,
	body: JSON.stringify(data),
});

function query(params: Record<string, string | number | undefined | null>): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "" && value !== "all") {
			sp.set(key, String(value));
		}
	}
	const s = sp.toString();
	return s ? `?${s}` : "";
}

// ── Catalogue and roles ─────────────────────────────────────────────────────

export async function fetchPermissionCatalogue(): Promise<PermissionGroup[]> {
	return (await call<{ groups: PermissionGroup[] }>("/permissions")).groups;
}

export async function fetchRoles(): Promise<Role[]> {
	return (await call<{ roles: Role[] }>("/roles")).roles;
}

export const createRole = (input: RoleInput) => call<Role>("/roles", json("POST", input));

export const updateRole = (id: number, input: RoleInput) =>
	call<Role>(`/roles/${id}`, json("PUT", input));

export const deleteRole = (id: number) => call<{ message: string }>(`/roles/${id}`, { method: "DELETE" });

// ── Accounts ────────────────────────────────────────────────────────────────

export interface UserQuery {
	page?: number;
	limit?: number;
	search?: string;
	/** A role id, or "none" for accounts without a role. */
	roleId?: number | "none" | "all";
	status?: "active" | "inactive" | "all";
	/** "missing": scoped role with no area assigned. */
	area?: "missing" | "all";
}

export function fetchUsers(q: UserQuery = {}): Promise<UsersPage> {
	return call<UsersPage>(
		`/users${query({
			page: q.page ?? 1,
			limit: q.limit ?? 10,
			search: q.search?.trim(),
			role_id: q.roleId,
			status: q.status,
			area: q.area,
		})}`
	);
}

export const fetchUserStats = () => call<UserStats>("/users/stats");

export const createUser = (input: UserInput) => call<ManagedUser>("/users", json("POST", input));

export const updateUser = (id: number, input: UserInput) =>
	call<ManagedUser>(`/users/${id}`, json("PUT", input));

export const setUserActive = (id: number, active: boolean) =>
	call<ManagedUser>(`/users/${id}/status`, json("PATCH", { active }));

export function fetchAccessAudit(q: { page?: number; limit?: number; table?: "users" | "roles" | "all"; recordId?: number } = {}): Promise<AuditPage> {
	return call<AuditPage>(
		`/access/audit${query({ page: q.page ?? 1, limit: q.limit ?? 25, table: q.table, record_id: q.recordId })}`
	);
}

// ── The caller's own account ────────────────────────────────────────────────

/** Saves the caller's own details and stores the refreshed session. */
export async function updateMyProfile(input: ProfileInput): Promise<User> {
	const session = await call<User>("/users/profile", json("PUT", input));
	AuthService.setUser(session);
	return session;
}

export const changeMyPassword = (currentPassword: string, newPassword: string) =>
	call<{ message: string }>("/users/profile/password", json("PUT", { currentPassword, newPassword }));
