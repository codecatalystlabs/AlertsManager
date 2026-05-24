import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
	message?: string;
	/** "inline" — fills the parent (typical inside content area);
	 *  "page" — full viewport overlay centered on the screen. */
	variant?: "inline" | "page";
	className?: string;
}

/**
 * Editorial loader — a thin oscillating bar in the warm palette, centered
 * absolutely both horizontally and vertically, with a quiet mono caption below.
 */
export const LoadingSpinner = memo<LoadingSpinnerProps>(
	({ message = "Loading…", variant = "inline", className }) => {
		return (
			<div
				role="status"
				aria-live="polite"
				aria-busy="true"
				className={cn(
					"flex items-center justify-center",
					variant === "page"
						? "fixed inset-0 z-50 bg-background"
						: "min-h-[60vh] w-full",
					className
				)}
			>
				<div className="flex flex-col items-center gap-5 text-center">
					{/* Bar loader: three accent stripes in red / yellow / green
					    sweeping through. */}
					<div className="relative h-[3px] w-40 overflow-hidden rounded-full bg-foreground/[0.06]">
						<span className="loader-bar-red absolute top-0 h-full w-1/3 rounded-full bg-accent-red" />
						<span className="loader-bar-yellow absolute top-0 h-full w-1/4 rounded-full bg-accent-yellow" />
						<span className="loader-bar-green absolute top-0 h-full w-1/5 rounded-full bg-accent-green" />
					</div>

					<div className="space-y-1">
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
							{message}
						</p>
						<p className="mono text-[9px] uppercase tracking-tighter text-muted-foreground/60">
							Ministry of Health · Republic of Uganda
						</p>
					</div>
				</div>
			</div>
		);
	}
);

LoadingSpinner.displayName = "LoadingSpinner";
