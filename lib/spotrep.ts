/**
 * SPOTREP — the District Spot Report, EBS step 5 ("Alert").
 *
 * Step 5 is the formal OUTPUT of the pipeline: once an event has been verified
 * and scored, the guidelines require a written alert stating "the nature of the
 * event, location, number affected, assigned risk level, and recommended next
 * steps", and name the SpotRep as the vehicle for High and Very High events
 * (see uganda-ebs-operational-reference.md §3 step 5). Every one of those five
 * elements is derived below rather than typed, because every one of them is
 * already recorded against the signal — a DSFP retyping them at 22:00 is how
 * they end up disagreeing with the register.
 *
 * WHAT IS DERIVED AND WHAT IS ASKED FOR
 * Eight of the nine rows in the district's template can be drafted from the alert.
 * One cannot: CHALLENGES is the district telling the region what it could not
 * do — no standby fuel, no coordination airtime, no funds to intensify
 * surveillance. Nothing in the alert record knows that, and inventing it would
 * be the one part of the report that is fiction. So it is asked for, and the
 * dialog will not export without it.
 *
 * Everything drafted here is a DRAFT: the composer hands every section to the
 * submitter as editable text. The point is a report that starts written, not a
 * report nobody may touch — a spot report is signed by a person, and they are
 * accountable for its wording.
 *
 * The layout mirrors the district's own Word template (Spotrep_Template_Events)
 * row for row, so a report generated here drops into the same folder as one
 * typed by hand and reads identically.
 *
 * Pure and dependency-light on purpose — no React, no browser APIs — so the
 * renderers (spotrep-docx.ts, spotrep-pdf.ts), the preview and the plain-node
 * test all consume one model. Tests: lib/spotrep.test.ts.
 */

import { altCode } from "@/lib/alt-code";
import { alertSignalTimestamp } from "@/lib/alert-sla";
import {
	RISK_ACTION,
	RISK_HIGH,
	RISK_VERY_HIGH,
	normalizeRiskLevel,
	parseRiskActions,
} from "@/lib/alert-risk";
import { signalSummary } from "@/lib/ebs-signals";
import { rrtMembersDisplay, rrtPersonDisplay } from "@/lib/rrt-team";

/* -------------------------------------------------------------------------
 * The alert fields a spot report reads.
 *
 * Every field is optional so both shapes the app carries an alert in — the
 * register's `AlertLog` and the API's `Alert` — satisfy it structurally, and so
 * a sparse row drafts a shorter report rather than throwing.
 * ---------------------------------------------------------------------- */

export interface SpotRepAlert {
	id?: number | null;
	/** Signal day; its time-of-day is a junk import artifact — see alert-sla.ts. */
	date?: string | null;
	/** Signal time-of-day (the real clock time). */
	time?: string | null;
	status?: string | null;
	/** Disease/response CODE. The display name is passed in — see SpotRepOptions. */
	response?: string | null;
	signalCode?: string | null;
	numberAffected?: number | null;
	callTaker?: string | null;
	personReporting?: string | null;
	contactNumber?: string | null;
	sourceOfAlert?: string | null;
	channelOfReporting?: string | null;
	alertCaseName?: string | null;
	alertCaseAge?: number | null;
	alertCaseSex?: string | null;
	alertCaseNationality?: string | null;
	alertCaseVillage?: string | null;
	alertCaseParish?: string | null;
	alertCaseSubCounty?: string | null;
	alertCaseDistrict?: string | null;
	village?: string | null;
	subCounty?: string | null;
	facility?: string | null;
	facilityType?: string | null;
	symptoms?: string | null;
	history?: string | null;
	healthFacilityVisit?: string | null;
	traditionalHealerVisit?: string | null;
	narrative?: string | null;
	actions?: string | null;
	responseActions?: string | null;
	labSamplesCollected?: string | null;
	labResult?: string | null;
	labResultDate?: string | null;
	isVerified?: boolean | null;
	verifiedBy?: string | null;
	verificationDate?: string | null;
	verificationTime?: string | null;
	verificationOutcome?: string | null;
	verificationNote?: string | null;
	riskLevel?: string | null;
	riskAssessedAt?: string | null;
	riskAssessedBy?: string | null;
	riskTeamLead?: string | null;
	riskTeamMembers?: string | null;
	riskActionTaken?: string | null;
	riskEvacuationFacility?: string | null;
	riskHazardNote?: string | null;
	riskExposureNote?: string | null;
	riskContextNote?: string | null;
	riskLikelihood?: string | null;
	riskImpact?: string | null;
	feedbackGivenAt?: string | null;
	feedbackChannel?: string | null;
}

