/**
 * Canonical district name: strip a trailing " District" suffix so duplicate
 * spellings ("Amuru" and "Amuru District") collapse to one. Note that " City"
 * is intentionally NOT stripped — "Arua City" and "Arua" are distinct units.
 */
export function canonicalDistrictName(name: string): string {
	return name.replace(/\s+district$/i, "").trim();
}
