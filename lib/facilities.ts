/**
 * National Master Facility List — the API client for /facilities.
 *
 * The fourth admin-managed reference list, alongside the two lookup kinds and
 * the EBS signal list (lib/lookup-options.ts). Its own module because a facility
 * is not a label: it carries a DHIS2 uid, a four-level administrative hierarchy,
 * and level/ownership/status axes the list is filtered by.
 *
 * Reads are unauthenticated (the public /add-alert form needs the picker and
 * carries no token); writes go through AuthService and are admin-only server
 * side.
 *
 * IMPORTANT — this list is ~8,700 rows. Every read is paged and filtered
 * SERVER-side. Nothing here should ever fetch the whole list into the browser:
 * that is what killed the old dashboard, and a picker that downloads 8,700 rows
 * per keystroke is the same mistake in a smaller box.
 */

import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatApiFetchError } from "@/lib/api-errors";

/** Controlled vocabularies — must mirror models.Facility* on the backend. */
export const FACILITY_LEVELS = [
	"HC II",
	"HC III",
	"HC IV",
	"General Hospital",
	"RRH",
	"NRH",
	"Clinic",
	"Drug Shop",
	"RBB",
	"NBB",
	"BCDP",
] as const;

export const FACILITY_OWNERSHIPS = ["GOV", "PNFP", "PFP"] as const;
export const FACILITY_STATUSES = ["Functional", "Non-Functional"] as const;
export const FACILITY_REPORTING = ["Reporting", "Non-Reporting"] as const;

/** Spelled out for the UI — "PNFP" means nothing to a first-time reader. */
export const FACILITY_OWNERSHIP_LABELS: Record<string, string> = {
	GOV: "Government",
	PNFP: "Private not for profit",
	PFP: "Private for profit",
};

export const FACILITY_LEVEL_LABELS: Record<string, string> = {
	RRH: "Regional Referral Hospital",
	NRH: "National Referral Hospital",
	RBB: "Regional Blood Bank",
	NBB: "National Blood Bank",
	BCDP: "Blood Collection & Distribution Point",
};

export interface Facility {
	id: number;
	uid: string;
	orgUnitId?: number;
	name: string;
	shortName: string;
	subCountyUid: string;
	subCounty: string;
	adminUnitUid: string;
	adminUnit: string;
	districtUid: string;
	district: string;
	regionUid: string;
	region: string;
	level: string;
	ownership: string;
	status: string;
	reporting: string;
	active: boolean;
}

/** Create/update body. Omitted fields are left unchanged by the API. */
export interface FacilityInput {
	uid?: string;
	orgUnitId?: number;
	name?: string;
	shortName?: string;
	subCountyUid?: string;
	subCounty?: string;
	adminUnitUid?: string;
	adminUnit?: string;
	districtUid?: string;
	district?: string;
	regionUid?: string;
	region?: string;
	level?: string;
	ownership?: string;
	status?: string;
	reporting?: string;
	active?: boolean;
}

export interface FacilityQuery {
	search?: string;
	district?: string;
	region?: string;
	subcounty?: string;
	level?: string;
	ownership?: string;
	status?: string;
	reporting?: string;
	/** Omit for every facility; true is what the pickers pass. */
	active?: boolean;
	limit?: number;
	offset?: number;
}

export interface FacilityPage {
	facilities: Facility[];
	/** Rows matching the filter, not the table size — so the pager stays honest. */
	total: number;
	limit: number;
	offset: number;
}

/** Distinct filter values present in the data, read from the data itself. */
export interface FacilityFacets {
	districts: string[];
	regions: string[];
	levels: string[];
	ownerships: string[];
	statuses: string[];
	reportings: string[];
}

class FacilityApiError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "FacilityApiError";
		this.status = status;
	}
}

/** Parse the backend's {error, usageCount} body into a usable message. */
async function readApiError(response: Response): Promise<FacilityApiError> {
	const bodyText = await response.text().catch(() => "");
	try {
		const parsed = JSON.parse(bodyText) as Record<string, unknown>;
		const parts = [parsed.error, parsed.hint, parsed.message]
			.filter((part): part is string => typeof part === "string" && !!part)
			.join(" ");
		if (parts) return new FacilityApiError(parts, response.status);
	} catch {
		// Not JSON — fall through to the generic formatter.
	}
	return new FacilityApiError(
		formatApiFetchError(
			response.status,
			response.statusText,
			bodyText,
			"health facilities"
		),
		response.status
	);
}

function str(v: unknown): string {
	return typeof v === "string" ? v : "";
}

