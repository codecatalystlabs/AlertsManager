/**
 * API URL configuration.
 *
 * - Browser: always use same-origin `/api/v1` (Next.js rewrite proxy).
 * - Server rewrite target: `API_BASE_URL` in `.env` (e.g. local Go API on :8089).
 */
export const CLIENT_API_BASE = "/api/v1";

/** Use 127.0.0.1 — on Windows, `localhost` often resolves to ::1 while the Go API binds IPv4 only. */
const LOCAL_API_BASE = "http://127.0.0.1:8089/api/v1";

/** Strip trailing slashes and mistaken `/alerts` suffix from API base URLs. */
export function normalizeApiBaseUrl(base: string): string {
	return base.replace(/\/+$/, "").replace(/\/alerts$/i, "");
}

/** Base URL for client-side fetch calls (goes through Next.js proxy). */
export function getClientApiBaseUrl(): string {
	const raw =
		typeof window !== "undefined"
			? process.env.NEXT_PUBLIC_API_BASE_URL || CLIENT_API_BASE
			: process.env.NEXT_PUBLIC_API_BASE_URL || CLIENT_API_BASE;
	return normalizeApiBaseUrl(raw);
}

/** Upstream API URL for Next.js rewrites (server-only). */
export function getServerApiBaseUrl(): string {
	return (process.env.API_BASE_URL || LOCAL_API_BASE).replace(/\/$/, "");
}
