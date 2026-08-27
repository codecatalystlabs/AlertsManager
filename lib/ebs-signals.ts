/**
 * The EBS signal lists — Annex I (health facility) and Annex II (community) of
 * the EBS Guidelines for Uganda.
 *
 * These are the pre-defined descriptions of an unusual occurrence that a
 * detector is trained to recognise and report. Naming which one a signal
 * matches is what turns "unexplained bleeding reported in Bugiri" into a
 * countable CH1 — the disaggregation KPI 1 asks for, and the vocabulary the
 * facility and district signal registers are kept in.
 *
 * The list is a GUIDE, NOT A CLOSED SET. The guidelines are explicit that
 * communities are encouraged to report anything they consider unusual whether
 * or not it appears here, so a signal matching nothing on the list is a valid
 * signal and the field stays optional everywhere.
 *
 * The list is reviewed annually by IES&PHE, which is why the codes carry their
 * annex rather than being treated as permanent constants.
 *
 * The list is ADMIN-MANAGED: it lives in `ebs_signal_definition` behind the
 * /ebs-signals CRUD API (Administration → Dropdown Options → EBS Signals),
 * precisely because IES&PHE revises it annually and a yearly revision should
 * not need a redeploy. The array below is the FALLBACK rendered before the API
 * responds, and the set the backend seeds a fresh database with.
 *
 * Twins that must stay in step:
 *   - alertsMIS/backend/internal/services/ebs_signals.go (seed + validation)
 *   - alertsMIS/backend/migrations/ebs/01_reference.sql (ebs_signal_definition)
 *
 * This file imports only lib/lookup-registry.ts, which itself imports nothing —
 * the helpers below are synchronous and called from render paths and plain-node
 * test scripts, neither of which can pull in fetch/auth machinery.
 */

import { SnapshotStore } from "@/lib/lookup-registry";

export type SignalSetting = "facility" | "community";
export type SignalDomain = "human" | "animal" | "environment";

export interface EbsSignal {
	/** FH1..FE2 (Annex I), CH1..CE7 (Annex II). Stored on alerts.signal_code. */
	code: string;
	label: string;
	domain: SignalDomain;
	setting: SignalSetting;
	annex: "I" | "II";
}

/** One row as the /ebs-signals API returns it. */
export interface EbsSignalRow extends EbsSignal {
	id: number;
	/** Retired signals are hidden from the picker but still resolve on old rows. */
	active: boolean;
	sortOrder: number;
	/** How many alerts currently record this code. */
	usageCount: number;
}

/** Annex I — health facility signals. */
const FACILITY_SIGNALS: EbsSignal[] = [
	{
		code: "FH1",
		label:
			"Occurrence of one or more cases or deaths of a strange, unusual or unexplained disease, based on the clinician's professional judgement",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH2",
		label:
			"One or more health care worker(s) with severe illness after attending to patients with similar symptoms",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH3",
		label:
			"Unexpectedly large increase of cases of similar symptoms based on the clinician's professional judgement",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH4",
		label:
			"Two or more cases of infectious diseases with the same symptoms and from the same location",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH5",
		label:
			"Occurrence of unexplained or unusual clinical manifestation of a known infectious disease or treatment response",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH6",
		label:
			"Unusual laboratory findings (e.g. increase in positivity rate, new strain, resistance profiles)",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH7",
		label:
			"Unexpected increase in people presenting with animal bites from the same community",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FH8",
		label:
			"Two or more people with a history of recent travel, presenting with similar symptoms",
		domain: "human",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FA1",
		label: "A cluster of animal deaths",
		domain: "animal",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FA2",
		label: "A cluster of animals presenting with unusual signs or behaviours",
		domain: "animal",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FA3",
		label:
			"A cluster of animals exhibiting production losses (e.g. milk, eggs, abortions)",
		domain: "animal",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FE1",
		label:
			"Unusual change in physical water quality parameters of drinking water sources",
		domain: "environment",
		setting: "facility",
		annex: "I",
	},
	{
		code: "FE2",
		label:
			"Sudden increase in average atmospheric temperature noticed for two consecutive days",
		domain: "environment",
		setting: "facility",
		annex: "I",
	},
];

