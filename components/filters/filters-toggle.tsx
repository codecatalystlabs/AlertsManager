"use client";

import { memo } from "react";
import { ChevronUp, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FiltersToggleProps {
	/** Whether the filter grid this button controls is currently visible. */
	open: boolean;
	onToggle: () => void;
	/** id of the grid, for aria-controls. */
	controls: string;
	/** Filters set but out of sight — badged so a collapsed grid never
	    narrows a list silently. Ignored while open. */
	activeCount?: number;
}

/**
 * The "Show filters" / "Hide filters" toggle shared by the Alerts, Signal
 * Register and eIDSR filter cards.
 *
 * The label is rendered as visible text, not sr-only: a bare slider icon read
 * as decoration and people did not find the filters behind it.
 */
export const FiltersToggle = memo<FiltersToggleProps>(
	({ open, onToggle, controls, activeCount = 0 }) => {
		const label = open ? "Hide filters" : "Show filters";

		return (
			<div className="flex items-center gap-1.5 shrink-0">
				{!open && activeCount > 0 && (
					<Badge
						variant="secondary"
						className="h-5 px-2 text-[10px] font-medium"
					>
						{activeCount} active
					</Badge>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onToggle}
					aria-expanded={open}
					aria-controls={controls}
					className="h-7 gap-1.5 px-2 text-xs"
				>
					{open ? <ChevronUp /> : <SlidersHorizontal />}
					{label}
				</Button>
			</div>
		);
	}
);

FiltersToggle.displayName = "FiltersToggle";
