import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { forwardEchisAlert, listEchisAlerts } from "@/lib/fetch-ndw-alerts";
import { buildForwardToSignalPayload } from "@/lib/forward-to-signal-payload";

const AUTO_FORWARD_NOTE =
	"Auto-forwarded to district from eCHIS signal";
const AUTO_FORWARD_SESSION_KEY = "echis-auto-forwarded-ids";

let autoForwardInFlight = false;

function readAutoForwardedIds(): Set<number> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = sessionStorage.getItem(AUTO_FORWARD_SESSION_KEY);
		if (!raw) return new Set();
		const ids = JSON.parse(raw) as number[];
		return new Set(ids.filter((id) => Number.isFinite(id)));
	} catch {
		return new Set();
	}
}

function markAutoForwarded(id: number): void {
	if (typeof window === "undefined") return;
	const ids = readAutoForwardedIds();
	ids.add(id);
	sessionStorage.setItem(
		AUTO_FORWARD_SESSION_KEY,
		JSON.stringify([...ids])
	);
}

function shouldAutoForward(
	row: EchisAlertRow,
	alreadyForwardedThisSession: Set<number>
): boolean {
	if (row.live) return false;
	const district = row.district?.trim();
	if (!district) return false;
	if (row.forwardedToDistrict?.trim()) return false;
	if (alreadyForwardedThisSession.has(row.id)) return false;
	return true;
}

/**
 * After an eCHIS sync, forward local rows that have a district but are not yet
 * forwarded. Skips rows already auto-forwarded this browser session so a slow
 * API stamp does not trigger duplicate forwards on every page visit.
 */
export async function autoForwardEchisDistrictSignals(): Promise<number> {
	if (autoForwardInFlight) return 0;
	autoForwardInFlight = true;

	try {
		const alreadyForwardedThisSession = readAutoForwardedIds();
		let page = 1;
		let forwarded = 0;
		const limit = 100;

		while (true) {
			const { alerts, pagination } = await listEchisAlerts({ page, limit });
			for (const row of alerts) {
				if (!shouldAutoForward(row, alreadyForwardedThisSession)) continue;
				try {
					await forwardEchisAlert(
						row.id,
						buildForwardToSignalPayload(row.district, AUTO_FORWARD_NOTE)
					);
					markAutoForwarded(row.id);
					alreadyForwardedThisSession.add(row.id);
					forwarded += 1;
				} catch {
					/* skip rows the API rejects; continue with the rest */
				}
			}
			if (page >= (pagination.totalPages || 1)) break;
			page += 1;
		}

		return forwarded;
	} finally {
		autoForwardInFlight = false;
	}
}
