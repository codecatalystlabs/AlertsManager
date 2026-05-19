import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";
import {
	getCachedAlerts,
	setCachedAlerts,
	isCacheFresh,
	isCacheUsable,
	type FetchAlertsResult,
} from "@/lib/alerts-cache";

class AlertsFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "AlertsFetchError";
	}
}

async function fetchAlertsFromApi<T>(): Promise<T> {
	const apiBase = getClientApiBaseUrl();
	let response: Response;

	try {
		response = await AuthService.makeAuthenticatedRequest(
			`${apiBase}/alerts`
		);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AlertsFetchError(
				"Cannot reach the API. If developing locally, ensure the backend is running on port 8089."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new AlertsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const data = await response.json();
	return (Array.isArray(data) ? data : []) as T;
}

function warnBackgroundRevalidate(error: unknown): void {
	if (process.env.NODE_ENV === "development") {
		console.warn(
			"[alerts] Background refresh failed; continuing with cached data.",
			error instanceof Error ? error.message : error
		);
	}
}

/**
 * Fetch all alerts with cache:
 * - Fresh cache: return immediately
 * - Stale cache: return immediately + background revalidate
 * - Missing/expired or force: network fetch
 */
export async function fetchAllAlerts<T>(
	options: { force?: boolean } = {}
): Promise<FetchAlertsResult<T>> {
	const { force = false } = options;
	const cached = getCachedAlerts<T>();

	if (!force && cached) {
		if (isCacheFresh()) {
			return { data: cached.data, fromCache: true };
		}

		if (isCacheUsable()) {
			return {
				data: cached.data,
				fromCache: true,
				revalidate: async () => {
					try {
						const fresh = await fetchAlertsFromApi<T>();
						setCachedAlerts(fresh);
						return fresh;
					} catch (error) {
						warnBackgroundRevalidate(error);
						return null;
					}
				},
			};
		}
	}

	const data = await fetchAlertsFromApi<T>();
	setCachedAlerts(data);
	return { data, fromCache: false };
}
