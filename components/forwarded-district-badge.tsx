import Link from "next/link";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	forwardedToLabel,
	signalRegisterHref,
} from "@/lib/signal-register-link";
import { AlertVerifyChip } from "@/components/eidsr-alerts/alert-verify-chip";
import type { VerifiableAlertRef } from "@/components/eidsr-alerts/alert-verify-chip";

interface ForwardedDistrictBadgeProps {
	district: string;
	forwardedAlertId?: number | null;
	forwardedAlert?: VerifiableAlertRef | null;
}

/** Shared "Forwarded to {district}" badge + optional link to Signal Register. */
export function ForwardedDistrictBadge({
	district,
	forwardedAlertId,
	forwardedAlert,
}: ForwardedDistrictBadgeProps) {
	const label = forwardedToLabel(district);
	const href =
		forwardedAlertId != null && forwardedAlertId > 0
			? signalRegisterHref(forwardedAlertId)
			: null;

	return (
		<div className="flex flex-col items-start gap-1">
			{href ? (
				<Link href={href} className="inline-flex">
					<Badge
						variant="outline"
						className="gap-1 whitespace-nowrap text-[10px] font-normal hover:bg-muted"
						title={label}
					>
						<Send className="h-3 w-3" />
						{label}
					</Badge>
				</Link>
			) : (
				<Badge
					variant="outline"
					className="gap-1 whitespace-nowrap text-[10px] font-normal"
					title={label}
				>
					<Send className="h-3 w-3" />
					{label}
				</Badge>
			)}
			<AlertVerifyChip alert={forwardedAlert} />
		</div>
	);
}
