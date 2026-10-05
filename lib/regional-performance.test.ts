/**
 * Tests for the signal-performance tables' shared definitions. No test runner
 * is configured in this repo, so this file is a self-contained,
 * assertion-based script:
 *
 *   node --experimental-strip-types lib/regional-performance.test.ts
 *
 * It exits non-zero on the first failed assertion.
 *
 * WHY THIS FILE EXISTS: the district table is filtered and grouped by the
 * server's CANONICAL district ("Gulu" = Gulu City + Gulu District). If the
 * picker offered "Gulu City" the server would still count both, and the row
 * would read "Gulu" — so the picker, the row label and the division lookup
 * must all strip the same suffixes. The ranking sort is pinned too: a "(%)"
 * with no signals behind it must never rank as the best or worst district.
 */
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// The module imports through the "@/..." tsconfig alias, which bare node cannot
// resolve; map it to the project root (same harness as register-view.test.ts).
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
	formatPerformanceScope,
	performanceColumns,
	performanceDistrictName,
	performanceDistrictOptions,
	regionalReportFileName,
	regionalTableRows,
	sortPerformanceRows,
} = await import("./regional-performance.ts");

const row = (district: string, region: string, rawData: number, signals: number, within: number) => ({
	region, district, rawData, triaged: rawData, signals, verified: signals,
	verifiedWithin24h: within, riskAssessed: 0, alerts: 0,
});

// Suffixes: City and District units share one name; nothing else is touched.
assert.equal(performanceDistrictName("Gulu City"), "Gulu");
assert.equal(performanceDistrictName(" Gulu District "), "Gulu");
assert.equal(performanceDistrictName("Madi-Okollo District"), "Madi-Okollo");
assert.equal(performanceDistrictName("Kampala"), "Kampala");

// Options: merged, region-scoped, carrying their region.
const regions = [{ id: 1, name: "Acholi" }, { id: 3, name: "Bugisu" }];
const units = [
	{ name: "Gulu City", regionId: 1 },
	{ name: "Gulu District", regionId: 1 },
	{ name: "Mbale City", regionId: 3 },
	{ name: "Agago District", regionId: 1 },
];
assert.deepEqual(performanceDistrictOptions(units, regions, []), [
	{ name: "Agago", region: "Acholi" },
	{ name: "Gulu", region: "Acholi" },
	{ name: "Mbale", region: "Bugisu" },
]);
assert.deepEqual(
	performanceDistrictOptions(units, regions, ["bugisu"]).map((o) => o.name),
	["Mbale"]
);

// Columns: the district table labels by district, then region, then the funnel.
assert.deepEqual(
	performanceColumns("district").slice(0, 3).map((c) => c.key),
	["district", "region", "rawData"]
);
assert.equal(performanceColumns("region")[0].key, "region");

// The grand total's label lands in whichever column labels a row.
const report = {
	groupBy: "district" as const,
	fromDate: "2026-09-01",
	toDate: "2026-09-30",
	rows: [row("Gulu", "Acholi", 5, 2, 1)],
	total: { ...row("", "Grand Total", 5, 2, 1), district: undefined },
};
const lines = regionalTableRows(report);
assert.equal(lines.at(-1)!.row.district, "Grand Total");
assert.equal(lines.at(-1)!.row.region, "");
assert.equal(regionalTableRows({ ...report, groupBy: undefined }).at(-1)!.row.region, "Grand Total");
assert.equal(regionalReportFileName(report, "pdf"), "district-signal-performance_2026-09-01_to_2026-09-30.pdf");
assert.equal(regionalReportFileName({ ...report, groupBy: "region" }, "xlsx").startsWith("regional-"), true);

// Ranking by "(%)": no signals = no score, last whichever way it is sorted.
const rows = [
	row("Arua", "Arua", 10, 0, 0), // —
	row("Gulu", "Acholi", 10, 4, 1), // 25%
	row("Mbale", "Bugisu", 10, 2, 2), // 100%
];
const pct = (dir: "asc" | "desc") =>
	sortPerformanceRows(rows, "district", { key: "pct", dir }).map((r) => r.district);
assert.deepEqual(pct("desc"), ["Mbale", "Gulu", "Arua"]);
assert.deepEqual(pct("asc"), ["Gulu", "Mbale", "Arua"]);
// No sort keeps the server's order, untouched.
assert.equal(sortPerformanceRows(rows, "district", null), rows);
// Unknown stays last on a name sort, both ways.
const named = [row("Unknown", "Unknown", 1, 0, 0), row("Zombo", "Arua", 1, 0, 0), row("Abim", "Karamoja", 1, 0, 0)];
assert.deepEqual(sortPerformanceRows(named, "district", { key: "district", dir: "desc" }).map((r) => r.district), ["Zombo", "Abim", "Unknown"]);
assert.deepEqual(sortPerformanceRows(named, "district", { key: "district", dir: "asc" }).map((r) => r.district), ["Abim", "Zombo", "Unknown"]);

// Scope line: what the server applied, short enough to sit under a title.
assert.equal(formatPerformanceScope(undefined), "");
assert.equal(formatPerformanceScope({ regions: [], districts: [] }), "");
assert.equal(
	formatPerformanceScope({ regions: ["Bugisu"], districts: ["Mbale"], division: "Industrial Division", origin: "6767" }),
	"Bugisu · Mbale · Industrial Division · Came in via 6767 SMS"
);
assert.equal(
	formatPerformanceScope({ regions: ["A", "B", "C", "D"], districts: [] }),
	"4 regions"
);

console.log("regional-performance: all assertions passed");
