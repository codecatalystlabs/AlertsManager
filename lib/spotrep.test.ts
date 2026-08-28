/**
 * Tests for the spot-report composer. No test runner is configured in this repo,
 * so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/spotrep.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the whole promise of the feature is that a spot report
 * is DERIVED from the signal rather than retyped, so the failure mode is silent
 * and serious — a report that states the wrong risk level, omits the number
 * affected, or quietly drops the district's Challenges is still a well-formatted
 * document that somebody signs. The assertions below pin the five elements EBS
 * step 5 requires an alert to carry (nature, location, number affected, risk
 * level, recommended next steps), plus the two rules that are easy to
 * "tidy away": Challenges is never auto-filled, and it is never dropped for
 * being empty.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// spotrep.ts reaches siblings through the "@/..." tsconfig path alias, which
// bare node cannot resolve. Map it to the project root, matching the repo's
// runner-less test convention (see lib/alert-normalize.test.ts).
const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith("@/")) {
			const target = resolvePath(projectRoot, specifier.slice(2));
			return { url: pathToFileURL(`${target}.ts`).href, shortCircuit: true };
		}
		return nextResolve(specifier, context);
	},
});

const {
	SPOTREP_FIELDS,
	formatSpotRepStamp,
	spotRepAutoDraft,
	spotRepCaseCount,
	spotRepFilename,
	spotRepIsMandated,
	spotRepMissingRequired,
	spotRepPlainText,
	spotRepRows,
	spotRepSubmitter,
	toBulletLines,
} = await import("./spotrep.ts");

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		console.error(
			`FAIL: ${name}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`
		);
		process.exit(1);
	}
	passed += 1;
}
function truthy(name: string, actual: unknown): void {
	if (!actual) {
		console.error(`FAIL: ${name}\n  expected truthy, got: ${String(actual)}`);
		process.exit(1);
	}
	passed += 1;
}
function falsy(name: string, actual: unknown): void {
	if (actual) {
		console.error(`FAIL: ${name}\n  expected falsy, got: ${String(actual)}`);
		process.exit(1);
	}
	passed += 1;
}

/** The Kasese VHF spot report the district actually filed, as a signal record. */
const kasese = {
	id: 6313,
	date: "2025-11-14T00:00:00",
	time: "2025-11-14T16:30:00",
	status: "Alive",
	response: "ViralHemorrhagicFever",
	signalCode: "CH1",
	numberAffected: 3,
	callTaker: "Alice Desk",
	personReporting: "Lab personnel, Hima HCIII",
	contactNumber: "+256779501921",
	sourceOfAlert: "Health Facility",
	channelOfReporting: "Phone call",
	region: "Rwenzori",
	alertCaseName: "John Doe",
	alertCaseAge: 35,
	alertCaseSex: "Male",
	alertCaseVillage: "Nyangereka",
	alertCaseParish: "Hima",
	alertCaseSubCounty: "Hima Town",
	alertCaseDistrict: "Kasese",
	facility: "Hima HCIII",
	symptoms: "Fever (>=38C), Headache, Bleeding",
	history: "3 day history of blood stained stool",
	narrative: "The DSFP informed the HSDSFP to prepare to investigate further.",
	actions: "#Called the HSDSFP to pick a sample#Shared with the DHO and DHT",
	responseActions: "Sample Collected, Respond",
	labSamplesCollected: "Blood sample",
	isVerified: true,
	verifiedBy: "DSFP Kasese",
	verificationTime: "2025-11-14T18:00:00",
	verificationOutcome: "Confirmed",
	verificationNote: "Case meets the VHF case definition.",
	riskLevel: "Very High",
	riskAssessedAt: "2025-11-14T20:00:00",
	riskTeamLead: "Dr Jane Doe · 0771234567",
	riskActionTaken: "EMS Evacuation",
	riskEvacuationFacility: "Rukoki Isolation Unit",
};

const now = new Date(2025, 10, 14, 16, 30);
const draft = spotRepAutoDraft(kasese, {
	eventName: "Acute haemorrhagic fever syndrome",
	submitterName: "Sarah Auma",
	submitterPosition: "DSFP",
	submitterContact: "0771234567",
	now,
});

// --- Challenges: the one row nothing may fill in ---------------------------
// This is the whole reason the composer exists rather than a one-click export.
check("challenges start blank", draft.challenges, "");
check(
	"challenges are declared as the submitter's own",
	SPOTREP_FIELDS.find((f) => f.key === "challenges")?.derived,
	false
);
check(
	"challenges are required",
	SPOTREP_FIELDS.find((f) => f.key === "challenges")?.required,
	true
);
truthy(
	"a blank Challenges blocks export",
	spotRepMissingRequired(draft).includes("Challenges")
);
// ...and having been left blank, the row must still APPEAR in the document. A
// spot report with a visibly empty Challenges row says something true; one that
// silently drops the row says the district had none.
truthy(
	"an empty Challenges row survives into the document",
	spotRepRows(draft).some((r) => r.label === "Challenges")
);
falsy(
	"an empty optional row is dropped",
	spotRepRows(draft).some((r) => r.label === "Acknowledgement")
);

