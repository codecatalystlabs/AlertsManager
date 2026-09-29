"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { can, PERM } from "@/lib/access";
import { auditSentence } from "@/lib/access-admin";
import { fetchAccessAudit, type AuditPage, type PermissionGroup } from "@/lib/access-api";
import type { User } from "@/lib/auth";
import { formatDateTime, formatTimeAgo } from "@/lib/format-date";
import { labelFor } from "@/components/access/permission-labels";

type Table = "all" | "users" | "roles";
const PAGE_SIZE = 25;

/**
 * The Access log tab: who changed which account or role, and when — each
 * entry said as a sentence, never as raw codes. Returns nothing for an
 * account that may not read the log.
 */
export function AccessLogPanel({ actor, groups }: { actor: User | null; groups: PermissionGroup[] }) {
	const allowed = can(actor, PERM.auditView);
	const [table, setTable] = useState<Table>("all");
	const [page, setPage] = useState(1);
	const [data, setData] = useState<AuditPage | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const label = useMemo(() => labelFor(groups), [groups]);

	useEffect(() => {
		if (!allowed) return;
		let cancelled = false;
		setLoading(true);
		fetchAccessAudit({ page, limit: PAGE_SIZE, table })
			.then((d) => {
				if (cancelled) return;
				setData(d);
				setError(null);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the access log");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [allowed, page, table]);

	if (!allowed) return null;

	const pages = data?.pagination.pages ?? 1;

	return (
		<Card>
			<CardContent className="space-y-2 p-2.5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-sm text-muted-foreground">
						Every change to an account or a role, newest first.
					</p>
					<Select
						value={table}
						onValueChange={(v) => {
							setTable(v as Table);
							setPage(1);
						}}
					>
						<SelectTrigger className="h-8 w-40" aria-label="Show changes to">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All changes</SelectItem>
							<SelectItem value="users">Accounts</SelectItem>
							<SelectItem value="roles">Roles</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{error ? (
					<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</p>
				) : (
					<ol className="divide-y rounded-md border">
						{loading && !data && (
							<li className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</li>
						)}
						{data && data.entries.length === 0 && (
							<li className="px-3 py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</li>
						)}
						{data?.entries.map((entry) => {
							const { text, details } = auditSentence(entry, label);
							return (
								<li key={entry.id} className="flex gap-2.5 px-3 py-2">
									<History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1 text-sm">
										<p>
											<span className="font-medium">{entry.actor || "System"}</span> {text}
										</p>
										{details.map((line) => (
											<p key={line} className="text-xs text-muted-foreground">
												{line}
											</p>
										))}
									</div>
									<time
										className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
										dateTime={entry.timestamp}
										title={formatDateTime(entry.timestamp)}
									>
										{formatTimeAgo(entry.timestamp, "—")}
									</time>
								</li>
							);
						})}
					</ol>
				)}

				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						{data ? `${data.pagination.total.toLocaleString()} change${data.pagination.total === 1 ? "" : "s"}` : ""}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							className="h-7 w-7 p-0"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1 || loading}
							aria-label="Newer"
						>
							<ChevronLeft className="h-3.5 w-3.5" />
						</Button>
						<span>
							Page {page} of {pages}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="h-7 w-7 p-0"
							onClick={() => setPage((p) => Math.min(pages, p + 1))}
							disabled={page >= pages || loading}
							aria-label="Older"
						>
							<ChevronRight className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
