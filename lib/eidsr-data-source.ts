import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { EIDSR_MESSAGES_API_PATHS } from "@/constants/eidsr-messages";

export type EidsrDataSource = "messages" | "events";

let cachedSource: EidsrDataSource | null = null;

/**
 * Detect whether the Go API exposes /eidsr/local/messages.
 * 404 → use legacy /eidsr/local/events + /eidsr/local/refresh.
 */
export async function getEidsrDataSource(
	forceRefresh = false
): Promise<EidsrDataSource> {
	if (cachedSource && !forceRefresh) return cachedSource;

	const base = getClientApiBaseUrl();
	const url = `${base}${EIDSR_MESSAGES_API_PATHS.messages}?all=true`;

	try {
		const response = await AuthService.makeAuthenticatedRequest(url, {
			method: "GET",
		});

		if (response.status === 404) {
			cachedSource = "events";
			return cachedSource;
		}

		// Route exists (2xx, 401, 403, 500, etc.)
		cachedSource = "messages";
		return cachedSource;
	} catch {
		cachedSource = "events";
		return cachedSource;
	}
}

export function resetEidsrDataSourceCache(): void {
	cachedSource = null;
}

export const EIDSR_EVENTS_FALLBACK_HINT =
	"This API does not expose /eidsr/local/messages yet. Showing 6767 events from /eidsr/local/events. Deploy an updated Go API with SMS message routes to enable sync via /messages/sync and verify-into-alerts.";
