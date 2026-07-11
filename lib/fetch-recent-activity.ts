import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

/**
 * Selectable window for the dashboard "Recent activity" card. A rolling window is
 * `${N}h` (hours) or one of the day presets, e.g. "1h", "3h", "10h", "24h", "7d",
 * "30d"; "custom" is an explicit calendar-day range. The `${number}h` form also
 * covers the user-entered "custom hours" value.
 */
export type RecentActivityWindow = "7d" | "30d" | "custom" | `${number}h`;

/** Payload from GET /dashboard/recent-activity. */
export interface RecentActivity {
	window: RecentActivityWindow;
	/** RFC3339 window bounds, resolved server-side. */
	from: string;
	to: string;
	pending: number;
	verified: number;
	total: number;
}

export interface RecentActivityParams {
	window: RecentActivityWindow;
	/** YYYY-MM-DD; required (and only used) when window === "custom". */
	from_date?: string;
	to_date?: string;
	/** Case district name; omit or "all" for every district. */
	district?: string;
}

class RecentActivityFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "RecentActivityFetchError";
	}
}

function buildUrl(apiBase: string, params: RecentActivityParams): string {
	const sp = new URLSearchParams();
	sp.set("window", params.window);
	if (params.window === "custom") {
		if (params.from_date) sp.set("from_date", params.from_date);
		if (params.to_date) sp.set("to_date", params.to_date);
	}
	if (params.district && params.district !== "all") {
		sp.set("district", params.district);
	}
	return `${apiBase}/dashboard/recent-activity?${sp.toString()}`;
}

/**
 * GET /api/v1/dashboard/recent-activity — pending vs verified counts for signals
 * logged within a selectable window (last 24h / 7d / 30d / custom). Honours the
 * district filter but is independent of the dashboard's date range.
 */
export async function fetchRecentActivity(
	params: RecentActivityParams
): Promise<RecentActivity> {
	const apiBase = getClientApiBaseUrl();

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(
			buildUrl(apiBase, params)
		);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new RecentActivityFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new RecentActivityFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	return (await response.json()) as RecentActivity;
}
