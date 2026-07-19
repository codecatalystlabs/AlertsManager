import { altCode } from "@/lib/alt-code";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Inbox, Send, ShieldCheck } from "lucide-react";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { AlertVerifyChip } from "@/components/eidsr-alerts/alert-verify-chip";

function fmt(value: string | null | undefined): string {
	if (!value) return "";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}


/**
 * End-to-end trail of a 6767 alert on the EOC side: received → forwarded to a
 * district (and whether that district verified it) → verified into alerts. Driven
 * by the live alert refs the server joins onto the event, so the EOC can trace an
 * alert all the way to its downstream verification outcome without leaving 6767.
 */
export function EidsrLifecycleTimeline({ message }: { message: EidsrMessage }) {
	const received = message.receivedAt || message.createdAt;
	const hasForward = !!message.forwardedToDistrict;
	const hasLink = message.linkedAlertId != null;

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-semibold">Traceability</h4>
			<ol className="space-y-3">
				<li className="flex gap-3">
					<Inbox className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Received via 6767</p>
						{received && (
							<p className="text-xs text-muted-foreground">
								{fmt(received)}
							</p>
						)}
					</div>
				</li>

				{hasForward && (
					<li className="flex gap-3">
						<Send className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
						<div className="space-y-1">
							<p className="text-sm font-medium">
								Forwarded to {message.forwardedToDistrict}
							</p>
							{message.forwardedAt && (
								<p className="text-xs text-muted-foreground">
									{fmt(message.forwardedAt)}
								</p>
							)}
							<div className="flex flex-wrap items-center gap-2">
								<AlertVerifyChip alert={message.forwardedAlert} />
								{message.forwardedAlertId != null && (
									<Button
										variant="outline"
										size="sm"
										className="h-7 gap-1"
										asChild
									>
										<Link href="/dashboard/call-logs">
											<ExternalLink className="h-3.5 w-3.5" />
											{altCode(message.forwardedAlertId)}
										</Link>
									</Button>
								)}
							</div>
						</div>
					</li>
				)}

				{hasLink && (
					<li className="flex gap-3">
						<ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
						<div className="space-y-1">
							<p className="text-sm font-medium">
								Verified into alerts ({altCode(message.linkedAlertId as number)})
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<AlertVerifyChip alert={message.linkedAlert} />
								<Button
									variant="outline"
									size="sm"
									className="h-7 gap-1"
									asChild
								>
									<Link href="/dashboard/alerts">
										<ExternalLink className="h-3.5 w-3.5" />
										{altCode(message.linkedAlertId as number)}
									</Link>
								</Button>
							</div>
						</div>
					</li>
				)}

				{!hasForward && !hasLink && (
					<li className="text-xs text-muted-foreground">
						Not yet forwarded or verified.
					</li>
				)}
			</ol>
		</div>
	);
}
