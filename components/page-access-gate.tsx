"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { accessKnown, canOpen, firstOpenPath } from "@/lib/access";

/**
 * Shown in place of any dashboard page the account's role does not open. The
 * one "no access" screen in the app (#3), so every refusal reads the same and
 * offers the way back.
 */
export function Denied({ roleName, home }: { roleName?: string | null; home: string }) {
	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<Card className="max-w-md">
				<CardContent className="flex flex-col items-center gap-3 p-6 text-center">
					<ShieldX className="h-10 w-10 text-uganda-red" aria-hidden />
					<h2 className="text-base font-semibold">You don&apos;t have access to this page</h2>
					<p className="text-sm text-muted-foreground">
						{roleName ? (
							<>
								Your role, <span className="font-medium text-foreground">{roleName}</span>, does not
								include it.
							</>
						) : (
							"Your role does not include it."
						)}{" "}
						Ask an administrator if you need it.
					</p>
					<Button asChild size="sm">
						<Link href={home}>Go to your start page</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Guards every dashboard page with the same PAGE_ACCESS table the sidebar
 * reads, so a page reached by URL or bookmark answers exactly as the rail
 * does. The API refuses the page's data regardless; this spares the person a
 * screen of failed requests.
 *
 * A session stored by an older release carries no permissions until the
 * refresh in AuthWrapper lands; the page renders meanwhile rather than
 * flashing "no access" at someone who has it.
 */
export function PageAccessGate({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? "";
	const user = useCurrentUser();
	if (!user || !accessKnown(user) || canOpen(user, pathname)) return <>{children}</>;
	return <Denied roleName={user.role?.name} home={firstOpenPath(user)} />;
}
