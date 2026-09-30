"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type Scope } from "@/lib/access";
import { neededBy, requiresMap, toggleGroup, togglePermission } from "@/lib/access-admin";
import {
	AccessApiError,
	createRole,
	updateRole,
	type PermissionGroup,
	type Role,
} from "@/lib/access-api";
import { AuthService, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/access/access-bits";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
	{ value: "national", label: "National", hint: "Sees all of Uganda." },
	{ value: "region", label: "One region", hint: "Sees one region; the region is chosen on each account." },
	{ value: "district", label: "One district", hint: "Sees one district; the district is chosen on each account." },
];

/** What the editor opens with. */
export interface RoleDraft {
	/** The role being edited; null creates (or duplicates into) a new one. */
	role: Role | null;
	name: string;
	description: string;
	scope: Scope;
	permissions: string[];
}

export function draftFor(role: Role | null, duplicate = false): RoleDraft {
	return {
		role: duplicate ? null : role,
		name: role ? (duplicate ? `Copy of ${role.name}`.slice(0, 50) : role.name) : "",
		description: role?.description ?? "",
		scope: role?.scope ?? "national",
		permissions: role && !role.isSystem ? [...role.permissions] : [],
	};
}

interface RoleEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	draft: RoleDraft;
	groups: PermissionGroup[];
	/** Read-only: the viewer may see roles but not change them. */
	readOnly: boolean;
	actor: User | null;
	onSaved: (role: Role) => void;
}

/**
 * Create, edit, duplicate or inspect a role: its name, how much of the country
 * it sees, and its permissions, grouped as the catalogue groups them.
 *
 * Ticking a permission ticks what it needs; unticking one unticks what needs
 * it, so the saved role is always exactly what the screen shows. A permission
 * the administrator does not hold is shown but cannot be ticked — the server
 * would refuse to grant it.
 */
