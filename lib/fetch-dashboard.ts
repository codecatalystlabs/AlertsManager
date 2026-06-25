import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

/** One labelled bar/slice in a dashboard breakdown. */
export interface DashboardCountItem {
	key: string;
	label: string;
	count: number;
}

/** One bucket (day or month) of the signals-over-time line. */
export interface DashboardTimePoint {
	period: string;
	label: string;
	count: number;
}

/** Full dashboard payload from GET /dashboard/summary. */
export interface DashboardSummary {
	total: number;
	verified: number;
	notVerified: number;
	discarded: number;
	alerts: number;
	fieldVerification: DashboardCountItem[];
	deskVerification: DashboardCountItem[];
	verification: DashboardCountItem[];
	status: DashboardCountItem[];
	topDistricts: DashboardCountItem[];
	diseases: DashboardCountItem[];
	sources: DashboardCountItem[];
	age: DashboardCountItem[];
	sex: DashboardCountItem[];
	timeline: DashboardTimePoint[];
	granularity: "daily" | "monthly";
}

export interface DashboardSummaryParams {
	/** Inclusive range start (YYYY-MM-DD); omit for all-time. */
	from_date?: string;
	/** Inclusive range end (YYYY-MM-DD); omit for all-time. */
	to_date?: string;
	/** Case district name; omit or "all" for every district. */
	district?: string;
	/** Region name; omit or "all" for every region. */
	region?: string;
}

class DashboardFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "DashboardFetchError";
	}
}

const EMPTY_SUMMARY: DashboardSummary = {
	total: 0,
	verified: 0,
	notVerified: 0,
	discarded: 0,
	alerts: 0,
	fieldVerification: [],
	deskVerification: [],
	verification: [],
	status: [],
	topDistricts: [],
	diseases: [],
	sources: [],
	age: [],
	sex: [],
	timeline: [],
	granularity: "daily",
};

function buildSummaryUrl(apiBase: string, params: DashboardSummaryParams): string {
	const searchParams = new URLSearchParams();
	if (params.from_date) searchParams.set("from_date", params.from_date);
	if (params.to_date) searchParams.set("to_date", params.to_date);
	if (params.district && params.district !== "all") {
		searchParams.set("district", params.district);
	}
	if (params.region && params.region !== "all") {
		searchParams.set("region", params.region);
	}
	const query = searchParams.toString();
	const path = `${apiBase}/dashboard/summary`;
	return query ? `${path}?${query}` : path;
}

/**
 * GET /api/v1/dashboard/summary — the whole dashboard (KPI counts + every chart
 * breakdown) aggregated server-side, scoped by date range and district. Replaces
 * the old approach of pulling every alert row to the browser to aggregate.
 */
export async function fetchDashboardSummary(
	params: DashboardSummaryParams = {}
): Promise<DashboardSummary> {
	const apiBase = getClientApiBaseUrl();

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(
			buildSummaryUrl(apiBase, params)
		);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new DashboardFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new DashboardFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const json = (await response.json()) as Partial<DashboardSummary> | null;
	// Defensive merge so a partial/empty response never crashes the charts.
	return { ...EMPTY_SUMMARY, ...(json ?? {}) };
}
