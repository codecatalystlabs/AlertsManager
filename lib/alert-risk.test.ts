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
	deriveMatrixLevel,
	normalizeRiskLevel,
	RISK_LIKELIHOODS,
	RISK_IMPACTS,
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

// --- The matrix grid (Figure 4) --------------------------------------------
// Transcribed from the guideline's figure independently of the table
// deriveMatrixLevel holds, so a typo in one is caught by the other. This is the
// TWIN of services.DeriveMatrixLevel / TestDeriveMatrixLevelMatchesPublishedGrid
// in Go — the two must agree or the dialog's preview lies about the level the
// server will store.
//
// Columns run least → most likely; rows run most → least severe.
const MATRIX_COLUMNS = [
	"Very unlikely",
	"Unlikely",
	"Likely",
	"Highly likely",
	"Almost certain",
];
const MATRIX_GRID: Record<string, RiskLevel[]> = {
	Severe: [RISK_HIGH, RISK_HIGH, RISK_VERY_HIGH, RISK_VERY_HIGH, RISK_VERY_HIGH],
	Major: [RISK_HIGH, RISK_HIGH, RISK_HIGH, RISK_VERY_HIGH, RISK_VERY_HIGH],
	Moderate: [RISK_LOW, RISK_LOW, RISK_HIGH, RISK_HIGH, RISK_HIGH],
	Minor: [RISK_LOW, RISK_LOW, RISK_MODERATE, RISK_MODERATE, RISK_MODERATE],
	Minimal: [RISK_LOW, RISK_LOW, RISK_LOW, RISK_LOW, RISK_LOW],
};
for (const impact of RISK_IMPACTS) {
	const row = MATRIX_GRID[impact.value];
	if (!row) {
		console.error(`FAIL: impact band ${impact.value} missing from the transcribed grid`);
		process.exit(1);
	}
	MATRIX_COLUMNS.forEach((likelihood, i) => {
		check(`matrix ${likelihood} x ${impact.value}`, deriveMatrixLevel(likelihood, impact.value), row[i]);
	});
}

// A half-placed event has no cell, so it has no level.
check("matrix without impact", deriveMatrixLevel("Almost certain", ""), null);
check("matrix without likelihood", deriveMatrixLevel("", "Severe"), null);
check("matrix with unknown band", deriveMatrixLevel("Almost certain", "Catastrophic"), null);
check("matrix with nulls", deriveMatrixLevel(null, null), null);

// Both axes must be monotonic: worsening one band can never LOWER the level.
for (const impact of RISK_IMPACTS) {
	let previous = Number.POSITIVE_INFINITY;
	for (const likelihood of RISK_LIKELIHOODS) {
		// RISK_LIKELIHOODS runs most likely first, so the level must not rise.
		const current = RISK_LEVELS.indexOf(deriveMatrixLevel(likelihood.value, impact.value)!);
		if (current > previous) {
			console.error(`FAIL: ${impact.value} rises going down the likelihood axis`);
			process.exit(1);
		}
		previous = current;
		passed += 1;
	}
}
for (const likelihood of RISK_LIKELIHOODS) {
	let previous = Number.POSITIVE_INFINITY;
	for (const impact of RISK_IMPACTS) {
		// RISK_IMPACTS runs most severe first, so the level must not rise.
		const current = RISK_LEVELS.indexOf(deriveMatrixLevel(likelihood.value, impact.value)!);
		if (current > previous) {
			console.error(`FAIL: ${likelihood.value} rises going down the impact axis`);
			process.exit(1);
		}
		previous = current;
		passed += 1;
	}
}

// The matrix is IMPACT-led, not a symmetric heat map. These two rules are what a
// reviewer would "correct" if they assumed a textbook grid, and correcting them
// would change which events stand up command and control.
for (const likelihood of RISK_LIKELIHOODS) {
	const severe = deriveMatrixLevel(likelihood.value, "Severe");
	if (severe !== RISK_HIGH && severe !== RISK_VERY_HIGH) {
		console.error(`FAIL: ${likelihood.value} x Severe = ${severe}, want High or Very High`);
		process.exit(1);
	}
	check(`${likelihood.value} x Minimal stays Low`, deriveMatrixLevel(likelihood.value, "Minimal"), RISK_LOW);
	passed += 1;
}

console.log(`ok — ${passed} assertions passed`);
