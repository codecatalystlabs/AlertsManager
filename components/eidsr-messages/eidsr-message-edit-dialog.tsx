"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	eidsrMessageToEditForm,
	mergeEidsrMessages,
	resolveEidsrVerifyId,
	type EidsrMessageEditForm,
} from "@/lib/eidsr-message-normalize";
import { getEidsr6767ById } from "@/lib/fetch-eidsr-6767";
import { updateEidsrMessage } from "@/lib/fetch-eidsr-messages";
import { DistrictSelect } from "@/components/district-select";
import { useToast } from "@/hooks/use-toast";

interface EidsrMessageEditDialogProps {
	isOpen: boolean;
	onClose: () => void;
	message: EidsrMessage | null;
	onSaved: (message: EidsrMessage) => void;
}

const EMPTY_FORM: EidsrMessageEditForm = {
	personReporting: "",
	contactNumber: "",
	messageText: "",
	status: "",
	alertCaseDistrict: "",
	village: "",
	subCounty: "",
	symptoms: "",
	actions: "",
	feedback: "",
	sourceOfAlert: "",
	response: "",
	alertCaseName: "",
	alertCaseAge: "",
	alertCaseSex: "",
};

export function EidsrMessageEditDialog({
	isOpen,
	onClose,
	message,
	onSaved,
}: EidsrMessageEditDialogProps) {
	const { toast } = useToast();
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loadedMessage, setLoadedMessage] = useState<EidsrMessage | null>(
		null
	);
	const [form, setForm] = useState<EidsrMessageEditForm>(EMPTY_FORM);

	useEffect(() => {
		if (!isOpen || !message) {
			setLoadedMessage(null);
			setForm(EMPTY_FORM);
			setError(null);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);
		setForm(eidsrMessageToEditForm(message));
		setLoadedMessage(message);

		void (async () => {
			try {
				const { message: fresh } = await getEidsr6767ById(message.id);
				if (cancelled) return;
				const merged = mergeEidsrMessages(message, fresh);
				setLoadedMessage(merged);
				setForm(eidsrMessageToEditForm(merged));
			} catch (err) {
				if (cancelled) return;
				const msg =
					err instanceof Error
						? err.message
						: "Could not load full record";
				setError(msg);
				setForm(eidsrMessageToEditForm(message));
				setLoadedMessage(message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isOpen, message]);

	const update = (field: keyof EidsrMessageEditForm, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		const target = loadedMessage ?? message;
		if (!target) return;
		setSaving(true);
		setError(null);
		try {
			const payload: Record<string, unknown> = { ...form };
			if (form.alertCaseAge.trim() !== "") {
				const age = Number(form.alertCaseAge);
				if (Number.isNaN(age)) {
					setError("Age must be a number");
					setSaving(false);
					return;
				}
				payload.alertCaseAge = age;
			} else {
				delete payload.alertCaseAge;
			}

			const updated = await updateEidsrMessage(
				resolveEidsrVerifyId(target),
				payload,
				target
			);
			toast({
				title: "Message updated",
				description: "6767 record saved successfully.",
			});
			onSaved(updated);
			onClose();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to update message";
			setError(msg);
			toast({ title: "Update failed", description: msg, variant: "destructive" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Edit 6767 record #{message?.id}
					</DialogTitle>
				</DialogHeader>

				{loading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading record from API…
					</div>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{!loading && (
					<div className="grid gap-3">
						<div className="grid gap-1.5">
							<Label>Reporter</Label>
							<Input
								value={form.personReporting}
								onChange={(e) =>
									update("personReporting", e.target.value)
								}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Phone</Label>
							<Input
								value={form.contactNumber}
								onChange={(e) =>
									update("contactNumber", e.target.value)
								}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Status</Label>
							<Input
								value={form.status}
								onChange={(e) => update("status", e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Source of alert</Label>
							<Input
								value={form.sourceOfAlert}
								onChange={(e) =>
									update("sourceOfAlert", e.target.value)
								}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Case name / disease</Label>
							<Input
								value={form.alertCaseName}
								onChange={(e) =>
									update("alertCaseName", e.target.value)
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-1.5">
								<Label>Age</Label>
								<Input
									type="number"
									min={0}
									value={form.alertCaseAge}
									onChange={(e) =>
										update("alertCaseAge", e.target.value)
									}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Sex</Label>
								<Input
									value={form.alertCaseSex}
									onChange={(e) =>
										update("alertCaseSex", e.target.value)
									}
								/>
							</div>
						</div>
						<div className="grid gap-1.5">
							<Label>Location / district</Label>
							<DistrictSelect
								value={form.alertCaseDistrict}
								onValueChange={(v) =>
									update("alertCaseDistrict", v)
								}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Village</Label>
							<Input
								value={form.village}
								onChange={(e) => update("village", e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Sub-county</Label>
							<Input
								value={form.subCounty}
								onChange={(e) => update("subCounty", e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Symptoms / notes</Label>
							<Textarea
								value={form.symptoms}
								onChange={(e) => update("symptoms", e.target.value)}
								rows={2}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Actions</Label>
							<Input
								value={form.actions}
								onChange={(e) => update("actions", e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Feedback</Label>
							<Input
								value={form.feedback}
								onChange={(e) => update("feedback", e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label>Message text</Label>
							<Textarea
								value={form.messageText}
								onChange={(e) =>
									update("messageText", e.target.value)
								}
								rows={4}
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={saving || loading}>
						{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
