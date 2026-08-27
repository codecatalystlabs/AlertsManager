/**
 * Tests for the admin-managed dropdown registry. No test runner is configured in
 * this repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/lookup-registry.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the source/channel lists moved from hard-coded arrays to
 * an admin-managed table, and the risky part of that move is NOT the CRUD — it
 * is that normalisation must keep working for values already stored on signals.
 * A retired option whose aliases stop resolving silently turns thousands of rows
 * into unrecognised free text in every table, export and filter. The alias and
 * "unknown values survive" cases below are the guard on that.
 */
import {
	LOOKUP_SOURCE_OF_ALERT,
	LookupRegistryStore,
	buildRegistry,
	filterValuesWithRegistry,
	normalizeWithRegistry,
	registryFromDefaults,
	type LookupOption,
} from "./lookup-registry.ts";

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

function option(
	name: string,
	sortOrder: number,
	aliases: string[] = [],
	active = true
): LookupOption {
	return {
		id: sortOrder,
		kind: LOOKUP_SOURCE_OF_ALERT,
		name,
		aliases,
		active,
		sortOrder,
		usageCount: 0,
	};
}

// --- Ordering and the active/retired split ----------------------------------

const registry = buildRegistry([
	option("Other", 60),
	option("Community", 10, ["Community Member", "Mass gathering"]),
	option("eCHIS", 70, ["eCHIS (CHT)"], false),
	option("Health facility", 20, ["Facility"]),
]);

check(
	"pickers list active options in admin-defined order",
	registry.names,
	["Community", "Health facility", "Other"]
);

// --- Normalisation ----------------------------------------------------------

check(
	"an alias folds onto its canonical name",
	normalizeWithRegistry(registry, "Community Member"),
	"Community"
);
check(
	"matching is case- and whitespace-insensitive",
	normalizeWithRegistry(registry, "  MASS GATHERING "),
	"Community"
);
check(
	"a canonical name resolves to itself",
	normalizeWithRegistry(registry, "Health facility"),
	"Health facility"
);
// The whole point of retiring rather than deleting: hidden from the picker,
// still resolvable for the signals that already carry it.
check(
	"a RETIRED option still normalises",
	normalizeWithRegistry(registry, "eCHIS (CHT)"),
	"eCHIS"
);
check(
	"an unknown value survives, trimmed but unchanged",
	normalizeWithRegistry(registry, "  Prison "),
	"Prison"
);
check("a blank value stays blank", normalizeWithRegistry(registry, ""), "");
check(
	"null/undefined are handled",
	normalizeWithRegistry(registry, null),
	""
);

// --- Server-side filter expansion -------------------------------------------

check(
	"filtering by a canonical name also matches every legacy spelling",
	filterValuesWithRegistry(registry, "Community").sort(),
	["Community", "community", "community member", "mass gathering"]
);
check(
	"an option with no aliases filters on itself alone",
	filterValuesWithRegistry(registry, "Other").sort(),
	["Other", "other"]
);

// --- Fallback defaults ------------------------------------------------------

const fallback = registryFromDefaults(LOOKUP_SOURCE_OF_ALERT, [
	{ name: "Community", aliases: ["Community Member"] },
	{ name: "eCHIS", active: false },
]);
check(
	"defaults build a usable registry before the API responds",
	fallback.names,
	["Community"]
);
check(
	"defaults keep their aliases resolving",
	normalizeWithRegistry(fallback, "community member"),
	"Community"
);

// --- The store notifies only on a real change -------------------------------

const store = new LookupRegistryStore(fallback);
let notifications = 0;
const unsubscribe = store.subscribe(() => {
	notifications += 1;
});

// Same contents, different object: pickers would re-render for nothing, and
// every SWR revalidation returns exactly this.
store.set(
	buildRegistry([
		option("Community", 10, ["Community Member"]),
		option("eCHIS", 20, [], false),
	])
);
check("an identical list does not notify subscribers", notifications, 0);

store.set(buildRegistry([option("Community", 10), option("Prison", 20)]));
check("a real change notifies once", notifications, 1);
check("and the snapshot is the new list", store.get().names, [
	"Community",
	"Prison",
]);

unsubscribe();
store.set(buildRegistry([option("Community", 10)]));
check("unsubscribing stops notifications", notifications, 1);

console.log(`lookup-registry: ${passed} assertions passed`);
