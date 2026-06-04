import { getServerApiBaseUrl } from "@/lib/api-config";

const LOCAL_BACKEND_HINT =
	"Start the Go API on port 8089. This repo is frontend-only — the backend must be run separately.";

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

export function getBackendUpstreamUrl(): string {
	if (typeof window === "undefined") {
		return getServerApiBaseUrl();
	}

	return process.env.NEXT_PUBLIC_API_DEV_UPSTREAM || "http://127.0.0.1:8089/api/v1";
}

export function formatApiFetchError(
	status: number,
	statusText: string,
	bodyText = "",
	resourceLabel = "alerts"
): string {
	if (isLikelyBackendUnreachable(status, bodyText)) {
		const upstream = getBackendUpstreamUrl();
		return (
			`Cannot reach the backend API at ${upstream}. ${LOCAL_BACKEND_HINT} ` +
			`(Next.js proxy returned ${status} because nothing is listening on port 8089.)`
		);
	}

	if (status >= 500) {
		const detail = bodyText.trim().slice(0, 300);
		return (
			`Failed to load ${resourceLabel}: ${status} ${statusText}. ` +
			"The API returned a server error — check backend logs. " +
			`For local dev, ensure the Go API is running on port 8089 and restart \`yarn dev\` after changing .env.` +
			(detail ? ` Response: ${detail}` : "")
		);
	}

	const detail = bodyText.trim();
	const suffix = detail ? ` ${detail.slice(0, 200)}` : "";
	return `Failed to load ${resourceLabel}: ${status} ${statusText}.${suffix}`;
}

export function formatAlertsFetchError(
	status: number,
	statusText: string,
	bodyText = ""
): string {
	return formatApiFetchError(status, statusText, bodyText, "alerts");
}

export function formatEidsrFetchError(
	status: number,
	statusText: string,
	bodyText = ""
): string {
	return formatApiFetchError(status, statusText, bodyText, "6767 messages");
}
