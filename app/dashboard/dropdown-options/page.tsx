"use client";

import { useCallback, useMemo, useState } from "react";
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	Edit,
	EyeOff,
	ListTree,
	Loader2,
	Plus,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import {
	useEbsSignalOptions,
	useInvalidateLookupOptions,
	useLookupOptions,
} from "@/hooks/use-lookup-options";
import {
	LOOKUP_CHANNEL_OF_REPORTING,
	LOOKUP_KIND_LABELS,
	LOOKUP_SOURCE_OF_ALERT,
	createLookupOption,
	deleteLookupOption,
	updateLookupOption,
	createEbsSignal,
	deleteEbsSignal,
	updateEbsSignal,
	type EbsSignalInput,
	type LookupKind,
	type LookupOption,
} from "@/lib/lookup-options";
import {
	SIGNAL_DOMAIN_LABEL,
	SIGNAL_SETTING_LABEL,
	type EbsSignalRow,
	type SignalDomain,
	type SignalSetting,
} from "@/lib/ebs-signals";

/**
 * Administration → Dropdown Options.
 *
 * Both "Source of Alert" and "Channel of Reporting" were hard-coded lists that
 * needed a code change and a redeploy to extend. This screen is the CRUD front
 * end for /lookups/:kind; whatever an admin saves here is what every signal
 * form, filter and export offers — including the PUBLIC self-report page.
 */

/** What each list means, shown under its tab so the two aren't confused. */
const KIND_BLURBS: Record<LookupKind, string> = {
	[LOOKUP_SOURCE_OF_ALERT]:
		"WHO or WHERE the signal came from — Community, Health facility, Point Of Entry…",
	[LOOKUP_CHANNEL_OF_REPORTING]:
		"The MEDIUM the signal arrived through — SMS (6767), Call Centre, eCHIS…",
};

interface OptionFormState {
	name: string;
	aliases: string;
	sortOrder: string;
	active: boolean;
}

const EMPTY_FORM: OptionFormState = {
	name: "",
	aliases: "",
	sortOrder: "",
	active: true,
};

