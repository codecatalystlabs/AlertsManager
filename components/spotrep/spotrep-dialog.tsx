"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import hotToast from "react-hot-toast";
import {
	Copy,
	FileDown,
	FileText,
	ImagePlus,
	Loader2,
	RotateCcw,
	Siren,
	Trash2,
} from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/risk";
import { cn } from "@/lib/utils";
import { altCode } from "@/lib/alt-code";
import { useCurrentUser } from "@/hooks/use-current-user";
import { userFullName } from "@/lib/user-name";
import { alertResponseLabel } from "@/lib/resolve-alert-response";
import {
	SPOTREP_FIELDS,
	spotRepAutoDraft,
	spotRepDistrict,
	spotRepFilename,
	spotRepIsMandated,
	spotRepMissingRequired,
	spotRepPlainText,
	spotRepRows,
	toBulletLines,
	type SpotRepAlert,
	type SpotRepDraft,
	type SpotRepFieldKey,
} from "@/lib/spotrep";
import {
	SPOTREP_IMAGE_ACCEPT,
	SPOTREP_MAX_IMAGES,
	loadCrestDataUrl,
	readSpotRepImage,
	type SpotRepImage,
} from "@/lib/spotrep-images";

/* -------------------------------------------------------------------------
 * Unfinished drafts.
 *
 * Writing the Challenges section is the slow part of a spot report — it is the
 * one thing nobody can look up — and it is routinely interrupted by the event
 * the report is about. Losing it because a dialog closed is the difference
 * between a report filed tonight and one filed tomorrow, so the composer keeps
 * a per-signal draft in the browser.
 *
 * The subtlety is what to restore. Restoring EVERYTHING would freeze the report
 * at the state of the record when the draft was abandoned — a risk re-assessment
 * or a lab result landing in between would never reach the narrative. So the
 * snapshot of the auto-draft is stored alongside, and on reopen a field is
 * restored only where the submitter had actually changed it. Their words
 * survive; the record's own changes still flow through.
 *
 * Browser-local by design: this is one person's unfinished sentence, not a
 * record, and nothing here is the signal's audit trail.
 * ---------------------------------------------------------------------- */

const DRAFT_KEY = (alertId: number) => `spotrep-draft:${alertId}`;

interface StoredDraft {
	savedAt: string;
	values: Partial<SpotRepDraft>;
	auto: Partial<SpotRepDraft>;
}

function readStoredDraft(alertId: number): StoredDraft | null {
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY(alertId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredDraft;
		return parsed && parsed.values ? parsed : null;
	} catch {
		return null;
	}
}

function writeStoredDraft(alertId: number, stored: StoredDraft): void {
	try {
		window.localStorage.setItem(DRAFT_KEY(alertId), JSON.stringify(stored));
	} catch {
		// A full or blocked storage must never stop someone filing a report.
	}
}

function clearStoredDraft(alertId: number): void {
	try {
		window.localStorage.removeItem(DRAFT_KEY(alertId));
	} catch {
		/* see above */
	}
}

/**
 * The submitter's edits merged over a freshly drafted report.
 *
 * `restored` is false when the stored draft turned out to hold nothing the
 * submitter had actually written — every field still matching the auto-draft it
 * was saved against. That happens routinely, because the composer saves on every
 * keystroke and therefore also saves the untouched draft it opens with. Telling
 * someone their unfinished work was restored when nothing was is worse than
 * saying nothing: it invites them to trust a report they have not written.
 */
function mergeStoredDraft(
	auto: SpotRepDraft,
	stored: StoredDraft | null
): { draft: SpotRepDraft; restored: boolean } {
	if (!stored) return { draft: auto, restored: false };
	const merged = { ...auto };
	let restored = false;
	for (const key of Object.keys(auto) as (keyof SpotRepDraft)[]) {
		const saved = stored.values[key];
		if (saved == null) continue;
		// Unchanged from the draft it was made against ⇒ take today's draft.
		if (saved === stored.auto[key]) continue;
		merged[key] = saved;
		restored = true;
	}
	return { draft: merged, restored };
}

/** True when the submitter has written nothing the auto-draft did not already say. */
function isUntouched(draft: SpotRepDraft, auto: SpotRepDraft): boolean {
	return (Object.keys(auto) as (keyof SpotRepDraft)[]).every(
		(key) => draft[key] === auto[key]
	);
}

