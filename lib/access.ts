/**
 * What the signed-in account may do, as the web app sees it.
 *
 * The API is the security boundary: every route checks a permission and the
 * caller's area server-side (alertsMIS internal/routes). This module only
 * decides what to SHOW, so a person is never offered a button that would be
 * refused. It is the one place the app names permission codes; screens ask
 * `can(user, PERM.x)`, and the role editor renders the catalogue's labels from
 * GET /permissions rather than codes.
 *
 * Pure (no React, no imports) so it runs under plain `node` — see
 * access.test.ts.
 */

/** The permission catalogue. Mirrors internal/access/catalog.go. */
export const PERM = {
	signalsView: "signals.view",
	signalsEdit: "signals.edit",
	signalsTriage: "signals.triage",
	signalsVerify: "signals.verify",
	signalsRiskAssess: "signals.risk_assess",
	signalsFeedback: "signals.feedback",
	signalsDelete: "signals.delete",

	eidsrView: "eidsr.view",
	eidsrSync: "eidsr.sync",
	eidsrEdit: "eidsr.edit",
	eidsrVerify: "eidsr.verify",
	eidsrMove: "eidsr.move",
	eidsrDelete: "eidsr.delete",

	echisView: "echis.view",
	echisSync: "echis.sync",
	echisEdit: "echis.edit",
	echisVerify: "echis.verify",
	echisForward: "echis.forward",

	poeView: "poe.view",
	poeSync: "poe.sync",
	poeVerify: "poe.verify",
	poeForward: "poe.forward",

	dashboardView: "dashboard.view",
	mapView: "map.view",
	reportsView: "reports.view",

	referenceManage: "reference.manage",
	facilitiesManage: "facilities.manage",

	integrationsView: "integrations.view",
	integrationsManage: "integrations.manage",

	usersView: "users.view",
	usersManage: "users.manage",
	rolesManage: "roles.manage",
	auditView: "audit.view",
} as const;

export type Permission = (typeof PERM)[keyof typeof PERM];

/** How much of the country a role sees. */
export type Scope = "national" | "region" | "district";

/** The part of the signed-in user this module reads. */
export interface AccessSubject {
	permissions?: readonly string[] | null;
	isSuperAdmin?: boolean | null;
	scope?: string | null;
	region?: string | null;
	district?: string | null;
}

/**
 * True when the session carries a permission list at all. A session stored by
 * an older release has none until it is refreshed from /users/profile; screens
 * wait for it rather than flashing "no access".
 */
export function accessKnown(user: AccessSubject | null | undefined): boolean {
	return !!user && (user.isSuperAdmin === true || Array.isArray(user.permissions));
}

