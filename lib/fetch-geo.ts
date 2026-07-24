import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

/**
 * Geo boundaries + scoped alert counts for the interactive map. The backend
 * returns one GeoJSON FeatureCollection per drill level (region → district →
 * subcounty), so the ~100 MB of subcounty geometry is only ever fetched a single
 * district at a time.
 */

export type GeoLevel = "region" | "district" | "subcounty";

/** Polygon/MultiPolygon geometry, kept loose so we don't depend on @types/geojson. */
export interface GeoGeometry {
	type: "Polygon" | "MultiPolygon";
	coordinates: number[][][] | number[][][][];
}

export interface GeoFeatureProperties {
	uid: string;
	name: string;
	level: number;
	parentUid: string;
	regionUid: string;
	districtUid: string;
	count: number;
	/** [lng, lat] interior point for the count bubble. */
	centroid: [number, number];
	/** [minLng, minLat, maxLng, maxLat] for fitBounds on drill. */
	bbox: [number, number, number, number];
}

export interface GeoFeature {
	type: "Feature";
	geometry: GeoGeometry | null;
	properties: GeoFeatureProperties;
}

export interface GeoFeatureCollection {
	type: "FeatureCollection";
	level: GeoLevel;
	parentUid: string;
	maxCount: number;
	total: number;
	features: GeoFeature[];
	/**
	 * Subcounty level only: signals in the drilled district that couldn't be
	 * placed on any subcounty polygon (blank/unmatched subcounty). Lets the UI
	 * keep the drill-in total honest instead of silently dropping ~43% of signals.
	 */
	unassigned?: number;
}

export interface GeoQuery {
	fromDate?: string;
	toDate?: string;
	/** Selected alertResponse codes/labels; empty/undefined = every type. */
	responses?: string[];
	/** Selected verification-outcome buckets (see GEO_OUTCOME_FILTER_OPTIONS); empty/undefined = every outcome. */
	outcomes?: string[];
}

class GeoFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "GeoFetchError";
	}
}

function buildQuery(q: GeoQuery, extra: Record<string, string> = {}): string {
	const params = new URLSearchParams();
	if (q.fromDate) params.set("from_date", q.fromDate);
	if (q.toDate) params.set("to_date", q.toDate);
	// Multi-select filters are sent comma-joined; the taxonomy codes and outcome
	// buckets never contain commas, so the backend splits them back cleanly.
	if (q.responses && q.responses.length)
		params.set("response", q.responses.join(","));
	if (q.outcomes && q.outcomes.length)
		params.set("outcome", q.outcomes.join(","));
	for (const [key, value] of Object.entries(extra)) {
		if (value) params.set(key, value);
	}
	const s = params.toString();
	return s ? `?${s}` : "";
}

async function fetchGeo<T>(path: string): Promise<T> {
	const url = `${getClientApiBaseUrl()}${path}`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new GeoFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new GeoFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	return (await response.json()) as T;
}

/** GET /geo/regions — the 15 regions (or the caller's region when scoped). */
export function fetchGeoRegions(q: GeoQuery): Promise<GeoFeatureCollection> {
	return fetchGeo<GeoFeatureCollection>(`/geo/regions${buildQuery(q)}`);
}

/** GET /geo/districts — districts of a region (all districts if regionUid is ""). */
export function fetchGeoDistricts(
	regionUid: string,
	q: GeoQuery
): Promise<GeoFeatureCollection> {
	return fetchGeo<GeoFeatureCollection>(
		`/geo/districts${buildQuery(q, { region_uid: regionUid })}`
	);
}

/** GET /geo/subcounties — subcounties of a district. */
export function fetchGeoSubcounties(
	districtUid: string,
	q: GeoQuery
): Promise<GeoFeatureCollection> {
	return fetchGeo<GeoFeatureCollection>(
		`/geo/subcounties${buildQuery(q, { district_uid: districtUid })}`
	);
}

/** The alerts behind one subcounty's choropleth count (or the district's unassigned chip). */
export interface SubcountyAlertsResult {
	district: string;
	subcounty: string;
	/** Uncapped count — `alerts` is capped at 500 server-side. */
	total: number;
	alerts: import("@/lib/auth").Alert[];
}

/**
 * GET /geo/subcounty-alerts — lists the individual alerts that make up one
 * subcounty's count on the drill-down map, using the SAME scoped query and
 * canonical-name fold as the choropleth so the list reconciles with the
 * polygon's number. Pass `unassigned: true` (with no subcounty) to list the
 * district's signals that couldn't be placed on any subcounty polygon.
 */
export function fetchGeoSubcountyAlerts(
	districtUid: string,
	target: { subcounty?: string; unassigned?: boolean },
	q: GeoQuery
): Promise<SubcountyAlertsResult> {
	const extra: Record<string, string> = { district_uid: districtUid };
	if (target.unassigned) extra.unassigned = "true";
	else extra.subcounty = target.subcounty ?? "";
	return fetchGeo<SubcountyAlertsResult>(
		`/geo/subcounty-alerts${buildQuery(q, extra)}`
	);
}

/** One cluster anchor: an area centroid carrying its alert count. */
export interface GeoPoint {
	lat: number;
	lng: number;
	count: number;
	name: string;
	level: "district" | "subcounty";
	district: string;
	region: string;
}

export interface GeoPointsResponse {
	points: GeoPoint[];
	total: number;
	areas: number;
}

/**
 * GET /geo/points — per-area cluster anchors with alert counts for the
 * marker-cluster map. One request returns every plottable area (alerts are
 * placed at their matched subcounty/district centroid).
 */
export function fetchGeoPoints(q: GeoQuery): Promise<GeoPointsResponse> {
	return fetchGeo<GeoPointsResponse>(`/geo/points${buildQuery(q)}`);
}