function parseFacility(raw: unknown): Facility | null {
	if (!raw || typeof raw !== "object") return null;
	const row = raw as Record<string, unknown>;
	const name = str(row.name).trim();
	const uid = str(row.uid).trim();
	if (!name || !uid) return null;
	return {
		id: Number(row.id) || 0,
		uid,
		orgUnitId:
			typeof row.orgUnitId === "number" ? row.orgUnitId : undefined,
		name,
		shortName: str(row.shortName),
		subCountyUid: str(row.subCountyUid),
		subCounty: str(row.subCounty),
		adminUnitUid: str(row.adminUnitUid),
		adminUnit: str(row.adminUnit),
		districtUid: str(row.districtUid),
		district: str(row.district),
		regionUid: str(row.regionUid),
		region: str(row.region),
		level: str(row.level),
		ownership: str(row.ownership),
		status: str(row.status),
		reporting: str(row.reporting),
		// Only an explicit false retires a facility, so a field the API stops
		// sending cannot silently empty every picker.
		active: row.active !== false,
	};
}

function buildQuery(query: FacilityQuery): string {
	const params = new URLSearchParams();
	const set = (key: string, value: string | undefined) => {
		const v = value?.trim();
		// "all" is the UI's "no filter"; never send it as a literal value.
		if (v && v.toLowerCase() !== "all") params.set(key, v);
	};
	set("search", query.search);
	set("district", query.district);
	set("region", query.region);
	set("subcounty", query.subcounty);
	set("level", query.level);
	set("ownership", query.ownership);
	set("status", query.status);
	set("reporting", query.reporting);
	if (query.active !== undefined) params.set("active", String(query.active));
	if (query.limit !== undefined) params.set("limit", String(query.limit));
	if (query.offset) params.set("offset", String(query.offset));
	const qs = params.toString();
	return qs ? `?${qs}` : "";
}

/** GET /facilities — one page, filtered and counted server-side. */
export async function fetchFacilities(
	query: FacilityQuery = {}
): Promise<FacilityPage> {
	const url = `${getClientApiBaseUrl()}/facilities${buildQuery(query)}`;

	let response: Response;
	try {
		response = await fetch(url, { credentials: "omit" });
	} catch (error) {
		if (error instanceof TypeError) {
			throw new FacilityApiError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}
	if (!response.ok) throw await readApiError(response);

	const json = (await response.json()) as Record<string, unknown>;
	const rows = Array.isArray(json.facilities) ? json.facilities : [];
	return {
		facilities: rows
			.map(parseFacility)
			.filter((f): f is Facility => f !== null),
		total: Number(json.total) || 0,
		limit: Number(json.limit) || 50,
		offset: Number(json.offset) || 0,
	};
}

/**
 * GET /facilities/facets — the filter values still REACHABLE under `query`.
 *
 * Pass the current filter scope: each facet comes back computed with every
 * filter applied EXCEPT its own, which is what makes the bar cascade (pick a
 * region and the district list narrows to that region's districts) without
 * making any single dropdown a dead end.
 */
export async function fetchFacilityFacets(
	query: FacilityQuery = {}
): Promise<FacilityFacets> {
	// Paging is meaningless for a facet and would scope it to the current page.
	const { limit: _limit, offset: _offset, ...scope } = query;
	const url = `${getClientApiBaseUrl()}/facilities/facets${buildQuery(scope)}`;
	const response = await fetch(url, { credentials: "omit" });
	if (!response.ok) throw await readApiError(response);
	const json = (await response.json()) as Record<string, unknown>;
	const list = (v: unknown): string[] =>
		Array.isArray(v) ? v.map(String).filter(Boolean) : [];
	return {
		districts: list(json.districts),
		regions: list(json.regions),
		levels: list(json.levels),
		ownerships: list(json.ownerships),
		statuses: list(json.statuses),
		reportings: list(json.reportings),
	};
}

async function writeFacility(
	method: "POST" | "PUT",
	url: string,
	body: FacilityInput
): Promise<Facility> {
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method,
		body: JSON.stringify(body),
	});
	if (!response.ok) throw await readApiError(response);
	const facility = parseFacility(await response.json());
	if (!facility) {
		throw new FacilityApiError("The API returned an unreadable facility.");
	}
	return facility;
}

export function createFacility(input: FacilityInput): Promise<Facility> {
	return writeFacility("POST", `${getClientApiBaseUrl()}/facilities`, input);
}

export function updateFacility(
	id: number,
	input: FacilityInput
): Promise<Facility> {
	return writeFacility(
		"PUT",
		`${getClientApiBaseUrl()}/facilities/${id}`,
		input
	);
}

/**
 * DELETE /facilities/:id. The API refuses (409) when alerts name the facility
 * unless `force` is set — alerts store the facility NAME as free text, so a
 * delete strands those rows against a name nothing explains any more. Retiring
 * (active:false) is the non-destructive path the admin screen offers first.
 */
export async function deleteFacility(id: number, force = false): Promise<void> {
	const url = `${getClientApiBaseUrl()}/facilities/${id}${
		force ? "?force=true" : ""
	}`;
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method: "DELETE",
	});
	if (!response.ok) throw await readApiError(response);
}
