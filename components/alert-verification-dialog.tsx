"use client";

import { useCallback, useEffect, useState } from "react";

import { altCode } from "@/lib/alt-code";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import {
	CheckCircleIcon,
	XCircleIcon,
	Loader2,
	MapPin,
	ShieldQuestion,
	Trash2,
	TruckIcon,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { verifyEidsrMessage } from "@/lib/fetch-eidsr-messages";
import { verifyEchisAlert, verifyPoeAlert } from "@/lib/fetch-ndw-alerts";
import { buildEidsrVerifyPayload } from "@/lib/eidsr-verify-payload";
import {
	DISCARD_REASONS,
	DISCARD_REASON_GUIDANCE,
	VERIFICATION_CONFIRMED,
	VERIFICATION_DISCARDED,
	VERIFICATION_ESCALATED_FIELD,
	VERIFICATION_LEVEL_DESK,
	VERIFICATION_LEVEL_FIELD,
	legacyDeskValue,
	type VerificationLevel,
	type VerificationOutcome,
} from "@/lib/verification-options";
import { formatDate } from "@/lib/format-date";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { userFullName } from "@/lib/user-name";
import { cn } from "@/lib/utils";
import { SignalSummaryCard } from "@/components/signal-summary";
import { alertEntryStatus, alertResponse } from "@/constants";
import { resolveAlertResponseCode } from "@/lib/resolve-alert-response";

/**
 * Verification — EBS step 3, asked as the one question it actually is.
 *
 * The guideline's verification step answers ONE thing: is this signal a real
 * public-health event? This dialog used to ask forty fields to get there — a
 * case investigation form (CIF number, case name, age, sex, clinical history,
 * traditional healer visits) standing between a verifier and the word "no".
 * Recording a false signal is the cheap, high-volume path in event-based
 * surveillance, and taxing it hardest is how a register fills with invented
 * case data and how the signal-to-event conversion rate stops meaning anything.
 *
 * So the form asks what verification decides, and nothing else:
 *
 *   Is this a true signal?
 *     yes      → CONFIRMED. It is an event, and goes on to risk assessment.
 *     no       → DISCARDED, with a reason from the list. Closed, and the
 *                reporter is owed feedback saying so.
 *     can't tell from here → ESCALATED TO FIELD (desk only).
 *
 * THE SAME QUESTION IS ASKED AT TWO LEVELS. The desk asks it by phone, from
 * the records, and is the only level allowed to decline to answer: a signal it
 * cannot settle goes to a field team, which may take days. The field asks it
 * on site and always concludes, because there is no level beyond it.
 *
 * Both levels use THIS dialog, keyed off `level`, because they are the same
 * question — a second form would be a second definition of verification.
 * What the level changes: the answers offered (three vs two), whose findings
 * the note becomes (verification_note vs field_verification_note), and the
 * handover shown at the top, so a team arriving a week later can see who sent
 * them and what they were asked to check.
 *
 * (It used to open with "Have you verified this signal?", whose "no" branch
 * saved a reason without an outcome. That question was dropped on request
 * (2026-09-22): opening this dialog now means a decision is being recorded.)
 *
 * The verifier is asked to describe the decision in their own words. The
 * outcome says what was decided; only the note says what was checked and on
 * what basis, and for a discard it is the sole record of why nobody pursued
 * the signal.
 *
 * The case details are NOT gone — they are captured at intake and editable in
 * the alert edit dialog, which is where correcting a case record belongs.
 */

interface AlertVerificationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
	onVerificationComplete: () => void;
	/**
	 * Which level is answering. Desk by default; "Field" is opened from the
	 * register row of a signal the desk escalated (or straight from the
	 * register, for a team already going out) and offers no escalation.
	 */
	level?: VerificationLevel;
	/** When `eidsr`, verifies via POST /eidsr/local/messages/:id/verify (JWT only, no body token). */
	verificationMode?: "alert" | "eidsr";
	eidsrMessageId?: number;
	/** Local event id for POST /eidsr/local/events/:id/verify */
	eidsrEventLocalId?: number;
	onEidsrVerified?: (alertId: number | null) => void;
	onVerifyingChange?: (verifying: boolean) => void;
	/** When set, verifies an NDW signal via POST /ndw/{echis|poe}/:id/verify (JWT only). */
	ndwSource?: "echis" | "poe";
	ndwId?: number;
}

