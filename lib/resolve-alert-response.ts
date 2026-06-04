import { alertResponse } from "@/constants";

/** Match free-text disease / response to an alertResponse code (add-alert uses code as value). */
export function resolveAlertResponseCode(input: string): string {
	const text = input?.trim();
	if (!text) return "";

	const lower = text.toLowerCase();
	const exact = alertResponse.find(
		(r) =>
			r.code.toLowerCase() === lower ||
			r.name.toLowerCase() === lower
	);
	if (exact) return exact.code;

	if (lower === "evd" || lower.includes("ebola")) {
		return (
			alertResponse.find((r) => r.code === "EbolaVirusDisease")?.code ??
			""
		);
	}
	if (lower.includes("vhf") || lower.includes("hemorrhagic")) {
		return (
			alertResponse.find((r) => r.code === "ViralHemorrhagicFever")
				?.code ?? ""
		);
	}
	if (lower.includes("marburg")) {
		return alertResponse.find((r) => r.code === "Marburg")?.code ?? "";
	}

	const partial = alertResponse.find(
		(r) =>
			r.name.toLowerCase().includes(lower) ||
			lower.includes(r.name.toLowerCase())
	);
	return partial?.code ?? "";
}

export function alertResponseLabel(code: string): string {
	if (!code) return "";
	return alertResponse.find((r) => r.code === code)?.name ?? code;
}
