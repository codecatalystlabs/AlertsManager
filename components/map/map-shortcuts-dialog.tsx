"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export const MAP_SHORTCUTS: { keys: string[]; action: string }[] = [
	{ keys: ["Ctrl", "K"], action: "Find a region, district or subcounty" },
	{ keys: ["/"], action: "Find an area (same as Ctrl+K)" },
	{ keys: ["Esc"], action: "Up one level (or leave full screen)" },
	{ keys: ["H"], action: "Back to the whole country" },
	{ keys: ["F"], action: "Full screen" },
	{ keys: ["T"], action: "Open / close the timeline" },
	{ keys: ["Space"], action: "Play / pause the timeline" },
	{ keys: ["←", "→"], action: "Previous / next timeline frame" },
	{ keys: ["C"], action: "Shade by count / by change" },
	{ keys: ["I"], action: "Show / hide the insights panel" },
	{ keys: ["L"], action: "Live mode on / off" },
	{ keys: ["?"], action: "This list" },
];

export function MapShortcutsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Map keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Work anywhere on the map page, except while typing in a field.
					</DialogDescription>
				</DialogHeader>
				<ul className="divide-y text-sm">
					{MAP_SHORTCUTS.map((s) => (
						<li key={s.action} className="flex items-center justify-between gap-4 py-1.5">
							<span className="text-muted-foreground">{s.action}</span>
							<span className="flex shrink-0 gap-1">
								{s.keys.map((k) => (
									<kbd
										key={k}
										className="min-w-[1.6rem] rounded border border-b-2 bg-muted px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold"
									>
										{k}
									</kbd>
								))}
							</span>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
