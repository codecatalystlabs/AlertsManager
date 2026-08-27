/**
 * Admin-managed dropdown lists ("lookups") — the pure, dependency-free half.
 *
 * "Source of Alert" and "Channel of Reporting" used to be hard-coded arrays in
 * this folder, so adding a reporting channel was a code change and a redeploy.
 * They now live in the backend `lookup_options` table behind /lookups CRUD, and
 * an admin edits them from Administration -> Dropdown Options.
 *
 * The old hard-coded arrays survive as DEFAULTS for one reason: the PUBLIC
 * self-report form must still render its pickers before (or without) a
 * successful API call. The registry below starts on those defaults and is
 * replaced once the API responds.
 *
 * Why a module-level store rather than passing options down as props: values are
 * also normalised from pure, synchronous helpers (normalizeSourceOfAlert,
 * sourceFilterValues) that are called from exports, column filters and PDF
 * builders — places that cannot hold React state. The store keeps those helpers
 * synchronous while `useSyncExternalStore` gives components a reactive read.
 *
 * This file deliberately imports NOTHING: lib/alert-normalize.ts reaches it
 * through normalizeSourceOfAlert, and its test runs under plain node, which
 * cannot load the fetch/auth machinery that lives in lookup-options.ts.
 */

export const LOOKUP_SOURCE_OF_ALERT = "source_of_alert";
export const LOOKUP_CHANNEL_OF_REPORTING = "channel_of_reporting";

export const LOOKUP_KINDS = [
	LOOKUP_SOURCE_OF_ALERT,
	LOOKUP_CHANNEL_OF_REPORTING,
] as const;

export type LookupKind = (typeof LOOKUP_KINDS)[number];

/** Human label for each list, used by the admin screen and error messages. */
export const LOOKUP_KIND_LABELS: Record<LookupKind, string> = {
	[LOOKUP_SOURCE_OF_ALERT]: "Source of Alert",
	[LOOKUP_CHANNEL_OF_REPORTING]: "Channel of Reporting",
};

/** One row of an option list, as returned by GET /lookups/:kind. */
export interface LookupOption {
	id: number;
	kind: LookupKind;
	name: string;
	/** Legacy spellings that fold onto `name` when old records are displayed. */
	aliases: string[];
	/** Inactive options are hidden from pickers but still resolve on old rows. */
	active: boolean;
	sortOrder: number;
	/** How many alerts currently store this option (or one of its aliases). */
	usageCount: number;
}

/** Create/update body for an option. Omitted fields are left unchanged. */
export interface LookupOptionInput {
	name?: string;
	aliases?: string[];
	active?: boolean;
	sortOrder?: number;
}

/**
 * The resolved view of one list. `names` is what a picker renders (active only,
 * in admin-defined order); `aliasMap` is lowercased alias/name -> canonical name
 * and deliberately includes RETIRED options, so a legacy value still resolves to
 * a real label instead of showing raw.
 */
export interface LookupRegistry {
	options: LookupOption[];
	names: string[];
	aliasMap: Record<string, string>;
}

/** Shape of the hard-coded fallbacks, mirroring the backend seed defaults. */
export interface LookupDefault {
	name: string;
	aliases?: string[];
	active?: boolean;
}

export function buildRegistry(options: LookupOption[]): LookupRegistry {
	const sorted = [...options].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
	);
	const aliasMap: Record<string, string> = {};
	for (const option of sorted) {
		const name = option.name.trim();
		if (!name) continue;
		aliasMap[name.toLowerCase()] = name;
		for (const alias of option.aliases ?? []) {
			const trimmed = alias.trim();
			if (trimmed) aliasMap[trimmed.toLowerCase()] = name;
		}
	}
	return {
		options: sorted,
		names: sorted.filter((o) => o.active).map((o) => o.name),
		aliasMap,
	};
}

/** Turn the hard-coded fallback list into a registry (ids are placeholders). */
export function registryFromDefaults(
	kind: LookupKind,
	defaults: readonly LookupDefault[]
): LookupRegistry {
	return buildRegistry(
		defaults.map((entry, index) => ({
			id: -(index + 1),
			kind,
			name: entry.name,
			aliases: entry.aliases ? [...entry.aliases] : [],
			active: entry.active ?? true,
			sortOrder: (index + 1) * 10,
			usageCount: 0,
		}))
	);
}

type Listener = () => void;

/**
 * Minimal external store: one snapshot, replaced wholesale on hydration. The
 * snapshot identity only changes when `equals` says the contents differ, so
 * components using `useSyncExternalStore` re-render exactly once per real
 * update — and never on an SWR revalidation that returned the same list.
 */
export class SnapshotStore<T> {
	private snapshot: T;
	private readonly equals: (a: T, b: T) => boolean;
	private readonly listeners = new Set<Listener>();

	// Fields are assigned explicitly rather than declared as constructor
	// parameter properties: the repo's tests run under `node
	// --experimental-strip-types`, whose strip-only mode rejects that syntax, and
	// this module is reachable from them.
	constructor(initial: T, equals: (a: T, b: T) => boolean) {
		this.snapshot = initial;
		this.equals = equals;
	}

	get = (): T => this.snapshot;

	set = (next: T): void => {
		if (this.equals(this.snapshot, next)) return;
		this.snapshot = next;
		for (const listener of this.listeners) listener();
	};

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
}

/** A SnapshotStore holding one option list. */
export class LookupRegistryStore extends SnapshotStore<LookupRegistry> {
	constructor(initial: LookupRegistry) {
		super(initial, sameNames);
	}
}

/** Cheap equality: identical picker contents AND identical alias mapping. */
function sameNames(a: LookupRegistry, b: LookupRegistry): boolean {
	if (a.names.length !== b.names.length) return false;
	if (a.names.some((name, i) => name !== b.names[i])) return false;
	const aKeys = Object.keys(a.aliasMap);
	const bKeys = Object.keys(b.aliasMap);
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((key) => a.aliasMap[key] === b.aliasMap[key]);
}

/**
 * Fold a raw stored value onto its canonical option name. Unknown values come
 * back trimmed but otherwise unchanged — an option row being deleted must never
 * blank out the value a signal already carries.
 */
export function normalizeWithRegistry(
	registry: LookupRegistry,
	raw: string | null | undefined
): string {
	if (!raw) return "";
	const trimmed = raw.trim();
	return registry.aliasMap[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Every raw stored spelling that normalises to `canonical`. Used to build a
 * server-side IN-filter so picking "Community" also matches legacy rows stored
 * as "Community Member" / "Mass gathering".
 */
export function filterValuesWithRegistry(
	registry: LookupRegistry,
	canonical: string
): string[] {
	const values = new Set<string>([canonical]);
	for (const [raw, mapped] of Object.entries(registry.aliasMap)) {
		if (mapped === canonical) values.add(raw);
	}
	return Array.from(values);
}

