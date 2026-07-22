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
	/** Performs the forward request; resolves with the destination district. */
	onForward: (
		district: string,
		note?: string
	) => Promise<{ district: string }>;
	/** Called after a successful forward, with the destination district. */
	onForwarded: (district: string) => void;
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
	onForward,
	onForwarded,
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
				title: "Alert forwarded",
				description: `Sent to ${result.district} as a call log.`,
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
					<DialogTitle>Forward alert to a district</DialogTitle>
					<DialogDescription>
						Send this {sourceLabel} to a district as a call log. It will
						appear in that district&apos;s Call Logs and can be verified
						there.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{warnForwarded && (
						<Alert className="surface-warning">
							<AlertDescription className="text-warning">
								Already forwarded to {warnForwarded}. Forwarding
								again will create another call log.
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
						Forward alert
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
