/** Client-side cache for /alerts list — stale-while-revalidate */

const CACHE_KEY = "uganda_health_alerts_v1";
const FRESH_MS = 5 * 60 * 1000; // serve from cache without network
const STALE_MS = 15 * 60 * 1000; // serve stale, revalidate in background

export interface AlertsCacheEntry<T> {
	data: T;
	fetchedAt: number;
}

type CacheListener<T> = (data: T) => void;

let memoryCache: AlertsCacheEntry<unknown> | null = null;
const listeners = new Set<CacheListener<unknown>>();

function readStorage<T>(): AlertsCacheEntry<T> | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as AlertsCacheEntry<T>;
		if (!parsed?.data || typeof parsed.fetchedAt !== "number") return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeStorage<T>(entry: AlertsCacheEntry<T>): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
	} catch {
		// sessionStorage full or unavailable
	}
}

export function getCachedAlerts<T>(): AlertsCacheEntry<T> | null {
	if (memoryCache) return memoryCache as AlertsCacheEntry<T>;
	const stored = readStorage<T>();
	if (stored) memoryCache = stored as AlertsCacheEntry<unknown>;
	return stored;
}

export function setCachedAlerts<T>(data: T): void {
	const entry: AlertsCacheEntry<T> = { data, fetchedAt: Date.now() };
	memoryCache = entry as AlertsCacheEntry<unknown>;
	writeStorage(entry);
	listeners.forEach((listener) => listener(data));
}

export function invalidateAlertsCache(): void {
	memoryCache = null;
	if (typeof window !== "undefined") {
		try {
			sessionStorage.removeItem(CACHE_KEY);
		} catch {
			/* ignore */
		}
	}
}

export function subscribeAlertsCache<T>(listener: CacheListener<T>): () => void {
	listeners.add(listener as CacheListener<unknown>);
	return () => listeners.delete(listener as CacheListener<unknown>);
}

export function getCacheAgeMs(): number | null {
	const cached = getCachedAlerts();
	if (!cached) return null;
	return Date.now() - cached.fetchedAt;
}

export function isCacheFresh(): boolean {
	const age = getCacheAgeMs();
	return age !== null && age < FRESH_MS;
}

export function isCacheUsable(): boolean {
	const age = getCacheAgeMs();
	return age !== null && age < STALE_MS;
}

export interface FetchAlertsResult<T> {
	data: T;
	fromCache: boolean;
	/** Resolves to fresh data, or null if background refresh failed (cached data still valid). */
	revalidate?: () => Promise<T | null>;
}