/** What the caller supplies that the alert record cannot. */
export interface SpotRepOptions {
	/**
	 * The disease/event in words. The alert stores a CODE ("ViralHemorrhagicFever")
	 * and resolving it needs `@/constants`, which pulls in icon components — so
	 * the caller resolves it (alertResponseLabel) and passes the label in, the
	 * same split lib/alert-pdf.ts uses.
	 */
	eventName?: string | null;
	/** Signed-in account, for the submitter block. */
	submitterName?: string | null;
	submitterPosition?: string | null;
	submitterContact?: string | null;
	/** Report timestamp. Injectable so the test is not clock-dependent. */
	now?: Date;
}

/* -------------------------------------------------------------------------
 * Small text helpers. Every one of them treats "absent" as "say nothing"
 * rather than as "—": a spot report is prose, and a paragraph seeded with
 * em-dashes reads as a form somebody failed to fill in.
 * ---------------------------------------------------------------------- */

/**
 * `false` counts as "nothing to say", not as the word "false" — the drafters
 * below are written as `condition && "sentence"` chains, so a falsy condition
 * arrives here as a boolean and must render as an absent piece.
 */
type Piece = string | number | false | null | undefined;

const clean = (value: Piece): string =>
	value == null || value === false ? "" : String(value).trim().replace(/\s+/g, " ");

/**
 * The same tidy-up for a MULTI-LINE value: each line trimmed, runs of blank
 * lines collapsed to one — but the line breaks kept. `clean` flattens
 * whitespace, which would fold a six-action list into a single sentence and a
 * four-paragraph narrative into a wall.
 */
const cleanBlock = (value: Piece): string =>
	value == null || value === false
		? ""
		: String(value)
				.split(/\r?\n/)
				.map((line) => line.trim().replace(/[ \t]+/g, " "))
				.join("\n")
				.replace(/\n{3,}/g, "\n\n")
				.trim();

/** Non-empty pieces, joined. */
const join = (parts: Piece[], sep = ", "): string =>
	parts.map(clean).filter(Boolean).join(sep);

/** Sentences, each ended with a full stop exactly once. */
const paragraph = (sentences: Piece[]): string =>
	sentences
		.map(clean)
		.filter(Boolean)
		.map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
		.join(" ");

const MONTHS = [
	"JAN", "FEB", "MAR", "APR", "MAY", "JUN",
	"JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * "14 NOV 2025, 16:30 HRS" — the stamp districts already write at the head of a
 * spot report. Deliberately not `toLocaleString()`: this line is read by a
 * regional and a national desk in the same week, and a locale-shaped date is
 * the one field where 06/07 could mean two different days.
 */
export function formatSpotRepStamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` +
		`, ${pad(date.getHours())}:${pad(date.getMinutes())} HRS`
	);
}

/** Date only — for "reported on …" inside prose. */
function formatDay(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return clean(value);
	return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatClock(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} HRS`;
}

/**
 * A stored comma/semicolon list as a readable phrase. Used for symptoms and for
 * the response-action columns, all of which are comma-joined single columns.
 */
function listPhrase(value?: string | null): string {
	return splitList(value).join(", ");
}

function splitList(value?: string | null): string[] {
	return (value ?? "")
		.split(/[,;]/)
		.map((part) => clean(part))
		.filter(Boolean);
}

/**
 * Free text into bullet lines.
 *
 * Districts type action lists in whatever shape the keyboard allowed — the
 * reference report in Documents/ runs them together as "#1 Called the HSDSFP…
 * #Shared with the DHO…" — so "#", "-", "•", "*" and "1." all count as a break,
 * as does a newline. One long run-on line is left whole rather than guessed at.
 */
