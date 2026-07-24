"use client";

import { useCallback, useEffect, useState } from "react";
import hotToast from "react-hot-toast";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { altCode } from "@/lib/alt-code";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { FEEDBACK_CHANNELS, type FeedbackChannel } from "@/lib/alert-feedback";
import { Loader2, MessageCircleReply, PhoneOff } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

/**
 * Close the loop with the reporter — EBS step 7.
 *
 * The dialog shows WHO is being fed back to and on which number, because the
 * whole point of the step is that a specific person hears back. When the signal
 * carries no contact details that is surfaced rather than hidden: the record can
 * still be made (they may have been told at a meeting), but the operator should
 * know they have no phone route.
 */
export function FeedbackDialog({
	open,
	onOpenChange,
	alertId,
	reporterName,
	reporterPhone,
	onRecorded,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alertId: number | null;
	reporterName?: string | null;
	reporterPhone?: string | null;
	onRecorded?: () => void;
}) {
	const [channel, setChannel] = useState<FeedbackChannel | null>(null);
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setChannel(null);
		setNote("");
	}, [open]);

	const submit = useCallback(async () => {
		if (!alertId || !channel) return;
		setSaving(true);
		try {
			const response = await AuthService.makeAuthenticatedRequest(
				`${API_BASE_URL}/alerts/${alertId}/feedback`,
				{
					method: "POST",
					body: JSON.stringify({ channel, note: note.trim() || undefined }),
				}
			);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Failed to record feedback");
			}
			hotToast.success(`${altCode(alertId)} — reporter told via ${channel}`);
			onRecorded?.();
			onOpenChange(false);
		} catch (e) {
			hotToast.error(
				e instanceof Error ? e.message : "Failed to record feedback"
			);
		} finally {
			setSaving(false);
		}
	}, [alertId, channel, note, onRecorded, onOpenChange]);

	const name = (reporterName ?? "").trim();
	const phone = (reporterPhone ?? "").trim();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<MessageCircleReply className="h-4 w-4 text-uganda-red" />
						Record feedback — {altCode(alertId)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Confirm the reporter was told the outcome. This records that
						feedback was given — it does not send the message.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							Reporter
						</p>
						<p className="text-sm font-medium">{name || "Not recorded"}</p>
						{phone ? (
							<p className="font-mono text-xs text-muted-foreground">{phone}</p>
						) : (
							<p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
								<PhoneOff className="h-3 w-3" />
								No contact number on this signal — no phone or SMS route.
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs">How were they reached?</Label>
						<div className="flex flex-wrap gap-2">
							{FEEDBACK_CHANNELS.map((option) => (
								<button
									key={option}
									type="button"
									aria-pressed={channel === option}
									onClick={() => setChannel(option)}
									className={cn(
										"rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
										channel === option
											? "border-uganda-red bg-uganda-red text-white"
											: "border-gray-200 hover:bg-gray-50"
									)}
								>
									{option}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="feedback-note" className="text-xs">
							What were they told?{" "}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							id="feedback-note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="e.g. explained the case was discarded after lab results came back negative"
							className="min-h-[64px] text-xs"
						/>
						<p className="text-[11px] text-muted-foreground">
							Kept on the signal&apos;s traceability timeline.
						</p>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={submit} disabled={!channel || saving}>
						{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						Record feedback
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