export function RoleEditorDialog({ open, onOpenChange, draft, groups, readOnly, actor, onSaved }: RoleEditorDialogProps) {
	const { toast } = useToast();
	const isSystem = draft.role?.isSystem === true;
	const locked = readOnly || isSystem;
	const [name, setName] = useState(draft.name);
	const [description, setDescription] = useState(draft.description);
	const [scope, setScope] = useState<Scope>(draft.scope);
	const [selected, setSelected] = useState<string[]>(draft.permissions);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setName(draft.name);
		setDescription(draft.description);
		setScope(draft.scope);
		setSelected(draft.permissions);
		setErrors({});
		setFormError(null);
	}, [open, draft]);

	const requires = useMemo(() => requiresMap(groups), [groups]);
	const total = useMemo(() => groups.reduce((n, g) => n + g.permissions.length, 0), [groups]);
	const labels = useMemo(() => {
		const m = new Map<string, string>();
		for (const g of groups) for (const p of g.permissions) m.set(p.code, p.label);
		return m;
	}, [groups]);
	const held = useMemo(() => new Set(actor?.permissions ?? []), [actor]);
	const mayGrant = (code: string) => actor?.isSuperAdmin === true || held.has(code);
	const ticked = (code: string) => isSystem || selected.includes(code);

	const handleSave = async () => {
		const trimmed = name.trim();
		const e: Record<string, string> = {};
		if (trimmed.length < 2 || trimmed.length > 50) e.name = "Name must be 2–50 characters";
		setErrors(e);
		setFormError(null);
		if (Object.keys(e).length) return;

		setSaving(true);
		try {
			const input = { name: trimmed, description: description.trim(), scope, permissions: selected };
			const saved = draft.role ? await updateRole(draft.role.id, input) : await createRole(input);
			toast({ title: draft.role ? `Role ${saved.name} updated` : `Role ${saved.name} created` });
			// The administrator may have edited their own role.
			void AuthService.fetchUserProfile().catch(() => {});
			onSaved(saved);
			onOpenChange(false);
		} catch (err) {
			if (err instanceof AccessApiError) {
				const fields = { ...err.fields };
				if (err.status === 409 && !fields.name) fields.name = err.message;
				setErrors(fields);
				setFormError(Object.keys(fields).length ? null : err.message);
			} else {
				setFormError(err instanceof Error ? err.message : "Could not save the role");
			}
		} finally {
			setSaving(false);
		}
	};

	const title = isSystem
		? `${draft.name} (built-in)`
		: readOnly
			? draft.name
			: draft.role
				? `Edit role ${draft.role.name}`
				: "New role";

	return (
		<Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
			<DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{isSystem && <Lock className="h-4 w-4 text-uganda-red" />}
						{title}
					</DialogTitle>
					<DialogDescription>
						{isSystem
							? "The built-in administrator holds every permission, including any added later. It cannot be changed or deleted."
							: readOnly
								? "You can see this role but not change it."
								: "Changes apply to everyone holding the role on their next request."}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="role-name" className="text-xs">
							Name
						</Label>
						<Input
							id="role-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={50}
							className="h-8"
							disabled={locked}
							aria-invalid={Boolean(errors.name)}
							placeholder="e.g. Surveillance Officer"
						/>
						<FieldError message={errors.name} />
					</div>
					<div className="space-y-1 sm:row-span-2">
						<Label htmlFor="role-description" className="text-xs">
							Description (optional)
						</Label>
						<Textarea
							id="role-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={255}
							rows={3}
							disabled={locked}
							className="text-sm"
							placeholder="Who holds this role and what they do"
						/>
						<FieldError message={errors.description} />
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Sees</Label>
						<RadioGroup
							value={scope}
							onValueChange={(v) => setScope(v as Scope)}
							className="gap-1.5"
							disabled={locked}
						>
							{SCOPES.map((s) => (
								<label key={s.value} className="flex cursor-pointer items-start gap-2 text-sm">
									<RadioGroupItem value={s.value} className="mt-0.5" />
									<span>
										<span className="font-medium">{s.label}</span>
										<span className="block text-xs text-muted-foreground">{s.hint}</span>
									</span>
								</label>
							))}
						</RadioGroup>
						<FieldError message={errors.scope} />
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-sm font-semibold">Permissions</h3>
						<span className="text-xs text-muted-foreground">
							{isSystem ? "All permissions" : `${selected.length} of ${total} selected`}
						</span>
					</div>
					<FieldError message={errors.permissions} />
					{groups.length === 0 && (
						<p className="text-sm text-muted-foreground">Loading the permission list…</p>
					)}
					<div className="grid gap-2 md:grid-cols-2">
						{groups.map((group) => {
							const codes = group.permissions.map((p) => p.code);
							const on = codes.filter(ticked).length;
							const grantable = codes.filter(mayGrant);
							return (
								<fieldset key={group.name} className="rounded-md border p-2">
									<legend className="flex w-full items-center justify-between gap-2 px-1">
										<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											{group.name}
										</span>
										{!locked && grantable.length > 0 && (
											<label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
												<Checkbox
													checked={on === codes.length ? true : on > 0 ? "indeterminate" : false}
													onCheckedChange={(v) =>
														setSelected((s) => toggleGroup(s, grantable, v === true, requires))
													}
													aria-label={`All of ${group.name}`}
												/>
												All
											</label>
										)}
									</legend>
									<ul className="space-y-1.5">
										{group.permissions.map((p) => {
											const dependants = neededBy(selected, p.code, requires);
											// Removing is always allowed (a duplicated role may carry
											// permissions this administrator lacks); granting is not.
											const grantOk = mayGrant(p.code) || ticked(p.code);
											return (
												<li key={p.code}>
													<label
														className={cn(
															"flex items-start gap-2",
															locked || !grantOk ? "cursor-default" : "cursor-pointer"
														)}
														title={
															!locked && !grantOk
																? "You can only grant permissions you hold yourself"
																: undefined
														}
													>
														<Checkbox
															className="mt-0.5"
															checked={ticked(p.code)}
															disabled={locked || !grantOk}
															onCheckedChange={(v) =>
																setSelected((s) => togglePermission(s, p.code, v === true, requires))
															}
														/>
														<span className="min-w-0 text-sm leading-tight">
															<span className="inline-flex items-center gap-1 font-medium">
																{p.label}
																{p.sensitive && (
																	<span title="Sensitive: deletes data or grants access">
																		<TriangleAlert
																			className="h-3 w-3 text-warning"
																			aria-label="Sensitive"
																		/>
																	</span>
																)}
															</span>
															<span className="block text-xs text-muted-foreground">{p.description}</span>
															{!locked && dependants.length > 0 && (
																<span className="block text-[11px] text-muted-foreground">
																	Needed by {dependants.map((d) => labels.get(d) ?? d).join(", ")}
																</span>
															)}
														</span>
													</label>
												</li>
											);
										})}
									</ul>
								</fieldset>
							);
						})}
					</div>
				</div>

				{formError && (
					<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{formError}
					</p>
				)}

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
						{locked ? "Close" : "Cancel"}
					</Button>
					{!locked && (
						<Button size="sm" className="bg-uganda-red hover:bg-uganda-red/90" onClick={handleSave} disabled={saving}>
							{saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
							{draft.role ? "Save role" : "Create role"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
