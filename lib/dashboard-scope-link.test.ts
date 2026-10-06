/**
 * Tests for carrying the dashboard's scope into the lists it links to. No test
 * runner is configured in this repo, so this file is a self-contained,
 * assertion-based script:
 *
 *   node --experimental-strip-types lib/dashboard-scope-link.test.ts
 */
import assert from "node:assert/strict";
import {
	scopeFromSearchParams,
	withDashboardScope,
	type DashboardLinkScope,
} from "./dashboard-scope-link.ts";

let passed = 0;
const check = (name: string, fn: () => void) => {
	fn();
	passed++;
	void name;
};

const unscoped: DashboardLinkScope = {
	from: "",
	to: "",
	region: "all",
	district: "all",
	division: "all",
	disease: "all",
};
const scoped: DashboardLinkScope = {
	from: "2026-09-01",
	to: "2026-09-30",
	region: "Tooro",
	district: "Kasese",
	division: "all",
	disease: "EbolaVirusDisease,ViralHemorrhagicFever",
};

check("no scope leaves the link alone", () => {
	assert.equal(withDashboardScope("/dashboard/signal-logs?stage=triage", unscoped), "/dashboard/signal-logs?stage=triage");
	assert.equal(withDashboardScope("/dashboard/alerts", null), "/dashboard/alerts");
});

check("a scope is appended, keeping the stage", () => {
	const href = withDashboardScope("/dashboard/signal-logs?stage=risk", scoped);
	const url = new URL(href, "http://x");
	assert.equal(url.pathname, "/dashboard/signal-logs");
	assert.equal(url.searchParams.get("stage"), "risk");
	assert.equal(url.searchParams.get("from_date"), "2026-09-01");
	assert.equal(url.searchParams.get("to_date"), "2026-09-30");
	assert.equal(url.searchParams.get("region"), "Tooro");
	assert.equal(url.searchParams.get("district"), "Kasese");
	assert.equal(url.searchParams.get("division"), null, "\"all\" is not sent");
	assert.equal(url.searchParams.get("disease"), "EbolaVirusDisease,ViralHemorrhagicFever");
});

check("round trip: what the link carries is what the list applies", () => {
	const url = new URL(withDashboardScope("/dashboard/alerts", scoped), "http://x");
	assert.deepEqual(scopeFromSearchParams(url.searchParams), {
		fromDate: "2026-09-01",
		toDate: "2026-09-30",
		region: "Tooro",
		district: "Kasese",
		division: "all",
		disease: "EbolaVirusDisease,ViralHemorrhagicFever",
	});
});

check("a plain visit carries no scope", () => {
	assert.equal(scopeFromSearchParams(new URLSearchParams("stage=triage")), null);
	assert.equal(scopeFromSearchParams(new URLSearchParams("")), null);
	assert.equal(scopeFromSearchParams(null), null);
});

check("one dimension set replaces the rest with \"no filter\"", () => {
	assert.deepEqual(scopeFromSearchParams(new URLSearchParams("district=Gulu")), {
		fromDate: "",
		toDate: "",
		region: "all",
		district: "Gulu",
		division: "all",
		disease: "all",
	});
});

console.log(`dashboard-scope-link: ${passed} checks passed`);
