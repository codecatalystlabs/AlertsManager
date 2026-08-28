"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { altCode } from "@/lib/alt-code";
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
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	XCircleIcon,
	Loader2,
	ShieldQuestion,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { verifyEidsrMessage } from "@/lib/fetch-eidsr-messages";
import { verifyEchisAlert, verifyPoeAlert } from "@/lib/fetch-ndw-alerts";
import { buildEidsrVerifyPayload } from "@/lib/eidsr-verify-payload";
import {
	VERIFICATION_CONFIRMED,
	VERIFICATION_DISCARDED,
	legacyDeskValue,
	type VerificationOutcome,
} from "@/lib/verification-options";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { userFullName } from "@/lib/user-name";
import { cn } from "@/lib/utils";

/**
 * Verification — EBS step 3, asked as the two questions it actually is.
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
 *   1. Have you verified this signal?
 *        no  → say why. NOTHING is recorded as an outcome: the signal keeps
 *              its place in the queue and its clock keeps running. An attempt
 *              is not a verification.
 *        yes → question 2.
 *   2. Is this a true signal?
 *        yes → CONFIRMED. It is an event, and goes on to risk assessment.
 *        no  → DISCARDED. Checked and closed, and the reporter is owed
 *              feedback saying so.
 *
 * Every branch requires the verifier to describe the decision in their own
 * words. The outcome says what was decided; only the note says what was checked
 * and on what basis, and for a discard it is the sole record of why nobody
 * pursued the signal.
 *
 * The case details are NOT gone — they are captured at intake and editable in
 * the alert edit dialog, which is where correcting a case record belongs.
 */

interface AlertVerificationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
	onVerificationComplete: () => void;
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

type YesNo = "yes" | "no" | "";

/** One read-only fact about the signal being adjudicated. */
interface SummaryItem {
	label: string;
	value: string;
}

