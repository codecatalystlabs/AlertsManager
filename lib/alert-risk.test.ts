/**
 * Tests for the risk algorithm. No test runner is configured in this repo, so
 * this file is a self-contained, assertion-based script:
 *
 *   node --experimental-strip-types lib/alert-risk.test.ts
 *
 * WHY: this is a TWIN of alertsMIS/backend/internal/services/risk_assessment.go.
 * The dialog PREVIEWS the level the assessor's answers will produce, and the
 * server derives the level it actually stores. If the two tables drift, the
 * preview lies about what the team is being committed to.
 *
 * The eight rows below are transcribed from EBS Guidelines §6. If this test and
 * the guideline ever disagree, the guideline wins.
 */
import {
	deriveRiskLevel,
	normalizeRiskLevel,
	RISK_ACTION,
	RISK_LEVELS,
	RISK_LOW,
	RISK_MODERATE,
	RISK_HIGH,
	RISK_VERY_HIGH,
	type RiskLevel,
} from "./alert-risk.ts";

let passed = 0;
function check(name: string, actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		console.error(`FAIL: ${name}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
		process.exit(1);
	}
	passed += 1;
}

// --- The published decision table, row for row -----------------------------
const table: [boolean, boolean, boolean, RiskLevel][] = [
	[true, true, false, RISK_VERY_HIGH],
	[true, true, true, RISK_HIGH],
	[true, false, false, RISK_HIGH],
	[true, false, true, RISK_MODERATE],
	[false, true, false, RISK_HIGH],
	[false, true, true, RISK_MODERATE],
	[false, false, false, RISK_MODERATE],
	[false, false, true, RISK_LOW],
];
check("all 8 combinations transcribed", table.length, 8);
for (const [severe, spread, control, want] of table) {
	check(
		`derive(severe=${severe}, spread=${spread}, control=${control})`,
		deriveRiskLevel(severe, spread, control),
		want
	);
}

// --- Boundaries that carry the operational consequences --------------------
check("only route to Very High", deriveRiskLevel(true, true, false), RISK_VERY_HIGH);
for (const [severe, spread, control] of [
	[false, true, false],
	[true, false, false],
	[true, true, true],
] as [boolean, boolean, boolean][]) {
	if (deriveRiskLevel(severe, spread, control) === RISK_VERY_HIGH) {
		console.error(`FAIL: (${severe},${spread},${control}) must not reach Very High`);
		process.exit(1);
	}
	passed += 1;
}
check("only route to Low", deriveRiskLevel(false, false, true), RISK_LOW);

// Losing control measures must escalate every row it touches.
for (const [severe, spread] of [
	[false, false],
	[false, true],
	[true, false],
	[true, true],
] as [boolean, boolean][]) {
	const withControl = RISK_LEVELS.indexOf(deriveRiskLevel(severe, spread, true));
	const without = RISK_LEVELS.indexOf(deriveRiskLevel(severe, spread, false));
	if (without <= withControl) {
		console.error(
			`FAIL: (severe=${severe}, spread=${spread}) losing control measures must escalate`
		);
		process.exit(1);
	}
	passed += 1;
}

// --- Normalisation and actions ---------------------------------------------
check("normalize Low", normalizeRiskLevel("low"), RISK_LOW);
check("normalize medium synonym", normalizeRiskLevel("medium"), RISK_MODERATE);
check("normalize Very High", normalizeRiskLevel("very high"), RISK_VERY_HIGH);
check("normalize VeryHigh", normalizeRiskLevel("VeryHigh"), RISK_VERY_HIGH);
check("normalize empty", normalizeRiskLevel(""), null);
check("normalize unknown", normalizeRiskLevel("critical"), null);

for (const level of RISK_LEVELS) {
	if (!RISK_ACTION[level]) {
		console.error(`FAIL: no recommended action for ${level}`);
		process.exit(1);
	}
	passed += 1;
}
// Only Very High may promise an out-of-hours response.
for (const level of [RISK_LOW, RISK_MODERATE, RISK_HIGH] as RiskLevel[]) {
	if (RISK_ACTION[level].toLowerCase().includes("outside normal working hours")) {
		console.error(`FAIL: ${level} must not promise an out-of-hours response`);
		process.exit(1);
	}
	passed += 1;
}
check(
	"Very High mandates out-of-hours",
	RISK_ACTION[RISK_VERY_HIGH].toLowerCase().includes("outside normal working hours"),
	true
);

console.log(`ok — ${passed} assertions passed`);
