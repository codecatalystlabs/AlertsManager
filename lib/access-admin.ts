/**
 * The rules behind the Users & Access screens, kept free of React so they run
 * under plain `node` (access-admin.test.ts):
 *
 *   - the role editor's permission ticks and their prerequisites,
 *   - which roles an administrator may hand out,
 *   - matching a stored region/district to a picker option,
 *   - turning an access-log entry into a sentence.
 *
 * None of this is a security check — the API enforces every rule again — it
 * only keeps the screens from offering what the server would refuse.
 */
import { SCOPE_LABEL, type AccessSubject, type Scope } from "@/lib/access";
import type { AuditEntry, PermissionGroup, Role } from "@/lib/access-api";

// ── Permission ticks ────────────────────────────────────────────────────────

/** code → the codes it cannot work without. */
export type RequiresMap = Record<string, readonly string[]>;

export function requiresMap(groups: readonly PermissionGroup[]): RequiresMap {
	const map: RequiresMap = {};
	for (const g of groups) {
		for (const p of g.permissions) map[p.code] = p.requires ?? [];
	}
	return map;
}

/** code plus everything it needs, transitively. */
function withPrerequisites(code: string, requires: RequiresMap, into: Set<string>): void {
	if (into.has(code)) return;
	into.add(code);
	for (const r of requires[code] ?? []) withPrerequisites(r, requires, into);
}

/** Whether `code` needs `prerequisite`, directly or through another permission. */
function needs(code: string, prerequisite: string, requires: RequiresMap, seen = new Set<string>()): boolean {
	if (seen.has(code)) return false;
	seen.add(code);
	return (requires[code] ?? []).some((r) => r === prerequisite || needs(r, prerequisite, requires, seen));
}

/**
 * Ticks or unticks one permission. Ticking adds what it needs; unticking also
 * unticks every ticked permission that needs it, so the set can never hold a
 * permission without its prerequisites (the server would add them back
 * anyway, silently).
 */
export function togglePermission(
	selected: readonly string[],
	code: string,
	checked: boolean,
	requires: RequiresMap
): string[] {
	const next = new Set(selected);
	if (checked) {
		withPrerequisites(code, requires, next);
	} else {
		next.delete(code);
		for (const other of selected) {
			if (needs(other, code, requires)) next.delete(other);
		}
	}
	return [...next].sort();
}

/** Ticks or unticks a whole group, with the same prerequisite rules. */
export function toggleGroup(
	selected: readonly string[],
	codes: readonly string[],
	checked: boolean,
	requires: RequiresMap
): string[] {
	return codes.reduce<string[]>((acc, code) => togglePermission(acc, code, checked, requires), [...selected]);
}

/** The ticked permissions that need `code` — shown as "Needed by …". */
export function neededBy(selected: readonly string[], code: string, requires: RequiresMap): string[] {
	return selected.filter((other) => other !== code && needs(other, code, requires));
}

// ── Who may hand out which role ─────────────────────────────────────────────

/**
 * Mirrors the server's anti-escalation rule: only the built-in administrator
 * may confer the administrator role; anyone else only a role whose every
 * permission they hold themselves.
 */
export function canAssignRole(actor: AccessSubject | null | undefined, role: Pick<Role, "isSystem" | "permissions">): boolean {
	if (!actor) return false;
	if (actor.isSuperAdmin) return true;
	if (role.isSystem) return false;
	const held = new Set(actor.permissions ?? []);
	return role.permissions.every((p) => held.has(p));
}

// ── Areas ───────────────────────────────────────────────────────────────────

/** "Kampala District" / "kampala" / "Masaka City" → "kampala" / "masaka". */
export function canonicalArea(name: string | null | undefined): string {
	return (name ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+(district|city)$/, "")
		.trim();
}

/**
 * The picker option that names the same place as a stored value, so an edit
 * form preselects it even when the spellings differ ("Kampala" vs
 * "Kampala District"). Falls back to the stored value itself.
 */
export function matchAreaOption(options: readonly string[], stored: string | null | undefined): string {
	const want = canonicalArea(stored);
	if (!want) return "";
	return options.find((o) => canonicalArea(o) === want) ?? (stored ?? "").trim();
}

/** Whether an account's role needs an area it does not have. */
export function missingArea(scope: Scope | undefined, region: string | null | undefined, district: string | null | undefined): boolean {
	if (scope === "region") return !(region ?? "").trim();
	if (scope === "district") return !(district ?? "").trim();
	return false;
}

