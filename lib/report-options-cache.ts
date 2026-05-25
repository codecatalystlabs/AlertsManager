import type { ReportOptions } from "@/lib/fetch-reports";
import { fetchReportOptions } from "@/lib/fetch-reports";

const FRESH_MS = 10 * 60 * 1000;

let memory: { options: ReportOptions; fetchedAt: number } | null = null;
let inflight: Promise<ReportOptions> | null = null;

export function getCachedReportOptions(): ReportOptions | null {
	if (!memory) return null;
	if (Date.now() - memory.fetchedAt >= FRESH_MS) return null;
	return memory.options;
}

/** Deduped fetch for districts/metrics used by alerts filters and reports toolbar. */
export async function loadReportOptions(): Promise<ReportOptions> {
	const cached = getCachedReportOptions();
	if (cached) return cached;

	if (inflight) return inflight;

	inflight = fetchReportOptions()
		.then((options) => {
			memory = { options, fetchedAt: Date.now() };
			return options;
		})
		.finally(() => {
			inflight = null;
		});

	return inflight;
}
