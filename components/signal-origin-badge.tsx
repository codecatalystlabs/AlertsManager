import React from "react";
import {
	MessageSquareText,
	PenLine,
	PlaneLanding,
	Stethoscope,
	type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";
import {
	ORIGIN_6767,
	ORIGIN_DIRECT,
	ORIGIN_ECHIS,
	ORIGIN_POE,
	arrivedRecently,
	isAutoLogged6767,
	isLoggedBySync,
	signalOriginLabel,
	signalOriginOf,
	type SignalOrigin,
} from "@/lib/signal-origin";

const ORIGIN_STYLE: Record<SignalOrigin, { icon: LucideIcon; className: string }> = {
	[ORIGIN_6767]: {
		icon: MessageSquareText,
		className: "border-sky-200 bg-sky-50 text-sky-700",
	},
	[ORIGIN_ECHIS]: {
		icon: Stethoscope,
		className: "border-emerald-200 bg-emerald-50 text-emerald-700",
	},
	[ORIGIN_POE]: {
		icon: PlaneLanding,
		className: "border-violet-200 bg-violet-50 text-violet-700",
	},
	[ORIGIN_DIRECT]: {
		icon: PenLine,
		className: "border-border bg-transparent text-muted-foreground",
	},
};

/** Icon for an origin — shared with the origin filter chips. */
export function signalOriginIcon(origin: SignalOrigin): LucideIcon {
	return ORIGIN_STYLE[origin].icon;
}

/** What the badge's tooltip says about how the signal got here. */
function originTitle(
	origin: SignalOrigin,
	alertFrom: string | null | undefined,
	arrivedAt: string | null | undefined
): string {
	const when = formatDateTime(arrivedAt, "");
	const at = when ? `, ${when}` : "";
	switch (origin) {
		case ORIGIN_6767:
			return isAutoLogged6767(alertFrom)
				? `SMS to 6767 — logged automatically when the 6767 feed was synced${at}`
				: `SMS to 6767 — moved in by hand from the 6767 page${at}`;
		case ORIGIN_ECHIS:
			return isLoggedBySync(alertFrom)
				? `eCHIS — logged automatically when the eCHIS feed was synced${at}`
				: `Forwarded from eCHIS${at}`;
		case ORIGIN_POE:
			return isLoggedBySync(alertFrom)
				? `Point of Entry — logged automatically when the PoE feed was synced${at}`
				: `Forwarded from a Point of Entry${at}`;
		default:
			return `Logged directly in this system${at}`;
	}
}

/**
 * Which door a signal came in through — 6767 SMS, eCHIS, PoE, or logged
 * directly — plus a "New" marker for the first 24 hours after it arrived.
 *
 * The 6767 badge is the one people scan for: those signals arrive by
 * themselves now (logged on sync), so the register has to show at a glance
 * which rows nobody typed in.
 */
export function SignalOriginBadge({
	alertFrom,
	arrivedAt,
	className,
}: {
	alertFrom: string | null | undefined;
	/** When it entered the register (forwardedAt for a feed, else createdAt). */
	arrivedAt?: string | null;
	className?: string;
}) {
	const origin = signalOriginOf(alertFrom);
	const { icon: Icon, className: tone } = ORIGIN_STYLE[origin];
	const isNew = arrivedRecently(arrivedAt);

	return (
		<span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
			<Badge
				variant="outline"
				className={cn("gap-1 px-1.5 text-[10px] font-semibold", tone)}
				title={originTitle(origin, alertFrom, arrivedAt)}
			>
				<Icon className="h-3 w-3" aria-hidden />
				{signalOriginLabel(origin)}
			</Badge>
			{isNew && (
				<span
					className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary"
					title="Arrived in the last 24 hours"
				>
					New
				</span>
			)}
		</span>
	);
}