// --- The five elements EBS step 5 requires an alert to state ---------------
truthy("nature of the event is in the title", draft.title.includes("HAEMORRHAGIC"));
truthy(
	"the district is in the title",
	draft.title.includes("KASESE DISTRICT")
);
truthy(
	"location reaches the narrative",
	draft.narrative.includes("Nyangereka village") &&
		draft.narrative.includes("Kasese District")
);
check("number affected is the reporter's own estimate", spotRepCaseCount(kasese), 3);
truthy(
	"number affected reaches the incident title",
	draft.incidentTitle.includes("3 suspected cases")
);
truthy(
	"the assigned risk level reaches the narrative",
	draft.narrative.includes("VERY HIGH risk")
);
truthy(
	"the mandated response is recommended, not left to be looked up",
	draft.recommendations.includes("outside normal working hours")
);
truthy(
	"a Very High event recommends escalation to the PHEOCs",
	draft.recommendations.includes("National PHEOC")
);

// A missing estimate falls back to the one case the record describes, never 0 —
// "0 suspected cases reported" would be a false statement in the title.
check(
	"an absent estimate falls back to one case",
	spotRepCaseCount({ ...kasese, numberAffected: null }),
	1
);

// --- The narrative is assembled from the WHOLE pipeline --------------------
truthy("the signal is described", draft.narrative.includes("SIGNAL:"));
truthy("the case is described", draft.narrative.includes("CASE: John Doe"));
truthy("verification is described", draft.narrative.includes("VERIFICATION:"));
truthy("the risk assessment is described", draft.narrative.includes("RISK ASSESSMENT:"));
truthy(
	"the verifier's own note is carried, not paraphrased",
	draft.narrative.includes("Case meets the VHF case definition.")
);
truthy(
	"the reporter's own words are carried verbatim",
	draft.narrative.includes("The DSFP informed the HSDSFP")
);
truthy(
	"the RRT lead is named with a number the region can call",
	draft.narrative.includes("Dr Jane Doe (0771234567)")
);

// --- Actions come from every column that records something DONE ------------
const actions = toBulletLines(draft.actionsTaken);
truthy(
	"the free-text actions field is split into lines",
	actions.includes("Called the HSDSFP to pick a sample")
);
truthy(
	"the desk's response actions are carried",
	actions.includes("Sample Collected")
);
truthy(
	"the RRT's evacuation destination is carried",
	actions.some((a) => a.includes("Rukoki Isolation Unit"))
);
// "Sample Collected" is written into both responseActions and riskActionTaken
// for the same swab; listing it twice would read as two samples.
check(
	"actions are deduplicated",
	actions.filter((a) => a.toLowerCase() === "sample collected").length,
	1
);

// --- Bullet parsing --------------------------------------------------------
check(
	"a run-on '#' list splits",
	toBulletLines("#One thing#Another thing").join("|"),
	"One thing|Another thing"
);
check(
	"newline, dash, dot and bullet markers all split",
	toBulletLines("- one\n- two\n• three\n4. four").join("|"),
	"one|two|three|four"
);
check("empty text yields no bullets", toBulletLines("").length, 0);

// --- Mandate: High and Very High only --------------------------------------
check("Very High is mandated", spotRepIsMandated("Very High"), true);
check("High is mandated", spotRepIsMandated("High"), true);
check("Moderate is not mandated", spotRepIsMandated("Moderate"), false);
check("Low is not mandated", spotRepIsMandated("Low"), false);
check("an unassessed signal is not mandated", spotRepIsMandated(null), false);

// --- Formatting ------------------------------------------------------------
// Not toLocaleString(): this line is read by a regional and a national desk in
// the same week, and 06/07 would mean two different days between them.
check("the stamp is unambiguous", formatSpotRepStamp(now), "14 NOV 2025, 16:30 HRS");
check(
	"the filename says what it is and sorts",
	spotRepFilename(kasese, "docx", now),
	"SPOTREP_ALT6313_KASESE_20251114.docx"
);
check(
	"the submitter line degrades to whichever parts exist",
	spotRepSubmitter({ ...draft, submitterContact: "" }),
	"Sarah Auma, DSFP"
);

// --- Line breaks are load-bearing ------------------------------------------
// The row model trims lines but must not FLATTEN them: a six-action list folded
// into one sentence, or a four-paragraph narrative folded into a wall, is the
// difference between a report and a paragraph.
const filled = { ...draft, challenges: "No standby fuel\nNo coordination airtime" };
const challengeRow = spotRepRows(filled).find((r) => r.label === "Challenges");
check("challenge lines survive the row model", toBulletLines(challengeRow!.value).length, 2);
check(
	"narrative paragraphs survive the row model",
	spotRepRows(filled).find((r) => r.label === "Narrative")!.value.includes("\n\n"),
	true
);

// --- Plain text (the WhatsApp copy) ----------------------------------------
const text = spotRepPlainText(filled);
truthy("plain text leads with the title", text.startsWith("SPOTREP ON"));
truthy("plain text carries the challenges as bullets", text.includes("- No standby fuel"));
truthy("plain text names the submitter", text.includes("Sarah Auma, DSFP"));

// --- A sparse signal drafts a shorter report, not a broken one -------------
const sparse = spotRepAutoDraft({ id: 7, alertCaseDistrict: "Gulu" }, { now });
check("a sparse signal still gets a title", sparse.title, "SPOTREP ON PUBLIC HEALTH EVENT IN GULU DISTRICT");
truthy("a sparse signal still gets a narrative", sparse.narrative.includes("SIGNAL:"));
falsy(
	"an unassessed signal recommends no mandated response",
	sparse.recommendations.includes("outside normal working hours")
);
truthy(
	"an unassessed signal still recommends the standing next steps",
	sparse.recommendations.includes("Intensify surveillance")
);

console.log(`ok — ${passed} assertions passed`);