/** Annex II — community signals. */
const COMMUNITY_SIGNALS: EbsSignal[] = [
	{
		code: "CH1",
		label:
			"Unexplained bleeding from any part of the body in a person of any age",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH2",
		label:
			"A child below the age of 15 years with sudden onset of weakness in any one of the limbs",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH3",
		label: "Anyone with fever and rash",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH4",
		label: "Any occurrence of unusual signs, symptoms or deaths",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH5",
		label:
			"Two or more persons with similar signs and symptoms in the same location",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH6",
		label: "Sudden death in an apparently healthy individual",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH7",
		label: "Anyone with three or more watery stools in 24 hours",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH8",
		label:
			"Respiratory symptoms with fever in any person who has recently travelled abroad in the last 14 days",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH9",
		label: "Anyone who gets severe symptoms following vaccination",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH10",
		label:
			"Unusual numbers of children absent from the same school or class due to same illness",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CH11",
		label:
			"Unusually high number of people from the same location buying drugs for the same illness from a drug shop",
		domain: "human",
		setting: "community",
		annex: "II",
	},
	{
		code: "CA1",
		label: "Sudden death of an animal",
		domain: "animal",
		setting: "community",
		annex: "II",
	},
	{
		code: "CA2",
		label: "Any animal presenting with unusual signs or behaviour",
		domain: "animal",
		setting: "community",
		annex: "II",
	},
	{
		code: "CA3",
		label: "Any animal with a loss in production (e.g. milk, eggs, abortions)",
		domain: "animal",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE1",
		label: "Massive growth of algal bloom or water weeds in water bodies",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE2",
		label:
			"Improper waste disposal, leakage or spillage on land, in air or water bodies",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE3",
		label:
			"Unusual change in physical water quality parameters of drinking water sources",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE4",
		label:
			"Occurrence of an environmental hazard e.g. flood, landslide, earthquake, release of gasses, cracks on the ground",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE5",
		label: "Unexplained death of aquatic animals (e.g. fish, hippos)",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE6",
		label: "Reported outbreak of water related diseases in a health facility",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
	{
		code: "CE7",
		label:
			"Sudden increase in average atmospheric temperature noticed for two days",
		domain: "environment",
		setting: "community",
		annex: "II",
	},
];

/**
 * Fallback list — the 34 published signals, community first (most signals
 * reaching the desk are CH*). Mirrors services.DefaultEbsSignals on the backend.
 * The live list comes from the API; this is what renders until it arrives.
 */
export const DEFAULT_EBS_SIGNALS: EbsSignal[] = [
	...COMMUNITY_SIGNALS,
	...FACILITY_SIGNALS,
];

export const SIGNAL_SETTING_LABEL: Record<SignalSetting, string> = {
	community: "Community (Annex II)",
	facility: "Health facility (Annex I)",
};

export const SIGNAL_DOMAIN_LABEL: Record<SignalDomain, string> = {
	human: "Human health",
	animal: "Animal health",
	environment: "Environment",
};

/**
 * The resolved list. `selectable` is what the picker offers (active only);
 * `byCode` deliberately includes RETIRED signals, so an alert classified under
 * a signal that has since left the Annex still resolves to its definition
 * instead of displaying a bare code.
 */
interface SignalRegistry {
	all: EbsSignalRow[];
	selectable: EbsSignal[];
	byCode: Map<string, EbsSignal>;
}

function buildSignalRegistry(rows: EbsSignalRow[]): SignalRegistry {
	const sorted = [...rows].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)
	);
	return {
		all: sorted,
		selectable: sorted.filter((s) => s.active),
		byCode: new Map(sorted.map((s) => [s.code.toUpperCase(), s])),
	};
}

/** Same codes in the same order, with the same definitions and availability. */
function sameSignals(a: SignalRegistry, b: SignalRegistry): boolean {
	if (a.all.length !== b.all.length) return false;
	return a.all.every((signal, i) => {
		const other = b.all[i];
		return (
			signal.code === other.code &&
			signal.label === other.label &&
			signal.domain === other.domain &&
			signal.setting === other.setting &&
			signal.active === other.active
		);
	});
}

export const ebsSignalStore = new SnapshotStore<SignalRegistry>(
	buildSignalRegistry(
		DEFAULT_EBS_SIGNALS.map((signal, index) => ({
			...signal,
			id: -(index + 1),
			active: true,
			sortOrder: (index + 1) * 10,
			usageCount: 0,
		}))
	),
	sameSignals
);

/** Replace the live list — called once by the hydrator, then after admin edits. */
export function setEbsSignals(rows: EbsSignalRow[]): void {
	if (rows.length === 0) return; // never blank out the picker on an empty read
	ebsSignalStore.set(buildSignalRegistry(rows));
}

/**
 * The signals a picker may offer, in admin-defined order. A function, not a
 * constant: a module-scope array would freeze the fallback list. Components
 * should prefer `useEbsSignals()` so they re-render when the list loads.
 */
export function ebsSignals(): EbsSignal[] {
	return ebsSignalStore.get().selectable;
}

/** Every signal including retired ones — for the admin screen. */
export function allEbsSignals(): EbsSignalRow[] {
	return ebsSignalStore.get().all;
}

/**
 * Fold free-text onto a canonical signal code; null when absent or not on the
 * list. Unrecognised text is rejected rather than stored: a code nobody can
 * resolve to a definition is worse than no code, because it still counts.
 */
export function normalizeSignalCode(value?: string | null): string | null {
	const code = (value ?? "").trim().toUpperCase();
	return ebsSignalStore.get().byCode.has(code) ? code : null;
}

/** The definition behind a code, or null when it is absent/unrecognised. */
export function findSignal(value?: string | null): EbsSignal | null {
	const code = normalizeSignalCode(value);
	return code ? (ebsSignalStore.get().byCode.get(code) ?? null) : null;
}

/** "CH1 — Unexplained bleeding…", or null when there is nothing to describe. */
export function signalSummary(value?: string | null): string | null {
	const signal = findSignal(value);
	return signal ? `${signal.code} — ${signal.label}` : null;
}

/** Case-insensitive match on code or label, for the picker's search box. */
export function signalMatches(signal: EbsSignal, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		signal.code.toLowerCase().includes(q) ||
		signal.label.toLowerCase().includes(q) ||
		SIGNAL_DOMAIN_LABEL[signal.domain].toLowerCase().includes(q)
	);
}
