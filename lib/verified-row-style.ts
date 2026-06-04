/** Verified / linked-to-alerts table rows: bold green text in every cell. */
export const VERIFIED_TABLE_ROW_CLASS =
	"[&_td]:!font-bold [&_td]:!text-green-800 [&_td_span]:!text-green-800 [&_td_button]:!text-green-800";

export function verifiedTableRowClass(isVerified: boolean): string | undefined {
	return isVerified ? VERIFIED_TABLE_ROW_CLASS : undefined;
}
