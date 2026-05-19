/**
 * API URL configuration.
 *
 * - Browser: always use same-origin `/api/v1` (Next.js rewrite proxy).
 * - Server rewrite target: `API_BASE_URL` in `.env` (e.g. local Go API on :8089).
 */
export const CLIENT_API_BASE = "/api/v1";

const LOCAL_API_BASE = "http://localhost:8089/api/v1";

/** Base URL for client-side fetch calls (goes through Next.js proxy). */
export function getClientApiBaseUrl(): string {
	if (typeof window !== "undefined") {
		return process.env.NEXT_PUBLIC_API_BASE_URL || CLIENT_API_BASE;
	}
	return process.env.NEXT_PUBLIC_API_BASE_URL || CLIENT_API_BASE;
}

/** Upstream API URL for Next.js rewrites (server-only). */
export function getServerApiBaseUrl(): string {
	return (process.env.API_BASE_URL || LOCAL_API_BASE).replace(/\/$/, "");
}
