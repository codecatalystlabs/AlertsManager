"use client";

import { InfoIcon } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Info button beside a field label, carrying the EBS guidance for that field
 * (Event-Based Surveillance Guidelines for Uganda, MoH IES&PHE — see
 * uganda-ebs-operational-reference.md).
 *
 * `type="button"` matters: inside a <form> an unqualified button submits. The
 * text doubles as the aria-label so screen readers and keyboard users get it
 * without hovering, and Radix opens the tooltip on focus and on tap — which is
 * what phones do instead of hover.
 */
export function FieldHint({ text }: { text: string }) {
	return (
		<TooltipProvider delayDuration={150}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={text}
						className="text-gray-400 transition-colors hover:text-uganda-red focus-visible:text-uganda-red focus-visible:outline-none"
					>
						<InfoIcon className="h-3.5 w-3.5" />
					</button>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					{text}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
