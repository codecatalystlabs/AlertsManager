import { altCode } from "@/lib/alt-code";
import React, { memo } from "react";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DetailRow } from "@/components/ui/detail-fields";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";
import { EidsrLifecycleTimeline } from "@/components/eidsr-alerts/eidsr-lifecycle-timeline";
import { ExternalLink } from "lucide-react";

interface EidsrMessageDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	message: EidsrMessage | null;
}

export const EidsrMessageDetailsDialog = memo<EidsrMessageDetailsDialogProps>(
	({ isOpen, onClose, message }) => {
		if (!message) return null;

		const linkedId = message.linkedAlertId;
		const verified = isEidsr6767Verified(message);

		return (
			<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							EIDSR SMS #{message.id}
							{message.messageId && message.messageId !== String(message.id) && (
								<span className="text-sm font-normal text-muted-foreground ml-2">
									({message.messageId})
								</span>
							)}
						</DialogTitle>
					</DialogHeader>

					<div className="flex flex-wrap gap-2 items-center">
						{verified ? (
							<Badge className="bg-success/15 text-success hover:bg-success/15">Verified</Badge>
						) : (
							<Badge variant="secondary">Unverified</Badge>
						)}
						{message.status && (
							<Badge variant="outline">{message.status}</Badge>
						)}
						{linkedId != null && (
							<Button variant="outline" size="sm" className="h-7 gap-1" asChild>
								<Link href="/dashboard/alerts">
									<ExternalLink className="h-3.5 w-3.5" />
									View alert {altCode(linkedId)}
								</Link>
							</Button>
						)}
					</div>

					<Separator />
					<EidsrLifecycleTimeline message={message} />
					<Separator />

					<dl className="space-y-2">
						<DetailRow label="Reporter" value={message.personReporting} />
						<DetailRow label="Phone" value={message.contactNumber} />
						<DetailRow
							label="District"
							value={message.alertCaseDistrict}
						/>
						<DetailRow label="Village" value={message.village} />
						<DetailRow label="Sub-county" value={message.subCounty} />
						<DetailRow label="Source" value={message.sourceOfAlert} />
						<DetailRow label="Case name" value={message.alertCaseName} />
						<DetailRow
							label="Age / sex"
							value={
								[message.alertCaseAge, message.alertCaseSex]
									.filter((x) => x != null && x !== "")
									.join(" / ") || undefined
							}
						/>
						<DetailRow label="Symptoms" value={message.symptoms} />
						<DetailRow label="Actions" value={message.actions} />
						<DetailRow label="Feedback" value={message.feedback} />
						<DetailRow label="Message" value={message.messageText} />
						<DetailRow
							label="Received"
							value={message.receivedAt || message.createdAt}
						/>
						<DetailRow
							label="Linked alert ID"
							value={linkedId != null ? String(linkedId) : undefined}
						/>
						<DetailRow
							label="Verification desk"
							value={message.caseVerificationDesk}
						/>
						<DetailRow
							label="Signal verified"
							value={message.signalVerified}
						/>
						<DetailRow label="Triage" value={message.triage} />
						<DetailRow
							label="Risk level"
							value={message.riskAssessmentLevel}
						/>
					</dl>

					{Object.keys(message.dataValues).length > 0 && (
						<>
							<Separator />
							<h4 className="text-sm font-semibold">Parsed data values</h4>
							<dl className="space-y-2 max-h-48 overflow-y-auto">
								{Object.entries(message.dataValues).map(([key, value]) => (
									<DetailRow key={key} label={key} value={value} />
								))}
							</dl>
						</>
					)}
				</DialogContent>
			</Dialog>
		);
	}
);

EidsrMessageDetailsDialog.displayName = "EidsrMessageDetailsDialog";
