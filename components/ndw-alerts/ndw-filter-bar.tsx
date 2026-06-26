"use client";

import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	buildNdwFilterValue,
	countActiveNdwFilters,
	groupNdwFields,
	NDW_FILTER_OPERATORS,
	type NdwFilterField,
} from "@/constants/ndw-filter-fields";
import { Filter, Search, X } from "lucide-react";

export interface NdwFilterBarProps {
	fields: NdwFilterField[];
	search: string;
	searchPlaceholder?: string;
	filters: Record<string, string>;
	operators: Record<string, string>;
	onSearchChange: (v: string) => void;
	onFiltersChange: (filters: Record<string, string>) => void;
	onOperatorsChange: (operators: Record<string, string>) => void;
	onApply: () => void;
	onClear: () => void;
	isLoading?: boolean;
}

function defaultOperator(field: NdwFilterField): string {
	return field.type === "text" ? "ilike." : "eq.";
}

export const NdwFilterBar = memo<NdwFilterBarProps>(
	({
		fields,
		search,
		searchPlaceholder = "Quick search…",
		filters,
		operators,
		onSearchChange,
		onFiltersChange,
		onOperatorsChange,
		onApply,
		onClear,
		isLoading,
	}) => {
		const [open, setOpen] = useState(false);
		const [draft, setDraft] = useState<Record<string, string>>({});
		const [draftOps, setDraftOps] = useState<Record<string, string>>({});

		const activeCount = countActiveNdwFilters(filters);
		const grouped = useMemo(() => groupNdwFields(fields), [fields]);

		const openSheet = () => {
			setDraft({ ...filters });
			setDraftOps({ ...operators });
			setOpen(true);
		};

		const applySheet = () => {
			const built: Record<string, string> = {};
			for (const field of fields) {
				const raw = draft[field.key] ?? "";
				const op = draftOps[field.key] ?? defaultOperator(field);
				const val = buildNdwFilterValue(field, op, raw);
				if (val) built[field.key] = val;
			}
			onFiltersChange(built);
			onOperatorsChange({ ...draftOps });
			setOpen(false);
			onApply();
		};

		const clearAll = () => {
			setDraft({});
			setDraftOps({});
			onSearchChange("");
			onFiltersChange({});
			onOperatorsChange({});
			onClear();
		};

		return (
			<div className="rounded-lg border bg-card p-3 space-y-2">
				<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
					<div className="relative flex-1 min-w-0">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							className="h-9 pl-8 text-sm"
							placeholder={searchPlaceholder}
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && onApply()}
						/>
					</div>
					<div className="flex flex-wrap gap-1.5 shrink-0">
						<Sheet open={open} onOpenChange={setOpen}>
							<SheetTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 gap-1.5"
									onClick={openSheet}
								>
									<Filter className="h-3.5 w-3.5" />
									Filters
									{activeCount > 0 ? (
										<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
											{activeCount}
										</Badge>
									) : null}
								</Button>
							</SheetTrigger>
							<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
								<SheetHeader>
									<SheetTitle>Advanced filters</SheetTitle>
									<SheetDescription>
										Uses NDW operators (eq, ilike., gte., is.null, …). Text
										fields default to contains.
									</SheetDescription>
								</SheetHeader>
								<Accordion
									type="multiple"
									defaultValue={Object.keys(grouped)}
									className="py-4"
								>
									{Object.entries(grouped).map(([group, groupFields]) => (
										<AccordionItem key={group} value={group}>
											<AccordionTrigger className="text-sm py-2">
												{group}
											</AccordionTrigger>
											<AccordionContent>
												<div className="grid gap-3 pt-1">
													{groupFields.map((field) => (
														<div key={field.key} className="space-y-1">
															<Label className="text-xs text-muted-foreground">
																{field.label}
															</Label>
															<div className="flex gap-1.5">
																<Select
																	value={
																		draftOps[field.key] ?? defaultOperator(field)
																	}
																	onValueChange={(v) =>
																		setDraftOps((o) => ({
																			...o,
																			[field.key]: v,
																		}))
																	}
																>
																	<SelectTrigger className="h-8 w-[110px] text-xs shrink-0">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{NDW_FILTER_OPERATORS.map((op) => (
																			<SelectItem key={op.value} value={op.value}>
																				{op.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{field.type === "boolean" ? (
																	<Select
																		value={draft[field.key] ?? ""}
																		onValueChange={(v) =>
																			setDraft((d) => ({
																				...d,
																				[field.key]: v,
																			}))
																		}
																	>
																		<SelectTrigger className="h-8 flex-1 text-xs">
																			<SelectValue placeholder="Any" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="true">Yes</SelectItem>
																			<SelectItem value="false">No</SelectItem>
																		</SelectContent>
																	</Select>
																) : (
																	<Input
																		className="h-8 text-xs flex-1"
																		type={
																			field.type === "number"
																				? "number"
																				: field.type === "date"
																					? "date"
																					: "text"
																		}
																		placeholder={field.placeholder}
																		value={draft[field.key] ?? ""}
																		onChange={(e) =>
																			setDraft((d) => ({
																				...d,
																				[field.key]: e.target.value,
																			}))
																		}
																	/>
																)}
															</div>
														</div>
													))}
												</div>
											</AccordionContent>
										</AccordionItem>
									))}
								</Accordion>
								<SheetFooter className="gap-2 sm:gap-0">
									<Button variant="outline" onClick={() => setOpen(false)}>
										Cancel
									</Button>
									<Button onClick={applySheet}>Apply filters</Button>
								</SheetFooter>
							</SheetContent>
						</Sheet>
						<Button
							size="sm"
							className="h-9"
							onClick={onApply}
							disabled={isLoading}
						>
							Apply
						</Button>
						{(activeCount > 0 || search) && (
							<Button
								variant="ghost"
								size="sm"
								className="h-9 px-2"
								onClick={clearAll}
								disabled={isLoading}
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
				{activeCount > 0 ? (
					<p className="text-[11px] text-muted-foreground">
						{activeCount} NDW filter{activeCount === 1 ? "" : "s"} active — querying
						live API
					</p>
				) : (
					<p className="text-[11px] text-muted-foreground">
						No advanced filters — showing locally synced records
					</p>
				)}
			</div>
		);
	}
);
NdwFilterBar.displayName = "NdwFilterBar";
