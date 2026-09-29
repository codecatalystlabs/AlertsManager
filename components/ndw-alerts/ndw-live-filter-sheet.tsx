"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
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
	groupNdwFields,
	NDW_FILTER_OPERATORS,
	type NdwFilterField,
} from "@/constants/ndw-filter-fields";

export interface NdwLiveFilterSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fields: NdwFilterField[];
	/** The live filters currently applied; the sheet edits a copy. */
	filters: Record<string, string>;
	operators: Record<string, string>;
	onApply: (filters: Record<string, string>, operators: Record<string, string>) => void;
}

function defaultOperator(field: NdwFilterField): string {
	return field.type === "text" ? "ilike." : "eq.";
}

/**
 * Advanced query against the LIVE NDW API (not the synced copy), with NDW's
 * own operators. Opened from the quick-filter bar's More menu; applying it
 * switches the list into live mode.
 */
export const NdwLiveFilterSheet = memo<NdwLiveFilterSheetProps>(
	({ open, onOpenChange, fields, filters, operators, onApply }) => {
		const [draft, setDraft] = useState<Record<string, string>>({});
		const [draftOps, setDraftOps] = useState<Record<string, string>>({});
		const grouped = useMemo(() => groupNdwFields(fields), [fields]);

		// Start every opening from what is applied.
		useEffect(() => {
			if (!open) return;
			setDraft({ ...filters });
			setDraftOps({ ...operators });
		}, [open, filters, operators]);

		const applySheet = () => {
			const built: Record<string, string> = {};
			for (const field of fields) {
				const raw = draft[field.key] ?? "";
				const op = draftOps[field.key] ?? defaultOperator(field);
				const val = buildNdwFilterValue(field, op, raw);
				if (val) built[field.key] = val;
			}
			onApply(built, { ...draftOps });
			onOpenChange(false);
		};


		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Query NDW live</SheetTitle>
						<SheetDescription>
							Searches the NDW source directly, not the synced copy. Uses
							NDW operators (eq, ilike., gte., is.null, …); text fields
							default to contains.
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
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={applySheet}>Apply filters</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		);
	}
);
NdwLiveFilterSheet.displayName = "NdwLiveFilterSheet";
