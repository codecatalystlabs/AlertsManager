"use client";

import { useState } from "react";
import { Copy, Eye, Lock, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { can, PERM, SCOPE_LABEL } from "@/lib/access";
import { canAssignRole } from "@/lib/access-admin";
import { deleteRole, type PermissionGroup, type Role } from "@/lib/access-api";
import type { User } from "@/lib/auth";
import { draftFor, RoleEditorDialog, type RoleDraft } from "@/components/access/role-editor-dialog";

interface RolesPanelProps {
	actor: User | null;
	roles: Role[];
	loading: boolean;
	error: string | null;
	onReload: () => void;
	groups: PermissionGroup[];
	/** Jump to the Users tab: this role's holders who have no area. */
	onShowMissingArea: (roleId: number) => void;
}

/**
 * The Roles tab: every role, how much of the country it sees, how many
 * permissions and accounts it has — and, for an administrator allowed to
 * manage roles, creating, editing, duplicating and deleting them. Returns
 * nothing for an account that may not see roles.
 */
export function RolesPanel({ actor, roles, loading, error, onReload, groups, onShowMissingArea }: RolesPanelProps) {
	const { toast } = useToast();
	const canManage = can(actor, PERM.rolesManage);
	const canSee = canManage || can(actor, PERM.usersView);

	const [editorOpen, setEditorOpen] = useState(false);
	const [draft, setDraft] = useState<RoleDraft>(() => draftFor(null));
	const [deleting, setDeleting] = useState<Role | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	if (!canSee) return null;

	const total = groups.reduce((n, g) => n + g.permissions.length, 0);
	/** Whether the actor may edit or delete this role (the server's rule). */
	const mayChange = (r: Role) => canManage && !r.isSystem && canAssignRole(actor, r);

	const open = (role: Role | null, duplicate = false) => {
		setDraft(draftFor(role, duplicate));
		setEditorOpen(true);
	};

	const handleDelete = async () => {
		if (!deleting) return;
		setIsDeleting(true);
		try {
			await deleteRole(deleting.id);
			toast({ title: `Role ${deleting.name} deleted` });
			setDeleting(null);
			onReload();
		} catch (err) {
			toast({
				title: "Could not delete the role",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm text-muted-foreground">
					A role is a set of permissions and how much of the country its holders see. The region or district
					itself is chosen on each account.
				</p>
				{canManage && (
					<Button size="sm" className="h-8 gap-1.5 bg-uganda-red hover:bg-uganda-red/90" onClick={() => open(null)}>
						<Plus className="h-4 w-4" />
						New role
					</Button>
				)}
			</div>

			<Card>
				<CardContent className="p-0">
					{error ? (
						<div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-destructive">
							<span>{error}</span>
							<Button variant="outline" size="sm" className="h-7" onClick={onReload}>
								Try again
							</Button>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Role</TableHead>
									<TableHead>Sees</TableHead>
									<TableHead>Permissions</TableHead>
									<TableHead>Accounts</TableHead>
									<TableHead className="text-right">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading && roles.length === 0 && (
									<TableRow>
										<TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
											Loading roles…
										</TableCell>
									</TableRow>
								)}
								{roles.map((r) => (
									<TableRow key={r.id}>
										<TableCell className="min-w-[14rem]">
											<div className="flex items-center gap-1.5 font-medium">
												{r.name}
												{r.isSystem && (
													<Badge
														variant="outline"
														className="gap-1 border-uganda-red/30 bg-uganda-red/10 text-uganda-red"
													>
														<Lock className="h-3 w-3" />
														Built-in
													</Badge>
												)}
											</div>
											{r.description && (
												<p className="max-w-md text-xs text-muted-foreground">{r.description}</p>
											)}
										</TableCell>
										<TableCell className="whitespace-nowrap text-xs">{SCOPE_LABEL[r.scope] ?? r.scope}</TableCell>
										<TableCell className="whitespace-nowrap text-xs">
											{r.isSystem ? "All permissions" : `${r.permissions.length}${total ? ` of ${total}` : ""}`}
										</TableCell>
										<TableCell className="text-xs">
											<div className="whitespace-nowrap">{r.userCount.toLocaleString()}</div>
											{r.usersMissingArea > 0 && (
												<button
													type="button"
													onClick={() => onShowMissingArea(r.id)}
													className="mt-0.5 inline-flex items-center gap-1 text-left text-[11px] text-warning underline-offset-2 hover:underline"
													title="Show these accounts"
												>
													<TriangleAlert className="h-3 w-3 shrink-0" />
													{r.usersMissingArea} {r.usersMissingArea === 1 ? "holder has" : "holders have"} no{" "}
													{r.scope === "region" ? "region" : "district"} and{" "}
													{r.usersMissingArea === 1 ? "sees" : "see"} nothing
												</button>
											)}
										</TableCell>
										<TableCell>
											<div className="flex justify-end gap-1">
												{mayChange(r) ? (
													<Button
														size="sm"
														variant="outline"
														className="h-6 w-6 p-0"
														onClick={() => open(r)}
														aria-label={`Edit ${r.name}`}
														title="Edit"
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
												) : (
													<Button
														size="sm"
														variant="outline"
														className="h-6 w-6 p-0"
														onClick={() => open(r)}
														aria-label={`View ${r.name}`}
														title={
															canManage && !r.isSystem
																? "This role holds permissions you do not have, so you can only view it"
																: "View"
														}
													>
														<Eye className="h-3.5 w-3.5" />
													</Button>
												)}
												{canManage && !r.isSystem && (
													<Button
														size="sm"
														variant="outline"
														className="h-6 w-6 p-0"
														onClick={() => open(r, true)}
														aria-label={`Duplicate ${r.name}`}
														title="Duplicate"
													>
														<Copy className="h-3.5 w-3.5" />
													</Button>
												)}
												{mayChange(r) && (
													<span
														title={
															r.userCount > 0
																? "Move its accounts to another role before deleting it"
																: "Delete"
														}
													>
														<Button
															size="sm"
															variant="outline"
															className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
															onClick={() => setDeleting(r)}
															disabled={r.userCount > 0}
															aria-label={`Delete ${r.name}`}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</span>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<RoleEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				draft={draft}
				groups={groups}
				readOnly={draft.role ? !mayChange(draft.role) : !canManage}
				actor={actor}
				onSaved={onReload}
			/>

			<ConfirmDeleteDialog
				open={deleting !== null}
				onOpenChange={(next) => !next && setDeleting(null)}
				title={`Delete role ${deleting?.name ?? ""}?`}
				description="Nobody holds this role. Deleting it cannot be undone; the access log keeps a record of it."
				isDeleting={isDeleting}
				onConfirm={() => void handleDelete()}
			/>
		</div>
	);
}
