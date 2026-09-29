"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LAYOUT } from "@/constants/layout";
import { useCurrentUser } from "@/hooks/use-current-user";
import { accessKnown, can, PERM } from "@/lib/access";
import { AccessLogPanel } from "@/components/access/access-log-panel";
import { RolesPanel } from "@/components/access/roles-panel";
import { NO_USERS_FILTER, UsersPanel, type UsersFilter } from "@/components/access/users-panel";
import { usePermissionCatalogue, useRoles } from "@/components/access/use-access-data";

type Tab = "users" | "roles" | "log";

/**
 * Users & Access: accounts, the roles they hold, and the log of every change
 * to either. Each tab shows only when the account may use it; the page itself
 * opens for any one of users.view, roles.manage or audit.view (lib/access.ts
 * PAGE_ACCESS), and the API enforces every action regardless.
 */
export default function UsersAccessPage() {
	const actor = useCurrentUser();
	const seesUsers = can(actor, PERM.usersView);
	const seesRoles = seesUsers || can(actor, PERM.rolesManage);
	const seesLog = can(actor, PERM.auditView);

	const tabs = useMemo(() => {
		const out: { value: Tab; label: string }[] = [];
		if (seesUsers) out.push({ value: "users", label: "Users" });
		if (seesRoles) out.push({ value: "roles", label: "Roles & permissions" });
		if (seesLog) out.push({ value: "log", label: "Access log" });
		return out;
	}, [seesUsers, seesRoles, seesLog]);

	const [tab, setTab] = useState<Tab | null>(null);
	useEffect(() => {
		if (tabs.length && !tabs.some((t) => t.value === tab)) setTab(tabs[0].value);
	}, [tabs, tab]);

	const roles = useRoles(seesRoles);
	const catalogue = usePermissionCatalogue(seesRoles);
	const [usersFilter, setUsersFilter] = useState<UsersFilter>(NO_USERS_FILTER);

	const showMissingArea = useCallback((roleId: number) => {
		setUsersFilter({ ...NO_USERS_FILTER, roleId, area: "missing" });
		setTab("users");
	}, []);

	if (!actor || !accessKnown(actor) || !tab) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-uganda-red" />
			</div>
		);
	}

	return (
		<div className="space-y-2.5 p-4">
			<div>
				<h1 className={LAYOUT.pageTitle}>Users & Access</h1>
				<p className={LAYOUT.pageSubtitle}>
					Accounts, the roles that decide what each can do and see, and a record of every change.
				</p>
			</div>

			<Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
				<TabsList>
					{tabs.map((t) => (
						<TabsTrigger key={t.value} value={t.value}>
							{t.label}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="users" className="mt-2.5">
					<UsersPanel
						actor={actor}
						roles={roles.data}
						filter={usersFilter}
						onFilterChange={setUsersFilter}
						onAccountsChanged={roles.reload}
					/>
				</TabsContent>
				<TabsContent value="roles" className="mt-2.5">
					<RolesPanel
						actor={actor}
						roles={roles.data}
						loading={roles.loading}
						error={roles.error}
						onReload={roles.reload}
						groups={catalogue.data}
						onShowMissingArea={showMissingArea}
					/>
				</TabsContent>
				<TabsContent value="log" className="mt-2.5">
					<AccessLogPanel actor={actor} groups={catalogue.data} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
