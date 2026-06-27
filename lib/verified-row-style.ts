/**
 * Verified / linked rows are indicated solely by the green "Yes" pill in the
 * Verified column. We intentionally do NOT recolor the row's text or background:
 * the previous treatment forced bold green text on every cell, which made entire
 * rows read as green once the styles were actually generated.
 */
export function verifiedTableRowClass(_isVerified: boolean): string | undefined {
	return undefined;
}
