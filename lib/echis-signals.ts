import {
	CircleHelp,
	Droplets,
	GlassWater,
	HeartCrack,
	PawPrint,
	ScanFace,
	Siren,
	type LucideIcon,
} from "lucide-react";
import { NDW_BLANK_FACET } from "@/lib/fetch-ndw-alerts";

/**
 * The community (VHT) signal types an eCHIS report carries in
 * `signal_reported`. These are the eCHIS form's own codes, not the 34-signal
 * EBS list the register triages against.
 *
 * Order is the order the tiles show them: the signals that can mean a VHF or
 * a cluster of deaths first, then the rest. A code the feed starts sending that
 * is not listed here still shows, with a humanised label (echisSignalMeta).
 */
export interface EchisSignalMeta {
	label: string;
	/** Tile/pill icon. */
	icon: LucideIcon;
	/** Icon ink on the white tile. */
	ink: string;
	/** Pill classes in the table. */
	pill: string;
}

export const ECHIS_SIGNALS: Record<string, EchisSignalMeta> = {
	fever_and_bleeding: {
		label: "Fever & bleeding",
		icon: Droplets,
		ink: "text-rose-600",
		pill: "border-rose-200 bg-rose-50 text-rose-700",
	},
	sudden_or_unexplained_death: {
		label: "Sudden death",
		icon: HeartCrack,
		ink: "text-slate-700",
		pill: "border-slate-300 bg-slate-100 text-slate-800",
	},
	unexplained_rash: {
		label: "Unexplained rash",
		icon: ScanFace,
		ink: "text-amber-600",
		pill: "border-amber-200 bg-amber-50 text-amber-800",
	},
	bitten_by_dog_or_animal: {
		label: "Animal bite",
		icon: PawPrint,
		ink: "text-orange-600",
		pill: "border-orange-200 bg-orange-50 text-orange-800",
	},
	abnormal_change_in_drinking_water: {
		label: "Water change",
		icon: GlassWater,
		ink: "text-sky-600",
		pill: "border-sky-200 bg-sky-50 text-sky-800",
	},
	public_health_threat: {
		label: "Public health threat",
		icon: Siren,
		ink: "text-violet-600",
		pill: "border-violet-200 bg-violet-50 text-violet-800",
	},
};

export const ECHIS_SIGNAL_ORDER = Object.keys(ECHIS_SIGNALS);

const UNSPECIFIED: EchisSignalMeta = {
	label: "Not specified",
	icon: CircleHelp,
	ink: "text-muted-foreground",
	pill: "border-border bg-muted text-muted-foreground",
};

function humanise(code: string): string {
	const s = code.replace(/_/g, " ").trim();
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Label/colour for a signal code; "" (and NDW_BLANK_FACET) is "Not specified". */
export function echisSignalMeta(code?: string | null): EchisSignalMeta {
	const c = (code ?? "").trim();
	if (!c || c === NDW_BLANK_FACET) return UNSPECIFIED;
	return (
		ECHIS_SIGNALS[c] ?? {
			...UNSPECIFIED,
			label: humanise(c),
			ink: "text-foreground",
			pill: "border-border bg-background text-foreground",
		}
	);
}
