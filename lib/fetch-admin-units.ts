import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

class AdminUnitsFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "AdminUnitsFetchError";
	}
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function districtLabelFromItem(item: unknown): string | null {
	if (typeof item === "string") {
		const trimmed = item.trim();
		return trimmed || null;
	}

	const row = asRecord(item);
	if (!row) return null;

	const name =
		row.name ??
		row.district ??
		row.district_name ??
		row.districtName ??
		row.label ??
		row.displayName ??
		row.display_name;

	return name ? String(name).trim() : null;
}

/**
 * De-duplicate and sort district names, kept VERBATIM as the admin-units API
 * returns them — i.e. with the " District" / " City" suffix intact ("Gulu
 * District", "Gulu City"), so the dropdown matches what's stored on alerts.
 */
function dedupeSortDistricts(list: string[]): string[] {
	const byKey = new Map<string, string>();
	for (const raw of list) {
		const name = (raw ?? "").trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (!byKey.has(key)) byKey.set(key, name);
	}
	return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

/** Parse GET /admin-units/districts response (array or wrapped list of units). */
export function parseDistrictsResponse(json: unknown): string[] {
	if (!json) return [];

	if (Array.isArray(json)) {
		return dedupeSortDistricts(
			json
				.map(districtLabelFromItem)
				.filter((name): name is string => Boolean(name))
		);
	}

	const body = asRecord(json);
	if (!body) return [];

	const nested = [
		body.data,
		body.districts,
		body.results,
		body.items,
		body.rows,
	];

	for (const candidate of nested) {
		if (!Array.isArray(candidate)) continue;
		const list = candidate
			.map(districtLabelFromItem)
			.filter((name): name is string => Boolean(name));
		if (list.length > 0) return dedupeSortDistricts(list);
	}

	return [];
}

export async function fetchDistricts(): Promise<string[]> {
	const url = `${getClientApiBaseUrl()}/admin-units/districts`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AdminUnitsFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new AdminUnitsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const json = (await response.json()) as unknown;
	return parseDistrictsResponse(json);
}

/**
 * A single administrative unit option used by the cascading region → district →
 * subcounty/division selects. `id` drives the next level's API call; `name` is
 * what gets stored on the alert.
 */
export interface AdminUnitOption {
	id: number;
	name: string;
}

/** Pull the first defined value from a list of candidate object keys. */
function pick(row: Record<string, unknown>, keys: string[]): unknown {
	for (const key of keys) {
		if (row[key] !== undefined && row[key] !== null) return row[key];
	}
	return undefined;
}

/** Normalise an admin-units list response (array or wrapped) into {id, name}. */
function parseAdminUnitOptions(json: unknown, nameKeys: string[]): AdminUnitOption[] {
	const list = Array.isArray(json)
		? json
		: (() => {
				const body = asRecord(json);
				if (!body) return [];
				for (const candidate of [
					body.data,
					body.results,
					body.items,
					body.rows,
				]) {
					if (Array.isArray(candidate)) return candidate;
				}
				return [];
			})();

	const options: AdminUnitOption[] = [];
	const seen = new Set<number>();
	for (const item of list) {
		const row = asRecord(item);
		if (!row) continue;
		const idRaw = pick(row, ["id", "ID", "value"]);
		const nameRaw = pick(row, [...nameKeys, "name", "label", "displayName"]);
		const id = Number(idRaw);
		const name = nameRaw != null ? String(nameRaw).trim() : "";
		if (!Number.isFinite(id) || !name || seen.has(id)) continue;
		seen.add(id);
		options.push({ id, name });
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchAdminUnits(
	path: string,
	nameKeys: string[]
): Promise<AdminUnitOption[]> {
	const url = `${getClientApiBaseUrl()}${path}`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AdminUnitsFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new AdminUnitsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const json = (await response.json()) as unknown;
	return parseAdminUnitOptions(json, nameKeys);
}

/** GET /admin-units/regions → [{id, name}] for the Region select. */
export function fetchRegions(): Promise<AdminUnitOption[]> {
	return fetchAdminUnits("/admin-units/regions", ["region"]);
}

/**
 * GET /admin-units/districts → [{id, name}]. Unlike fetchDistricts (which
 * returns canonicalised names only), this keeps the raw id so a selected
 * district name can be resolved to its id for the subcounty/division lookup.
 */
export function fetchDistrictUnits(): Promise<AdminUnitOption[]> {
	return fetchAdminUnits("/admin-units/districts", ["district"]);
}

/** GET /admin-units/regions/:id/districts → districts within a region. */
export function fetchDistrictsByRegion(
	regionId: number
): Promise<AdminUnitOption[]> {
	return fetchAdminUnits(
		`/admin-units/regions/${regionId}/districts`,
		["district"]
	);
}

/**
 * Region-scoped district names, canonicalised + deduped exactly like
 * fetchDistricts() so the call-logs District filter shows the same clean names
 * whether or not a region is selected.
 */
export async function fetchDistrictNamesByRegion(
	regionId: number
): Promise<string[]> {
	const units = await fetchDistrictsByRegion(regionId);
	return dedupeSortDistricts(units.map((u) => u.name));
}

/** GET /admin-units/districts/:id/subcounties → subcounties/divisions in a district. */
export function fetchSubcountiesByDistrict(
	districtId: number
): Promise<AdminUnitOption[]> {
	return fetchAdminUnits(
		`/admin-units/districts/${districtId}/subcounties`,
		["subcounty"]
	);
}
