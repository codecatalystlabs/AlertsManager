/**
 * Tests for the Users & Access rules (lib/access-admin.ts) and the permission
 * label fallback (components/access/permission-labels.ts). No test runner is
 * configured in this repo, so this is a self-contained assertion script:
 *
 *   node --experimental-strip-types lib/access-admin.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the role editor must never leave a permission ticked
 * without what it needs (the server would silently add it back, so the screen
 * and the saved role would disagree), and the user form must never offer a
 * role the server will refuse to let this administrator assign.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith("@/")) {
			const target = resolvePath(projectRoot, specifier.slice(2));
			return { url: pathToFileURL(`${target}.ts`).href, shortCircuit: true };
		}
		return nextResolve(specifier, context);
	},
});

const {
	togglePermission,
	toggleGroup,
	neededBy,
	canAssignRole,
	canonicalArea,
	matchAreaOption,
	missingArea,
	auditSentence,
} = await import("./access-admin.ts");
const { fallbackPermissionLabel, labelFor, groupHeld } = await import(
	"../components/access/permission-labels.ts"
);

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

// A slice of the real catalogue's prerequisite graph.
const requires = {
	"signals.view": [],
	"signals.triage": ["signals.view"],
	"signals.delete": ["signals.view"],
	"users.view": [],
	"users.manage": ["users.view"],
	"roles.manage": ["users.view"],
};

// --- Ticking and unticking ---------------------------------------------------

check("ticking adds the prerequisite", togglePermission([], "signals.triage", true, requires), [
	"signals.triage",
	"signals.view",
]);
check(
	"unticking a prerequisite unticks what needs it",
	togglePermission(["signals.delete", "signals.triage", "signals.view", "users.view"], "signals.view", false, requires),
	["users.view"]
);
check(
	"unticking a dependant keeps its prerequisite",
	togglePermission(["signals.triage", "signals.view"], "signals.triage", false, requires),
	["signals.view"]
);
check(
	"ticking a whole group",
	toggleGroup([], ["users.manage", "roles.manage"], true, requires),
	["roles.manage", "users.manage", "users.view"]
);
check(
	"unticking a whole group clears it",
	toggleGroup(["roles.manage", "users.manage", "users.view"], ["users.view", "users.manage", "roles.manage"], false, requires),
	[]
);
check(
	"neededBy names the dependants",
	neededBy(["signals.triage", "signals.delete", "signals.view"], "signals.view", requires),
	["signals.triage", "signals.delete"]
);

// --- Who may assign which role -------------------------------------------------

const manager = { permissions: ["users.view", "users.manage", "signals.view"] };
check("a role within the manager's permissions", canAssignRole(manager, { isSystem: false, permissions: ["signals.view"] }), true);
check("a role with more than the manager holds", canAssignRole(manager, { isSystem: false, permissions: ["signals.view", "signals.delete"] }), false);
check("the built-in administrator role", canAssignRole(manager, { isSystem: true, permissions: [] }), false);
check("a super-admin may assign anything", canAssignRole({ isSuperAdmin: true }, { isSystem: true, permissions: [] }), true);
check("nobody signed in", canAssignRole(null, { isSystem: false, permissions: [] }), false);

// --- Areas --------------------------------------------------------------------

check("canonical district", canonicalArea(" Kampala District "), "kampala");
check("canonical city", canonicalArea("Masaka City"), "masaka");
check(
	"stored short name preselects the official option",
	matchAreaOption(["Gulu District", "Kampala District"], "kampala"),
	"Kampala District"
);
check("an unknown stored value is kept", matchAreaOption(["Gulu District"], "Atlantis"), "Atlantis");
check("empty stays empty", matchAreaOption(["Gulu District"], null), "");
check("district role with no district", missingArea("district", "Acholi", ""), true);
check("region role with a region", missingArea("region", "Acholi", null), false);
check("national role needs nothing", missingArea("national", null, null), false);

// --- The access log in words -----------------------------------------------------

const label = (code: string) => ({ "signals.delete": "Delete signals", "signals.triage": "Triage signals" })[code] ?? code;
const say = (action: string, detail: Record<string, unknown>, table = "users") =>
	auditSentence({ action, table, recordId: 7, detail }, label);

check(
	"account created",
	say("user_created", { username: "jdoe", role: "REOC", region: "Acholi" }).text,
	"created account jdoe with role REOC (Acholi)"
);
check(
	"role changed and password reset",
	say("user_updated", {
		username: "jdoe",
		changes: { role: { from: "District", to: "REOC" }, password: "reset" },
	}).text,
	"changed jdoe's role from District to REOC; reset jdoe's password"
);
check(
	"district moved and email edited",
	say("user_updated", {
		username: "jdoe",
		changes: { district: { from: "Gulu District", to: "Kampala District" }, email: { from: "a", to: "b" } },
	}).text,
	"set jdoe's district to Kampala District; updated jdoe's email"
);
check("deactivated", say("user_deactivated", { username: "jdoe" }).text, "deactivated jdoe");
check("own password", say("password_changed", { username: "jdoe" }).text, "changed their own password");
check(
	"role created",
	say("role_created", { name: "Triager", scope: "district", permissions: ["a", "b", "c"] }, "roles").text,
	"created role Triager (One district, 3 permissions)"
);
const updated = say(
	"role_updated",
	{ name: "Triager", changes: { added: ["signals.delete", "signals.triage"], removed: ["x.y"] } },
	"roles"
);
check("role updated", updated.text, "updated role Triager: added 2, removed 1 permissions");
check("role update lists labels, not codes", updated.details, ["Added: Delete signals, Triage signals", "Removed: x.y"]);
check("role deleted", say("role_deleted", { name: "Triager" }, "roles").text, "deleted role Triager");
check("an unknown action still reads", say("data_cleanup", { username: "jdoe" }).text, "data cleanup — jdoe");

// --- Permission labels ----------------------------------------------------------

check("fallback label", fallbackPermissionLabel("signals.risk_assess"), {
	group: "Signal pipeline",
	label: "Risk assess signals",
});
check("fallback keeps views apart", fallbackPermissionLabel("map.view").label, "View map");
const catalogue = [
	{ name: "Signal pipeline", permissions: [{ code: "signals.view", group: "Signal pipeline", label: "View signals", description: "" }] },
	{ name: "Insights", permissions: [{ code: "map.view", group: "Insights", label: "View the map", description: "" }] },
];
check("catalogue label preferred", labelFor(catalogue)("map.view"), "View the map");
check("unknown code falls back", labelFor(catalogue)("reports.view"), "View reports");
check("held grouped in catalogue order", groupHeld(["map.view", "signals.view"], catalogue), [
	{ group: "Signal pipeline", labels: ["View signals"] },
	{ group: "Insights", labels: ["View the map"] },
]);
check("held grouped without a catalogue", groupHeld(["dashboard.view", "map.view"], null), [
	{ group: "Insights", labels: ["View dashboard", "View map"] },
]);

console.log(`access-admin: ${passed} checks passed`);
