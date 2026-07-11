"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface MultiSelectOption {
	value: string;
	label: string;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	/** Currently-selected values. */
	selected: string[];
	onChange: (values: string[]) => void;
	/** Trigger label shown when nothing is selected (i.e. "all"). */
	allLabel?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	/** Extra classes for the trigger button (e.g. a fixed width). */
	className?: string;
	/** Popover panel width. */
	contentClassName?: string;
	ariaLabel?: string;
}

/**
 * A compact popover multi-select: a searchable checklist that stays open across
 * clicks so several options can be picked in one go. Selecting nothing means
 * "all" (the caller treats an empty array as no filter). Built on the shared
 * Popover + Command primitives so it matches the rest of the UI.
 */
export function MultiSelect({
	options,
	selected,
	onChange,
	allLabel = "All",
	searchPlaceholder = "Search…",
	emptyText = "No matches.",
	disabled,
	className,
	contentClassName,
	ariaLabel,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const selectedSet = React.useMemo(() => new Set(selected), [selected]);

	function toggle(value: string) {
		const next = new Set(selectedSet);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		onChange(Array.from(next));
	}

	const count = selected.length;
	const triggerText =
		count === 0
			? allLabel
			: count === 1
				? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
				: `${count} selected`;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					role="combobox"
					aria-expanded={open}
					aria-label={ariaLabel}
					disabled={disabled}
					className={cn(
						"h-8 justify-between gap-1 text-xs font-normal",
						className
					)}
				>
					<span className="truncate">{triggerText}</span>
					{count > 0 ? (
						<Badge
							variant="secondary"
							className="ml-1 shrink-0 rounded-sm px-1 text-[10px]"
						>
							{count}
						</Badge>
					) : (
						<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className={cn("w-[260px] p-0", contentClassName)}
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} className="h-9" />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						{count > 0 && (
							<CommandGroup>
								<CommandItem
									onSelect={() => onChange([])}
									className="justify-center text-xs text-muted-foreground"
								>
									Clear selection ({count})
								</CommandItem>
							</CommandGroup>
						)}
						<CommandGroup>
							{options.map((o) => {
								const checked = selectedSet.has(o.value);
								return (
									<CommandItem
										key={o.value}
										value={o.label}
										onSelect={() => toggle(o.value)}
									>
										<div
											className={cn(
												"mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
												checked
													? "bg-primary text-primary-foreground"
													: "opacity-50"
											)}
										>
											{checked && <Check className="h-3 w-3" />}
										</div>
										<span className="truncate">{o.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
