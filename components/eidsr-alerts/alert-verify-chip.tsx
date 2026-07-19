import { altCode } from "@/lib/alt-code";
import React from "react";
import { VerificationBadge } from "@/components/ui/status-badges";

/**
 * Minimal shape this chip needs from a downstream alert. Both EidsrAlertRef
 * (6767 linked/forwarded alerts) and ForwardedAlertRef (eCHIS/POE forwarded
 * alerts) satisfy it, so the same chip renders verification status everywhere.
 */
export interface VerifiableAlertRef {
	id: number;
	isVerified: boolean;
	verifiedBy?: string;
	verificationDate?: string;
}


/** RFC3339 → short local date; empty/invalid → "". */
function shortDate(value: string | undefined): string {
	if (!value) return "";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

/** Human title describing the downstream alert's verification state. */
export function alertVerifyTitle(alert: VerifiableAlertRef): string {
	if (!alert.isVerified) return `${altCode(alert.id)} not yet verified`;
	const who = alert.verifiedBy?.trim();
	const when = shortDate(alert.verificationDate);
	const tail = [who && `by ${who}`, when && `on ${when}`]
		.filter(Boolean)
		.join(" ");
	return `${altCode(alert.id)} verified${tail ? ` ${tail}` : ""}`;
}

/**
 * Verified/Pending chip for a downstream alert (the verify-linked or forwarded
 * alert a 6767 event points at). Renders nothing when there is no alert to
 * describe (e.g. the alert was deleted), so callers can drop it in unconditionally.
 */
export function AlertVerifyChip({
	alert,
}: {
	alert: VerifiableAlertRef | null | undefined;
}) {
	if (!alert) return null;

	return (
		<VerificationBadge
			verified={alert.isVerified}
			title={alertVerifyTitle(alert)}
		/>
	);
}
