/**
 * Synthetic, deterministic signal-like rows for exercising the data table at
 * volume. Nothing here is real: names are generated, and the geography is the
 * public list of regions with a handful of districts each.
 */

export interface LabSignal {
	id: string;
	reportedAt: string;
	region: string;
	district: string;
	signal: string;
	source: string;
	priority: "High" | "Medium" | "Low";
	status: "Untriaged" | "Triaged" | "Verified" | "Risk assessed" | "Discarded";
	cases: number;
	deaths: number;
	verified: boolean;
	responseHours: number;
	reporter: string;
	phone: string;
	notes: string;
}

const GEOGRAPHY: Record<string, string[]> = {
	Central: ["Kampala", "Wakiso", "Mukono", "Masaka", "Mpigi", "Luweero"],
	Eastern: ["Mbale", "Jinja", "Tororo", "Soroti", "Iganga", "Busia"],
	Northern: ["Gulu", "Lira", "Arua", "Kitgum", "Moroto", "Adjumani"],
	Western: ["Mbarara", "Kabale", "Fort Portal", "Hoima", "Kasese", "Bushenyi"],
};
const SIGNALS = [
	"Cluster of deaths",
	"Acute watery diarrhoea",
	"Fever with bleeding",
	"Acute flaccid paralysis",
	"Animal bites",
	"Unusual animal deaths",
	"Severe pneumonia cluster",
	"Measles-like rash",
	"Jaundice cluster",
	"Food poisoning",
];
const SOURCES = ["eCHIS", "POE", "6767", "Walk-in", "Community", "Media"];
const STATUSES: LabSignal["status"][] = ["Untriaged", "Triaged", "Verified", "Risk assessed", "Discarded"];
const FIRST = ["Aisha", "Brian", "Grace", "Joseph", "Mary", "Peter", "Ruth", "Samuel", "Esther", "Moses", "Irene", "David"];
const LAST = ["Okello", "Namukasa", "Mugisha", "Achieng", "Ssemakula", "Atim", "Tumusiime", "Nakato", "Opio", "Kato"];
const NOTES = [
	"Reported by a VHT during routine visits.",
	"Caller could not confirm the number of people affected; follow-up needed with the health facility in charge.",
	"Seen at the border crossing.",
	"Several households in the same village report similar symptoms over the past week, including two children under five.",
	"Duplicate of an earlier call, kept for completeness.",
	"",
];

/** Small, fast, seedable PRNG (mulberry32) — the same seed gives the same rows. */
function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function generateSignals(count: number, seed = 20261001): LabSignal[] {
	const rand = mulberry32(seed);
	const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
	const regions = Object.keys(GEOGRAPHY);
	const now = Date.UTC(2026, 9, 1);
	const rows: LabSignal[] = new Array(count);
	for (let i = 0; i < count; i++) {
		const region = pick(regions);
		const status = STATUSES[Math.min(4, Math.floor(rand() ** 1.6 * 5))];
		const cases = Math.floor(rand() ** 3 * 60) + 1;
		const priorityRoll = rand();
		rows[i] = {
			id: `SIG-${String(i + 1).padStart(6, "0")}`,
			reportedAt: new Date(now - Math.floor(rand() * 180 * 86_400_000)).toISOString(),
			region,
			district: pick(GEOGRAPHY[region]),
			signal: pick(SIGNALS),
			source: pick(SOURCES),
			priority: priorityRoll > 0.85 ? "High" : priorityRoll > 0.45 ? "Medium" : "Low",
			status,
			cases,
			deaths: rand() > 0.85 ? Math.floor(rand() * Math.min(cases, 6)) : 0,
			verified: status === "Verified" || status === "Risk assessed",
			responseHours: Math.round(rand() ** 2 * 96 * 10) / 10,
			reporter: `${pick(FIRST)} ${pick(LAST)}`,
			phone: `+2567${Math.floor(10_000_000 + rand() * 89_999_999)}`,
			notes: pick(NOTES),
		};
	}
	return rows;
}

export const LAB_REGIONS = Object.keys(GEOGRAPHY);
export const LAB_STATUSES = STATUSES;
export const LAB_SOURCES = SOURCES;
