import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	dataValueByProgramField,
	pickLinkedAlertId,
} from "@/lib/eidsr-message-normalize";

/** Read linked alert id from dataValues (friendly keys or element-id map). */
export function pickLinkedAlertIdFromDataValues(
	dataValues: Record<string, string>
): number | null {
	for (const key of [
		"linkedAlertId",
		"linked_alert_id",
		"alertId",
		"alert_id",
	]) {
		const n = Number(dataValues[key]);
		if (Number.isFinite(n) && n > 0) return n;
	}
	for (const [key, val] of Object.entries(dataValues)) {
		const k = key.toLowerCase();
		if (
			(k.includes("linked") && k.includes("alert")) ||
			k === "alertid"
		) {
			const n = Number(val);
			if (Number.isFinite(n) && n > 0) return n;
		}
	}
	return null;
}

export function isPositiveVerifiedText(value: string): boolean {
	const v = value.trim().toLowerCase();
	if (!v) return false;
	if (
		["no", "false", "0", "unverified", "pending", "not verified", "n"].includes(
			v
		)
	) {
		return false;
	}
	if (
		["yes", "true", "1", "verified", "complete", "completed", "y"].includes(v)
	) {
		return true;
	}
	return v.includes("verified") || v.includes("complete");
}

export function resolveEidsrVerifiedState(input: {
	linkedAlertId?: number | null;
	raw?: Record<string, unknown>;
	dataValues?: Record<string, string>;
	signalVerified?: string;
	isVerified?: boolean;
}): { linkedAlertId: number | null; isVerified: boolean } {
	const dv = input.dataValues ?? {};
	let linked =
		input.linkedAlertId ??
		(input.raw ? pickLinkedAlertId(input.raw) : null) ??
		pickLinkedAlertIdFromDataValues(dv);

	if (linked != null && (!Number.isFinite(linked) || linked <= 0)) {
		linked = null;
	}

	const signal =
		(input.signalVerified ?? "").trim() ||
		dataValueByProgramField(dv, "verifiedFlag");
	const verificationStatus = dataValueByProgramField(dv, "verificationStatus");

	const isVerified =
		linked != null ||
		isPositiveVerifiedText(signal) ||
		isPositiveVerifiedText(verificationStatus) ||
		input.isVerified === true;

	return { linkedAlertId: linked, isVerified };
}

/** Whether a 6767 row should show as verified (linked and/or EIDSR signal verified). */
export function isEidsr6767Verified(message: EidsrMessage): boolean {
	return resolveEidsrVerifiedState({
		linkedAlertId: message.linkedAlertId,
		raw: message.raw,
		dataValues: message.dataValues,
		signalVerified: message.signalVerified,
		isVerified: message.isVerified,
	}).isVerified;
}
