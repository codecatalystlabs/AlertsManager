import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck } from "lucide-react";
import type { EidsrAlertRef } from "@/lib/eidsr-message-normalize";

function altCode(id: number): string {
	return `ALT${String(id).padStart(3, "0")}`;
}

/** RFC3339 → short local date; empty/invalid → "". */
function shortDate(value: string): string {
	if (!value) return "";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

/** Human title describing the downstream alert's verification state. */
export function alertVerifyTitle(alert: EidsrAlertRef): string {
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
	alert: EidsrAlertRef | null | undefined;
}) {
	if (!alert) return null;

	if (alert.isVerified) {
		return (
			<Badge
				className="gap-1 whitespace-nowrap bg-green-100 text-green-800 hover:bg-green-100"
				title={alertVerifyTitle(alert)}
			>
				<ShieldCheck className="h-3 w-3" />
				Verified
			</Badge>
		);
	}

	return (
		<Badge
			className="gap-1 whitespace-nowrap bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
			title={alertVerifyTitle(alert)}
		>
			<Clock className="h-3 w-3" />
			Pending
		</Badge>
	);
}
