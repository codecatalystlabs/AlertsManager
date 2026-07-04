"use client";

// THROWAWAY test harness for verifying the Call Logs "Export to PDF" fix.
// Invokes the exact same code path the row-actions dropdown now runs:
//   downloadAlertConfirmationPdf(alertLogToPdfData(row))
// Delete this route after testing.

import { useState } from "react";
import { alertLogToPdfData } from "@/constants/call-logs";
import { downloadAlertConfirmationPdf } from "@/lib/alert-pdf";
import type { AlertLog } from "@/hooks/use-call-logs-data";

// A real row pulled from the alerts table (id 6182), shaped like AlertLog.
const realRow = {
	id: 6182,
	status: "Alive",
	date: "2026-06-26",
	time: "03:00",
	callTaker: "",
	personReporting: "Nakhaima joseph",
	contactNumber: "256779393495",
	sourceOfAlert: "Direct call",
	response: "AnimalBites", // code not in alertResponse → falls back to raw
	region: "Western",
	alertCaseDistrict: "Buhweju District",
	subCounty: "Magale Town Council",
	alertCaseVillage: "Buwesa Magale town council",
	alertCaseParish: "Buwesa",
	alertCaseName: "Alert a 6yrs old bitten by a stray dog in Magale town council",
	alertCaseAge: 6,
	alertCaseSex: "Male",
	pointOfContactName: "",
	pointOfContactPhone: "",
	history: "Alert a 6yrs old bitten by a stray dog in Magale town council",
	narrative: "Alert a 6yrs old bitten by a stray dog in Magale town council",
	symptoms: "Given Td, advised to go for Td within 72 hours, wound cleaned",
	alertReportedBefore: "No",
	isVerified: true,
	createdAt: "2026-06-27T07:37:23.704Z",
} as unknown as AlertLog;

// A known disease code + edge cases: empty createdAt (guarded), empty symptoms.
const edgeRow = {
	id: 42,
	status: "Dead",
	date: "2026-07-01",
	time: "14:30",
	callTaker: "Jane Taker",
	personReporting: "Anon Reporter",
	contactNumber: "",
	sourceOfAlert: "6767",
	response: "Cholera", // real code → should resolve to "Cholera"
	region: "Central",
	alertCaseDistrict: "Kampala",
	subCounty: "Central Division",
	alertCaseVillage: "",
	alertCaseParish: "",
	alertCaseName: "Test Patient",
	alertCaseAge: 30,
	alertCaseSex: "Female",
	pointOfContactName: "Kin Person",
	pointOfContactPhone: "256700000000",
	history: "",
	narrative: "",
	symptoms: "",
	alertReportedBefore: "Yes",
	isVerified: false,
	createdAt: "", // invalid/empty → parseTimestamp must yield undefined, not crash
} as unknown as AlertLog;

export default function PdfTestPage() {
	const [log, setLog] = useState<string[]>([]);
	const append = (m: string) => setLog((l) => [...l, m]);

	const run = async (row: AlertLog, label: string) => {
		try {
			const mapped = alertLogToPdfData(row);
			append(`[${label}] mapped: ${JSON.stringify(mapped)}`);
			await downloadAlertConfirmationPdf(mapped);
			append(`[${label}] downloadAlertConfirmationPdf resolved OK ✅`);
		} catch (err) {
			append(
				`[${label}] ERROR ❌ ${
					err instanceof Error ? err.message : String(err)
				}`
			);
		}
	};

	return (
		<div style={{ padding: 24, fontFamily: "sans-serif" }}>
			<h1>Call Logs PDF export — test harness</h1>
			<div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
				<button
					id="btn-real"
					onClick={() => run(realRow, "real")}
					style={{ padding: "8px 16px", background: "#d90000", color: "#fff", border: 0, borderRadius: 6 }}
				>
					Export real row (id 6182)
				</button>
				<button
					id="btn-edge"
					onClick={() => run(edgeRow, "edge")}
					style={{ padding: "8px 16px", background: "#333", color: "#fff", border: 0, borderRadius: 6 }}
				>
					Export edge row (empty createdAt/symptoms)
				</button>
			</div>
			<pre id="log" style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 6 }}>
				{log.join("\n")}
			</pre>
		</div>
	);
}
