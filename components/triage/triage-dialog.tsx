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
import {
	PRIORITY_GUIDANCE,
	TRIAGE_PRIORITIES,
	formatDeadline,
	normalizePriority,
	type AlertPriority,
} from "@/lib/alert-triage";
import { Loader2, ShieldQuestion } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

/**
 * Triage — step 2 of the EBS pipeline.
 *
 * The dialog states each priority's deadline next to its definition, because
 * the priority IS the deadline: picking "High" commits the team to verifying
 * within 12 hours. Showing the consequence at the point of choice is what keeps
 * priorities comparable between focal persons.
 */
export function TriageDialog({
	open,
	onOpenChange,
	alertId,
	currentPriority,
	onTriaged,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alertId: number | null;
	currentPriority?: string | null;
	onTriaged?: () => void;
}) {
	const [priority, setPriority] = useState<AlertPriority | null>(null);
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	// Re-seed from the alert each time the dialog opens, so re-triaging starts
	// from the current decision rather than the previous alert's.
	useEffect(() => {
		if (open) {
			setPriority(normalizePriority(currentPriority));
			setNote("");
		}
	}, [open, currentPriority]);

	const submit = useCallback(async () => {
		if (!alertId || !priority) return;
		setSaving(true);
		try {
			const response = await AuthService.makeAuthenticatedRequest(
				`${API_BASE_URL}/alerts/${alertId}/triage`,
				{
					method: "POST",
					body: JSON.stringify({ priority, note: note.trim() || undefined }),
				}
			);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Failed to record triage");
			}
			hotToast.success(
				`${altCode(alertId)} triaged ${priority} — verify within ${formatDeadline(priority)}`
			);
			onTriaged?.();
			onOpenChange(false);
		} catch (e) {
			hotToast.error(e instanceof Error ? e.message : "Failed to record triage");
		} finally {
			setSaving(false);
		}
	}, [alertId, priority, note, onTriaged, onOpenChange]);

	const retriage = Boolean(normalizePriority(currentPriority));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<ShieldQuestion className="h-4 w-4 text-uganda-red" />
						{retriage ? "Re-triage" : "Triage"} {altCode(alertId)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Does this signal plausibly threaten public health, and has it been
						reported before? The priority you assign sets the deadline for
						verifying it.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-2">
						{TRIAGE_PRIORITIES.map((option) => {
							const selected = priority === option;
							return (
								<button
									key={option}
									type="button"
									onClick={() => setPriority(option)}
									aria-pressed={selected}
									className={cn(
										"w-full rounded-lg border p-3 text-left transition-colors",
										selected
											? "border-uganda-red bg-uganda-red/5 ring-1 ring-uganda-red"
											: "border-gray-200 hover:bg-gray-50"
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-semibold">{option}</span>
										<span
											className={cn(
												"rounded px-1.5 py-0.5 text-[10px] font-semibold",
												selected
													? "bg-uganda-red text-white"
													: "bg-gray-100 text-gray-600"
											)}
										>
											verify within {formatDeadline(option)}
										</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{PRIORITY_GUIDANCE[option]}
									</p>
								</button>
							);
						})}
					</div>

					<div className="space-y-1">
						<Label htmlFor="triage-note" className="text-xs">
							Why this priority? <span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							id="triage-note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="e.g. cluster of 3 in one village, bleeding reported"
							className="min-h-[64px] text-xs"
						/>
						<p className="text-[11px] text-muted-foreground">
							Kept on the signal&apos;s traceability timeline, so a later
							re-triage does not erase the original reasoning.
						</p>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={submit} disabled={!priority || saving}>
						{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						{retriage ? "Update priority" : "Record triage"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
