import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck } from "lucide-react";

/**
 * One look for verification/status colours across every table:
 *   verified → soft green, pending → soft amber, anything else → neutral.
 * Tables should use these instead of hand-picking badge classes so the same
 * state never renders in two different colours on two pages.
 */
export const VERIFIED_BADGE_CLASS =
	"gap-1 whitespace-nowrap bg-success/15 text-success hover:bg-success/15";
export const PENDING_BADGE_CLASS =
	"gap-1 whitespace-nowrap bg-warning/15 text-warning hover:bg-warning/15";

/** Verified / Pending chip for a boolean verification state. */
export function VerificationBadge({
	verified,
	title,
}: {
	verified: boolean;
	title?: string;
}) {
	return verified ? (
		<Badge className={VERIFIED_BADGE_CLASS} title={title}>
			<ShieldCheck className="h-3 w-3" />
			Verified
		</Badge>
	) : (
		<Badge className={PENDING_BADGE_CLASS} title={title}>
			<Clock className="h-3 w-3" />
			Pending
		</Badge>
	);
}

/**
 * Free-text verification status (e.g. the NDW "Pending Verification") →
 * consistently coloured chip: pending → amber, verified → green, other →
 * neutral outline.
 */
export function VerificationStatusBadge({ status }: { status: string }) {
	const label = status.trim();
	if (!label) return <span className="text-muted-foreground">—</span>;
	const lower = label.toLowerCase();
	const cls = lower.includes("pending")
		? PENDING_BADGE_CLASS
		: lower.includes("verified")
		? VERIFIED_BADGE_CLASS
		: "";
	if (!cls) {
		return (
			<Badge variant="outline" className="text-[10px] font-normal">
				{label}
			</Badge>
		);
	}
	return <Badge className={`${cls} text-[10px] font-normal`}>{label}</Badge>;
}

/** Case status (Alive/Dead/Unknown/Pending) badge classes — same in every table. */
export function statusBadgeClass(status: string): string {
	switch (status) {
		case "Alive":
			return "bg-green-100 text-green-800 hover:bg-green-200";
		case "Dead":
			return "bg-red-100 text-red-800 hover:bg-red-200";
		default:
			return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
	}
}