/**
 * What the verifier answered. Three branches, not a yes/no: "I cannot tell
 * from here" is a real answer to the verification question, and the one the
 * field level exists to receive.
 */
type Answer = "" | "confirm" | "discard" | "escalate";

/**
 * The signal's recorded status, matched to one of the options this dialog
 * offers. The register also holds legacy values ("Pending", "COMPLETED", a
 * blank), which the select cannot show — those prefill as empty, and leaving
 * the field alone leaves the stored status untouched.
 */
function entryStatusOf(value: unknown): string {
	const v = String(value ?? "").trim().toLowerCase();
	return alertEntryStatus.find((s) => s.name.toLowerCase() === v)?.name ?? "";
}

/** Local date + time, for the "verifying as … at …" stamp. */
function nowLabel(): string {
	return new Date().toLocaleString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AlertVerificationDialog({
	isOpen,
	onClose,
	alert,
	onVerificationComplete,
	level = VERIFICATION_LEVEL_DESK,
	verificationMode = "alert",
	eidsrMessageId,
	eidsrEventLocalId,
	onEidsrVerified,
	onVerifyingChange,
	ndwSource,
	ndwId,
}: AlertVerificationDialogProps) {
	const isEidsrMode = verificationMode === "eidsr";
	const isNdwMode = !!ndwSource;
	// EIDSR and NDW both verify via a JWT-only endpoint that builds the alert
	// server-side, so neither needs the per-alert verification token.
	const isTokenlessMode = isEidsrMode || isNdwMode;
	const { toast } = useToast();
	// Who is doing the verifying, read from the signed-in account rather than
	// asked for: this is the actor recorded against the signal, and a verifier
	// retyping their own name is how "Verified By" ends up blank or as initials.
	const currentUser = useCurrentUser();
	const currentUserName = userFullName(currentUser);

	const [answer, setAnswer] = useState<Answer>("");
	// Required on a discard, from the fixed list — the note explains it, the
	// reason makes discards countable.
	const [discardReason, setDiscardReason] = useState("");
	// What the desk is asking the field team to check. Optional, and the first
	// thing the field verifier sees when they open the signal.
	const [note, setNote] = useState("");
	// Prefilled from the signal — verification is where a status recorded at
	// intake gets corrected, not re-entered from scratch. Optional: left blank,
	// no status is sent and the stored one stands.
	const [status, setStatus] = useState("");
	// Suspected etiology — what the verifier thinks this is. Also prefilled, and
	// also optional: "we do not know yet" is a normal answer at verification.
	const [etiology, setEtiology] = useState("");
	const [verificationToken, setVerificationToken] = useState("");
	const [isGeneratingToken, setIsGeneratingToken] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);


	const generateTokenAutomatically = useCallback(async () => {
		if (isTokenlessMode || !alert?.id) return;
		setIsGeneratingToken(true);
		setError(null);
		try {
			const result = await AuthService.generateVerificationToken(alert.id);
			setVerificationToken(result.token);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to generate token";
			setError(message);
			toast({
				title: "⚠️ Could not open verification",
				description: message,
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setIsGeneratingToken(false);
		}
	}, [alert?.id, isTokenlessMode, toast]);

	// Reset on open. Keyed off the stable alert id, NOT the `alert` object
	// reference: the eCHIS/POE pages rebuild the alert shape on every render, so
	// depending on `alert` would re-run this on each SWR refresh and wipe what
	// the verifier has typed.
	useEffect(() => {
		if (!isOpen || !alert) return;
		setAnswer("");
		setDiscardReason("");
		setNote("");
		setStatus(entryStatusOf(alert.status));
		setEtiology(resolveAlertResponseCode(String(alert.response ?? "")));
		setError(null);
		setSuccess(null);
		if (isTokenlessMode) {
			setVerificationToken("ndw-jwt");
		} else {
			setVerificationToken("");
			generateTokenAutomatically();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, alert?.id, isTokenlessMode]);

	const isFieldLevel = level === VERIFICATION_LEVEL_FIELD;

	const outcome: VerificationOutcome | "" =
		answer === "confirm"
			? VERIFICATION_CONFIRMED
			: answer === "discard"
			? VERIFICATION_DISCARDED
			: answer === "escalate"
			? VERIFICATION_ESCALATED_FIELD
			: "";

	// The outcome carries the decision, so the note is supporting detail and
	// must not block recording it. A DISCARD is the exception: it ends the
	// signal's life, and the reason is what makes a register full of
	// duplicates distinguishable from one full of hoaxes.
	const canSubmit =
		!!answer && (answer !== "discard" || !!discardReason) && !isVerifying;
	/** An answer that SETTLES the question, as opposed to passing it on. */

	/** The handover this signal is already carrying, if the desk escalated it. */
	const escalation = {
		at: String(alert?.escalatedToFieldAt ?? ""),
		by: String(alert?.escalatedToFieldBy ?? ""),
		request: String(alert?.fieldVerificationRequest ?? ""),
	};
	const wasEscalated =
		!!escalation.at ||
		String(alert?.verificationOutcome ?? "") === VERIFICATION_ESCALATED_FIELD;

	const submit = async () => {
		if (!canSubmit) return;
		setIsVerifying(true);
		onVerifyingChange?.(true);
		setError(null);

		const trimmedNote = note.trim();
		const verifiedBy = currentUserName;

		try {
			// ---- 6767 / eCHIS / POE: verify the signal into alerts --------
			if (isTokenlessMode) {
				const payload = buildEidsrVerifyPayload({
					status: answer === "confirm" ? status : "",
					response: answer === "confirm" ? etiology : "",
					verificationOutcome: outcome,
					verificationNote: trimmedNote,
					verificationLevel: level,
					discardReason: answer === "discard" ? discardReason : "",
					fieldVerificationRequest: "",
					deskVerificationActions: legacyDeskValue(outcome, []),
					verifiedBy,
					verificationDate: new Date().toISOString(),
					verificationTime: new Date().toTimeString().slice(0, 5),
				});

				let alertId: number | null = null;
				if (isEidsrMode) {
					const result = await verifyEidsrMessage(
						eidsrMessageId!,
						payload,
						eidsrEventLocalId ?? eidsrMessageId!
					);
					alertId =
						result.alertId ?? result.message?.linkedAlertId ?? null;
					onEidsrVerified?.(alertId);
				} else {
					const result =
						ndwSource === "echis"
							? await verifyEchisAlert(ndwId!, payload)
							: await verifyPoeAlert(ndwId!, payload);
					alertId = result.alertId || null;
				}

				setSuccess(
					answer === "escalate"
						? "Escalated for field verification."
						: "Verified into alerts successfully."
				);
				toast({
					title:
						answer === "escalate"
							? "Sent for field verification"
							: outcome === VERIFICATION_CONFIRMED
							? "Confirmed as an event"
							: "Discarded",
					description:
						alertId != null
							? `Saved as alert ${altCode(alertId)}.`
							: "Signal verified into alerts.",
					duration: 5000,
				});
				setTimeout(() => {
					onVerificationComplete();
					onClose();
				}, 1500);
				return;
			}

			// ---- A signal already on the register -------------------------
			const now = new Date();
			const escalating = answer === "escalate";
			await AuthService.verifyAlert(alert.id, {
				token: verificationToken,
				// "The verifier answered the form", not "the signal is
				// verified": the server decides what an escalation means for
				// is_verified. It is what makes the outcome and the discard
				// reason mandatory server-side.
				verified: true,
				verificationOutcome: outcome,
				verificationNote: trimmedNote,
				verificationLevel: level,
				discardReason: answer === "discard" ? discardReason : undefined,
				// Omitted when blank, so an untouched field never overwrites
				// the status or etiology the signal already carries.
				status: (answer === "confirm" && status) || undefined,
				response: (answer === "confirm" && etiology) || undefined,
				// An escalation is not a verification, so it stamps no
				// verification time — the server keeps the signal unverified
				// and the field visit supplies the real timestamp.
				verificationDate: escalating ? undefined : now.toISOString(),
				verificationTime: escalating ? undefined : now.toISOString(),
				verifiedBy,
				isVerified: !escalating,
			});

			setSuccess(
				escalating
					? "Sent for field verification."
					: "Verification recorded."
			);
			toast({
				title: escalating
					? "🚩 Sent for field verification"
					: outcome === VERIFICATION_CONFIRMED
					? "✅ Confirmed as an event"
					: "✅ Discarded",
				description: escalating
					? `${altCode(
							alert.id
					  )} stays in the verification queue, now waiting on a field team.`
					: outcome === VERIFICATION_CONFIRMED
					? `${altCode(alert.id)} now awaits risk assessment.`
					: `${altCode(alert.id)} is closed. The reporter is owed feedback.`,
				duration: 5000,
			});
			setTimeout(() => {
				onVerificationComplete();
				onClose();
			}, 1500);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to save verification";
			setError(message);
			toast({
				title: "❌ Could not save",
				description: message,
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setIsVerifying(false);
			onVerifyingChange?.(false);
		}
	};

	const ready = (verificationToken || isTokenlessMode) && !isGeneratingToken;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldQuestion className="h-4 w-4 text-uganda-red" />
						{isEidsrMode
							? `Verify 6767 SMS #${eidsrMessageId}`
							: isNdwMode
							? `Verify ${ndwSource === "echis" ? "eCHIS" : "POE"} signal`
							: isFieldLevel
							? `Field verification — ${altCode(alert?.id)}`
							: `Desk verification — ${altCode(alert?.id)}`}
					</DialogTitle>
					<DialogDescription>
						{isFieldLevel
							? "The same question, answered on site — and answered for good: there is no level beyond the field."
							: "Verification answers one question: is this signal a real public-health event?"}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert className="surface-danger">
						<XCircleIcon className="h-4 w-4 text-destructive" />
						<AlertDescription className="text-destructive">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{success && (
					<Alert className="surface-success">
						<CheckCircleIcon className="h-4 w-4 text-success" />
						<AlertDescription className="text-success">
							{success}
						</AlertDescription>
					</Alert>
				)}

				<div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
					{isGeneratingToken && (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="h-6 w-6 animate-spin text-uganda-red" />
						</div>
					)}

					{ready && (
						<div className="space-y-4">
							{/* What is being adjudicated. Read-only by design. */}
							<SignalSummaryCard alert={alert} />

							{/* The handover, for a team picking this up days
							    later: who sent them, when, and what they were
							    asked to check. */}
							{isFieldLevel && wasEscalated && (
								<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
									<p className="font-semibold">
										Escalated by the desk
										{escalation.by ? ` — ${escalation.by}` : ""}
										{escalation.at ? ` on ${formatDate(escalation.at)}` : ""}
									</p>
									<p className="mt-1">
										{escalation.request
											? `Asked to check: ${escalation.request}`
											: "No specific instructions were left. Verify the signal as reported."}
									</p>
								</div>
							)}

							<AnswerCard
								question="Is this a true signal?"
								hint={
									isFieldLevel
										? "What the visit found. A true signal is a real or probable public-health event."
										: "A true signal is a real or probable public-health event. Confirming it makes it an event."
								}
								value={answer}
								onChange={(next) => {
									setAnswer(next);
									if (next !== "discard") setDiscardReason("");
								}}
								// The desk may decline to answer; the field may not.
								// Offering an escalation here would send a signal to
								// the queue it is already standing in.
								allowEscalate={!isFieldLevel}
							/>

							{/* Where the answer leads, shown before it is committed. */}
							{outcome === VERIFICATION_CONFIRMED && (
								<Consequence
									tone="confirm"
									title="Confirmed — this is an event"
									body="It is counted in the signal-to-event conversion rate and moves on to risk assessment."
								/>
							)}
							{outcome === VERIFICATION_DISCARDED && (
								<Consequence
									tone="discard"
									title="Discarded - signal closed"
									body="Recorded, never deleted. The reporter is still owed feedback telling them what was found."
								/>
							)}
							{answer === "escalate" && (
								<Consequence
									tone="escalate"
									title="Sent for field verification"
									body="No outcome yet — the question stays open until a field team answers it. The signal stays in the verification queue, marked as being with the field team, and can be picked up today or next week."
								/>
							)}

							{/* Why it is being thrown out. Required, because a
							    discard is the one conclusion that ends a
							    signal's life. */}
							{answer === "discard" && (
								<div className="space-y-2">
									<Label htmlFor="discard-reason" className="text-sm font-medium">
										Why is it being discarded?
										<span className="ml-1 text-uganda-red">*</span>
									</Label>
									<Select value={discardReason} onValueChange={setDiscardReason}>
										<SelectTrigger id="discard-reason" className="w-full sm:w-96">
											<SelectValue placeholder="Pick the reason" />
										</SelectTrigger>
										<SelectContent>
											{DISCARD_REASONS.map((reason) => (
												<SelectItem key={reason} value={reason}>
													{reason}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										{DISCARD_REASON_GUIDANCE[discardReason] ??
											"Discards are counted by reason: duplicates point at reporting quality, hoaxes at community trust."}
									</p>
								</div>
							)}

							{/* Status of the person, as it stands at verification.
							    Offered once a conclusion is picked — an
							    escalation concludes nothing, and the field
							    visit is where these get answered. */}
							{answer === "confirm" && (
								<div className="space-y-2">
									<Label htmlFor="verification-status" className="text-sm font-medium">
										Status
										<span className="ml-1 font-normal text-muted-foreground">
											(optional)
										</span>
									</Label>
									<Select value={status} onValueChange={setStatus}>
										<SelectTrigger id="verification-status" className="w-full sm:w-64">
											<SelectValue placeholder="Alive, dead or unknown" />
										</SelectTrigger>
										<SelectContent>
											{alertEntryStatus.map((s) => (
												<SelectItem key={s.name} value={s.name}>
													{s.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										Prefilled from the signal. Change it if the person&apos;s
										status has changed; leave it as it is and the recorded
										status stands.
									</p>
								</div>
							)}

							{/* Suspected etiology — the same disease taxonomy the
							    register, the add/edit forms and the reports'
							    response-type filter use, so a verifier's answer
							    lands in the bucket those read. */}
							{answer === "confirm" && (
								<div className="space-y-2">
									<Label htmlFor="verification-etiology" className="text-sm font-medium">
										Suspected Etiology
										<span className="ml-1 font-normal text-muted-foreground">
											(optional)
										</span>
									</Label>
									<Select value={etiology} onValueChange={setEtiology}>
										<SelectTrigger id="verification-etiology" className="w-full sm:w-96">
											<SelectValue placeholder="Select the suspected disease" />
										</SelectTrigger>
										<SelectContent className="max-h-72">
											{alertResponse.map((r) => (
												<SelectItem key={r.code} value={r.code}>
													{r.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										What the signal is suspected to be. Leave it blank if it is
										not yet known — it can be set later from the alert record.
									</p>
								</div>
							)}

							{/* The note — supporting detail, never a blocker.
							    At the field level it is kept SEPARATELY from
							    the desk's note, so a visit adds to the record
							    instead of overwriting why it was sent. */}
							{!!answer && (
								<div className="space-y-2">
									<Label htmlFor="verification-note" className="text-sm font-medium">
										{answer === "escalate"
											? "What did the desk try?"
											: isFieldLevel
											? "What did the visit find?"
											: "Describe the decision taken"}
										<span className="ml-1 font-normal text-muted-foreground">
											(optional)
										</span>
									</Label>
									<Textarea
										id="verification-note"
										value={note}
										onChange={(e) => setNote(e.target.value)}
										rows={4}
										placeholder={
											answer === "escalate"
												? "e.g. called the reporter twice and the in-charge at the health centre; nobody can say whether the two cases are linked"
												: outcome === VERIFICATION_DISCARDED
												? "e.g. spoke to the VHT and the clinician — the two children had malaria confirmed by RDT, no cluster"
												: isFieldLevel
												? "e.g. visited the household; three linked cases, onset within four days of each other, samples taken"
												: "e.g. confirmed by the health centre in-charge; three linked cases in one household, samples taken"
										}
									/>
									<p className="text-xs text-muted-foreground">
										{answer === "escalate"
											? "What you already checked, so the field team does not repeat it."
											: "Say what you checked and who you spoke to — this is the only record of how the decision was reached, but you can record the decision without it."}
									</p>
								</div>
							)}

							{currentUserName && (
								<p className="text-xs text-muted-foreground">
									Recording as <strong>{currentUserName}</strong> · {nowLabel()}
								</p>
							)}
						</div>
					)}
				</div>

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					{ready && (
						<Button
							onClick={submit}
							disabled={!canSubmit}
							className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white"
						>
							{isVerifying ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Saving...
								</>
							) : answer === "escalate" ? (
								"Send for field verification"
							) : isFieldLevel ? (
								"Record field verification"
							) : (
								"Record verification"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * The verification question and the answers to it.
 *
 * Stacked cards rather than a row of buttons: the answers are not symmetrical
 * (one makes an event, one closes a signal, one hands the work to someone
 * else), and each needs a line saying what it means. They are also not a
 * dropdown — the whole question is one screen, and a verifier should be able
 * to see every way out of it without opening anything.
 */
function AnswerCard({
	question,
	hint,
	value,
	onChange,
	allowEscalate,
}: {
	question: string;
	hint: string;
	value: Answer;
	onChange: (value: Answer) => void;
	allowEscalate: boolean;
}) {
	const options: {
		key: Exclude<Answer, "">;
		label: string;
		body: string;
		icon: typeof CheckCircleIcon;
		selected: string;
	}[] = [
		{
			key: "confirm",
			label: "Yes — it is a true signal",
			body: "A real or probable public-health event. It becomes an event and goes for risk assessment.",
			icon: CheckCircleIcon,
			selected: "border-success bg-success/10 text-success ring-1 ring-success",
		},
		{
			key: "discard",
			label: "No — it is not",
			body: "Checked and found not to be an event. Closed, with a reason, and the reporter is owed feedback.",
			icon: Trash2,
			selected:
				"border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive",
		},
	];
	if (allowEscalate) {
		options.push({
			key: "escalate",
			label: "I cannot tell from here",
			body: "The desk cannot settle it. Send a field team; the question stays open until they answer.",
			icon: MapPin,
			selected: "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500",
		});
	}

	return (
		<div className="space-y-2 rounded-lg border p-3">
			<div className="flex items-start gap-2">
				<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-uganda-red text-[11px] font-semibold text-white">
					1
				</span>
				<div>
					<p className="text-sm font-semibold">
						{question}
						<span className="ml-1 text-uganda-red">*</span>
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
				</div>
			</div>
			<div className="space-y-1.5 pl-7">
				{options.map((option) => (
					<button
						key={option.key}
						type="button"
						aria-pressed={value === option.key}
						onClick={() => onChange(option.key)}
						className={cn(
							"flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
							value === option.key
								? option.selected
								: "border-gray-200 hover:bg-gray-50"
						)}
					>
						<option.icon className="mt-0.5 h-4 w-4 shrink-0" />
						<span className="space-y-0.5">
							<span className="block text-sm font-medium">{option.label}</span>
							<span
								className={cn(
									"block text-xs",
									value === option.key ? "opacity-90" : "text-muted-foreground"
								)}
							>
								{option.body}
							</span>
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

/** Where the chosen answer leads, stated before it is committed. */
function Consequence({
	tone,
	title,
	body,
}: {
	tone: "confirm" | "discard" | "escalate";
	title: string;
	body: string;
}) {
	const Icon =
		tone === "confirm"
			? CheckCircleIcon
			: tone === "discard"
			? XCircleIcon
			: TruckIcon;

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-lg border p-3 text-xs",
				tone === "confirm" && "border-success/30 surface-success",
				tone === "discard" && "border-destructive/30 surface-danger",
				tone === "escalate" && "border-amber-200 bg-amber-50 text-amber-900"
			)}
		>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" />
			<div className="space-y-1">
				<p className="font-semibold">{title}</p>
				<p>{body}</p>
			</div>
		</div>
	);
}
