import { DEFAULT_API_BASE_URL, getServerApiBaseUrl } from "@/lib/api-config";

const BACKEND_UNREACHABLE_HINT =
	"The API server did not respond. Confirm the backend is online and that API_BASE_URL points to it, then retry.";

/** Network/proxy failures should be reported separately from upstream 500s. */
export function isLikelyBackendUnreachable(
	status: number,
	bodyText: string
): boolean {
	if (status < 500) return false;

	const normalized = bodyText.trim().toLowerCase();
	return (
		normalized.includes("econnrefused") ||
		normalized.includes("failed to proxy")
	);
}

export function getBackendUpstreamUrl(): string {
	if (typeof window === "undefined") {
		return getServerApiBaseUrl();
	}

	return process.env.NEXT_PUBLIC_API_DEV_UPSTREAM || DEFAULT_API_BASE_URL;
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
			`Cannot reach the backend API at ${upstream}. ${BACKEND_UNREACHABLE_HINT} ` +
			`(Next.js proxy returned ${status}.)`
		);
	}

	if (status >= 500) {
		const detail = bodyText.trim().slice(0, 300);
		return (
			`Failed to load ${resourceLabel}: ${status} ${statusText}. ` +
			"The API returned a server error — check the backend logs. " +
			"If you just changed .env, restart the dev server so the new API_BASE_URL takes effect." +
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

function parseApiErrorBody(bodyText: string): {
	error?: string;
	details?: string;
	message?: string;
} | null {
	const trimmed = bodyText.trim();
	if (!trimmed.startsWith("{")) return null;
	try {
		const parsed = JSON.parse(trimmed) as Record<string, unknown>;
		return {
			error: typeof parsed.error === "string" ? parsed.error : undefined,
			details:
				typeof parsed.details === "string" ? parsed.details : undefined,
			message:
				typeof parsed.message === "string" ? parsed.message : undefined,
		};
	} catch {
		return null;
	}
}

function formatEidsrUpstreamHint(details: string): string | null {
	const lower = details.toLowerCase();
	if (
		lower.includes("no such host") ||
		lower.includes("dial tcp") ||
		lower.includes("lookup ")
	) {
		const hostMatch = details.match(/https?:\/\/([^/"'\s]+)/i);
		const host = hostMatch?.[1] ?? "the configured EIDSR host";
		return (
			`The API server cannot reach ${host} (DNS lookup failed). ` +
			"Update the Go API EIDSR base URL / host in server environment variables " +
			"to the correct DHIS2 or EIDSR endpoint, then restart the API."
		);
	}
	if (lower.includes("eidsr")) {
		return (
			"The API could not pull data from EIDSR. Check EIDSR/DHIS2 URL and credentials " +
			"on the Go API server (not in this Next.js app)."
		);
	}
	return null;
}

export function formatEidsrVerifyFetchError(
	status: number,
	statusText: string,
	bodyText = "",
	messageId?: number,
	triedRoutes?: string[]
): string {
	const parsed = parseApiErrorBody(bodyText);
	const route = messageId
		? `POST /api/v1/eidsr/local/messages/${messageId}/verify`
		: "POST /api/v1/eidsr/local/messages/{id}/verify";

	if (status === 404 && triedRoutes?.length) {
		return (
			`Verification failed: none of the verify endpoints are available (404). ` +
			`Tried: ${triedRoutes.join(", ")}. ` +
			"Deploy the Go API route that matches your backend (messages or events verify)."
		);
	}

	if (status === 404) {
		return (
			`Verification endpoint not found (${route}). ` +
			"Ensure the Go API registers this route and that the ID is correct."
		);
	}

	if (parsed) {
		const summary =
			parsed.error || parsed.message || "EIDSR verification failed";
		const details = parsed.details ?? "";
		if (details) return `${summary}. ${details.slice(0, 400)}`;
		return `${summary} (${status} ${statusText})`;
	}

	const detail = bodyText.trim();
	if (detail) return `${route} failed: ${detail.slice(0, 300)}`;
	return `EIDSR verification failed: ${status} ${statusText}`;
}

export function formatEidsrFetchError(
	status: number,
	statusText: string,
	bodyText = ""
): string {
	const parsed = parseApiErrorBody(bodyText);
	if (parsed) {
		const summary = parsed.error || parsed.message || "EIDSR sync failed";
		const details = parsed.details ?? "";
		const upstreamHint = details ? formatEidsrUpstreamHint(details) : null;

		if (upstreamHint) {
			return `${summary}. ${upstreamHint}`;
		}
		if (details) {
			return `${summary}. ${details.slice(0, 400)}`;
		}
		return `${summary} (${status} ${statusText})`;
	}

	return formatApiFetchError(status, statusText, bodyText, "6767 messages");
}