/* ------------------------------------------------------------------------- */

export function SpotRepDialog({
	open,
	onOpenChange,
	alert,
	loading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The signal this report is about. Null while the full record loads. */
	alert: SpotRepAlert | null;
	/** True while the page is fetching the complete alert. */
	loading?: boolean;
}) {
	const user = useCurrentUser();
	const [draft, setDraft] = useState<SpotRepDraft | null>(null);
	// The pristine draft this session started from — what "reset" restores, and
	// the baseline that decides which fields the submitter actually authored.
	const [auto, setAuto] = useState<SpotRepDraft | null>(null);
	const [restoredAt, setRestoredAt] = useState<string | null>(null);
	const [images, setImages] = useState<SpotRepImage[]>([]);
	const [tab, setTab] = useState("compose");
	const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);

	const alertId = alert?.id ?? null;
	const district = alert ? spotRepDistrict(alert) : "";
	const mandated = spotRepIsMandated(alert?.riskLevel);

	// Build the draft when the dialog opens on a signal. Keyed on the id so a
	// re-open on the SAME signal keeps what is on screen, while opening on a
	// different one starts over.
	const seededFor = useRef<number | null>(null);
	useEffect(() => {
		if (!open) {
			seededFor.current = null;
			return;
		}
		if (!alert || alertId == null || seededFor.current === alertId) return;
		seededFor.current = alertId;

		const fresh = spotRepAutoDraft(alert, {
			// The alert stores a response CODE; the label lives in @/constants,
			// which pulls in icon components — so it is resolved here and passed
			// in rather than imported by the pure module.
			eventName: alertResponseLabel(alert.response ?? ""),
			submitterName: userFullName(user),
			submitterPosition: user?.affiliation || titleCase(user?.level),
			submitterContact: "",
		});
		const { draft: seeded, restored } = mergeStoredDraft(fresh, readStoredDraft(alertId));
		setAuto(fresh);
		setDraft(seeded);
		setRestoredAt(restored ? (readStoredDraft(alertId)?.savedAt ?? null) : null);
		setImages([]);
		setTab("compose");
		// `user` may arrive a tick after mount; re-seeding on it would wipe typing.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, alert, alertId]);

	// Persist on every edit, with the baseline it was made against. An untouched
	// draft is not saved — and clears any earlier one, so "Start fresh" stays
	// fresh on the next open instead of being immediately re-saved by this effect.
	useEffect(() => {
		if (!open || !draft || !auto || alertId == null) return;
		if (isUntouched(draft, auto)) {
			clearStoredDraft(alertId);
			return;
		}
		writeStoredDraft(alertId, {
			savedAt: new Date().toISOString(),
			values: draft,
			auto,
		});
	}, [open, draft, auto, alertId]);

	const setField = useCallback((key: SpotRepFieldKey, value: string) => {
		setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
	}, []);

	const resetField = useCallback(
		(key: SpotRepFieldKey) => {
			setDraft((prev) => (prev && auto ? { ...prev, [key]: auto[key] } : prev));
		},
		[auto]
	);

	const startFresh = useCallback(() => {
		if (!auto || alertId == null) return;
		clearStoredDraft(alertId);
		setDraft({ ...auto });
		setRestoredAt(null);
	}, [auto, alertId]);

	const addImages = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;
			const room = SPOTREP_MAX_IMAGES - images.length;
			if (room <= 0) {
				hotToast.error(`A spot report carries at most ${SPOTREP_MAX_IMAGES} pictures`);
				return;
			}
			const picked = Array.from(files).slice(0, room);
			const read: SpotRepImage[] = [];
			for (const file of picked) {
				try {
					read.push(await readSpotRepImage(file));
				} catch (e) {
					hotToast.error(e instanceof Error ? e.message : "Could not read that image");
				}
			}
			if (read.length > 0) setImages((prev) => [...prev, ...read]);
		},
		[images.length]
	);

	const missing = draft ? spotRepMissingRequired(draft) : [];
	const ready = Boolean(draft) && missing.length === 0;

	const download = useCallback(
		async (format: "docx" | "pdf") => {
			if (!draft || !alert) return;
			setBusy(format);
			try {
				const crestDataUrl = await loadCrestDataUrl();
				const fileName = spotRepFilename(alert, format);
				if (format === "docx") {
					const { downloadSpotRepDocx } = await import("@/lib/spotrep-docx");
					await downloadSpotRepDocx({
						draft,
						fileName,
						district,
						crestDataUrl,
						images,
					});
				} else {
					const { downloadSpotRepPdf } = await import("@/lib/spotrep-pdf");
					await downloadSpotRepPdf({
						draft,
						fileName,
						district,
						crestDataUrl,
						images,
					});
				}
				hotToast.success(`${fileName} downloaded`);
			} catch (e) {
				console.error("Failed to generate the spot report", e);
				hotToast.error(
					e instanceof Error ? e.message : "Could not generate the spot report"
				);
			} finally {
				setBusy(null);
			}
		},
		[draft, alert, district, images]
	);

	const copyText = useCallback(async () => {
		if (!draft) return;
		try {
			await navigator.clipboard.writeText(spotRepPlainText(draft));
			hotToast.success("Spot report copied — paste it into WhatsApp or SMS");
		} catch {
			hotToast.error("Could not copy — your browser blocked clipboard access");
		}
	}, [draft]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
				<DialogHeader className="space-y-1">
					<DialogTitle className="flex flex-wrap items-center gap-2 text-base">
						<FileText className="h-4 w-4 text-uganda-red" />
						Spot report — {altCode(alertId)}
						<RiskBadge level={alert?.riskLevel} />
					</DialogTitle>
					<DialogDescription className="text-xs">
						EBS step 5: the written alert. Everything below is drafted from this
						signal&apos;s own record — check it, add what only you know, and issue it.
					</DialogDescription>
				</DialogHeader>

				{loading || !draft ? (
					<div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Drafting the report from the signal record…
					</div>
				) : (
					<>
						{/* Why this report is being written. High and Very High events are
						    the ones the guidelines REQUIRE a spot report for; for a Low or
						    Moderate event the district is choosing to escalate, and saying
						    so is more useful than an identical banner on every report. */}
						<div
							className={cn(
								"flex items-start gap-2 rounded-lg border p-2.5 text-xs",
								mandated
									? "border-uganda-red/30 bg-uganda-red/5 text-uganda-red"
									: "border-gray-200 bg-gray-50/60 text-muted-foreground"
							)}
						>
							<Siren className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<p className="leading-snug">
								{mandated ? (
									<>
										<strong>A spot report is required for this event.</strong>{" "}
										The guidelines mandate one for High and Very High risk
										events, addressed to the Regional PHEOC and the National
										PHEOC.
									</>
								) : (
									<>
										A spot report is mandated for High and Very High events.
										This one is {alert?.riskLevel || "not scored"} — issuing a
										report anyway is a judgement call, and a reasonable one for
										an event that is still developing.
									</>
								)}
							</p>
						</div>

						{restoredAt && (
							<div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
								<span>
									Your unfinished draft from{" "}
									{new Date(restoredAt).toLocaleString()} was restored.
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[11px] text-amber-900 hover:bg-amber-100"
									onClick={startFresh}
								>
									Start fresh
								</Button>
							</div>
						)}

						<Tabs
							value={tab}
							onValueChange={setTab}
							className="flex min-h-0 flex-1 flex-col"
						>
							<TabsList className="h-8 self-start">
								<TabsTrigger value="compose" className="h-6 px-3 text-xs">
									Compose
								</TabsTrigger>
								<TabsTrigger value="preview" className="h-6 px-3 text-xs">
									Preview
								</TabsTrigger>
							</TabsList>

							<TabsContent
								value="compose"
								className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
							>
								{SPOTREP_FIELDS.filter(
									(f) => !f.key.startsWith("submitter")
								).map((field) => (
									<SpotRepField
										key={field.key}
										field={field}
										value={draft[field.key]}
										edited={Boolean(auto) && draft[field.key] !== auto![field.key]}
										onChange={(value) => setField(field.key, value)}
										onReset={() => resetField(field.key)}
									/>
								))}

								{/* The submitter — one row in the document, three inputs here
								    so the number is a field rather than something typed into
								    the end of a name and lost. */}
								<div className="space-y-1.5 rounded-lg border border-gray-200 p-2.5">
									<p className="text-xs font-semibold">
										Submitter <span className="text-uganda-red">*</span>
									</p>
									<div className="grid gap-2 sm:grid-cols-3">
										<Input
											value={draft.submitterName}
											onChange={(e) => setField("submitterName", e.target.value)}
											placeholder="Name"
											className="h-8 text-xs"
										/>
										<Input
											value={draft.submitterPosition}
											onChange={(e) =>
												setField("submitterPosition", e.target.value)
											}
											placeholder="Position — e.g. DSFP"
											className="h-8 text-xs"
										/>
										<Input
											value={draft.submitterContact}
											onChange={(e) =>
												setField("submitterContact", e.target.value)
											}
											type="tel"
											inputMode="tel"
											placeholder="Contact number"
											className="h-8 text-xs"
										/>
									</div>
									<p className="text-[11px] text-muted-foreground">
										Prefilled from your account. A spot report is signed by a
										person the region can call back.
									</p>
								</div>

								{/* Pictorials — the template's last row. */}
								<div className="space-y-1.5 rounded-lg border border-gray-200 p-2.5">
									<div className="flex items-center justify-between gap-2">
										<p className="text-xs font-semibold">Pictorials</p>
										<Button
											variant="outline"
											size="sm"
											className="h-6 px-2 text-[11px]"
											disabled={images.length >= SPOTREP_MAX_IMAGES}
											onClick={() => fileInput.current?.click()}
										>
											<ImagePlus className="mr-1 h-3 w-3" />
											Attach
										</Button>
									</div>
									<input
										ref={fileInput}
										type="file"
										accept={SPOTREP_IMAGE_ACCEPT}
										multiple
										className="hidden"
										onChange={(e) => {
											void addImages(e.target.files);
											// Allow re-picking the same file after a removal.
											e.target.value = "";
										}}
									/>
									{images.length === 0 ? (
										<p className="text-[11px] text-muted-foreground">
											Optional. Up to {SPOTREP_MAX_IMAGES} photos — a line list,
											a facility, a site. Large images are shrunk so the report
											still sends on a district connection.
										</p>
									) : (
										<div className="grid gap-2 sm:grid-cols-2">
											{images.map((picture, index) => (
												<div
													key={`${picture.caption}-${index}`}
													className="flex gap-2 rounded-md border border-gray-200 p-1.5"
												>
													{/* eslint-disable-next-line @next/next/no-img-element */}
													<img
														src={picture.dataUrl}
														alt={picture.caption}
														className="h-14 w-14 shrink-0 rounded object-cover"
													/>
													<div className="min-w-0 flex-1 space-y-1">
														<Input
															value={picture.caption}
															onChange={(e) =>
																setImages((prev) =>
																	prev.map((p, i) =>
																		i === index
																			? { ...p, caption: e.target.value }
																			: p
																	)
																)
															}
															placeholder="Caption"
															className="h-6 text-[11px]"
														/>
														<Button
															variant="ghost"
															size="sm"
															className="h-5 px-1 text-[10px] text-red-600 hover:text-red-700"
															onClick={() =>
																setImages((prev) =>
																	prev.filter((_, i) => i !== index)
																)
															}
														>
															<Trash2 className="mr-1 h-3 w-3" />
															Remove
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent
								value="preview"
								className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1"
							>
								<SpotRepPreview
									draft={draft}
									district={district}
									images={images}
								/>
							</TabsContent>
						</Tabs>

						<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
							<p className="text-[11px] text-muted-foreground">
								{missing.length > 0 ? (
									<span className="text-uganda-red">
										Still needed: {missing.join(", ")}
									</span>
								) : (
									"Ready to issue."
								)}
							</p>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={copyText}
									disabled={!ready}
									title="Plain text, for a WhatsApp or SMS thread"
								>
									<Copy className="mr-1 h-3.5 w-3.5" />
									Copy text
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => void download("pdf")}
									disabled={!ready || busy !== null}
								>
									{busy === "pdf" ? (
										<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
									) : (
										<FileDown className="mr-1 h-3.5 w-3.5" />
									)}
									PDF
								</Button>
								<Button
									size="sm"
									onClick={() => void download("docx")}
									disabled={!ready || busy !== null}
								>
									{busy === "docx" ? (
										<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
									) : (
										<FileDown className="mr-1 h-3.5 w-3.5" />
									)}
									Word (.docx)
								</Button>
							</div>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** One row of the composer. */
function SpotRepField({
	field,
	value,
	edited,
	onChange,
	onReset,
}: {
	field: (typeof SPOTREP_FIELDS)[number];
	value: string;
	edited: boolean;
	onChange: (value: string) => void;
	onReset: () => void;
}) {
	const id = `spotrep-${field.key}`;
	const empty = !value.trim();
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id} className="text-xs">
					{field.label}
					{field.required && <span className="text-uganda-red"> *</span>}
					{/* The one row nobody can look up says so on its face, so it is not
					    skipped as "another field the system filled in". */}
					{!field.derived && (
						<span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900">
							yours to write
						</span>
					)}
				</Label>
				{field.derived && edited && (
					<Button
						variant="ghost"
						size="sm"
						className="h-5 px-1.5 text-[10px] text-muted-foreground"
						onClick={onReset}
					>
						<RotateCcw className="mr-1 h-3 w-3" />
						Reset to record
					</Button>
				)}
			</div>
			{field.multiline ? (
				<Textarea
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					rows={field.rows ?? 4}
					className={cn(
						"text-xs leading-relaxed",
						field.required && empty && "border-uganda-red/50"
					)}
				/>
			) : (
				<Input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={cn(
						"h-8 text-xs",
						field.required && empty && "border-uganda-red/50"
					)}
				/>
			)}
			<p className="text-[11px] leading-snug text-muted-foreground">{field.hint}</p>
		</div>
	);
}

/**
 * The report as it will be issued.
 *
 * Not decoration: a spot report is a document with a named submitter on it, and
 * "read it before you sign it" needs the thing to be readable AS a document
 * rather than as the form that produced it.
 */
function SpotRepPreview({
	draft,
	district,
	images,
}: {
	draft: SpotRepDraft;
	district: string;
	images: SpotRepImage[];
}) {
	const rows = useMemo(() => spotRepRows(draft), [draft]);
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 text-[11px] leading-relaxed">
			<div className="mb-3 text-center">
				<p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
					Republic of Uganda — Ministry of Health
				</p>
				<p className="text-xs font-bold uppercase text-uganda-red">
					Office of the District Health Officer
					{district ? ` — ${district} District` : ""}
				</p>
			</div>
			<table className="w-full table-fixed border-collapse">
				<tbody>
					<tr>
						<td
							colSpan={2}
							className="border border-gray-300 bg-uganda-red p-2 text-center text-xs font-bold text-white"
						>
							{draft.title}
						</td>
					</tr>
					{rows.map((row) => (
						<tr key={row.label}>
							<td className="w-[26%] border border-gray-300 bg-gray-50 p-2 align-top font-semibold">
								{row.label}
							</td>
							<td className="border border-gray-300 p-2 align-top">
								{!row.value.trim() ? (
									<span className="italic text-muted-foreground">
										Not completed
									</span>
								) : row.bullets ? (
									<ul className="list-disc space-y-0.5 pl-4">
										{toBulletLines(row.value).map((line, i) => (
											<li key={i}>{line}</li>
										))}
									</ul>
								) : (
									row.value.split(/\n{2,}/).map((block, i) => (
										<p key={i} className={i > 0 ? "mt-2" : undefined}>
											{block.replace(/\n/g, " ")}
										</p>
									))
								)}
							</td>
						</tr>
					))}
					{images.length > 0 && (
						<tr>
							<td className="border border-gray-300 bg-gray-50 p-2 align-top font-semibold">
								Pictorials
							</td>
							<td className="border border-gray-300 p-2">
								<div className="flex flex-wrap gap-2">
									{images.map((picture, i) => (
										<figure key={i} className="w-32">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={picture.dataUrl}
												alt={picture.caption}
												className="w-full rounded border border-gray-200"
											/>
											{picture.caption.trim() && (
												<figcaption className="mt-0.5 text-[10px] text-muted-foreground">
													{picture.caption}
												</figcaption>
											)}
										</figure>
									))}
								</div>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

/** "district biostat" → "District Biostat", for the submitter's position. */
function titleCase(value?: string | null): string {
	return (value ?? "")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
