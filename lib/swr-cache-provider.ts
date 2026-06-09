/**
 * Persistent SWR cache provider.
 *
 * Hydrates SWR's cache from sessionStorage on startup and flushes it back on
 * `beforeunload`, so a hard refresh paints instantly from the last-seen data
 * (then revalidates in the background). sessionStorage — not localStorage — so
 * the cache auto-clears when the tab closes, which is safer on shared machines
 * and matches the semantics of the alerts-cache it replaces.
 */

import type { Cache } from "swr";

export const SWR_CACHE_STORAGE_KEY = "alertsmanager-swr-cache-v1";

// SWR's cache entries are opaque `State` objects; a Map keyed by string with
// `any` values satisfies its `Cache` contract.
type SWRCache = Map<string, any>;

/** Remove the persisted cache (call on logout so a new login can't see stale data). */
export function clearPersistedSwrCache(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.removeItem(SWR_CACHE_STORAGE_KEY);
	} catch {
		/* private mode / storage disabled */
	}
}

export function sessionStorageProvider(): Cache {
	// SSR / non-browser: a plain in-memory map is all SWR needs.
	if (typeof window === "undefined") {
		return new Map() as Cache;
	}

	let initial: [string, unknown][] = [];
	try {
		const raw = sessionStorage.getItem(SWR_CACHE_STORAGE_KEY);
		if (raw) initial = JSON.parse(raw) as [string, unknown][];
	} catch {
		// Corrupt or unreadable cache → start empty.
		initial = [];
	}

	const map: SWRCache = new Map(initial);

	const persist = () => {
		try {
			sessionStorage.setItem(
				SWR_CACHE_STORAGE_KEY,
				JSON.stringify(Array.from(map.entries()))
			);
		} catch {
			// Quota exceeded / unavailable — cache simply isn't persisted this time.
		}
	};

	window.addEventListener("beforeunload", persist);
	// `pagehide` covers mobile Safari / bfcache where `beforeunload` may not fire.
	window.addEventListener("pagehide", persist);

	return map as Cache;
}
