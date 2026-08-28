"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send } from "lucide-react";
import { DistrictSelect } from "@/components/district-select";
import { useToast } from "@/hooks/use-toast";

interface ForwardToDistrictDialogProps {
	isOpen: boolean;
	onClose: () => void;
	/** What is being forwarded, e.g. "eCHIS signal", "POE alert", "6767 alert". */
	sourceLabel: string;
	/** Pre-selected district (eCHIS rows carry their own district; POE/6767 do not). */
	defaultDistrict?: string;
	/** District this row was last forwarded to, if any (shows a re-forward warning). */
	alreadyForwarded?: string | null;
	/**
	 * What the reporter said about where this signal came from, shown above the
	 * picker. The district is chosen by hand and cannot be derived: 6767 records
	 * a free-text location ("kyabolhokya MLTC KASESE", "Nsambya Hospital") that
	 * resolves to a real district in under 3% of cases. Whoever picks needs the
	 * reporter's own words in front of them, not in a dialog they have to close
	 * this one to read.
	 */
	reportedLocation?: string | null;
	/** Performs the forward request; resolves with the destination district. */
	onForward: (
		district: string,
		note?: string
	) => Promise<{ district: string; alertCode?: string }>;
	/** Called after a successful forward, with the destination district. */
	onForwarded: (district: string) => void;
	/**
	 * Wording overrides. The 6767 feed uses this dialog to MOVE a signal into the
	 * Signal Register — one action, its own vocabulary — while eCHIS and POE
	 * still forward to a district. Same form, same district rule; only the words
	 * differ, so they are props rather than a second copy of the component.
	 */
	title?: string;
	description?: string;
	submitLabel?: string;
	/** Success toast headline, e.g. "Signal moved to the register". */
	successTitle?: string;
}

/**
 * Forward a signal to a district as a call-log alert. Source-agnostic: the
 * caller supplies `onForward` (which endpoint to hit) and a `sourceLabel`, so
 * the 6767 (EIDSR), eCHIS and POE feeds all reuse this one dialog.
 */
export function ForwardToDistrictDialog({
	isOpen,
	onClose,
	sourceLabel,
	defaultDistrict,
	alreadyForwarded,
	reportedLocation,
	onForward,
	onForwarded,
	title = "Forward alert to a district",
	description,
	submitLabel = "Forward alert",
	successTitle = "Alert forwarded",
}: ForwardToDistrictDialogProps) {
	const { toast } = useToast();
	const [district, setDistrict] = useState("");
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset the form (and seed the default district) whenever a different row opens.
	useEffect(() => {
		if (isOpen) {
			setDistrict(defaultDistrict?.trim() || "");
			setNote("");
			setError(null);
		}
	}, [isOpen, defaultDistrict]);

	const warnForwarded = alreadyForwarded?.trim() || "";

	const handleSubmit = async () => {
		if (!district.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const result = await onForward(district.trim(), note.trim() || undefined);
			toast({
				title: successTitle,
				description: result.alertCode
					? `${result.alertCode} created in ${result.district}, ready to triage.`
					: `Sent to ${result.district} as a signal log.`,
			});
			onForwarded(result.district);
			onClose();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to forward alert";
			setError(msg);
			toast({
				title: "Forward failed",
				description: msg,
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => !open && !submitting && onClose()}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{description ??
							`Send this ${sourceLabel} to a district as a signal log. It will appear in that district's Signal Logs and can be verified there.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{warnForwarded && (
						<Alert className="surface-warning">
							<AlertDescription className="text-warning">
								Already sent to {warnForwarded}.
							</AlertDescription>
						</Alert>
					)}

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="forward-district">
							District <span className="text-uganda-red">*</span>
						</Label>
						{reportedLocation?.trim() && (
							<p className="text-xs text-muted-foreground">
								Reported location:{" "}
								<span className="font-medium text-foreground">
									{reportedLocation.trim()}
								</span>
							</p>
						)}
						<DistrictSelect
							id="forward-district"
							value={district}
							onValueChange={setDistrict}
							placeholder="Select the district to forward to"
							disabled={submitting}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="forward-note">
							Note to district (optional)
						</Label>
						<Textarea
							id="forward-note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Any instructions or context for the receiving district…"
							rows={3}
							disabled={submitting}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={submitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={submitting || !district.trim()}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
