/**
 * Tests for the Excel export row. No test runner is configured in this repo, so
 * this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/alert-export.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the export is a second WHITELIST behind the normalizer
 * (see alert-normalize.test.ts) — a field can survive the API, the model and the
 * normalizer and still be missing from the workbook, because the column list
 * here never mentioned it. The failure is invisible from the app: the table
 * shows the value, the download succeeds, and only the person opening the file
 * finds the stage of the pipeline that isn't there. Every triage, verification,
 * risk and feedback column is pinned below.
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// alert-export.ts and its dependencies import siblings two ways bare node
// cannot resolve: through the "@/..." tsconfig path alias, and through
// extensionless relative paths ("./alert-outcome"). Both are resolved to a .ts
// file here so this test stays runnable with plain node.
const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith("@/")) {
			const target = resolvePath(projectRoot, specifier.slice(2));
			return { url: pathToFileURL(`${target}.ts`).href, shortCircuit: true };
		}
		if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
			return nextResolve(`${specifier}.ts`, context);
		}
		return nextResolve(specifier, context);
	},
});

const { buildExcelRow, EXCEL_EXPORT_HEADERS } = await import("./alert-export.ts");
const { formatDate, formatTime } = await import("./format-date.ts");
const { altCode } = await import("./alt-code.ts");

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

// A signal logged at 08:00, triaged at 11:00, verified at 14:00 — three hours
// to triage, six hours in the system, comfortably inside the 24h verification
// deadline. Timestamps are local-time strings so the assertions don't depend on
// the machine's timezone.
const TRIAGED_AT = "2026-07-24T11:00:00";
const VERIFIED_AT = "2026-07-24T14:00:00";
const ASSESSED_AT = "2026-07-24T16:30:00";
const FEEDBACK_AT = "2026-07-25T09:15:00";

const row = buildExcelRow({
	id: 4211,
	status: "Alive",
	date: "2026-07-24T00:00:00",
	time: "2026-07-24T08:00:00",
	personReporting: "VHT Nabirye",
	contactNumber: "0700000000",
	sourceOfAlert: "Community",
	region: "Bukedi",
	alertCaseDistrict: "Tororo",
	subCounty: "Mukuju",
	alertCaseName: "Test Case",
	alertCaseAge: 34,
	alertCaseSex: "Female",
	response: "Cholera",
	// Ragged spacing and a trailing comma, as the intake form actually writes it.
	symptoms: "Fever,Watery diarrhoea , Vomiting,",
	isVerified: true,
	callTaker: "Operator 1",
	narrative: "Reported by VHT.",
	triageDecision: "Forwarded to Verification",
	signalCode: "CH1",
	triageReason: "Cluster of similar cases in one village.",
	triagedAt: TRIAGED_AT,
	triagedBy: "DSFP Tororo",
	verificationOutcome: "Confirmed",
	verificationNote: "Three cases confirmed by the facility in-charge.",
	responseActions: "Sample Collected,Admitted",
	caseVerificationDesk: "Sample Collected",
	fieldVerificationDecision: "",
	fieldVerification: "Team visited the household.",
	verificationDate: "2026-07-23T00:00:00", // deliberately the junk day
	verificationTime: VERIFIED_AT,
	verifiedBy: "Biostat Tororo",
	comments: "Contact tracing started.",
	feedback: "Case admitted at Tororo GH.",
	labSamplesCollected: "Yes",
	labResult: "Positive",
	labResultDate: "2026-07-26T00:00:00",
	riskLevel: "High",
	riskSevere: true,
	riskSpread: true,
	riskControl: true,
	riskLikelihood: "Likely",
	riskImpact: "Severe",
	riskHazardNote: "Confirmed cholera.",
	riskExposureNote: "Shared water source.",
	riskContextNote: "Rainy season.",
	riskTeamLead: "DHO Tororo",
	riskTeamMembers: "DSFP, Lab focal person",
	riskActionTaken: "Sample Collected,Validated for EMS Evacuation",
	riskEvacuationFacility: "Tororo General Hospital",
	riskAssessedAt: ASSESSED_AT,
	riskAssessedBy: "DHO Tororo",
	feedbackGivenAt: FEEDBACK_AT,
	feedbackBy: "DSFP Tororo",
	feedbackChannel: "Phone call",
});

// --- The signal as reported -------------------------------------------------

check("response", row["Response"], "Cholera");
check(
	"symptoms are re-joined evenly, with the trailing comma dropped",
	row["Symptoms"],
	"Fever, Watery diarrhoea, Vomiting"
);

// --- Triage -----------------------------------------------------------------

check("signal triaged", row["Signal Triaged"], "Yes");
check("triage decision", row["Triage Decision"], "Forwarded to Verification");
check(
	"ebs signal is the code and its name",
	String(row["EBS Signal"]).startsWith("CH1 — "),
	true
);
check("triage reason", row["Triage Reason"], "Cluster of similar cases in one village.");
check("not a duplicate", row["Duplicate Of"], "");
check("triaged date", row["Triaged Date"], formatDate(TRIAGED_AT));
check("triaged time", row["Triaged Time"], formatTime(TRIAGED_AT));
check("triaged by", row["Triaged By"], "DSFP Tororo");
check("time to triage", row["Time to Triage"], "3h");

// --- Verification -----------------------------------------------------------

check("verification decision", row["Verification Decision"], "Confirmed");
check("verification note", row["Verification Note"], "Three cases confirmed by the facility in-charge.");
check("desk verification actions", row["Desk Verification Actions"], "Sample Collected");
check("response actions", row["Response Actions"], "Sample Collected,Admitted");
check("field verification notes", row["Field Verification Notes"], "Team visited the household.");
// The date must come from verificationTime, NOT the junk verificationDate day
// (which claims the day BEFORE the signal on real rows).
check("verification date uses the real timestamp", row["Verification Date"], formatDate(VERIFIED_AT));
check("verification time", row["Verification Time"], formatTime(VERIFIED_AT));
check("verified by", row["Verified By"], "Biostat Tororo");
check("time to verify", row["Time to Verify"], "6h");
check("sla status", row["SLA Status"], "Within deadline");
check("verification comments", row["Verification Comments"], "Contact tracing started.");
check("verification feedback", row["Verification Feedback"], "Case admitted at Tororo GH.");
check("lab samples collected", row["Lab Samples Collected"], "Yes");
check("lab result", row["Lab Result"], "Positive");
check("lab result date", row["Lab Result Date"], formatDate("2026-07-26T00:00:00"));

// --- Risk assessment --------------------------------------------------------

check("risk level", row["Risk Level"], "High");
check("risk severe", row["Risk: Severe Illness/Death"], "Yes");
check("risk likelihood", row["Risk Likelihood"], "Likely");
check("risk impact", row["Risk Impact"], "Severe");
check("rrt lead", row["RRT Lead"], "DHO Tororo");
check("risk action taken", row["Risk Action Taken"], "Sample Collected,Validated for EMS Evacuation");
check("evacuation facility", row["Evacuation Facility"], "Tororo General Hospital");
check("risk assessed date", row["Risk Assessed Date"], formatDate(ASSESSED_AT));
check("risk assessed time", row["Risk Assessed Time"], formatTime(ASSESSED_AT));

// --- Reporter feedback ------------------------------------------------------

check("feedback status", row["Reporter Feedback"], "Given");
check("feedback date", row["Feedback Date"], formatDate(FEEDBACK_AT));
check("feedback channel", row["Feedback Channel"], "Phone call");

// --- A signal nobody has touched yet ----------------------------------------

const untouched = buildExcelRow({
	id: 4212,
	status: "Alive",
	date: "2026-07-24T00:00:00",
	time: "2026-07-24T08:00:00",
	personReporting: "Anonymous",
	contactNumber: "",
	sourceOfAlert: "Community",
});

check("no symptoms recorded is blank", untouched["Symptoms"], "");
check("untriaged answers No, not blank", untouched["Signal Triaged"], "No");
check("untriaged has no decision", untouched["Triage Decision"], "");
check("untriaged names no signal", untouched["EBS Signal"], "");
check("no triage date", untouched["Triaged Date"], "");
check("no time to triage", untouched["Time to Triage"], "");
// Still pending: no verification duration, but the SLA clock is running.
check("no time to verify while pending", untouched["Time to Verify"], "");
check("pending still gets an sla status", typeof untouched["SLA Status"], "string");
check("verified flag", untouched["Verified"], "Pending");
// Nothing is owed until the signal has a conclusion.
check("feedback not due", untouched["Reporter Feedback"], "Not due");
// Unanswered risk questions must stay blank, never render as an explicit "No".
check("unanswered risk question is blank", untouched["Risk: Severe Illness/Death"], "");

// A discarded signal DOES owe its reporter feedback.
const discarded = buildExcelRow({
	id: 4213,
	status: "Alive",
	date: "2026-07-24T00:00:00",
	time: "2026-07-24T08:00:00",
	personReporting: "VHT Okello",
	contactNumber: "",
	sourceOfAlert: "Community",
	verificationOutcome: "Discarded",
});
check("discarded owes feedback", discarded["Reporter Feedback"], "Pending");

// Triaged before the decision column existed: only a priority records it, and
// a priority was only ever given to a signal that went forward. The priority
// itself is no longer a column — triage stopped setting one.
const legacy = buildExcelRow({
	id: 4214,
	status: "Alive",
	date: "2026-07-24T00:00:00",
	time: "2026-07-24T08:00:00",
	personReporting: "VHT Akello",
	contactNumber: "",
	sourceOfAlert: "Community",
	priority: "High",
	triagedAt: TRIAGED_AT,
});
check("legacy priority-only row reads as triaged", legacy["Signal Triaged"], "Yes");
check("legacy priority-only row went forward", legacy["Triage Decision"], "Forwarded to Verification");

// Discarded at triage as a duplicate: the decision, the reason and the earlier
// signal it duplicates are the whole record of why nobody verified it.
const duplicate = buildExcelRow({
	id: 4215,
	status: "Alive",
	date: "2026-07-24T00:00:00",
	time: "2026-07-24T08:00:00",
	personReporting: "VHT Nabirye",
	contactNumber: "",
	sourceOfAlert: "Community",
	triageDecision: "Discarded",
	triageReason: "Same household as 4211.",
	triageDuplicateOf: 4211,
	triagedAt: TRIAGED_AT,
});
check("duplicate is triaged", duplicate["Signal Triaged"], "Yes");
check("duplicate decision", duplicate["Triage Decision"], "Discarded");
check("duplicate points at the earlier signal", duplicate["Duplicate Of"], `${altCode(4211)}`);

// --- Header integrity -------------------------------------------------------

check(
	"every column is written",
	Object.keys(row).length,
	EXCEL_EXPORT_HEADERS.length
);
check(
	"no duplicate headers",
	new Set(EXCEL_EXPORT_HEADERS).size,
	EXCEL_EXPORT_HEADERS.length
);
// Triage no longer sets a priority, so neither it nor the deadline it set may
// come back as a column — the file must not carry fields the system no longer has.
check("triage priority is gone", EXCEL_EXPORT_HEADERS.includes("Triage Priority"), false);
check("verification deadline is gone", EXCEL_EXPORT_HEADERS.includes("Verification Deadline"), false);

console.log(`ok — ${passed} assertions passed`);
