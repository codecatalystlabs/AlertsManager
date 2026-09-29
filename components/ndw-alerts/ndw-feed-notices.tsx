import { Radar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of the quick-filter bar while the list shows LIVE NDW results,
 * so it is always obvious the rows are not the synced copy and how to get
 * back to it.
 */
export function NdwLiveBanner({
	total,
	noun,
	onEdit,
	onExit,
}: {
	total: number;
	noun: string;
	onEdit: () => void;
	onExit: () => void;
}) {
	return (
		<div
			role="status"
			className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900"
		>
			<Radar className="h-4 w-4 shrink-0" />
			<p className="text-xs">
				<span className="font-semibold">
					Live NDW query · {total.toLocaleString()} {noun}
				</span>
				<span className="text-sky-900/70">
					{" "}
					· read straight from NDW, not the synced copy. Tiles and quick filters
					resume when you go back.
				</span>
			</p>
			<div className="ml-auto flex gap-2">
				<Button size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={onEdit}>
					Edit query
				</Button>
				<Button size="sm" className="h-7 gap-1 text-xs" onClick={onExit}>
					<X className="h-3.5 w-3.5" />
					Back to synced records
				</Button>
			</div>
		</div>
	);
}

/**
 * The table's empty state: say why there is nothing, and offer the one click
 * that brings rows back.
 */
export function NdwEmptyState({
	noun,
	segmentLabel,
	filtered,
	onShowAll,
	onClear,
}: {
	noun: string;
	/** The selected segment, when one is. */
	segmentLabel?: string;
	filtered: boolean;
	onShowAll: () => void;
	onClear: () => void;
}) {
	let message: string;
	if (segmentLabel) {
		message = `No ${noun} in “${segmentLabel}”${filtered ? " with these filters" : ""}.`;
	} else if (filtered) {
		message = `No ${noun} match these filters.`;
	} else {
		return (
			<span>Nothing synced yet. Use Sync now to pull {noun} from NDW.</span>
		);
	}
	return (
		<div className="flex flex-col items-center gap-2 py-2">
			<span>{message}</span>
			<div className="flex gap-2">
				{segmentLabel && (
					<Button size="sm" variant="outline" className="h-7 text-xs" onClick={onShowAll}>
						Show all {noun}
					</Button>
				)}
				{filtered && (
					<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClear}>
						Clear filters
					</Button>
				)}
			</div>
		</div>
	);
}