function text(value: unknown): string {
	if (value == null) return "";
	const s = String(value).trim();
	return s === "0" ? "" : s;
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

/**
 * What the verifier is adjudicating, read-only.
 *
 * Verification is a judgement about a report, so the report has to be legible
 * without leaving the dialog — but none of it is editable here. Correcting case
 * data is the edit dialog's job; conflating the two is what turned this form
 * into a case investigation in the first place.
 */
function buildSummary(alert: any): SummaryItem[] {
	if (!alert) return [];

	const place = [
		text(alert.alertCaseVillage) || text(alert.village),
		text(alert.alertCaseSubCounty) || text(alert.subCounty),
		text(alert.alertCaseDistrict),
	]
		.filter(Boolean)
		.join(", ");

	const reporter = [text(alert.personReporting), text(alert.contactNumber)]
		.filter(Boolean)
		.join(" · ");

	const items: SummaryItem[] = [
		{ label: "Signal", value: text(alert.signalReported).replaceAll("_", " ") },
		{ label: "Case", value: text(alert.alertCaseName) },
		{ label: "Location", value: place },
		{ label: "Reported by", value: reporter },
		{ label: "Source", value: text(alert.sourceOfAlert) },
		{ label: "Number affected", value: text(alert.numberAffected) },
		{ label: "Symptoms", value: text(alert.symptoms) },
		{
			label: "Description",
			value:
				text(alert.briefDescription) ||
				text(alert.history) ||
				text(alert.narrative),
		},
		{ label: "Additional information", value: text(alert.additionalInformation) },
	];

	return items.filter((i) => i.value);
}

export function AlertVerificationDialog({
	isOpen,
	onClose,
	alert,
	onVerificationComplete,
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

	const [verified, setVerified] = useState<YesNo>("");
	const [trueSignal, setTrueSignal] = useState<YesNo>("");
	const [note, setNote] = useState("");
	const [verificationToken, setVerificationToken] = useState("");
	const [isGeneratingToken, setIsGeneratingToken] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const summary = useMemo(() => buildSummary(alert), [alert]);

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
		setVerified("");
		setTrueSignal("");
		setNote("");
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

	/**
	 * An external signal answering "not verified" has nowhere to record a
	 * reason: it is not on the alerts register yet, and shadowing the eCHIS /
	 * POE / 6767 mirror tables to give it one is exactly what we do not do.
	 * Leaving it alone IS the correct outcome — it stays on its source list.
	 */
	const pendingIsNoOp = isTokenlessMode && verified === "no";

	const outcome: VerificationOutcome | "" =
		verified === "yes"
			? trueSignal === "yes"
				? VERIFICATION_CONFIRMED
				: trueSignal === "no"
				? VERIFICATION_DISCARDED
				: ""
			: "";

	const answered = verified === "no" || (verified === "yes" && !!outcome);
	const canSubmit = answered && note.trim().length > 0 && !isVerifying;

	const submit = async () => {
		if (!canSubmit) return;
		setIsVerifying(true);
		onVerifyingChange?.(true);
		setError(null);

		const trimmedNote = note.trim();
		const verifiedBy = currentUserName;

		try {
			// ---- "No, I have not verified this signal" -------------------
			if (verified === "no") {
				await AuthService.recordVerificationAttempt(alert.id, {
					token: verificationToken,
					verificationPendingReason: trimmedNote,
					verifiedBy,
				});
				setSuccess("Recorded as not yet verified.");
				toast({
					title: "Saved — still awaiting verification",
					description: `${altCode(
						alert.id
					)} stays on the Triaged list with its clock running.`,
					duration: 5000,
				});
				setTimeout(() => {
					onVerificationComplete();
					onClose();
				}, 1200);
				return;
			}

			// ---- 6767 / eCHIS / POE: verify the signal into alerts --------
			if (isTokenlessMode) {
				const payload = buildEidsrVerifyPayload({
					verificationOutcome: outcome,
					verificationNote: trimmedNote,
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

				setSuccess("Verified into alerts successfully.");
				toast({
					title:
						outcome === VERIFICATION_CONFIRMED
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
			await AuthService.verifyAlert(alert.id, {
				token: verificationToken,
				verified: true,
				verificationOutcome: outcome,
				verificationNote: trimmedNote,
				verificationDate: now.toISOString(),
				verificationTime: now.toISOString(),
				verifiedBy,
				isVerified: true,
			});

			setSuccess("Verification recorded.");
			toast({
				title:
					outcome === VERIFICATION_CONFIRMED
						? "✅ Confirmed as an event"
						: "✅ Discarded",
				description:
					outcome === VERIFICATION_CONFIRMED
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
			<DialogContent className="max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldQuestion className="h-4 w-4 text-uganda-red" />
						{isEidsrMode
							? `Verify 6767 SMS #${eidsrMessageId}`
							: isNdwMode
							? `Verify ${ndwSource === "echis" ? "eCHIS" : "POE"} signal`
							: `Verify signal — ${altCode(alert?.id)}`}
					</DialogTitle>
					<DialogDescription>
						Verification answers one question: is this signal a real
						public-health event?
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
							{summary.length > 0 && (
								<div className="rounded-lg border bg-muted/40 p-3">
									<h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										The signal
									</h3>
									<dl className="mt-2 space-y-1.5 text-sm">
										{summary.map((item) => (
											<div
												key={item.label}
												className="grid grid-cols-[9rem_1fr] gap-2"
											>
												<dt className="text-xs uppercase tracking-wide text-muted-foreground">
													{item.label}
												</dt>
												<dd className="break-words">{item.value}</dd>
											</div>
										))}
									</dl>
								</div>
							)}

							{/* Question 1 */}
							<QuestionCard
								step={1}
								question="Have you verified this signal?"
								hint="Did you actually check it — with the reporter, the facility, or on site?"
								value={verified}
								onChange={(v) => {
									setVerified(v);
									setTrueSignal("");
								}}
							/>

							{/* Question 2 — only once the first is answered yes. */}
							{verified === "yes" && (
								<QuestionCard
									step={2}
									question="Is this a true signal?"
									hint="A true signal is a real or probable public-health event. Confirming it makes it an event."
									value={trueSignal}
									onChange={setTrueSignal}
									yesLabel="Yes — it is a true signal"
									noLabel="No — it is not"
								/>
							)}

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
							{verified === "no" && !pendingIsNoOp && (
								<Consequence
									tone="pending"
									title="Not verified yet"
									body="No outcome is recorded. The signal stays on the Triaged list awaiting verification, and its clock keeps running."
								/>
							)}
							{pendingIsNoOp && (
								<Consequence
									tone="pending"
									title="Nothing to record yet"
									body={`This signal is not on the alerts register until it is verified, so there is no record to attach a reason to. It stays on the ${
										isEidsrMode
											? "6767"
											: ndwSource === "echis"
											? "eCHIS"
											: "POE"
									} list and can be verified later.`}
								/>
							)}

							{/* The note. Required on every branch. */}
							{answered && !pendingIsNoOp && (
								<div className="space-y-2">
									<Label htmlFor="verification-note" className="text-sm font-medium">
										{verified === "no"
											? "Why has it not been verified?"
											: "Describe the decision taken"}
										<span className="ml-1 text-uganda-red">*</span>
									</Label>
									<Textarea
										id="verification-note"
										value={note}
										onChange={(e) => setNote(e.target.value)}
										rows={4}
										placeholder={
											verified === "no"
												? "e.g. reporter's phone off since yesterday; facility focal person away until Thursday"
												: outcome === VERIFICATION_DISCARDED
												? "e.g. spoke to the VHT and the clinician — the two children had malaria confirmed by RDT, no cluster"
												: "e.g. confirmed by the health centre in-charge; three linked cases in one household, samples taken"
										}
									/>
									<p className="text-xs text-muted-foreground">
										Say what you checked and who you spoke to. This is the
										only record of how the decision was reached.
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
						{pendingIsNoOp ? "Close" : "Cancel"}
					</Button>
					{ready && !pendingIsNoOp && (
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
							) : verified === "no" ? (
								"Save reason"
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

/** One yes/no question, asked as two buttons rather than a dropdown. */
function QuestionCard({
	step,
	question,
	hint,
	value,
	onChange,
	yesLabel = "Yes",
	noLabel = "No",
}: {
	step: number;
	question: string;
	hint: string;
	value: YesNo;
	onChange: (value: YesNo) => void;
	yesLabel?: string;
	noLabel?: string;
}) {
	return (
		<div className="space-y-2 rounded-lg border p-3">
			<div className="flex items-start gap-2">
				<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-uganda-red text-[11px] font-semibold text-white">
					{step}
				</span>
				<div>
					<p className="text-sm font-semibold">
						{question}
						<span className="ml-1 text-uganda-red">*</span>
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
				</div>
			</div>
			<div className="flex gap-2 pl-7">
				{(
					[
						["yes", yesLabel],
						["no", noLabel],
					] as const
				).map(([key, label]) => (
					<button
						key={key}
						type="button"
						aria-pressed={value === key}
						onClick={() => onChange(key)}
						className={cn(
							"rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
							value === key
								? "border-uganda-red bg-uganda-red/10 text-uganda-red ring-1 ring-uganda-red"
								: "border-gray-200 hover:bg-gray-50"
						)}
					>
						{label}
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
	tone: "confirm" | "discard" | "pending";
	title: string;
	body: string;
}) {
	const Icon =
		tone === "confirm"
			? CheckCircleIcon
			: tone === "discard"
			? XCircleIcon
			: AlertTriangleIcon;

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-lg border p-3 text-xs",
				tone === "confirm" && "border-success/30 surface-success",
				tone === "discard" && "border-destructive/30 surface-danger",
				tone === "pending" && "border-amber-200 bg-amber-50 text-amber-900"
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
