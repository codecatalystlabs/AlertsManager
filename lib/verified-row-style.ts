/** Verified / linked-to-alerts rows: bold green text in every cell.
 *  Targets `[data-cell]` so it works for both desktop `<td>`s and mobile cards. */
export const VERIFIED_TABLE_ROW_CLASS =
	"[&_[data-cell]]:!font-bold [&_[data-cell]]:!text-green-800 [&_[data-cell]_span]:!text-green-800 [&_[data-cell]_button]:!text-green-800";

export function verifiedTableRowClass(isVerified: boolean): string | undefined {
	return isVerified ? VERIFIED_TABLE_ROW_CLASS : undefined;
}
