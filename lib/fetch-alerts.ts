import { AuthService } from "@/lib/auth";
import {
	getCachedAlerts,
	setCachedAlerts,
	isCacheFresh,
	isCacheUsable,
	type FetchAlertsResult,
} from "@/lib/alerts-cache";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8089/api/v1";

async function fetchAlertsFromApi<T>(): Promise<T> {
	const response = await AuthService.makeAuthenticatedRequest(
		`${API_BASE_URL}/alerts`
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch alerts: ${response.status} ${response.statusText}`
		);
	}

	const data = await response.json();
	return (Array.isArray(data) ? data : []) as T;
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
					const fresh = await fetchAlertsFromApi<T>();
					setCachedAlerts(fresh);
					return fresh;
				},
			};
		}
	}

	const data = await fetchAlertsFromApi<T>();
	setCachedAlerts(data);
	return { data, fromCache: false };
}