function formFromOption(option: LookupOption): OptionFormState {
	return {
		name: option.name,
		aliases: option.aliases.join(", "),
		sortOrder: String(option.sortOrder),
		active: option.active,
	};
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

/** The EBS signal list is a third tab but not a LookupKind — it has its own API. */
const TAB_EBS_SIGNALS = "ebs_signals";
type OptionsTab = LookupKind | typeof TAB_EBS_SIGNALS;

export default function DropdownOptionsPage() {
	const [tab, setTab] = useState<OptionsTab>(LOOKUP_SOURCE_OF_ALERT);

	return (
		<div className="container mx-auto p-4">
			<div className="mb-4">
				<h1 className="text-xl font-bold text-gray-900 mb-1">
					Dropdown Options
				</h1>
				<p className="text-sm text-gray-600">
					Manage the option lists used by every signal form, filter and
					export — including the public report page. Changes take effect
					immediately; no redeploy needed.
				</p>
			</div>

			<Tabs
				value={tab}
				onValueChange={(value) => setTab(value as OptionsTab)}
			>
				<TabsList>
					<TabsTrigger value={LOOKUP_SOURCE_OF_ALERT}>
						{LOOKUP_KIND_LABELS[LOOKUP_SOURCE_OF_ALERT]}
					</TabsTrigger>
					<TabsTrigger value={LOOKUP_CHANNEL_OF_REPORTING}>
						{LOOKUP_KIND_LABELS[LOOKUP_CHANNEL_OF_REPORTING]}
					</TabsTrigger>
					<TabsTrigger value={TAB_EBS_SIGNALS}>EBS Signals</TabsTrigger>
				</TabsList>

				<TabsContent value={LOOKUP_SOURCE_OF_ALERT} className="mt-4">
					<OptionListCard kind={LOOKUP_SOURCE_OF_ALERT} />
				</TabsContent>
				<TabsContent value={LOOKUP_CHANNEL_OF_REPORTING} className="mt-4">
					<OptionListCard kind={LOOKUP_CHANNEL_OF_REPORTING} />
				</TabsContent>
				<TabsContent value={TAB_EBS_SIGNALS} className="mt-4">
					<EbsSignalsCard />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function OptionListCard({ kind }: { kind: LookupKind }) {
	const { toast } = useToast();
	// include_inactive is on in useLookupOptions, so retired options are listed
	// here (they're hidden from the pickers, not from the admin).
	const { options, loading, error } = useLookupOptions(kind);
	const invalidateLookups = useInvalidateLookupOptions();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<LookupOption | null>(null);
	const [form, setForm] = useState<OptionFormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleting, setDeleting] = useState<LookupOption | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [busyId, setBusyId] = useState<number | null>(null);

	const label = LOOKUP_KIND_LABELS[kind];

	/**
	 * Revalidate every option list after a write, so this table AND the module
	 * registries behind every open picker pick the change up at once. This kind's
	 * own key is one of them — no separate reload, which would just refetch it a
	 * second time.
	 */
	const refreshEverywhere = useCallback(
		() => invalidateLookups(),
		[invalidateLookups]
	);

	const openCreate = () => {
		setEditing(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setDialogOpen(true);
	};

	const openEdit = (option: LookupOption) => {
		setEditing(option);
		setForm(formFromOption(option));
		setFormError(null);
		setDialogOpen(true);
	};

	const handleSave = async () => {
		const name = form.name.trim();
		if (!name) {
			setFormError("Name is required.");
			return;
		}
		const sortOrder = form.sortOrder.trim()
			? Number(form.sortOrder.trim())
			: undefined;
		if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
			setFormError("Order must be a number.");
			return;
		}

		setSaving(true);
		setFormError(null);
		try {
			const input = {
				name,
				aliases: form.aliases
					.split(",")
					.map((alias) => alias.trim())
					.filter(Boolean),
				active: form.active,
				...(sortOrder !== undefined ? { sortOrder } : {}),
			};
			if (editing) {
				await updateLookupOption(kind, editing.id, input);
			} else {
				await createLookupOption(kind, input);
			}
			await refreshEverywhere();
			setDialogOpen(false);
			toast({
				title: editing ? "Option updated" : "Option added",
				description: `"${name}" is now part of the ${label} list.`,
			});
		} catch (err) {
			setFormError(
				errorMessage(err, "Could not save the option. Please retry.")
			);
		} finally {
			setSaving(false);
		}
	};

	/** Retire / restore without opening the dialog — the common everyday action. */
	const toggleActive = async (option: LookupOption) => {
		setBusyId(option.id);
		try {
			await updateLookupOption(kind, option.id, { active: !option.active });
			await refreshEverywhere();
			toast({
				title: option.active ? "Option retired" : "Option restored",
				description: option.active
					? `"${option.name}" no longer appears in pickers. Signals that already record it still display it.`
					: `"${option.name}" is offered in the ${label} pickers again.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not update the option",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setBusyId(null);
		}
	};

	/** Swap sort_order with the neighbouring row to move an option up or down. */
	const move = async (index: number, direction: -1 | 1) => {
		const option = options[index];
		const neighbour = options[index + direction];
		if (!option || !neighbour) return;
		setBusyId(option.id);
		try {
			await updateLookupOption(kind, option.id, {
				sortOrder: neighbour.sortOrder,
			});
			await updateLookupOption(kind, neighbour.id, {
				sortOrder: option.sortOrder,
			});
			await refreshEverywhere();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not reorder the list",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setBusyId(null);
		}
	};

	const handleDelete = async () => {
		if (!deleting) return;
		setIsDeleting(true);
		try {
			// The API refuses (409) to delete an in-use option unless forced. The
			// dialog has already spelled out the consequence for this exact row,
			// so an in-use delete confirmed here is a deliberate one.
			await deleteLookupOption(kind, deleting.id, deleting.usageCount > 0);
			await refreshEverywhere();
			toast({
				title: "Option deleted",
				description: `"${deleting.name}" was removed from the ${label} list.`,
			});
			setDeleting(null);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not delete the option",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const activeCount = useMemo(
		() => options.filter((option) => option.active).length,
		[options]
	);

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<ListTree className="h-4 w-4 text-muted-foreground" />
							{label}
						</CardTitle>
						<p className="mt-1 text-xs text-muted-foreground">
							{KIND_BLURBS[kind]}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{activeCount} shown in pickers ·{" "}
							{options.length - activeCount} retired
						</p>
					</div>
					<Button
						className="bg-uganda-red hover:bg-uganda-red/90 shrink-0"
						onClick={openCreate}
					>
						<Plus className="w-4 h-4 mr-2" />
						Add option
					</Button>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant="destructive" className="mb-3">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{loading && options.length === 0 ? (
						<div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading options…
						</div>
					) : options.length === 0 ? (
						<p className="py-8 text-sm text-muted-foreground">
							No options yet. Add the first one — until then the
							pickers fall back to the built-in list.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">Order</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>
											Also matches
											<span className="ml-1 font-normal text-muted-foreground">
												(legacy spellings)
											</span>
										</TableHead>
										<TableHead className="w-28">Status</TableHead>
										<TableHead className="w-28">Signals</TableHead>
										<TableHead className="w-44 text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{options.map((option, index) => (
										<TableRow
											key={option.id}
											className={
												option.active ? undefined : "opacity-60"
											}
										>
											<TableCell>
												<div className="flex items-center gap-0.5">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														aria-label={`Move ${option.name} up`}
														disabled={
															index === 0 || busyId !== null
														}
														onClick={() => move(index, -1)}
													>
														<ArrowUp className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														aria-label={`Move ${option.name} down`}
														disabled={
															index === options.length - 1 ||
															busyId !== null
														}
														onClick={() => move(index, 1)}
													>
														<ArrowDown className="h-3.5 w-3.5" />
													</Button>
												</div>
											</TableCell>
											<TableCell className="font-medium">
												{option.name}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{option.aliases.length > 0
													? option.aliases.join(", ")
													: "—"}
											</TableCell>
											<TableCell>
												{option.active ? (
													<Badge
														variant="outline"
														className="border-emerald-600 text-emerald-700"
													>
														Active
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="border-muted-foreground text-muted-foreground"
													>
														Retired
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-sm tabular-nums">
												{option.usageCount.toLocaleString()}
											</TableCell>
											<TableCell>
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openEdit(option)}
														disabled={busyId !== null}
													>
														<Edit className="h-4 w-4" />
														<span className="sr-only">
															Edit {option.name}
														</span>
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleActive(option)}
														disabled={busyId !== null}
														title={
															option.active
																? "Retire (hide from pickers, keep resolving on old signals)"
																: "Restore to the pickers"
														}
													>
														{busyId === option.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : option.active ? (
															<EyeOff className="h-4 w-4" />
														) : (
															<RotateCcw className="h-4 w-4" />
														)}
														<span className="sr-only">
															{option.active
																? "Retire"
																: "Restore"}{" "}
															{option.name}
														</span>
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={() => setDeleting(option)}
														disabled={busyId !== null}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">
															Delete {option.name}
														</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					if (!saving) setDialogOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{editing ? `Edit ${label} option` : `Add ${label} option`}
						</DialogTitle>
						<DialogDescription>
							The name is stored on every signal that selects it, so keep
							it short and unambiguous.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{formError && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-1">
							<Label htmlFor="option-name">
								Name <span className="text-uganda-red">*</span>
							</Label>
							<Input
								id="option-name"
								value={form.name}
								onChange={(e) =>
									setForm({ ...form, name: e.target.value })
								}
								placeholder={
									kind === LOOKUP_SOURCE_OF_ALERT
										? "e.g. Prison"
										: "e.g. WhatsApp"
								}
								disabled={saving}
							/>
							{editing && (
								<p className="text-xs text-muted-foreground">
									Renaming does not rewrite the{" "}
									{editing.usageCount.toLocaleString()} signal(s) that
									already store &quot;{editing.name}&quot; — the old
									name is kept as a legacy spelling instead, so they
									keep resolving to the new label.
								</p>
							)}
						</div>

						<div className="space-y-1">
							<Label htmlFor="option-aliases">
								Also matches (comma separated)
							</Label>
							<Input
								id="option-aliases"
								value={form.aliases}
								onChange={(e) =>
									setForm({ ...form, aliases: e.target.value })
								}
								placeholder="Community Member, Mass gathering"
								disabled={saving}
							/>
							<p className="text-xs text-muted-foreground">
								Older spellings stored on existing signals. They are
								hidden from the picker but still display, export and
								filter under this option&apos;s name.
							</p>
						</div>

						<div className="space-y-1">
							<Label htmlFor="option-order">Order</Label>
							<Input
								id="option-order"
								type="number"
								value={form.sortOrder}
								onChange={(e) =>
									setForm({ ...form, sortOrder: e.target.value })
								}
								placeholder="Leave blank to add at the end"
								disabled={saving}
							/>
							<p className="text-xs text-muted-foreground">
								Lower numbers appear first in the dropdown.
							</p>
						</div>

						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<Label htmlFor="option-active">Show in pickers</Label>
								<p className="text-xs text-muted-foreground">
									Turn off to retire the option: hidden from every
									dropdown, still resolved on the signals that
									already record it.
								</p>
							</div>
							<Switch
								id="option-active"
								checked={form.active}
								onCheckedChange={(checked) =>
									setForm({ ...form, active: checked })
								}
								disabled={saving}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setDialogOpen(false)}
								disabled={saving}
							>
								Cancel
							</Button>
							<Button
								className="bg-uganda-red hover:bg-uganda-red/90"
								onClick={handleSave}
								disabled={saving}
							>
								{saving ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Saving…
									</>
								) : editing ? (
									"Save changes"
								) : (
									"Add option"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<ConfirmDeleteDialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				title={`Delete "${deleting?.name ?? ""}"?`}
				description={
					deleting && deleting.usageCount > 0
						? `${deleting.usageCount.toLocaleString()} signal(s) still record this value. Deleting removes it from every picker and filter — those signals keep the value but stop being grouped under it. Retiring it instead (the eye icon) hides it from pickers while keeping it resolvable.`
						: `This removes "${deleting?.name ?? ""}" from the ${label} list. No signal currently records it.`
				}
				isDeleting={isDeleting}
				onConfirm={handleDelete}
				confirmLabel={
					deleting && deleting.usageCount > 0 ? "Delete anyway" : "Delete"
				}
				confirmingLabel="Deleting…"
			/>
		</>
	);
}

/* -------------------------------------------------------------------------- *
 * EBS signal list (Annex I / Annex II)
 *
 * Managed separately from the two name/alias lists because a signal carries the
 * CODE alerts store, a long definition, and the setting/domain axes the triage
 * picker groups by. The guidelines describe the list as reviewed annually by
 * IES&PHE, which is exactly why it is editable here rather than compiled in.
 * -------------------------------------------------------------------------- */

interface SignalFormState {
	code: string;
	label: string;
	setting: SignalSetting;
	domain: SignalDomain;
	sortOrder: string;
	active: boolean;
}

const EMPTY_SIGNAL_FORM: SignalFormState = {
	code: "",
	label: "",
	setting: "community",
	domain: "human",
	sortOrder: "",
	active: true,
};

function formFromSignal(signal: EbsSignalRow): SignalFormState {
	return {
		code: signal.code,
		label: signal.label,
		setting: signal.setting,
		domain: signal.domain,
		sortOrder: String(signal.sortOrder),
		active: signal.active,
	};
}

function EbsSignalsCard() {
	const { toast } = useToast();
	// Fetched with retired signals included — the admin sees the whole list.
	const { signals, loading, error } = useEbsSignalOptions();
	const invalidateLookups = useInvalidateLookupOptions();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<EbsSignalRow | null>(null);
	const [form, setForm] = useState<SignalFormState>(EMPTY_SIGNAL_FORM);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleting, setDeleting] = useState<EbsSignalRow | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [busyId, setBusyId] = useState<number | null>(null);

	const refreshEverywhere = useCallback(
		() => invalidateLookups(),
		[invalidateLookups]
	);

	const openCreate = () => {
		setEditing(null);
		setForm(EMPTY_SIGNAL_FORM);
		setFormError(null);
		setDialogOpen(true);
	};

	const openEdit = (signal: EbsSignalRow) => {
		setEditing(signal);
		setForm(formFromSignal(signal));
		setFormError(null);
		setDialogOpen(true);
	};

	const handleSave = async () => {
		const code = form.code.trim().toUpperCase();
		const label = form.label.trim();
		if (!code) {
			setFormError("Code is required.");
			return;
		}
		if (!label) {
			setFormError(
				"A definition is required — it is what a detector is trained to recognise."
			);
			return;
		}
		const sortOrder = form.sortOrder.trim()
			? Number(form.sortOrder.trim())
			: undefined;
		if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
			setFormError("Order must be a number.");
			return;
		}

		setSaving(true);
		setFormError(null);
		try {
			const input: EbsSignalInput = {
				code,
				label,
				setting: form.setting,
				domain: form.domain,
				active: form.active,
				...(sortOrder !== undefined ? { sortOrder } : {}),
			};
			if (editing) {
				await updateEbsSignal(editing.id, input);
			} else {
				await createEbsSignal(input);
			}
			await refreshEverywhere();
			setDialogOpen(false);
			toast({
				title: editing ? "Signal updated" : "Signal added",
				description: `${code} is now part of the Annex ${
					form.setting === "facility" ? "I" : "II"
				} list.`,
			});
		} catch (err) {
			setFormError(
				errorMessage(err, "Could not save the signal. Please retry.")
			);
		} finally {
			setSaving(false);
		}
	};

	const toggleActive = async (signal: EbsSignalRow) => {
		setBusyId(signal.id);
		try {
			await updateEbsSignal(signal.id, { active: !signal.active });
			await refreshEverywhere();
			toast({
				title: signal.active ? "Signal retired" : "Signal restored",
				description: signal.active
					? `${signal.code} is no longer offered at triage. Signals already classified under it still resolve to its definition.`
					: `${signal.code} can be picked at triage again.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not update the signal",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setBusyId(null);
		}
	};

	const move = async (index: number, direction: -1 | 1) => {
		const signal = signals[index];
		const neighbour = signals[index + direction];
		if (!signal || !neighbour) return;
		setBusyId(signal.id);
		try {
			await updateEbsSignal(signal.id, { sortOrder: neighbour.sortOrder });
			await updateEbsSignal(neighbour.id, { sortOrder: signal.sortOrder });
			await refreshEverywhere();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not reorder the list",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setBusyId(null);
		}
	};

	const handleDelete = async () => {
		if (!deleting) return;
		setIsDeleting(true);
		try {
			await deleteEbsSignal(deleting.id, deleting.usageCount > 0);
			await refreshEverywhere();
			toast({
				title: "Signal deleted",
				description: `${deleting.code} was removed from the signal list.`,
			});
			setDeleting(null);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Could not delete the signal",
				description: errorMessage(err, "Please retry."),
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const activeCount = useMemo(
		() => signals.filter((signal) => signal.active).length,
		[signals]
	);

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<ListTree className="h-4 w-4 text-muted-foreground" />
							EBS Signals (Annex I &amp; II)
						</CardTitle>
						<p className="mt-1 text-xs text-muted-foreground">
							The pre-defined unusual occurrences a detector is trained to
							recognise. Naming which one a report matches is what makes
							signals countable by type at triage.
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{activeCount} offered at triage ·{" "}
							{signals.length - activeCount} retired
						</p>
					</div>
					<Button
						className="bg-uganda-red hover:bg-uganda-red/90 shrink-0"
						onClick={openCreate}
					>
						<Plus className="w-4 h-4 mr-2" />
						Add signal
					</Button>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant="destructive" className="mb-3">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{loading && signals.length === 0 ? (
						<div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading signals…
						</div>
					) : signals.length === 0 ? (
						<p className="py-8 text-sm text-muted-foreground">
							No signals yet. Add the first one — until then the triage
							picker falls back to the published Annex lists.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">Order</TableHead>
										<TableHead className="w-20">Code</TableHead>
										<TableHead>Definition</TableHead>
										<TableHead className="w-40">Setting</TableHead>
										<TableHead className="w-32">Domain</TableHead>
										<TableHead className="w-24">Status</TableHead>
										<TableHead className="w-20">Signals</TableHead>
										<TableHead className="w-40 text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{signals.map((signal, index) => (
										<TableRow
											key={signal.id}
											className={
												signal.active ? undefined : "opacity-60"
											}
										>
											<TableCell>
												<div className="flex items-center gap-0.5">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														aria-label={`Move ${signal.code} up`}
														disabled={
															index === 0 || busyId !== null
														}
														onClick={() => move(index, -1)}
													>
														<ArrowUp className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														aria-label={`Move ${signal.code} down`}
														disabled={
															index === signals.length - 1 ||
															busyId !== null
														}
														onClick={() => move(index, 1)}
													>
														<ArrowDown className="h-3.5 w-3.5" />
													</Button>
												</div>
											</TableCell>
											<TableCell className="font-mono font-medium">
												{signal.code}
											</TableCell>
											<TableCell className="text-sm">
												{signal.label}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{SIGNAL_SETTING_LABEL[signal.setting]}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{SIGNAL_DOMAIN_LABEL[signal.domain]}
											</TableCell>
											<TableCell>
												{signal.active ? (
													<Badge
														variant="outline"
														className="border-emerald-600 text-emerald-700"
													>
														Active
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="border-muted-foreground text-muted-foreground"
													>
														Retired
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-sm tabular-nums">
												{signal.usageCount.toLocaleString()}
											</TableCell>
											<TableCell>
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openEdit(signal)}
														disabled={busyId !== null}
													>
														<Edit className="h-4 w-4" />
														<span className="sr-only">
															Edit {signal.code}
														</span>
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleActive(signal)}
														disabled={busyId !== null}
														title={
															signal.active
																? "Retire (hide from the triage picker, keep resolving on classified signals)"
																: "Restore to the triage picker"
														}
													>
														{busyId === signal.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : signal.active ? (
															<EyeOff className="h-4 w-4" />
														) : (
															<RotateCcw className="h-4 w-4" />
														)}
														<span className="sr-only">
															{signal.active
																? "Retire"
																: "Restore"}{" "}
															{signal.code}
														</span>
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={() => setDeleting(signal)}
														disabled={busyId !== null}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">
															Delete {signal.code}
														</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					if (!saving) setDialogOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{editing ? `Edit signal ${editing.code}` : "Add EBS signal"}
						</DialogTitle>
						<DialogDescription>
							The signal list is a guide, not a closed set — a report
							matching nothing on it is still a valid report.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{formError && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="grid grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label htmlFor="signal-code">
									Code <span className="text-uganda-red">*</span>
								</Label>
								<Input
									id="signal-code"
									value={form.code}
									onChange={(e) =>
										setForm({ ...form, code: e.target.value })
									}
									placeholder="CH12"
									className="font-mono"
									disabled={
										saving || (editing !== null && editing.usageCount > 0)
									}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label htmlFor="signal-setting">Where it is detected</Label>
								<Select
									value={form.setting}
									onValueChange={(value) =>
										setForm({ ...form, setting: value as SignalSetting })
									}
									disabled={saving}
								>
									<SelectTrigger id="signal-setting">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="community">
											{SIGNAL_SETTING_LABEL.community}
										</SelectItem>
										<SelectItem value="facility">
											{SIGNAL_SETTING_LABEL.facility}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{editing && editing.usageCount > 0 && (
							<p className="-mt-2 text-xs text-muted-foreground">
								The code is locked: {editing.usageCount.toLocaleString()}{" "}
								signal(s) already record {editing.code}, and changing it
								would leave them pointing at a definition that no longer
								exists. Retire this signal and add the new code instead —
								the definition below can still be edited.
							</p>
						)}

						<div className="space-y-1">
							<Label htmlFor="signal-label">
								Definition <span className="text-uganda-red">*</span>
							</Label>
							<Textarea
								id="signal-label"
								value={form.label}
								onChange={(e) =>
									setForm({ ...form, label: e.target.value })
								}
								placeholder="Two or more persons with similar signs and symptoms in the same location"
								rows={3}
								disabled={saving}
							/>
							<p className="text-xs text-muted-foreground">
								Worded as the detector would recognise it, not as a
								diagnosis. The annex (
								{form.setting === "facility" ? "I" : "II"}) follows from
								where it is detected.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="signal-domain">Domain</Label>
								<Select
									value={form.domain}
									onValueChange={(value) =>
										setForm({ ...form, domain: value as SignalDomain })
									}
									disabled={saving}
								>
									<SelectTrigger id="signal-domain">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="human">
											{SIGNAL_DOMAIN_LABEL.human}
										</SelectItem>
										<SelectItem value="animal">
											{SIGNAL_DOMAIN_LABEL.animal}
										</SelectItem>
										<SelectItem value="environment">
											{SIGNAL_DOMAIN_LABEL.environment}
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Groups the signal in the triage picker.
								</p>
							</div>
							<div className="space-y-1">
								<Label htmlFor="signal-order">Order</Label>
								<Input
									id="signal-order"
									type="number"
									value={form.sortOrder}
									onChange={(e) =>
										setForm({ ...form, sortOrder: e.target.value })
									}
									placeholder="End of the list"
									disabled={saving}
								/>
								<p className="text-xs text-muted-foreground">
									Lower numbers appear first.
								</p>
							</div>
						</div>

						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<Label htmlFor="signal-active">Offer at triage</Label>
								<p className="text-xs text-muted-foreground">
									Turn off to retire the signal: no longer selectable,
									still resolved on the signals already classified under
									it.
								</p>
							</div>
							<Switch
								id="signal-active"
								checked={form.active}
								onCheckedChange={(checked) =>
									setForm({ ...form, active: checked })
								}
								disabled={saving}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setDialogOpen(false)}
								disabled={saving}
							>
								Cancel
							</Button>
							<Button
								className="bg-uganda-red hover:bg-uganda-red/90"
								onClick={handleSave}
								disabled={saving}
							>
								{saving ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Saving…
									</>
								) : editing ? (
									"Save changes"
								) : (
									"Add signal"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<ConfirmDeleteDialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				title={`Delete signal ${deleting?.code ?? ""}?`}
				description={
					deleting && deleting.usageCount > 0
						? `${deleting.usageCount.toLocaleString()} signal(s) are classified as ${deleting.code}. Deleting the definition leaves them carrying a code that resolves to nothing — the exact state the code validation exists to prevent. Retiring it instead (the eye icon) keeps it resolvable while removing it from the triage picker.`
						: `This removes ${deleting?.code ?? ""} from the signal list. No signal is currently classified under it.`
				}
				isDeleting={isDeleting}
				onConfirm={handleDelete}
				confirmLabel={
					deleting && deleting.usageCount > 0 ? "Delete anyway" : "Delete"
				}
				confirmingLabel="Deleting…"
			/>
		</>
	);
}
