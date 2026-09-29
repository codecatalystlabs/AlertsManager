import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	PENDING_BADGE_CLASS,
	VERIFIED_BADGE_CLASS,
} from "@/components/ui/status-badges";
import { altCode } from "@/lib/alt-code";
import { cn } from "@/lib/utils";
import {
	resolveRegisterRef,
	type EidsrAlertRef,
	type EidsrMessage,
} from "@/lib/eidsr-message-normalize";
import { signalRegisterHref } from "@/lib/signal-register-link";
import { isAutoLogged6767 } from "@/lib/signal-origin";

/** Where the register row stands now: untriaged, triaged, or verified. */
function stageChip(alert: EidsrAlertRef | null): React.ReactNode {
	if (!alert) return null;
	if (alert.isVerified) {
		return <Badge className={cn(VERIFIED_BADGE_CLASS, "text-[10px]")}>Verified</Badge>;
	}
	if (alert.triaged) {
		return (
			<Badge variant="outline" className="whitespace-nowrap text-[10px]">
				Triaged
			</Badge>
		);
	}
	return <Badge className={cn(PENDING_BADGE_CLASS, "text-[10px]")}>Untriaged</Badge>;
}

function refTitle(
	id: number,
	alert: EidsrAlertRef | null,
	district: string | null
): string {
	const how = isAutoLogged6767(alert?.alertFrom)
		? "Logged automatically when the 6767 feed was synced"
		: "Moved into Raw Information by hand";
	const where = district
		? `district ${district}`
		: "no district yet — set it on the Raw Information row";
	return `${altCode(id)} — ${how}; ${where}. Click to open it.`;
}

/**
 * The 6767 row's place in Raw Information, on one line: its ALT id (a link to
 * the row), the district it was given, and how far through the pipeline it has
 * got. One column, because "is it in Raw Information" and "was it forwarded"
 * have been the same question since logging became the only way in.
 */
export function RawInformationCell({ message }: { message: EidsrMessage }) {
	const ref = resolveRegisterRef(message);
	if (!ref) {
		return (
			<Badge variant="secondary" className="whitespace-nowrap text-[10px]">
				Not logged
			</Badge>
		);
	}
	const district = ref.district ?? ref.alert?.district ?? null;
	return (
		<span className="inline-flex items-center gap-1.5 whitespace-nowrap">
			<Link
				href={signalRegisterHref(ref.id)}
				className="font-mono text-xs font-semibold text-primary underline-offset-2 hover:underline"
				title={refTitle(ref.id, ref.alert, district)}
			>
				{altCode(ref.id)}
			</Link>
			<span
				className={cn(
					"max-w-[140px] truncate text-xs",
					district ? "text-muted-foreground" : "font-medium text-warning"
				)}
			>
				{district ?? "No district"}
			</span>
			{stageChip(ref.alert)}
		</span>
	);
}
