/**
 * Tests for the user-name helpers. No test runner is configured in this repo,
 * so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/user-name.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: userFullName feeds "Verified By" — the actor recorded
 * against a signal and read back months later from exports, the traceability
 * timeline and the confirmation PDF. The two failure modes that matter are
 * silently recording a username instead of a person, and PADDING a one-name
 * profile into something that names the wrong person. Both are pinned below.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// user-name.ts imports its User type through the "@/..." tsconfig path alias,
// which bare node cannot resolve. Map it to the project root so this file stays
// runnable with plain node, matching the repo's runner-less convention.
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

const { hasFullName, userFullName, userInitials, userNameParts } = await import(
	"./user-name.ts"
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

/** A User with only the fields these helpers read. */
function user(fields: Record<string, unknown>) {
	return {
		id: 1,
		username: "bkroland19",
		firstName: "",
		lastName: "",
		otherName: "",
		email: "",
		affiliation: "",
		userType: "",
		level: "",
		createdAt: "",
		updatedAt: "",
		...fields,
	} as Parameters<typeof userFullName>[0];
}

// --- The ordinary case: at least two names ---------------------------------

const roland = user({ firstName: "Roland", lastName: "Bukenya" });
check("first + last", userFullName(roland), "Roland Bukenya");
check("that is a full name", hasFullName(roland), true);

const withMiddle = user({
	firstName: "Roland",
	otherName: "Kato",
	lastName: "Bukenya",
});
check(
	"a middle name is kept, in writing order",
	userFullName(withMiddle),
	"Roland Kato Bukenya"
);

// --- Whitespace-only fields are not names ----------------------------------

check(
	"blank and whitespace-only parts are dropped",
	userNameParts(user({ firstName: " Roland ", otherName: "   ", lastName: "Bukenya" })),
	["Roland", "Bukenya"]
);

// A single field often holds two names typed with a stray double space; the gap
// shows up wherever the name is rendered.
check(
	"internal whitespace runs are collapsed",
	userFullName(user({ firstName: "bukenya", lastName: "kizza  roland" })),
	"bukenya kizza roland"
);

// --- A thin profile is reported, never padded ------------------------------

const oneName = user({ firstName: "Roland" });
check("one recorded name returns that name", userFullName(oneName), "Roland");
// The important one: NEVER splice the username in to reach two words. That
// would record "Roland bkroland19" as the human who verified a signal.
check("and is NOT padded with the username", hasFullName(oneName), false);

// --- Falling back to the username ------------------------------------------

const nameless = user({});
check(
	"an account with no names at all falls back to the username",
	userFullName(nameless),
	"bkroland19"
);
check("which is not a full name either", hasFullName(nameless), false);

check("a missing user yields no name", userFullName(null), "");
check("and no parts", userNameParts(undefined), []);
check("and is not a full name", hasFullName(null), false);

// --- Initials ---------------------------------------------------------------

check("initials come from first + last", userInitials(roland), "RB");
check(
	"a middle name does not displace the surname initial",
	userInitials(withMiddle),
	"RB"
);
check("one name gives its first two letters", userInitials(oneName), "RO");
check("no names falls back to the username", userInitials(nameless), "BK");
check("a missing user gives nothing", userInitials(null), "");

console.log(`user-name: ${passed} assertions passed`);
