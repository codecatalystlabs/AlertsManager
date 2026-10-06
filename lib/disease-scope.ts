import { alertResponse } from "@/constants";

/**
 * The disease scopes a summary can be filtered to, and their names.
 *
 * The canonical taxonomy (`alertResponse`, the add/edit/verify forms' list)
 * has no Ebola entry, and nothing for the EVD tables' own scope — Ebola + VHF —
 * so the dashboard could never be put on the same disease scope as those
 * tables, and the two read differently with no way to line them up (2026-10-06
 * audit). Both are offered first. The value is what the API takes: one code,
 * or several comma-separated; the backend folds each onto its canonical
 * disease and matches every stored spelling of it.
 */
export const EVD_SCOPE_CODE = "EbolaVirusDisease,ViralHemorrhagicFever";

export interface DiseaseScopeOption {
	code: string;
	name: string;
}

export const DISEASE_SCOPE_OPTIONS: DiseaseScopeOption[] = [
	{ code: EVD_SCOPE_CODE, name: "EVD — Ebola + VHF (the EVD tabs' scope)" },
	{ code: "EbolaVirusDisease", name: "Ebola virus disease" },
	...alertResponse,
];

/** The display name of a disease scope value ("all" → "All diseases"). */
export function diseaseScopeLabel(value: string | null | undefined): string {
	const v = (value ?? "").trim();
	if (!v || v.toLowerCase() === "all") return "All diseases";
	const known = DISEASE_SCOPE_OPTIONS.find((o) => o.code === v);
	if (known) return known.name;
	return v
		.split(",")
		.map((code) => DISEASE_SCOPE_OPTIONS.find((o) => o.code === code.trim())?.name ?? code.trim())
		.join(" + ");
}
