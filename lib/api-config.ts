/**
 * API URL configuration.
 *
 * - Browser: always use same-origin `/api/v1` (Next.js rewrite proxy).
 * - Server rewrite target: `API_BASE_URL` in `.env`, defaulting to the deployed backend.
 */
export const CLIENT_API_BASE = "http://localhost:8089/api/v1";

/** Default upstream: the deployed backend. Set `API_BASE_URL` in `.env` to use a local API. */
export const DEFAULT_API_BASE_URL = "https://alerts.health.go.ug/api/v1";

/** Strip trailing slashes and mistaken `/alerts` suffix from API base URLs. */
export function normalizeApiBaseUrl(base: string): string {
	return base.replace(/\/+$/, "").replace(/\/alerts$/i, "");
}

/**
 * Base URL for client-side fetch calls.
 * Prefer same-origin `/api/v1` (Next.js rewrite) when the configured API host
 * matches the page — matches localhost and fixes prod when NEXT_PUBLIC points
 * at the public site URL instead of the internal upstream.
 */
export function getClientApiBaseUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;

	if (typeof window !== "undefined") {
		if (!explicit) {
			return CLIENT_API_BASE;
		}

		if (explicit.startsWith("/")) {
			return normalizeApiBaseUrl(explicit);
		}

		try {
			const configured = new URL(explicit, window.location.origin);
			if (configured.origin === window.location.origin) {
				return CLIENT_API_BASE;
			}
		} catch {
			return normalizeApiBaseUrl(explicit);
		}

		return normalizeApiBaseUrl(explicit);
	}

	return normalizeApiBaseUrl(explicit || CLIENT_API_BASE);
}

/** Upstream API URL for Next.js rewrites (server-only). */
export function getServerApiBaseUrl(): string {
	return (process.env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
