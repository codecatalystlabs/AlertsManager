"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDistrictOptions } from "@/hooks/use-district-options";
import { useRegionOptions } from "@/hooks/use-region-options";
import { SCOPE_LABEL } from "@/lib/access";
import { canAssignRole, matchAreaOption } from "@/lib/access-admin";
import {
	AccessApiError,
	createUser,
	updateUser,
	type ManagedUser,
	type Role,
	type UserInput,
} from "@/lib/access-api";
import type { User } from "@/lib/auth";
import { FieldError } from "@/components/access/access-bits";

/** User types offered by the form; an account's own value is kept if it differs. */
const USER_TYPES = ["District", "REOC", "MoH", "MoH Call Centre", "EMS"] as const;
const NO_USER_TYPE = "__none__";
const MIN_PASSWORD = 8;

interface FormState {
	username: string;
	firstName: string;
	lastName: string;
	otherName: string;
	email: string;
	affiliation: string;
	userType: string;
	roleId: number | null;
	region: string;
	district: string;
	password: string;
}

function initialState(user: ManagedUser | null): FormState {
	return {
		username: user?.username ?? "",
		firstName: user?.firstName ?? "",
		lastName: user?.lastName ?? "",
		otherName: user?.otherName ?? "",
		email: user?.email ?? "",
		affiliation: user?.affiliation ?? "",
		userType: user?.userType ?? "",
		roleId: user?.role?.id ?? null,
		region: user?.region ?? "",
		district: user?.district ?? "",
		password: "",
	};
}

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** null creates a new account. */
	user: ManagedUser | null;
	roles: Role[];
	/** The administrator filling the form. */
	actor: User | null;
	onSaved: (user: ManagedUser) => void;
}

/**
 * Create or edit an account. The role decides whether a region or a district
 * must be chosen; only roles the administrator may hand out are offered. On
 * their own account an administrator can edit their details but not their
 * role, area or password — the server refuses those, so the form locks them.
 */
