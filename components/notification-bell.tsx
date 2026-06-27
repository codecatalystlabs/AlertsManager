"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Siren, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlertNotifications } from "@/hooks/use-alert-notifications";

/** Compact "x ago" for a recent timestamp; falls back to a local time string. */
function timeAgo(iso?: string): string {
	if (!iso) return "";
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return "";
	const secs = Math.round((Date.now() - t) / 1000);
	if (secs < 60) return "just now";
	const mins = Math.round(secs / 60);
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return new Date(t).toLocaleDateString();
}

export function NotificationBell() {
	const router = useRouter();
	const {
		notifications,
		unseenCount,
		markAllRead,
		clearAll,
		soundEnabled,
		setSoundEnabled,
	} = useAlertNotifications();
	const [open, setOpen] = useState(false);

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		// Opening the bell acknowledges the unseen ones.
		if (next) markAllRead();
	};

	const goToAlerts = () => {
		setOpen(false);
		router.push("/dashboard/alerts");
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="relative h-9 w-9 p-0"
					aria-label={
						unseenCount > 0
							? `Notifications, ${unseenCount} unread`
							: "Notifications"
					}
				>
					<Bell className="h-5 w-5 text-gray-600" />
					{unseenCount > 0 && (
						<span className="absolute -right-0.5 -top-0.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-uganda-red px-1 text-[10px] font-bold leading-4 text-white">
							{unseenCount > 99 ? "99+" : unseenCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between border-b px-3 py-2">
					<span className="text-sm font-semibold">New alerts</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setSoundEnabled(!soundEnabled)}
							className="text-muted-foreground hover:text-foreground"
							aria-label={
								soundEnabled
									? "Mute notification sound"
									: "Unmute notification sound"
							}
							title={
								soundEnabled
									? "Sound on — click to mute"
									: "Sound off — click to unmute"
							}
						>
							{soundEnabled ? (
								<Volume2 className="h-4 w-4" />
							) : (
								<VolumeX className="h-4 w-4" />
							)}
						</button>
						{notifications.length > 0 && (
							<button
								type="button"
								onClick={clearAll}
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Clear all
							</button>
						)}
					</div>
				</div>

				{notifications.length === 0 ? (
					<div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
						<Bell className="h-6 w-6 text-muted-foreground/50" />
						<p className="text-sm text-muted-foreground">
							No new alerts
						</p>
						<p className="text-xs text-muted-foreground/70">
							You&apos;ll be notified here when new alerts arrive.
						</p>
					</div>
				) : (
					<ScrollArea className="max-h-80">
						<ul className="divide-y">
							{notifications.map((n) => (
								<li key={n.id}>
									<button
										type="button"
										onClick={goToAlerts}
										className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60"
									>
										<span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-uganda-red/10">
											<Siren className="h-3.5 w-3.5 text-uganda-red" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">
												{n.caseName}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{n.district !== "—"
													? `${n.district} · `
													: ""}
												ALT{String(n.id).padStart(3, "0")}
											</span>
										</span>
										<span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
											{timeAgo(n.createdAt)}
										</span>
									</button>
								</li>
							))}
						</ul>
					</ScrollArea>
				)}
			</PopoverContent>
		</Popover>
	);
}
