/**
 * Tests for lib/access.ts. No test runner is configured in this repo, so this
 * file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/access.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: access is decided before a screen is built (practices
 * "shift security to the left"). These tests pin that the web app's permission
 * codes are exactly the API's, that every dashboard page and sidebar entry has
 * an access rule, and what each seeded role can open — so a new page, a new
 * nav item or a renamed permission fails here instead of in front of a user.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const {
	PERM,
	PAGE_ACCESS,
	accessKnown,
	can,
	canAny,
	canOpen,
	firstOpenPath,
	areaLabel,
	signalActions,
	canTakeStep,
	feedActions,
} = await import("./access.ts");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a !== e) {
		console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
		process.exit(1);
	}
	passed += 1;
}

// --- The codes are the API's codes -------------------------------------------

const codes = Object.values(PERM).sort();
check("no permission code is listed twice", new Set(codes).size, codes.length);

const catalogGo = resolve(root, "../alertsMIS/backend/internal/access/catalog.go");
if (existsSync(catalogGo)) {
	const goCodes = [...readFileSync(catalogGo, "utf8").matchAll(/Permission = "([a-z_.]+)"/g)]
		.map((m) => m[1])
		.sort();
	check("PERM mirrors the Go catalogue exactly", codes, goCodes);
} else {
	console.warn(`skipped: ${catalogGo} not found (backend not checked out beside the app)`);
}

// --- Every page and every nav entry has a rule --------------------------------

const dashboardDir = resolve(root, "app/dashboard");
const pageDirs = readdirSync(dashboardDir).filter(
	(d) => statSync(resolve(dashboardDir, d)).isDirectory() && existsSync(resolve(dashboardDir, d, "page.tsx"))
);
const ruled = new Set(PAGE_ACCESS.map((r) => r.path));
check("the dashboard home has a rule", ruled.has("/dashboard"), true);
for (const dir of pageDirs) {
	check(`app/dashboard/${dir} has an access rule`, ruled.has(`/dashboard/${dir}`), true);
}

const sidebar = readFileSync(resolve(root, "components/modern-sidebar.tsx"), "utf8");
const navHrefs = [...sidebar.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
check("the sidebar lists its pages", navHrefs.length > 5, true);
for (const href of navHrefs.filter((h) => h.startsWith("/dashboard"))) {
	const path = href.split("?")[0];
	const hasRule = PAGE_ACCESS.some((r) => path === r.path || path.startsWith(`${r.path}/`));
	check(`sidebar entry ${href} resolves to a rule`, hasRule, true);
}

// --- can() -------------------------------------------------------------------

check("nobody holds anything", can(null, PERM.signalsView), false);
check("a missing list holds nothing", can({}, PERM.signalsView), false);
check("a listed permission is held", can({ permissions: ["signals.view"] }, PERM.signalsView), true);
check("an unlisted one is not", can({ permissions: ["signals.view"] }, PERM.signalsDelete), false);
check("the super-admin holds everything", can({ isSuperAdmin: true, permissions: [] }, PERM.rolesManage), true);
check("canAny is any-of", canAny({ permissions: ["users.view"] }, PERM.rolesManage, PERM.usersView), true);
check("an older session is not yet known", accessKnown({ permissions: undefined }), false);
check("a session with an empty list is known", accessKnown({ permissions: [] }), true);

// --- The seeded roles, page by page ------------------------------------------

const FIELD_WORK = [
	"signals.view", "signals.edit", "signals.triage", "signals.verify", "signals.risk_assess", "signals.feedback",
	"eidsr.view", "eidsr.sync", "eidsr.edit", "eidsr.verify", "eidsr.move", "eidsr.delete",
	"echis.view", "echis.sync", "echis.edit", "echis.verify", "echis.forward",
	"poe.view", "poe.sync", "poe.verify", "poe.forward",
	"dashboard.view", "map.view", "reports.view",
];
const admin = { isSuperAdmin: true, permissions: [] as string[], scope: "national" };
const eoc = { permissions: [...FIELD_WORK, "signals.delete", "integrations.view", "integrations.manage"], scope: "national" };
const district = {
	permissions: FIELD_WORK.filter((p) => !["eidsr.move", "eidsr.delete", "echis.forward", "poe.forward"].includes(p)),
	scope: "district",
	district: "Kampala District",
};
const viewer = { permissions: ["signals.view"], scope: "national" };
const userManager = { permissions: ["users.view", "users.manage"], scope: "national" };

check("admin opens Users & Access", canOpen(admin, "/dashboard/users"), true);
check("EOC does not open Users & Access", canOpen(eoc, "/dashboard/users"), false);
check("a user manager opens Users & Access", canOpen(userManager, "/dashboard/users"), true);
check("EOC does not open Dropdown Options", canOpen(eoc, "/dashboard/dropdown-options"), false);
check("a district user opens the register queues", canOpen(district, "/dashboard/signal-logs?stage=risk"), true);
check("a signals-only viewer does not open the dashboard", canOpen(viewer, "/dashboard"), false);
check("the dashboard rule is exact, not a prefix for every page", canOpen(viewer, "/dashboard/signal-logs"), true);
check("everyone signed in looks up facilities", canOpen(viewer, "/dashboard/facilities"), true);
check("nobody signed out opens the profile", canOpen(null, "/dashboard/profile"), false);
check("the public intake form is outside the rules", canOpen(null, "/add-alert"), true);
check("a nested path takes its parent's rule", canOpen(eoc, "/dashboard/users/42"), false);

check("admin lands on the dashboard", firstOpenPath(admin), "/dashboard");
check("a signals-only viewer lands on Raw Information", firstOpenPath(viewer), "/dashboard/signal-logs");
check("a user manager lands on Users & Access", firstOpenPath(userManager), "/dashboard/users");
check("an account with nothing lands on its profile", firstOpenPath({ permissions: [] }), "/dashboard/profile");
check("a session not yet refreshed lands on the dashboard", firstOpenPath({ scope: "national" }), "/dashboard");

// --- Actions -----------------------------------------------------------------

check("EOC deletes signals", signalActions(eoc).delete, true);
check("a district user does not", signalActions(district).delete, false);
check("a district user takes the verify step", canTakeStep(signalActions(district), "field-verify"), true);
check("a viewer does not triage", canTakeStep(signalActions(viewer), "triage"), false);
check("an unknown step is never takeable", canTakeStep(signalActions(admin), "none"), false);
check("a district user cannot forward eCHIS", feedActions(district, "echis").forward, false);
check("but verifies it", feedActions(district, "echis").verify, true);
check("EOC forwards POE", feedActions(eoc, "poe").forward, true);

// --- Area --------------------------------------------------------------------

check("a district account names its district", areaLabel(district), "Kampala District");
check("a region account names its region", areaLabel({ scope: "region", region: "Acholi" }), "Acholi region");
check("a scoped account without an area says so", areaLabel({ scope: "district", district: " " }), "No district assigned");
check("a national account covers the country", areaLabel(eoc), "All of Uganda");

console.log(`access.test.ts: ${passed} checks passed`);
