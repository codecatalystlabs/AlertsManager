/**
 * Tests for the RRT name/phone encoding. No test runner is configured in this
 * repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/rrt-team.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY: the team is structured in the form but stored in two free-text columns
 * that already hold years of unstructured values. Every one of those has to
 * survive a round trip through the dialog unchanged — a re-assessment that
 * silently rewrites the previous team is worse than no phone numbers at all.
 */
import {
	formatRrtMembers,
	formatRrtPerson,
	parseRrtMembers,
	parseRrtPerson,
	rrtMembersDisplay,
	rrtPersonDisplay,
	splitRrtMembers,
} from "./rrt-team.ts";

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

// --- one person ---------------------------------------------------------
check("format both", formatRrtPerson({ name: "Dr Jane Doe", phone: "0771234567" }),
	"Dr Jane Doe · 0771234567");
check("format name only", formatRrtPerson({ name: "DHO Kasese", phone: "" }), "DHO Kasese");
check("format phone only", formatRrtPerson({ name: "", phone: "0771234567" }), "· 0771234567");
check("format blank", formatRrtPerson({ name: "  ", phone: " " }), "");

check("parse both", parseRrtPerson("Dr Jane Doe · 0771234567"),
	{ name: "Dr Jane Doe", phone: "0771234567" });
check("parse phone only", parseRrtPerson("· 0771234567"), { name: "", phone: "0771234567" });
check("parse blank", parseRrtPerson(null), { name: "", phone: "" });

// A legacy row is a name, not a parse failure.
check("legacy lead", parseRrtPerson("DHO Kasese"), { name: "DHO Kasese", phone: "" });
check("legacy comma name", parseRrtPerson("Doe, John"), { name: "Doe, John", phone: "" });

// --- the team -----------------------------------------------------------
const TEAM = [
	{ name: "Dr Jane Doe", phone: "0771234567" },
	{ name: "Okwir Sam", phone: "" },
];
check("format team", formatRrtMembers(TEAM), "Dr Jane Doe · 0771234567; Okwir Sam");
check("format drops blank rows",
	formatRrtMembers([...TEAM, { name: "", phone: "" }]),
	"Dr Jane Doe · 0771234567; Okwir Sam");
check("team round trip", parseRrtMembers(formatRrtMembers(TEAM)), TEAM);

// Commas are NOT separators: a legacy list stays one entry rather than being
// split into "surveillance" / "clinical" / "lab".
check("legacy members stay whole", parseRrtMembers("surveillance, clinical, lab, vet"),
	[{ name: "surveillance, clinical, lab, vet", phone: "" }]);
check("newlines split", parseRrtMembers("A · 1\nB · 2"),
	[{ name: "A", phone: "1" }, { name: "B", phone: "2" }]);
check("empty gives one blank row", parseRrtMembers(""), [{ name: "", phone: "" }]);
check("stray separators ignored", parseRrtMembers("; ;"), [{ name: "", phone: "" }]);

// --- read-only display ---------------------------------------------------
check("display both", rrtPersonDisplay("Dr Jane Doe · 0771234567"), "Dr Jane Doe (0771234567)");
check("display name only", rrtPersonDisplay("DHO Kasese"), "DHO Kasese");
check("display phone only", rrtPersonDisplay("· 0771234567"), "0771234567");
check("display team", rrtMembersDisplay("A · 1; B"), "A (1), B");
check("display empty", rrtMembersDisplay(""), "");
check("split does not pad", splitRrtMembers(""), []);

console.log(`rrt-team: ${passed} assertions passed`);