export function UserFormDialog({ open, onOpenChange, user, roles, actor, onSaved }: UserFormDialogProps) {
	const { toast } = useToast();
	const isEdit = user !== null;
	const isSelf = isEdit && actor?.id === user.id;
	const [form, setForm] = useState<FormState>(() => initialState(user));
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setForm(initialState(user));
		setErrors({});
		setFormError(null);
	}, [open, user]);

	const { regions } = useRegionOptions();
	const { districts } = useDistrictOptions();
	const role = roles.find((r) => r.id === form.roleId) ?? null;

	// Preselect the stored area even when the picker spells it differently.
	useEffect(() => {
		if (!open || !user) return;
		setForm((f) => ({
			...f,
			region: matchAreaOption(regions, f.region),
			district: matchAreaOption(districts, f.district),
		}));
	}, [open, user, regions, districts]);

	const assignable = useMemo(
		() => roles.filter((r) => canAssignRole(actor, r) || r.id === user?.role?.id),
		[roles, actor, user]
	);

	const userTypes = useMemo(() => {
		const current = form.userType.trim();
		return current && !USER_TYPES.includes(current as (typeof USER_TYPES)[number])
			? [...USER_TYPES, current]
			: [...USER_TYPES];
	}, [form.userType]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
		setForm((f) => ({ ...f, [key]: value }));
		setErrors((e) => {
			if (!e[key]) return e;
			const next = { ...e };
			delete next[key];
			return next;
		});
	};

	const validate = (): Record<string, string> => {
		const e: Record<string, string> = {};
		if (!form.username.trim()) e.username = "Username is required";
		if (!form.firstName.trim()) e.firstName = "First name is required";
		if (!form.lastName.trim()) e.lastName = "Last name is required";
		if (!form.email.trim()) e.email = "Email is required";
		if (!form.roleId) e.roleId = "Choose a role";
		if (role?.scope === "region" && !form.region) e.region = "This role is limited to one region: choose it";
		if (role?.scope === "district" && !form.district) e.district = "This role is limited to one district: choose it";
		if (!isEdit && form.password.length < MIN_PASSWORD)
			e.password = `Password must be at least ${MIN_PASSWORD} characters`;
		if (isEdit && form.password && form.password.length < MIN_PASSWORD)
			e.password = `Password must be at least ${MIN_PASSWORD} characters`;
		return e;
	};

	const handleSubmit = async () => {
		const e = validate();
		setErrors(e);
		setFormError(null);
		if (Object.keys(e).length > 0) return;

		const input: UserInput = {
			username: form.username.trim(),
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			otherName: form.otherName.trim(),
			email: form.email.trim(),
			affiliation: form.affiliation.trim(),
			userType: form.userType.trim(),
			roleId: form.roleId,
			region: role?.scope === "region" ? form.region : null,
			district: role?.scope === "district" ? form.district : null,
			password: isSelf ? "" : form.password,
		};
		if (isSelf) {
			// Role and area are locked on one's own account; send them back
			// exactly as stored so a re-spelled area cannot read as a change.
			input.region = user.region;
			input.district = user.district;
		}

		setSaving(true);
		try {
			const saved = isEdit ? await updateUser(user.id, input) : await createUser(input);
			toast({ title: isEdit ? `${saved.username} updated` : `Account ${saved.username} created` });
			onSaved(saved);
			onOpenChange(false);
		} catch (err) {
			if (err instanceof AccessApiError) {
				setErrors(err.fields);
				setFormError(Object.keys(err.fields).length ? null : err.message);
			} else {
				setFormError(err instanceof Error ? err.message : "Could not save the account");
			}
		} finally {
			setSaving(false);
		}
	};

	const text = (key: keyof FormState, label: string, props: React.ComponentProps<typeof Input> = {}) => (
		<div className="space-y-1">
			<Label htmlFor={`user-${key}`} className="text-xs">
				{label}
			</Label>
			<Input
				id={`user-${key}`}
				value={String(form[key] ?? "")}
				onChange={(ev) => set(key, ev.target.value as never)}
				className="h-8"
				aria-invalid={Boolean(errors[key])}
				{...props}
			/>
			<FieldError message={errors[key]} />
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? `Edit ${user.username}` : "New account"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Changes to the role or area apply on the account's next request — no need to sign out."
							: "The account can sign in as soon as it is created."}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3 sm:grid-cols-2">
					{text("username", "Username", { autoComplete: "off", placeholder: "e.g. jdoe" })}
					{text("email", "Email", { type: "email", placeholder: "name@health.go.ug" })}
					{text("firstName", "First name")}
					{text("lastName", "Last name")}
					{text("otherName", "Other name (optional)")}
					{text("affiliation", "Affiliation (optional)", { placeholder: "e.g. MoH Call Centre" })}

					<div className="space-y-1">
						<Label className="text-xs">User type (optional)</Label>
						<Select
							value={form.userType.trim() || NO_USER_TYPE}
							onValueChange={(v) => set("userType", v === NO_USER_TYPE ? "" : v)}
						>
							<SelectTrigger className="h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_USER_TYPE}>Not specified</SelectItem>
								{userTypes.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError message={errors.userType} />
					</div>
				</div>

				<div className="space-y-3 rounded-md border bg-muted/30 p-3">
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-sm font-semibold">Access</h3>
						{isSelf && (
							<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<Lock className="h-3 w-3" />
								Your own role and area: ask another administrator
							</span>
						)}
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<Label className="text-xs">Role</Label>
							<Select
								value={form.roleId ? String(form.roleId) : ""}
								onValueChange={(v) => set("roleId", Number(v))}
								disabled={isSelf}
							>
								<SelectTrigger className="h-8" aria-invalid={Boolean(errors.roleId)}>
									<SelectValue placeholder="Choose a role" />
								</SelectTrigger>
								<SelectContent>
									{assignable.map((r) => (
										<SelectItem key={r.id} value={String(r.id)}>
											{r.name} · {SCOPE_LABEL[r.scope] ?? r.scope}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{assignable.length < roles.length && !isSelf && (
								<p className="text-[11px] text-muted-foreground">
									Roles with permissions you do not hold are not listed.
								</p>
							)}
							<FieldError message={errors.roleId} />
						</div>

						{role?.scope === "region" && (
							<div className="space-y-1">
								<Label className="text-xs">Region</Label>
								<Select value={form.region} onValueChange={(v) => set("region", v)} disabled={isSelf}>
									<SelectTrigger className="h-8" aria-invalid={Boolean(errors.region)}>
										<SelectValue placeholder="Choose the region" />
									</SelectTrigger>
									<SelectContent>
										{regions.map((r) => (
											<SelectItem key={r} value={r}>
												{r}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError message={errors.region} />
							</div>
						)}
						{role?.scope === "district" && (
							<div className="space-y-1">
								<Label className="text-xs">District</Label>
								<Select value={form.district} onValueChange={(v) => set("district", v)} disabled={isSelf}>
									<SelectTrigger className="h-8" aria-invalid={Boolean(errors.district)}>
										<SelectValue placeholder="Choose the district" />
									</SelectTrigger>
									<SelectContent>
										{districts.map((d) => (
											<SelectItem key={d} value={d}>
												{d}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError message={errors.district} />
							</div>
						)}
						{role?.scope === "national" && (
							<p className="self-end pb-1.5 text-xs text-muted-foreground">
								A national role sees all of Uganda.
							</p>
						)}
					</div>
					{role && role.scope !== "national" && (
						<p className="text-[11px] text-muted-foreground">
							The account will only see signals, feeds and reports for this{" "}
							{role.scope === "region" ? "region" : "district"}.
						</p>
					)}
				</div>

				{!isSelf && (
					<div className="space-y-1">
						<Label htmlFor="user-password" className="text-xs">
							{isEdit ? "Set a new password (optional)" : "Password"}
						</Label>
						<PasswordInput
							id="user-password"
							autoComplete="new-password"
							value={form.password}
							onChange={(ev) => set("password", ev.target.value)}
							placeholder={isEdit ? "Leave blank to keep the current password" : ""}
							className="h-8"
							aria-invalid={Boolean(errors.password)}
						/>
						<p className="text-[11px] text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
						<FieldError message={errors.password} />
					</div>
				)}

				{formError && (
					<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{formError}
					</p>
				)}

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancel
					</Button>
					<Button size="sm" className="bg-uganda-red hover:bg-uganda-red/90" onClick={handleSubmit} disabled={saving}>
						{saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
						{isEdit ? "Save changes" : "Create account"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
