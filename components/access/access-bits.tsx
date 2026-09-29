"use client";

import { Lock, MapPin, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SCOPE_LABEL, type Scope } from "@/lib/access";
import { missingArea } from "@/lib/access-admin";
import type { ManagedUser, RoleRef } from "@/lib/access-api";
import { cn } from "@/lib/utils";

/**
 * The small pieces the Users & Access screens share: how a role, an area and
 * an account's status are shown, and a field's error line.
 */

/** A role's name; "No role" (cannot sign in) when there is none. */
export function RoleBadge({ role, legacyLevel }: { role: RoleRef | null; legacyLevel?: string }) {
	if (!role) {
		const legacy = legacyLevel?.trim();
		return (
			<Badge
				variant="outline"
				className="gap-1 border-warning/40 bg-warning/10 text-warning"
				title={
					legacy
						? `No role, so this account cannot sign in. Its old access level was "${legacy}".`
						: "No role, so this account cannot sign in."
				}
			>
				<TriangleAlert className="h-3 w-3" />
				No role
			</Badge>
		);
	}
	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-1 whitespace-nowrap",
				role.isSystem && "border-uganda-red/30 bg-uganda-red/10 text-uganda-red"
			)}
			title={`${role.name} — ${SCOPE_LABEL[role.scope] ?? role.scope}`}
		>
			{role.isSystem && <Lock className="h-3 w-3" />}
			{role.name}
		</Badge>
	);
}

/** Where an account works: its district, its region, or the whole country. */
export function AreaCell({ user }: { user: Pick<ManagedUser, "role" | "region" | "district"> }) {
	const scope: Scope | undefined = user.role?.scope;
	if (!user.role) return <span className="text-xs text-muted-foreground">—</span>;
	if (missingArea(scope, user.region, user.district)) {
		return (
			<Badge
				variant="outline"
				className="gap-1 whitespace-nowrap border-warning/40 bg-warning/10 text-warning"
				title="The role is limited to one area but none is assigned, so this account sees nothing."
			>
				<TriangleAlert className="h-3 w-3" />
				{scope === "district" ? "No district" : "No region"}
			</Badge>
		);
	}
	if (scope === "district" || scope === "region") {
		const place = scope === "district" ? user.district : `${user.region} region`;
		return (
			<span className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
				<MapPin className="h-3 w-3 text-uganda-red" />
				{place}
			</span>
		);
	}
	return <span className="whitespace-nowrap text-xs text-muted-foreground">All of Uganda</span>;
}

export function StatusBadge({ active }: { active: boolean }) {
	return active ? (
		<Badge variant="outline" className="border-success/30 bg-success/10 text-success">
			Active
		</Badge>
	) : (
		<Badge variant="outline" className="border-border bg-muted text-muted-foreground">
			Inactive
		</Badge>
	);
}

/** The server's (or the form's) message for one field. */
export function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return <p className="text-xs text-destructive">{message}</p>;
}
