/**
 * Names for permission codes when the catalogue itself cannot be fetched —
 * GET /permissions needs users.view or roles.manage, and the Profile page must
 * still show everyone what they hold. The catalogue's own labels are always
 * preferred (see labelFor below); this fallback only keeps raw codes off the
 * screen.
 */
import type { PermissionGroup } from "@/lib/access-api";

const GROUP_NAME: Record<string, string> = {
	signals: "Signal pipeline",
	eidsr: "6767 feed",
	echis: "eCHIS feed",
	poe: "Point-of-entry feed",
	dashboard: "Insights",
	map: "Insights",
	reports: "Insights",
	reference: "Reference data",
	facilities: "Reference data",
	integrations: "Integrations",
	users: "Administration",
	roles: "Administration",
	audit: "Administration",
};

/** What each area's actions act on, for the fallback label. */
const OBJECT_WORD: Record<string, string> = {
	signals: "signals",
	eidsr: "6767 messages",
	echis: "eCHIS alerts",
	poe: "POE alerts",
	dashboard: "dashboard",
	map: "map",
	reports: "reports",
	reference: "dropdown options",
	facilities: "health facilities",
	integrations: "EMS integration",
	users: "users",
	roles: "roles",
	audit: "access log",
};

function titleCase(s: string): string {
	const words = s.replace(/[_.]+/g, " ").trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "signals.risk_assess" → { group: "Signal pipeline", label: "Risk assess signals" }. */
export function fallbackPermissionLabel(code: string): { group: string; label: string } {
	const [area = "", action = ""] = code.split(".");
	const object = OBJECT_WORD[area] ?? area.replace(/_/g, " ");
	return {
		group: GROUP_NAME[area] ?? titleCase(area),
		label: action ? `${titleCase(action)} ${object}` : titleCase(object),
	};
}

/** code → label, from the catalogue when there is one. */
export function labelFor(groups: readonly PermissionGroup[] | null | undefined): (code: string) => string {
	const known = new Map<string, string>();
	for (const g of groups ?? []) for (const p of g.permissions) known.set(p.code, p.label);
	return (code) => known.get(code) ?? fallbackPermissionLabel(code).label;
}

/** The held permissions grouped for display, catalogue order when known. */
export function groupHeld(
	held: readonly string[],
	groups: readonly PermissionGroup[] | null | undefined
): { group: string; labels: string[] }[] {
	const heldSet = new Set(held);
	if (groups && groups.length) {
		return groups
			.map((g) => ({
				group: g.name,
				labels: g.permissions.filter((p) => heldSet.has(p.code)).map((p) => p.label),
			}))
			.filter((g) => g.labels.length > 0);
	}
	const byGroup = new Map<string, string[]>();
	for (const code of held) {
		const { group, label } = fallbackPermissionLabel(code);
		byGroup.set(group, [...(byGroup.get(group) ?? []), label]);
	}
	return [...byGroup].map(([group, labels]) => ({ group, labels }));
}
