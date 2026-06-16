"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export interface SelectOption {
	value: string;
	label: string;
}

interface SearchableSelectProps {
	options: SelectOption[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	id?: string;
	/** Applied to the trigger button. */
	className?: string;
}

/**
 * Single-select dropdown with a type-to-filter search box. cmdk filters on each
 * item's `value` (set to the visible label), so users search by what they see.
 */
export function SearchableSelect({
	options,
	value,
	onChange,
	placeholder = "Select an option",
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled,
	id,
	className,
}: SearchableSelectProps) {
	const [open, setOpen] = React.useState(false);
	const selected = options.find((o) => o.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					id={id}
					disabled={disabled}
					className={cn(
						"w-full justify-between font-normal",
						!selected && "text-muted-foreground",
						className
					)}
				>
					<span className="truncate">
						{selected ? selected.label : placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[--radix-popover-trigger-width] p-0"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									onSelect={() => {
										onChange(
											option.value === value
												? ""
												: option.value
										);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											option.value === value
												? "opacity-100"
												: "opacity-0"
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

interface MultiSelectProps {
	options: SelectOption[];
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	id?: string;
	/** Applied to the trigger container. */
	className?: string;
}

/**
 * Searchable multiple-select. Selected options render as removable badges in the
 * trigger; the popover stays open so several can be picked in one go.
 */
export function MultiSelect({
	options,
	values,
	onChange,
	placeholder = "Select options",
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled,
	id,
	className,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const selectedOptions = options.filter((o) => values.includes(o.value));

	const toggle = (optionValue: string) => {
		onChange(
			values.includes(optionValue)
				? values.filter((v) => v !== optionValue)
				: [...values, optionValue]
		);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<div
					id={id}
					role="combobox"
					aria-expanded={open}
					tabIndex={disabled ? -1 : 0}
					aria-disabled={disabled}
					className={cn(
						"flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						disabled && "cursor-not-allowed opacity-50",
						className
					)}
				>
					{selectedOptions.length === 0 ? (
						<span className="text-muted-foreground">
							{placeholder}
						</span>
					) : (
						selectedOptions.map((option) => (
							<Badge
								key={option.value}
								variant="secondary"
								className="gap-1 bg-uganda-yellow/20 text-uganda-black"
							>
								{option.label}
								<button
									type="button"
									aria-label={`Remove ${option.label}`}
									className="rounded-sm outline-none hover:text-uganda-red"
									onMouseDown={(e) => {
										// Prevent the trigger from toggling the popover.
										e.preventDefault();
										e.stopPropagation();
									}}
									onClick={(e) => {
										e.stopPropagation();
										toggle(option.value);
									}}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))
					)}
					<ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 self-start opacity-50" />
				</div>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[--radix-popover-trigger-width] p-0"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const checked = values.includes(option.value);
								return (
									<CommandItem
										key={option.value}
										value={option.label}
										onSelect={() => toggle(option.value)}
									>
										<div
											className={cn(
												"mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-uganda-red",
												checked
													? "bg-uganda-red text-white"
													: "opacity-60"
											)}
										>
											{checked && (
												<Check className="h-3 w-3" />
											)}
										</div>
										{option.label}
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
