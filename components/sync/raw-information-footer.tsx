import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutoLogReport } from "@/lib/sync-progress";
import type { SignalOrigin } from "@/lib/signal-origin";

/**
 * Footer for a finished feed sync (6767, eCHIS, PoE) that logged signals into
 * Raw Information: where they went, and a link that opens the register on that
 * feed's signals. Renders nothing when the sync logged none.
 */
export function RawInformationSyncFooter({
	autoLog,
	origin,
	children,
}: {
	autoLog: AutoLogReport | null | undefined;
	origin: SignalOrigin;
	/** One sentence on the logged signals: how they are flagged, where their district came from. */
	children: ReactNode;
}) {
	if (!autoLog || autoLog.logged <= 0) return null;
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<p className="text-xs text-muted-foreground">{children}</p>
			<Button asChild size="sm" className="h-8 gap-1.5">
				<Link href={`/dashboard/signal-logs?origin=${origin}`}>
					Triage them in Raw Information
					<ArrowRight className="h-4 w-4" />
				</Link>
			</Button>
		</div>
	);
}