// ── The access log in words ─────────────────────────────────────────────────

const FIELD_WORD: Record<string, string> = {
	username: "username",
	firstName: "first name",
	lastName: "last name",
	otherName: "other name",
	email: "email",
	affiliation: "affiliation",
	userType: "user type",
	description: "description",
};

type Change = { from?: string; to?: string };

function str(v: unknown): string {
	return typeof v === "string" ? v : "";
}

function scopeWord(v: unknown): string {
	return SCOPE_LABEL[str(v) as Scope] ?? str(v);
}

function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export interface AuditSentence {
	/** What the actor did, starting with a verb: "deactivated jdoe". */
	text: string;
	/** Further lines, e.g. the permissions a role gained or lost. */
	details: string[];
}

/**
 * Renders an access-log entry as a sentence. `label` names a permission code
 * the way the role editor does, so the log never shows raw codes.
 */
export function auditSentence(entry: Pick<AuditEntry, "action" | "table" | "recordId" | "detail">, label: (code: string) => string): AuditSentence {
	const d = entry.detail ?? {};
	const who = str(d.username) || `account #${entry.recordId}`;
	const role = str(d.name) || `role #${entry.recordId}`;
	const changes = (d.changes ?? {}) as Record<string, unknown>;

	switch (entry.action) {
		case "user_created": {
			const area = str(d.district) || str(d.region);
			return { text: `created account ${who} with role ${str(d.role) || "—"}${area ? ` (${area})` : ""}`, details: [] };
		}
		case "user_updated": {
			const parts: string[] = [];
			const roleChange = changes.role as Change | undefined;
			if (roleChange) parts.push(`changed ${who}'s role from ${roleChange.from || "no role"} to ${roleChange.to || "no role"}`);
			for (const area of ["district", "region"] as const) {
				const c = changes[area] as Change | undefined;
				if (!c) continue;
				parts.push(c.to ? `set ${who}'s ${area} to ${c.to}` : `cleared ${who}'s ${area}`);
			}
			if (changes.password) parts.push(`reset ${who}'s password`);
			const edited = Object.keys(changes).filter((k) => FIELD_WORD[k]);
			if (edited.length) parts.push(`updated ${who}'s ${edited.map((k) => FIELD_WORD[k]).join(", ")}`);
			return { text: parts.length ? parts.join("; ") : `updated ${who}`, details: [] };
		}
		case "user_deactivated":
			return { text: `deactivated ${who}`, details: [] };
		case "user_reactivated":
			return { text: `reactivated ${who}`, details: [] };
		case "profile_updated":
			return { text: "updated their own details", details: [] };
		case "password_changed":
			return { text: "changed their own password", details: [] };
		case "role_created": {
			const perms = Array.isArray(d.permissions) ? d.permissions.length : 0;
			return { text: `created role ${role} (${scopeWord(d.scope)}, ${plural(perms, "permission")})`, details: [] };
		}
		case "role_updated": {
			const parts: string[] = [];
			const details: string[] = [];
			const rename = changes.name as Change | undefined;
			if (rename) parts.push(`renamed role ${rename.from} to ${rename.to}`);
			const scope = changes.scope as Change | undefined;
			if (scope) parts.push(`changed ${role}'s scope from ${scopeWord(scope.from)} to ${scopeWord(scope.to)}`);
			if (changes.description) parts.push(`edited ${role}'s description`);
			const added = Array.isArray(changes.added) ? (changes.added as string[]) : [];
			const removed = Array.isArray(changes.removed) ? (changes.removed as string[]) : [];
			if (added.length || removed.length) {
				const counts = [added.length && `added ${added.length}`, removed.length && `removed ${removed.length}`].filter(Boolean).join(", ");
				parts.push(`updated role ${role}: ${counts} ${added.length + removed.length === 1 ? "permission" : "permissions"}`);
				if (added.length) details.push(`Added: ${added.map(label).join(", ")}`);
				if (removed.length) details.push(`Removed: ${removed.map(label).join(", ")}`);
			}
			return { text: parts.length ? parts.join("; ") : `updated role ${role}`, details };
		}
		case "role_deleted":
			return { text: `deleted role ${role}`, details: [] };
	}
	// An action this screen does not know yet (e.g. a data clean-up): still
	// say something readable rather than dropping the row.
	const subject = entry.table === "roles" ? role : who;
	return { text: `${entry.action.replace(/_/g, " ")} — ${subject}`, details: [] };
}
