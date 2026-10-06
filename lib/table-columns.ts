import type { VisibilityState } from "@tanstack/react-table";

/**
 * The column standard every signal table follows (Signal Register queues,
 * Alerts, 6767, eCHIS, PoE). A list exists to answer "what needs attention?",
 * so it shows what identifies and triages a row, in the same order everywhere:
 *
 *   1. ID, then the row's next step (worklists only)
 *   2. The column that defines the list, if any (Discarded at, Risk…)
 *   3. WHEN — one "Received"/"Reported" column: date + real time, "30 Sep 2026"
 *   4. WHAT — what was reported: the coded EBS signal, else the report text
 *   5. WHERE — district / port / location
 *   6. HOW it came in — origin, source of alert
 *   7. Status columns — case status, verification, where it went
 *
 * Contact details and identifiers — the reporter's own name, phone numbers,
 * passport and flight numbers, reference codes — are HIDDEN by default: they
 * do not help anyone decide what to work next, and a list on a shared screen is
 * the wrong place to display them. They stay one click away under Columns, in
 * the row's details, and in the full-record downloads (the register's and
 * Alerts page's Export CSV / Excel). The table's own quick export follows what
 * is on screen, so it includes them once they are switched on.
 */

/** A table's default visibility with the given columns switched off. */
export function hiddenByDefault(...columnIds: string[]): VisibilityState {
	return Object.fromEntries(columnIds.map((id) => [id, false]));
}

/**
 * Bumped when the standard itself changes. A table's saved layout (visibility,
 * order, widths, pins) is dropped once when this or the table's default
 * visibility changes — otherwise everyone who ever opened a table would keep
 * the layout it had then, and a new default would reach nobody.
 */
export const TABLE_LAYOUT_VERSION = 2;
