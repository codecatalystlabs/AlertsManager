"use client";

import { memo } from "react";
import { Info } from "lucide-react";

/**
 * What the EVD chart and tables leave out, said where the numbers are read.
 *
 * They count signals RECORDED as EVD / VHF. Until 2026-09-29 they also
 * counted every signal with no disease recorded — 6,476 of them all-time,
 * mostly eCHIS forwards — which made more than half of the "EVD" table
 * signals nobody had called Ebola. The count is now shown here instead, with
 * a switch for anyone who needs the old reading.
 */
export const UnrecordedDiseaseNote = memo<{
	/** Signals in scope with no disease recorded; -1 when not applicable. */
	count: number;
	included: boolean;
	onToggle: (include: boolean) => void;
}>(({ count, included, onToggle }) => {
	if (!included && count <= 0) return null;
	return (
		<p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-amber-800">
			<Info className="h-3 w-3 shrink-0" />
			{included ? (
				<span>Signals with no disease recorded are counted here as EVD.</span>
			) : (
				<span>
					{count.toLocaleString()} signal{count === 1 ? "" : "s"} in this period {count === 1 ? "has" : "have"} no
					disease recorded and {count === 1 ? "is" : "are"} not counted as EVD.
				</span>
			)}
			<button
				type="button"
				onClick={() => onToggle(!included)}
				className="font-medium underline underline-offset-2 hover:text-amber-950"
			>
				{included ? "Count recorded EVD/VHF only" : "Count them anyway"}
			</button>
		</p>
	);
});
UnrecordedDiseaseNote.displayName = "UnrecordedDiseaseNote";
