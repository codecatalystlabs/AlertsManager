import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";

/**
 * What a traveller declared at the port, read from the NDW record: the
 * symptoms list, the four exposure questions, and the (rarely filled) risk
 * level. This is what a port-health officer screens on, so the table, the
 * details dialog and the tiles all read it from here.
 */
export interface PoeScreening {
	symptoms: string[];
	/** Short labels of the exposure questions answered yes. */
	exposures: string[];
	exposureCount: number;
	/** Lower-cased NDW risk level, "" when the feed has not assessed one. */
	risk: string;
	/** Countries visited in the last 21 days, when the traveller listed any. */
	countriesVisited: string[];
}

const SYMPTOM_LABELS: Record<string, string> = {
	breathing: "Difficulty breathing",
	sore_throat: "Sore throat",
};

export const EXPOSURE_QUESTIONS: { key: string; label: string; long: string }[] = [
	{ key: "exposure_funeral", label: "Funeral", long: "Attended a funeral" },
	{ key: "exposure_bushmeat", label: "Bushmeat", long: "Handled or ate bushmeat" },
	{ key: "exposure_sick_contact", label: "Sick contact", long: "Contact with a sick person" },
	{ key: "exposure_healthcare", label: "Healthcare", long: "Was in a health facility" },
];

function humanise(code: string): string {
	const c = code.trim();
	if (SYMPTOM_LABELS[c]) return SYMPTOM_LABELS[c];
	const s = c.replace(/_/g, " ");
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** symptoms_text is a JSON array ("[\"fever\"]"); tolerate a plain list too. */
export function parseSymptoms(text?: string | null): string[] {
	const t = (text ?? "").trim();
	if (!t || t === "[]") return [];
	try {
		const v: unknown = JSON.parse(t);
		if (Array.isArray(v)) return v.map((s) => humanise(String(s))).filter(Boolean);
	} catch {
		// fall through to the plain-text split
	}
	return t
		.split(/[,;]/)
		.map((s) => humanise(s))
		.filter(Boolean);
}

function payloadOf(row: PoeAlertRow): Record<string, unknown> {
	if (!row.rawPayload) return {};
	try {
		const v: unknown = JSON.parse(row.rawPayload);
		return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function listOf(v: unknown): string[] {
	if (Array.isArray(v)) return v.map(String).filter(Boolean);
	if (typeof v === "string" && v.trim()) return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
	return [];
}

export function poeScreening(row: PoeAlertRow): PoeScreening {
	const p = payloadOf(row);
	const exposures = EXPOSURE_QUESTIONS.filter((q) => p[q.key] === true).map((q) => q.label);
	return {
		symptoms: parseSymptoms(row.symptomsText),
		exposures,
		exposureCount: Math.max(row.exposureCount ?? 0, exposures.length),
		risk: (row.riskLevel ?? "").trim().toLowerCase(),
		countriesVisited: listOf(p.countries_visited_21d),
	};
}

/** Risk pill classes for the NDW levels; unknown levels read as neutral. */
export function poeRiskPill(risk: string): string {
	switch (risk) {
		case "high":
			return "border-red-200 bg-red-50 text-red-700";
		case "medium":
			return "border-amber-200 bg-amber-50 text-amber-800";
		case "low":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		default:
			return "border-border bg-muted text-muted-foreground";
	}
}

/**
 * "Entebbe International Airport (EBB)" → "Entebbe (EBB)": every port is an
 * airport and the code is what officers use, so the table keeps one line.
 * Callers put the full name in a tooltip.
 */
export function shortPortName(port?: string | null): string {
	return (port ?? "").replace(/\s+(International\s+)?Airport\b/i, "").trim();
}