/** Whether the account holds perm. */
export function can(user: AccessSubject | null | undefined, perm: Permission): boolean {
	if (!user) return false;
	if (user.isSuperAdmin) return true;
	return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

/** Whether the account holds at least one of perms. */
export function canAny(user: AccessSubject | null | undefined, ...perms: Permission[]): boolean {
	return perms.some((p) => can(user, p));
}

/** Whether the account's role limits it to one district. */
export function isDistrictScoped(user: AccessSubject | null | undefined): boolean {
	return user?.scope === "district";
}

/** Whether the account's role limits it to one region. */
export function isRegionScoped(user: AccessSubject | null | undefined): boolean {
	return user?.scope === "region";
}

/**
 * The account's area in words: "Kampala District", "Acholi region", "All of
 * Uganda", or "No district assigned" for a scoped role missing its area.
 */
export function areaLabel(user: AccessSubject | null | undefined): string {
	if (isDistrictScoped(user)) return user?.district?.trim() || "No district assigned";
	if (isRegionScoped(user)) {
		const region = user?.region?.trim();
		return region ? `${region} region` : "No region assigned";
	}
	return "All of Uganda";
}

/** The label a scope carries in the UI. */
export const SCOPE_LABEL: Record<Scope, string> = {
	national: "National",
	region: "One region",
	district: "One district",
};

// ── Pages ──────────────────────────────────────────────────────────────────

interface PageRule {
	/** Path, matched exactly or as a prefix of a nested path. */
	path: string;
	/** Opens for any ONE of these; null = any signed-in account. */
	anyOf: readonly Permission[] | null;
}

/**
 * Which permission opens each dashboard page. One table drives both the
 * sidebar (visible nav items) and the page guard, so the two cannot disagree.
 * Listed in landing order: after sign-in a person lands on the first page
 * they may open. Every app/dashboard/* page must appear (access.test.ts).
 */
export const PAGE_ACCESS: readonly PageRule[] = [
	{ path: "/dashboard", anyOf: [PERM.dashboardView] },
	{ path: "/dashboard/signal-logs", anyOf: [PERM.signalsView] },
	{ path: "/dashboard/alerts", anyOf: [PERM.signalsView] },
	{ path: "/dashboard/eidsr-alerts", anyOf: [PERM.eidsrView] },
	{ path: "/dashboard/echis-alerts", anyOf: [PERM.echisView] },
	{ path: "/dashboard/poe-alerts", anyOf: [PERM.poeView] },
	{ path: "/dashboard/map", anyOf: [PERM.mapView] },
	{ path: "/dashboard/reports", anyOf: [PERM.reportsView] },
	{ path: "/dashboard/users", anyOf: [PERM.usersView, PERM.rolesManage, PERM.auditView] },
	{ path: "/dashboard/dropdown-options", anyOf: [PERM.referenceManage] },
	// Looking a facility up needs nothing; editing needs facilities.manage.
	{ path: "/dashboard/facilities", anyOf: null },
	{ path: "/dashboard/profile", anyOf: null },
	// The staff intake form posts to the public intake endpoint.
	{ path: "/dashboard/add-alert", anyOf: null },
	// Redirects: they land on a page with its own rule.
	{ path: "/dashboard/call-logs", anyOf: [PERM.signalsView] },
	{ path: "/dashboard/eidsr-messages", anyOf: [PERM.eidsrView] },
	// A simulated upload with no API behind it.
	{ path: "/dashboard/upload", anyOf: null },
];

/** The rule for a path: the longest listed path it equals or sits under. */
function ruleFor(pathname: string): PageRule | undefined {
	const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
	let best: PageRule | undefined;
	for (const rule of PAGE_ACCESS) {
		const matches = path === rule.path || path.startsWith(`${rule.path}/`);
		if (matches && (!best || rule.path.length > best.path.length)) best = rule;
	}
	return best;
}

/**
 * Whether the account may open a page. A path outside the dashboard (the
 * public add-alert form, say) is always open.
 */
export function canOpen(user: AccessSubject | null | undefined, pathname: string): boolean {
	const rule = ruleFor(pathname);
	if (!rule) return true;
	if (rule.anyOf === null) return !!user;
	return canAny(user, ...rule.anyOf);
}

/**
 * The first page the account may open, for landing after sign-in. A session
 * whose permissions are not known yet lands on the dashboard, whose guard
 * decides once they arrive.
 */
export function firstOpenPath(user: AccessSubject | null | undefined): string {
	if (!accessKnown(user)) return "/dashboard";
	const page = PAGE_ACCESS.find((rule) => rule.anyOf !== null && canAny(user, ...rule.anyOf));
	return page?.path ?? "/dashboard/profile";
}

// ── Actions on a signal ─────────────────────────────────────────────────────

/** Which Signal Register actions the account may take. */
export interface SignalActions {
	edit: boolean;
	triage: boolean;
	verify: boolean;
	riskAssess: boolean;
	feedback: boolean;
	delete: boolean;
}

export function signalActions(user: AccessSubject | null | undefined): SignalActions {
	return {
		edit: can(user, PERM.signalsEdit),
		triage: can(user, PERM.signalsTriage),
		verify: can(user, PERM.signalsVerify),
		riskAssess: can(user, PERM.signalsRiskAssess),
		feedback: can(user, PERM.signalsFeedback),
		delete: can(user, PERM.signalsDelete),
	};
}

/**
 * The action each pipeline step needs, keyed like lib/next-action.ts. A step
 * the account's role cannot take is shown as waiting, not offered as a button
 * the API would refuse.
 */
export const STEP_ACTION = {
	triage: "triage",
	retriage: "triage",
	verify: "verify",
	"field-verify": "verify",
	"assess-risk": "riskAssess",
	feedback: "feedback",
} as const satisfies Record<string, keyof SignalActions>;

/** Whether the account may take the pipeline step `key`. */
export function canTakeStep(actions: SignalActions, key: string): boolean {
	const action = (STEP_ACTION as Record<string, keyof SignalActions>)[key];
	return action ? actions[action] : false;
}

// ── Actions on a source feed ────────────────────────────────────────────────

/** The source feeds with sync, verify and forward actions. */
export type Feed = "echis" | "poe";

const FEED_PERMS: Record<Feed, { sync: Permission; verify: Permission; forward: Permission }> = {
	echis: { sync: PERM.echisSync, verify: PERM.echisVerify, forward: PERM.echisForward },
	poe: { sync: PERM.poeSync, verify: PERM.poeVerify, forward: PERM.poeForward },
};

/** Which actions the account may take on a feed's records. */
export function feedActions(user: AccessSubject | null | undefined, feed: Feed) {
	const p = FEED_PERMS[feed];
	return { sync: can(user, p.sync), verify: can(user, p.verify), forward: can(user, p.forward) };
}
