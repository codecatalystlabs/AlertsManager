/**
 * "Source of Alert" — who/where a signal came from.
 *
 * The list is ADMIN-MANAGED (Administration → Dropdown Options, backed by
 * /lookups/source_of_alert). The array below is only the fallback used before
 * the API responds — and the exact set the backend seeds a fresh database with,
 * so the two stay in step.
 *
 * Several near-duplicate labels have always existed in stored data ("Community",
 * "Community Member", "Mass gathering" all mean Community). Each option carries
 * `aliases` for those, so old records still display, export and filter under the
 * merged name. Aliases are editable by an admin too — merging a duplicate label
 * is no longer a code change.
 */

import {
	LOOKUP_SOURCE_OF_ALERT,
	LookupRegistryStore,
	buildRegistry,
	filterValuesWithRegistry,
	normalizeWithRegistry,
	registryFromDefaults,
	type LookupDefault,
	type LookupOption,
} from "@/lib/lookup-registry";

/**
 * Fallback list, mirroring services.DefaultLookupOptions on the backend.
 * `active: false` marks a RETIRED label: no longer offered in any picker, but
 * still resolved so the rows already carrying it don't display blank.
 */
export const DEFAULT_SOURCE_OF_ALERT_OPTIONS: readonly LookupDefault[] = [
	{ name: "Community", aliases: ["Community Member", "Mass gathering"] },
	{ name: "Health facility", aliases: ["Facility"] },
	{ name: "Refugee Camp" },
	{ name: "Point Of Entry" },
	{ name: "Schools", aliases: ["School"] },
	{ name: "Other" },
	{ name: "eCHIS", aliases: ["eCHIS (CHT)"], active: false },
];

export const sourceOfAlertStore = new LookupRegistryStore(
	registryFromDefaults(LOOKUP_SOURCE_OF_ALERT, DEFAULT_SOURCE_OF_ALERT_OPTIONS)
);

/** Replace the live list — called once by the hydrator, then after admin edits. */
export function setSourceOfAlertOptions(options: LookupOption[]): void {
	if (options.length === 0) return; // never blank out the pickers on an empty read
	sourceOfAlertStore.set(buildRegistry(options));
}

/**
 * The selectable source names, in admin-defined order. A plain function (not a
 * constant) so callers always read the current list rather than whatever was in
 * place when their module was first evaluated. Components should prefer
 * `useSourceOfAlertOptions()` so they re-render when the list loads.
 */
export function sourceOfAlertOptions(): string[] {
	return sourceOfAlertStore.get().names;
}

/**
 * Map a raw source value to its canonical merged label. Unknown values are
 * returned trimmed but otherwise unchanged, so no data is lost.
 */
export function normalizeSourceOfAlert(raw: string | null | undefined): string {
	return normalizeWithRegistry(sourceOfAlertStore.get(), raw);
}

/**
 * Every raw stored value that normalizes to the given canonical source label.
 * Used to build a server-side `source_of_alert` IN-filter so selecting e.g.
 * "Community" also matches legacy rows stored as "Community Member" /
 * "Mass gathering". MySQL compares case-insensitively, so the lowercased alias
 * keys still match the mixed-case values in the database.
 */
export function sourceFilterValues(canonical: string): string[] {
	return filterValuesWithRegistry(sourceOfAlertStore.get(), canonical);
}
