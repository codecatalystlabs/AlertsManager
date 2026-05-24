import { getServerApiBaseUrl } from "@/lib/api-config";

/** Plain-text 500 from Next.js rewrites usually means the upstream refused the connection. */
export function isLikelyBackendUnreachable(
	status: number,
	bodyText: string
): boolean {
	if (status < 500) return false;

	const body = bodyText.trim();
	if (!body) return true;

	const normalized = body.toLowerCase();
	return (
		normalized === "internal server error" ||
		normalized.includes("econnrefused") ||
		normalized.includes("failed to proxy")
	);
}

/**
 * Best-effort identifier of the upstream the proxy is configured to hit.
 *
 * Server-side this reads from `API_BASE_URL`. Client-side this can only
 * read public env vars, so we look at — in order:
 *   1. `NEXT_PUBLIC_API_UPSTREAM_HINT` — set this in `.env` mirroring
 *      `API_BASE_URL` if you want it shown in error messages.
 *   2. `NEXT_PUBLIC_API_BASE_URL` if it's an absolute URL (i.e. the
 *      browser is bypassing the rewrite proxy).
 *   3. A generic "the configured upstream" label — never invent a URL.
 */
export function getBackendUpstreamUrl(): string {
	if (typeof window === "undefined") {
		return getServerApiBaseUrl();
	}

	const hint = process.env.NEXT_PUBLIC_API_UPSTREAM_HINT;
	if (hint) return hint;

	const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (publicBase && /^https?:\/\//i.test(publicBase)) return publicBase;

	return "the configured API_BASE_URL";
}

export function formatAlertsFetchError(
	status: number,
	statusText: string,
	bodyText = ""
): string {
	if (isLikelyBackendUnreachable(status, bodyText)) {
		const upstream = getBackendUpstreamUrl();
		return (
			`Cannot reach the upstream API (${upstream}). ` +
			`The Next.js proxy returned ${status}. ` +
			`Check API_BASE_URL in .env and restart the dev server after changing it.`
		);
	}

	if (status >= 500) {
		return (
			`Upstream API error: ${status} ${statusText}. ` +
			`Check backend logs. If you just changed .env, restart the dev server so the proxy picks up the new API_BASE_URL.`
		);
	}

	const detail = bodyText.trim();
	const suffix = detail ? ` ${detail.slice(0, 200)}` : "";
	return `Failed to fetch: ${status} ${statusText}.${suffix}`;
}
