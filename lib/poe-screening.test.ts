/**
 * Tests for the POE screening reader. No test runner is configured in this
 * repo, so this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/poe-screening.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the POE screen's "Screening" column and the details
 * dialog decide from these functions whether a traveller reads as "No
 * symptoms" or as someone to follow up. The server's "Needs follow-up" tile
 * counts symptom_count/exposure_count; if this reader disagreed (say, by
 * missing an exposure the payload flags), a row in that tile would look clean.
 * The payload shapes below are the ones on the 27-Sep-2026 dump.
 */
import assert from "node:assert/strict";
import type { PoeAlertRow } from "./fetch-ndw-alerts.ts";
import { parseSymptoms, poeScreening, shortPortName } from "./poe-screening.ts";

// symptoms_text is a JSON array string; "[]" is the empty case on ~186k rows.
assert.deepEqual(parseSymptoms('["fever"]'), ["Fever"]);
assert.deepEqual(parseSymptoms('["fever", "sore_throat", "breathing"]'), [
	"Fever",
	"Sore throat",
	"Difficulty breathing",
]);
assert.deepEqual(parseSymptoms("[]"), []);
assert.deepEqual(parseSymptoms(""), []);
assert.deepEqual(parseSymptoms(undefined), []);
// Not JSON: tolerate a plain comma list rather than showing raw text.
assert.deepEqual(parseSymptoms("fever, cough"), ["Fever", "Cough"]);

const row = (over: Partial<PoeAlertRow>): PoeAlertRow =>
	({
		id: 1,
		symptomsText: "[]",
		riskLevel: "",
		exposureCount: 0,
		...over,
	}) as PoeAlertRow;

// A real exposed traveller: four exposure flags true in the payload.
const exposed = poeScreening(
	row({
		symptomsText: '["fever"]',
		exposureCount: 4,
		rawPayload: JSON.stringify({
			exposure_bushmeat: true,
			exposure_funeral: true,
			exposure_healthcare: true,
			exposure_sick_contact: true,
			exposure_count: 4,
			countries_visited_21d: null,
		}),
	})
);
assert.deepEqual(exposed.symptoms, ["Fever"]);
assert.deepEqual(exposed.exposures, ["Funeral", "Bushmeat", "Sick contact", "Healthcare"]);
assert.equal(exposed.exposureCount, 4);
assert.deepEqual(exposed.countriesVisited, []);

// A live (NDW proxy) row has no rawPayload: the count alone still flags it.
const liveRow = poeScreening(row({ exposureCount: 2 }));
assert.deepEqual(liveRow.exposures, []);
assert.equal(liveRow.exposureCount, 2);

// A row synced before exposure_count existed (count 0) still shows the flags.
const legacy = poeScreening(
	row({ exposureCount: 0, rawPayload: '{"exposure_funeral":true,"exposure_bushmeat":false}' })
);
assert.deepEqual(legacy.exposures, ["Funeral"]);
assert.equal(legacy.exposureCount, 1);

// Only literal true counts; "false"/null/absent do not.
const clean = poeScreening(
	row({ rawPayload: '{"exposure_funeral":false,"exposure_sick_contact":null}' })
);
assert.equal(clean.exposureCount, 0);
assert.deepEqual(clean.symptoms, []);

// Malformed payload never throws.
assert.equal(poeScreening(row({ rawPayload: "{not json" })).exposureCount, 0);

// Risk is lower-cased; empty stays empty (the common case).
assert.equal(poeScreening(row({ riskLevel: "High" })).risk, "high");
assert.equal(poeScreening(row({ riskLevel: "" })).risk, "");

// Countries visited: array or comma string.
assert.deepEqual(
	poeScreening(row({ rawPayload: '{"countries_visited_21d":["Kenya","DRC"]}' })).countriesVisited,
	["Kenya", "DRC"]
);
assert.deepEqual(
	poeScreening(row({ rawPayload: '{"countries_visited_21d":"Kenya, DRC"}' })).countriesVisited,
	["Kenya", "DRC"]
);

// Port labels: every port on the dump.
assert.equal(shortPortName("Entebbe International Airport (EBB)"), "Entebbe (EBB)");
assert.equal(shortPortName("Kasese Airport (KSE)"), "Kasese (KSE)");
assert.equal(shortPortName("Other"), "Other");
assert.equal(shortPortName(""), "");
assert.equal(shortPortName(undefined), "");

console.log("poe-screening: all assertions passed");
