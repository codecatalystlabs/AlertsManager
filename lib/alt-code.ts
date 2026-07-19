/**
 * Canonical formatter for an alert's human-facing code (`ALT001`, `ALT042`, …).
 *
 * This was previously re-implemented ~14 times across tables, dialogs, exports
 * and PDFs (and defined as a local `altCode()` twice), so any change to the
 * zero-padding width or prefix had to be made everywhere. Import this instead.
 *
 * @param id       the numeric alert id (nullable — unsaved/unlinked alerts)
 * @param fallback returned when `id` is null/undefined (default `""`)
 */
export function altCode(
	id: number | null | undefined,
	fallback = "",
): string {
	return id != null ? `ALT${String(id).padStart(3, "0")}` : fallback;
}
