"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { notifyAlertsChanged } from "@/lib/alerts-events";
import { altCode } from "@/lib/alt-code";
import { signalRegisterHref } from "@/lib/signal-register-link";

interface ForwardToDistrictDialogProps {
	isOpen: boolean;
	onClose: () => void;
	/** What is being forwarded, e.g. "eCHIS signal", "POE alert", "6767 alert". */
	sourceLabel: string;
	/** Override dialog title (default: Forward to a district). */
	title?: string;
	/** Override dialog description. */
	description?: string;
	/** Override primary button label. */
	submitLabel?: string;
	/** Override success toast title. */
	successTitle?: string;
	/** Pre-selected district (eCHIS rows carry their own district; POE/6767 do not). */
	defaultDistrict?: string;
	/** District this row was last forwarded to, if any (shows a re-forward warning). */
	alreadyForwarded?: string | null;
	/**
	 * The endpoint can forward a signal that is already in the Signal Register
	 * a second time (eCHIS / POE). The dialog then offers "Forward again"
	 * instead of refusing, and passes `again` to `onForward`.
	 */
	allowRepeat?: boolean;
	/** The live Signal Register row the signal already has, when known. */
	registerAlertId?: number | null;
	/** Optional reported location hint shown under the district field. */
	reportedLocation?: string | null;
	/**
	 * Performs the forward request; resolves with the destination district.
	 * `again` is true when the person chose to forward a signal that is
	 * already in the register. A rejection carrying `status: 409` means the
	 * signal is already there.
	 */
	onForward: (
		district: string,
		note: string | undefined,
		again: boolean
	) => Promise<{ district: string }>;
	/** Called after a successful forward, with the destination district. */
	onForwarded: (district: string) => void;
}

/**
 * Forward a signal to a district as a call-log alert. Source-agnostic: the
 * caller supplies `onForward` (which endpoint to hit) and a `sourceLabel`, so
 * the 6767 (EIDSR), eCHIS and POE feeds all reuse this one dialog.
 *
 * With `allowRepeat`, a signal already in the register can be forwarded again:
 * the dialog names the existing row and asks for it explicitly, because the
 * result is a second row for one signal — the duplicate that triage's first
 * question ("reported before?") then discards. The same prompt appears when
 * the server answers 409 for a row the page did not know was in the register.
 */
export function ForwardToDistrictDialog({
	isOpen,
	onClose,
	sourceLabel,
	title = "Forward to a district",
	description,
	submitLabel = "Forward to Signal Register",
	successTitle = "Signal forwarded",
	defaultDistrict,
	alreadyForwarded,
	allowRepeat = false,
	registerAlertId,
	reportedLocation,
	onForward,
	onForwarded,
}: ForwardToDistrictDialogProps) {
	const { toast } = useToast();
	const [district, setDistrict] = useState("");
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// The server's 409 text, when it reports a register row the page's copy
	// of the record did not show (e.g. the sync logged it meanwhile).
	const [conflict, setConflict] = useState<string | null>(null);

	// Reset the form (and seed the default district) whenever a different row opens.
	useEffect(() => {
		if (isOpen) {
			setDistrict(defaultDistrict?.trim() || "");
			setNote("");
			setError(null);
			setConflict(null);
		}
	}, [isOpen, defaultDistrict]);

	const warnForwarded = alreadyForwarded?.trim() || "";
	const locationHint = reportedLocation?.trim() || "";
	const existingId =
		registerAlertId != null && registerAlertId > 0 ? registerAlertId : null;
	const repeat = allowRepeat && (existingId != null || conflict != null);

	const handleSubmit = async () => {
		if (!district.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const result = await onForward(
				district.trim(),
				note.trim() || undefined,
				repeat
			);
			toast({
				title: repeat ? "Signal forwarded again" : successTitle,
				description: `Sent to ${result.district}. Open Signal Register to triage it.`,
			});
			notifyAlertsChanged();
			onForwarded(result.district);
			onClose();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to forward alert";
			const status = (err as { status?: number } | null)?.status;
			if (allowRepeat && !repeat && status === 409) {
				// Not a failure to report: it is the question the dialog asks
				// up front when it knows. Ask it now.
				setConflict(msg);
				return;
			}
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
					<DialogTitle>{repeat ? "Forward again" : title}</DialogTitle>
					<DialogDescription>
						{description ??
							`Send this ${sourceLabel} to a district as a signal in the Signal Register. It will not appear in Alerts Management until verified there.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{repeat ? (
						<Alert className="surface-warning">
							<AlertDescription className="space-y-1 text-warning">
								<p className="font-medium">
									{existingId != null ? (
										<>
											Already in the Signal Register as{" "}
											<Link
												href={signalRegisterHref(existingId)}
												className="font-mono underline underline-offset-2"
											>
												{altCode(existingId)}
											</Link>
											{warnForwarded ? ` (${warnForwarded})` : ""}.
										</>
									) : (
										conflict
									)}
								</p>
								<p>
									Forwarding again adds a second row for this {sourceLabel}.
									At triage, answer “reported before” on the copy that is
									not needed and it is discarded as a duplicate. To only
									change the district, edit the existing row instead.
								</p>
							</AlertDescription>
						</Alert>
					) : warnForwarded && (
						<Alert className="surface-warning">
							<AlertDescription className="text-warning">
								Already forwarded to {warnForwarded}. A signal has
								one row in the Signal Register: to move it, change
								the district on that row instead.
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
						{locationHint ? (
							<p className="text-xs text-muted-foreground">
								Reported location: {locationHint}
							</p>
						) : null}
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
						{repeat ? "Forward again" : submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