export function toBulletLines(value?: string | null): string[] {
	return (value ?? "")
		.split(/\r?\n|(?=#)|(?:^|\s)[•*]\s|(?:^|\n)\s*-\s/)
		.map((line) => clean(line).replace(/^(?:[#•*-]+\s*|\d+[.)]\s*)/, ""))
		.map((line) => clean(line))
		.filter(Boolean);
}

/* -------------------------------------------------------------------------
 * Derivations
 * ---------------------------------------------------------------------- */

/** The event in words, best available: caller's label → signal list → generic. */
export function spotRepEventName(
	alert: SpotRepAlert,
	options: SpotRepOptions = {}
): string {
	const supplied = clean(options.eventName);
	if (supplied) return supplied;
	const signal = signalSummary(alert.signalCode);
	// "CH1 — Unexplained bleeding" → the description, which is what reads as an
	// event name; the code itself is carried separately in the narrative.
	if (signal) return signal.split("—").slice(1).join("—").trim() || signal;
	const code = clean(alert.response);
	if (code) return code;
	return "Public Health Event";
}

/** The district the event sits in — the report is filed by and about a district. */
export function spotRepDistrict(alert: SpotRepAlert): string {
	return clean(alert.alertCaseDistrict);
}

/** "Nyangereke village, Hima parish, Bugoye Subcounty, Kasese District". */
export function spotRepLocation(alert: SpotRepAlert): string {
	const village = clean(alert.alertCaseVillage) || clean(alert.village);
	const parish = clean(alert.alertCaseParish);
	const subcounty = clean(alert.alertCaseSubCounty) || clean(alert.subCounty);
	const district = spotRepDistrict(alert);
	return join([
		village && `${village} village`,
		parish && `${parish} parish`,
		subcounty && `${subcounty} Subcounty`,
		district && `${district} District`,
	]);
}

/**
 * How many people the event affects — EBS step 5 requires the alert to state it.
 *
 * `numberAffected` is the reporter's own estimate and is routinely null (they
 * did not know). Falling back to 1 is not a guess about the outbreak: the record
 * describes one named case, so one is what this report can honestly claim, and
 * the composer leaves the sentence editable for a district that knows better.
 */
export function spotRepCaseCount(alert: SpotRepAlert): number {
	const n = alert.numberAffected;
	return typeof n === "number" && n > 0 ? n : 1;
}

/** "1 suspected case" / "4 suspected cases". */
function caseCountPhrase(alert: SpotRepAlert): string {
	const n = spotRepCaseCount(alert);
	return `${n} suspected case${n === 1 ? "" : "s"}`;
}

/** True where the guidelines REQUIRE a spot report: High and Very High events. */
export function spotRepIsMandated(riskLevel?: string | null): boolean {
	const level = normalizeRiskLevel(riskLevel);
	return level === RISK_HIGH || level === RISK_VERY_HIGH;
}

/** The RRT as a phrase: "led by Dr Jane Doe (0771…), with Okwir Sam (0772…)". */
function teamPhrase(alert: SpotRepAlert): string {
	const lead = rrtPersonDisplay(alert.riskTeamLead);
	const members = rrtMembersDisplay(alert.riskTeamMembers);
	return join([lead && `led by ${lead}`, members && `with ${members}`], ", ");
}

/* -------------------------------------------------------------------------
 * The draft
 * ---------------------------------------------------------------------- */

/** Every editable field of the report, in the district template's own order. */
export interface SpotRepDraft {
	/** "SPOTREP ON VIRAL HAEMORRHAGIC FEVER IN KASESE DISTRICT". */
	title: string;
	dateTime: string;
	incidentTitle: string;
	informationSource: string;
	narrative: string;
	actionsTaken: string;
	/** The one section nothing in the record can supply. Always starts blank. */
	challenges: string;
	recommendations: string;
	acknowledgement: string;
	submitterName: string;
	submitterPosition: string;
	submitterContact: string;
}

export type SpotRepFieldKey = Exclude<keyof SpotRepDraft, "title">;

/**
 * The form, declared once and consumed by the composer, the preview and the
 * documents — so a row cannot appear in the dialog and go missing from the Word
 * file. `derived` marks the rows drafted from the alert (and therefore worth a
 * "reset to the record" affordance); `required` marks the two the report is not
 * a report without.
 */
export const SPOTREP_FIELDS: {
	key: SpotRepFieldKey;
	label: string;
	/** Shown under the input — what the row is FOR, not what to type. */
	hint: string;
	derived: boolean;
	required?: boolean;
	multiline?: boolean;
	/** Rendered as a bullet list in the document. */
	bullets?: boolean;
	rows?: number;
}[] = [
	{
		key: "dateTime",
		label: "Date / Time",
		hint: "When this report is issued — not when the signal was received.",
		derived: true,
		required: true,
	},
	{
		key: "incidentTitle",
		label: "Incident Title / Name of the Event",
		hint: "What happened, how many, and where — in one line.",
		derived: true,
		required: true,
	},
	{
		key: "informationSource",
		label: "Information Source",
		hint: "Who reported it and on what number, so the region can call back.",
		derived: true,
	},
	{
		key: "narrative",
		label: "Narrative",
		hint: "Who, what, when, where and why. Drafted from the signal, verification and risk assessment.",
		derived: true,
		multiline: true,
		rows: 10,
		required: true,
	},
	{
		key: "actionsTaken",
		label: "Actions Taken",
		hint: "One action per line. Drafted from what was recorded at verification and risk assessment.",
		derived: true,
		multiline: true,
		bullets: true,
		rows: 6,
	},
	{
		key: "challenges",
		label: "Challenges",
		hint: "One per line. Nothing in the signal record knows this — it is what the district could not do, and it is why the region reads spot reports.",
		derived: false,
		multiline: true,
		bullets: true,
		rows: 5,
		required: true,
	},
	{
		key: "recommendations",
		label: "Recommendations",
		hint: "One per line. Seeded from the response the assigned risk level mandates.",
		derived: true,
		multiline: true,
		bullets: true,
		rows: 5,
	},
	{
		key: "acknowledgement",
		label: "Acknowledgement",
		hint: "Partners and teams who supported the response.",
		derived: false,
		multiline: true,
		rows: 3,
	},
	{
		key: "submitterName",
		label: "Submitter",
		hint: "The person accountable for this report.",
		derived: true,
		required: true,
	},
	{
		key: "submitterPosition",
		label: "Position",
		hint: "Their role — DSFP, HSDSFP, DHO.",
		derived: true,
	},
	{
		key: "submitterContact",
		label: "Contact",
		hint: "A number the region can reach them on.",
		derived: true,
	},
];

/** The rows the composer refuses to export without. */
export function spotRepMissingRequired(draft: SpotRepDraft): string[] {
	return SPOTREP_FIELDS.filter((f) => f.required && !clean(draft[f.key])).map(
		(f) => f.label
	);
}

/* ---- the individual drafts ---------------------------------------------- */

function draftIncidentTitle(alert: SpotRepAlert, options: SpotRepOptions): string {
	const where = join([
		clean(alert.alertCaseSubCounty) && `${clean(alert.alertCaseSubCounty)} Subcounty`,
		spotRepDistrict(alert) && `${spotRepDistrict(alert)} District`,
	]);
	const what = `${caseCountPhrase(alert)} of ${spotRepEventName(alert, options)}`;
	return where ? `${what} reported in ${where}` : `${what} reported`;
}

function draftInformationSource(alert: SpotRepAlert): string {
	const who = clean(alert.personReporting);
	const source = clean(alert.sourceOfAlert);
	const phone = clean(alert.contactNumber);
	const channel = clean(alert.channelOfReporting);
	const head = join([who || source, who && source ? `${source}` : ""], " — ");
	return join([head, phone, channel && `via ${channel}`], ", ") || "Not recorded";
}

/**
 * The narrative — the body of the report, assembled from the whole pipeline
 * rather than from the intake form alone.
 *
 * Ordered the way the event actually unfolded: the signal came in, this is who
 * the case is, this is what they presented with, this is what the desk found
 * when it verified, this is what the lab said, this is how the team scored it.
 * The reporter's own free-text narrative is appended verbatim as its own
 * paragraph — it is testimony, and paraphrasing it into the generated prose
 * would put words in a health worker's mouth.
 */
function draftNarrative(alert: SpotRepAlert, options: SpotRepOptions): string {
	const paragraphs: string[] = [];
	const event = spotRepEventName(alert, options);
	const signal = signalSummary(alert.signalCode);

	// 1. The signal.
	const signalMoment = alertSignalTimestamp(alert);
	const reporter = clean(alert.personReporting);
	const source = clean(alert.sourceOfAlert);
	const phone = clean(alert.contactNumber);
	paragraphs.push(
		paragraph([
			join(
				[
					`SIGNAL: ${caseCountPhrase(alert)} of ${event} reported`,
					signalMoment && `on ${formatDay(signalMoment.toISOString())}`,
					signalMoment && `at ${formatClock(signalMoment.toISOString())}`,
				],
				" "
			),
			reporter &&
				join(
					[`Reported by ${reporter}`, source && `(${source})`, phone && `on ${phone}`],
					" "
				),
			clean(alert.callTaker) && `Received at the district alert desk by ${clean(alert.callTaker)}`,
			signal && `Classified as ${signal}`,
			alert.id != null && `District signal reference ${altCode(alert.id)}`,
		])
	);

	// 2. The case.
	const name = clean(alert.alertCaseName);
	const age = typeof alert.alertCaseAge === "number" && alert.alertCaseAge > 0
		? `${alert.alertCaseAge}-year-old`
		: "";
	const sex = clean(alert.alertCaseSex).toLowerCase();
	const nationality = clean(alert.alertCaseNationality);
	const location = spotRepLocation(alert);
	const person = join([age, nationality, sex || "person"], " ");
	const symptoms = listPhrase(alert.symptoms);
	paragraphs.push(
		paragraph([
			join(
				[
					name ? `CASE: ${name}, a ${person}` : `CASE: a ${person}`,
					location && `from ${location}`,
				],
				" "
			),
			symptoms && `Presented with ${symptoms}`,
			clean(alert.status) && `Patient status at reporting: ${clean(alert.status)}`,
			clean(alert.history) && `History: ${clean(alert.history)}`,
			clean(alert.healthFacilityVisit) &&
				`Health facility visit: ${clean(alert.healthFacilityVisit)}`,
			clean(alert.traditionalHealerVisit) &&
				`Traditional healer visit: ${clean(alert.traditionalHealerVisit)}`,
			clean(alert.facility) &&
				join(
					["Seen at", clean(alert.facility), clean(alert.facilityType) && `(${clean(alert.facilityType)})`],
					" "
				),
		])
	);

	// 3. Verification and laboratory.
	const verifiedOn = clean(alert.verificationTime) || clean(alert.verificationDate);
	const verification = paragraph([
		(alert.isVerified || clean(alert.verificationOutcome)) &&
			join(
				[
					"VERIFICATION:",
					clean(alert.verificationOutcome)
						? `the signal was ${clean(alert.verificationOutcome).toLowerCase()} on verification`
						: "the signal was verified",
					verifiedOn && `on ${formatDay(verifiedOn)}`,
					clean(alert.verifiedBy) && `by ${clean(alert.verifiedBy)}`,
				],
				" "
			),
		clean(alert.verificationNote),
		clean(alert.labSamplesCollected) &&
			`Samples: ${clean(alert.labSamplesCollected)}`,
		clean(alert.labResult) &&
			join(
				[
					`Laboratory result: ${clean(alert.labResult)}`,
					clean(alert.labResultDate) && `(${formatDay(alert.labResultDate)})`,
				],
				" "
			),
	]);
	if (verification) paragraphs.push(verification);

	// 4. The risk assessment — the element step 5 exists to communicate.
	const level = normalizeRiskLevel(alert.riskLevel);
	if (level) {
		paragraphs.push(
			paragraph([
				join(
					[
						`RISK ASSESSMENT: the event is assessed as ${level.toUpperCase()} risk`,
						clean(alert.riskAssessedAt) && `on ${formatDay(alert.riskAssessedAt)}`,
						teamPhrase(alert) && `by the district Rapid Response Team ${teamPhrase(alert)}`,
					],
					" "
				),
				alert.riskLikelihood &&
					alert.riskImpact &&
					`Likelihood ${clean(alert.riskLikelihood).toLowerCase()}, impact ${clean(
						alert.riskImpact
					).toLowerCase()}`,
				clean(alert.riskHazardNote) && `Hazard: ${clean(alert.riskHazardNote)}`,
				clean(alert.riskExposureNote) && `Exposure: ${clean(alert.riskExposureNote)}`,
				clean(alert.riskContextNote) && `Context: ${clean(alert.riskContextNote)}`,
				RISK_ACTION[level] && `Mandated response: ${RISK_ACTION[level]}`,
			])
		);
	}

	// 5. The reporter's own words, untouched.
	const own = clean(alert.narrative);
	if (own) paragraphs.push(own);

	return paragraphs.filter(Boolean).join("\n\n");
}

/**
 * Actions taken, as lines.
 *
 * Drawn from every column that records something the team DID — the free-text
 * actions field, the desk's response actions, what the RRT recorded at risk
 * assessment, the lab, and the feedback step. Deduplicated case-insensitively:
 * "Sample Collected" is routinely written into two of those columns for the
 * same swab, and a report that lists it twice reads as two samples.
 */
function draftActions(alert: SpotRepAlert): string {
	const lines: string[] = [];

	lines.push(...toBulletLines(alert.actions));
	lines.push(...splitList(alert.responseActions));

	// One stance plus any response sub-actions — each is its own line, so a
	// report says the team responded AND what it did, not just "Respond".
	lines.push(...parseRiskActions(alert.riskActionTaken));
	if (clean(alert.riskEvacuationFacility)) {
		lines.push(`Patient evacuated to ${clean(alert.riskEvacuationFacility)}`);
	}
	if (clean(alert.labSamplesCollected)) {
		lines.push(`Samples collected: ${clean(alert.labSamplesCollected)}`);
	}
	if (clean(alert.verificationOutcome)) {
		lines.push(
			join(
				[
					`Signal verified — outcome ${clean(alert.verificationOutcome)}`,
					clean(alert.verifiedBy) && `(${clean(alert.verifiedBy)})`,
				],
				" "
			)
		);
	}
	if (normalizeRiskLevel(alert.riskLevel)) {
		lines.push(
			`Risk assessed as ${normalizeRiskLevel(alert.riskLevel)} by the district RRT`
		);
	}
	if (clean(alert.feedbackGivenAt)) {
		lines.push(
			join(
				[
					"Feedback given to the reporter",
					clean(alert.feedbackChannel) && `via ${clean(alert.feedbackChannel)}`,
					`on ${formatDay(alert.feedbackGivenAt)}`,
				],
				" "
			)
		);
	}

	const seen = new Set<string>();
	return lines
		.filter((line) => {
			const key = line.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.join("\n");
}

/**
 * Recommendations, seeded from the risk level.
 *
 * The first line is the response the guidelines MANDATE for the assigned level —
 * that is the whole reason the level was derived rather than picked, and a spot
 * report that omits it leaves the region to look it up. The rest are the
 * standing next steps a district owes on any live event; where the record shows
 * one has already happened (feedback given), it is not recommended again.
 */
function draftRecommendations(alert: SpotRepAlert): string {
	const level = normalizeRiskLevel(alert.riskLevel);
	const lines: string[] = [];
	if (level) lines.push(RISK_ACTION[level]);
	if (level === RISK_VERY_HIGH || level === RISK_HIGH) {
		lines.push(
			"Escalate to the Regional PHEOC and the National PHEOC (IES&PHE) as a High/Very High risk event."
		);
	}
	lines.push("Follow up the case and trace contacts for the full incubation period.");
	lines.push("Intensify surveillance at community and health facility level.");
	if (!clean(alert.labResult) && clean(alert.labSamplesCollected)) {
		lines.push("Expedite laboratory results and communicate them to the district.");
	}
	if (!clean(alert.feedbackGivenAt)) {
		lines.push("Provide feedback to the reporter and the reporting facility.");
	}
	return lines.join("\n");
}

/**
 * The full draft. Called once when the composer opens; every field is then the
 * submitter's to edit.
 */
export function spotRepAutoDraft(
	alert: SpotRepAlert,
	options: SpotRepOptions = {}
): SpotRepDraft {
	const now = options.now ?? new Date();
	const district = spotRepDistrict(alert);
	const event = spotRepEventName(alert, options).toUpperCase();

	return {
		title: district
			? `SPOTREP ON ${event} IN ${district.toUpperCase()} DISTRICT`
			: `SPOTREP ON ${event}`,
		dateTime: formatSpotRepStamp(now),
		incidentTitle: draftIncidentTitle(alert, options),
		informationSource: draftInformationSource(alert),
		narrative: draftNarrative(alert, options),
		actionsTaken: draftActions(alert),
		// Never drafted. See the header note: this is the one row the record
		// cannot know, and a seeded placeholder would be filed unchanged.
		challenges: "",
		recommendations: draftRecommendations(alert),
		acknowledgement: "",
		submitterName: clean(options.submitterName),
		submitterPosition: clean(options.submitterPosition),
		submitterContact: clean(options.submitterContact),
	};
}

/* -------------------------------------------------------------------------
 * The format-neutral document
 * ---------------------------------------------------------------------- */

export interface SpotRepRow {
	label: string;
	/** Free text; empty when the submitter left the row blank. */
	value: string;
	/** Rendered as a bullet list rather than a paragraph. */
	bullets?: boolean;
}

/**
 * The report as labelled rows, in the district template's order.
 *
 * One model, four renderings — the Word file, the PDF, the in-dialog preview and
 * the plain-text copy — so none of them can hold a row the others don't.
 * Optional rows the submitter left blank are dropped; the required ones are
 * kept even when empty, because a spot report with a visibly empty Challenges
 * row still says something true.
 */
export function spotRepRows(draft: SpotRepDraft): SpotRepRow[] {
	const rows: SpotRepRow[] = [];
	// The three submitter inputs are one row in the template, appended below.
	const submitterKeys = ["submitterName", "submitterPosition", "submitterContact"];
	for (const field of SPOTREP_FIELDS) {
		if (submitterKeys.includes(field.key)) continue;
		// Block-safe: the narrative's paragraph breaks and the bullet rows' line
		// breaks are load-bearing, so they must survive into every renderer.
		const value = cleanBlock(draft[field.key]);
		if (!value && !field.required) continue;
		rows.push({ label: field.label, value, bullets: field.bullets });
	}
	rows.push({ label: "Submitter", value: spotRepSubmitter(draft) });
	return rows;
}

/** "Dr Jane Doe, DSFP — 0771234567", degrading to whichever parts exist. */
export function spotRepSubmitter(draft: SpotRepDraft): string {
	const who = join([draft.submitterName, draft.submitterPosition], ", ");
	return join([who, draft.submitterContact], " — ");
}

/** `SPOTREP_ALT6313_KASESE_20260828.docx` — sortable, and says what it is. */
export function spotRepFilename(
	alert: SpotRepAlert,
	extension: "docx" | "pdf",
	now: Date = new Date()
): string {
	const stamp =
		`${now.getFullYear()}` +
		`${String(now.getMonth() + 1).padStart(2, "0")}` +
		`${String(now.getDate()).padStart(2, "0")}`;
	const district = spotRepDistrict(alert)
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return join(
		["SPOTREP", altCode(alert.id), district, stamp].filter(Boolean),
		"_"
	).concat(`.${extension}`);
}

/**
 * The report as plain text, for pasting into WhatsApp or an SMS thread.
 *
 * Districts share spot reports on WhatsApp long before the Word file reaches
 * anyone's inbox, and the alternative to this is somebody retyping the summary
 * from a phone screen. Deliberately unstyled — every asterisk and emoji is
 * mangled by one of the clients this lands in.
 */
export function spotRepPlainText(draft: SpotRepDraft): string {
	const parts: string[] = [draft.title.trim(), ""];
	for (const row of spotRepRows(draft)) {
		if (!row.value.trim()) continue;
		if (row.bullets) {
			parts.push(`${row.label}:`);
			for (const line of toBulletLines(row.value)) parts.push(`- ${line}`);
		} else {
			parts.push(`${row.label}: ${row.value}`);
		}
		parts.push("");
	}
	return parts.join("\n").trim();
}
