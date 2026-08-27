/**
 * "Channel of Reporting" — the medium a signal arrived through (distinct from
 * the Source of Alert, which is who/where the signal came from).
 *
 * ADMIN-MANAGED (Administration → Dropdown Options, backed by
 * /lookups/channel_of_reporting). The array below is only the fallback used
 * before the API responds, and the set the backend seeds a fresh database with.
 */

import {
	LOOKUP_CHANNEL_OF_REPORTING,
	LookupRegistryStore,
	buildRegistry,
	normalizeWithRegistry,
	registryFromDefaults,
	type LookupDefault,
	type LookupOption,
} from "@/lib/lookup-registry";

/** Fallback list, mirroring services.DefaultLookupOptions on the backend. */
export const DEFAULT_CHANNEL_OF_REPORTING_OPTIONS: readonly LookupDefault[] = [
	{ name: "SMS (6767)" },
	{ name: "Call Centre" },
	{ name: "alerts.health.go.ug" },
	{ name: "Social media" },
	{ name: "eCHIS" },
	{ name: "Direct Call" },
	{ name: "912" },
];

export const channelOfReportingStore = new LookupRegistryStore(
	registryFromDefaults(
		LOOKUP_CHANNEL_OF_REPORTING,
		DEFAULT_CHANNEL_OF_REPORTING_OPTIONS
	)
);

/** Replace the live list — called once by the hydrator, then after admin edits. */
export function setChannelOfReportingOptions(options: LookupOption[]): void {
	if (options.length === 0) return; // never blank out the pickers on an empty read
	channelOfReportingStore.set(buildRegistry(options));
}

/**
 * The selectable channel names, in admin-defined order. Components should prefer
 * `useChannelOfReportingOptions()` so they re-render when the list loads.
 */
export function channelOfReportingOptions(): string[] {
	return channelOfReportingStore.get().names;
}

/** Fold a stored channel value onto its canonical label (see aliases). */
export function normalizeChannelOfReporting(
	raw: string | null | undefined
): string {
	return normalizeWithRegistry(channelOfReportingStore.get(), raw);
}
