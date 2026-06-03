import { fetchDistricts } from "@/lib/fetch-admin-units";

const FRESH_MS = 10 * 60 * 1000;

let memory: { districts: string[]; fetchedAt: number } | null = null;
let inflight: Promise<string[]> | null = null;

export function getCachedDistrictOptions(): string[] | null {
	if (!memory) return null;
	if (Date.now() - memory.fetchedAt >= FRESH_MS) return null;
	return memory.districts;
}

/** Deduped fetch for district dropdowns from /admin-units/districts. */
export async function loadDistrictOptions(): Promise<string[]> {
	const cached = getCachedDistrictOptions();
	if (cached) return cached;

	if (inflight) return inflight;

	inflight = fetchDistricts()
		.then((districts) => {
			memory = { districts, fetchedAt: Date.now() };
			return districts;
		})
		.finally(() => {
			inflight = null;
		});

	return inflight;
}
