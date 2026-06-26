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
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { forwardEidsr6767 } from "@/lib/fetch-eidsr-6767";
import { DistrictSelect } from "@/components/district-select";
import { useToast } from "@/hooks/use-toast";

interface ForwardAlertDialogProps {
	isOpen: boolean;
	onClose: () => void;
	message: EidsrMessage | null;
	/** Called after a successful forward, with the destination district. */
	onForwarded: (district: string) => void;
}

export function ForwardAlertDialog({
	isOpen,
	onClose,
	message,
	onForwarded,
}: ForwardAlertDialogProps) {
	const { toast } = useToast();
	const [district, setDistrict] = useState("");
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset the form whenever a different message is opened.
	useEffect(() => {
		if (isOpen) {
			setDistrict("");
			setNote("");
			setError(null);
		}
	}, [isOpen, message?.id]);

	const alreadyForwarded = message?.forwardedToDistrict?.trim() || "";

	const handleSubmit = async () => {
		if (!message || !district.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const result = await forwardEidsr6767(message.id, {
				district: district.trim(),
				note: note.trim() || undefined,
			});
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
						Send this 6767 alert to a district as a call log. It will
						appear in that district&apos;s Call Logs.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{alreadyForwarded && (
						<Alert className="surface-warning">
							<AlertDescription className="text-warning">
								Already forwarded to {alreadyForwarded}.
								Forwarding again will create another call log.
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
					<Button
						variant="outline"
						onClick={onClose}
						disabled={submitting}
					>
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
