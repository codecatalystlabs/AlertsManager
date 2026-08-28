"use client";

import { cn } from "@/lib/utils";
import {
	buildRail,
	type RailSignal,
	type StageState,
} from "@/lib/stage-rail";
import { Check, CircleDashed, CircleSlash, Lock } from "lucide-react";

/**
 * Where one signal stands in the EBS steps.
 *
 * The strip on the list page answers "where is the work?"; this answers "where
 * is THIS?" — which gates it has passed, which one it is sitting at, and how
 * long it has been sitting there. Before this, a person reading a signal had to
 * infer its position from four scattered badges and a timeline of past events,
 * which is a reconstruction rather than a state.
 *
 * The state machine itself lives in lib/stage-rail.ts, pure and tested; this
 * file is only how it looks.
 */

const STATE_STYLE: Record<StageState, string> = {
	done: "border-success/40 bg-success/10 text-success",
	current: "border-uganda-red bg-uganda-red/5 text-uganda-black ring-1 ring-uganda-red",
	pending: "border-gray-200 bg-white text-gray-400",
	skipped: "border-warning/40 bg-warning/10 text-warning",
	blocked: "border-gray-200 bg-gray-50 text-gray-400",
	locked: "border-gray-200 bg-gray-50 text-gray-400",
};

function StateIcon({ state }: { state: StageState }) {
	const cls = "h-3 w-3 shrink-0";
	switch (state) {
		case "done":
			return <Check aria-hidden className={cls} />;
		case "blocked":
		case "skipped":
			return <CircleSlash aria-hidden className={cls} />;
		case "locked":
			return <Lock aria-hidden className={cls} />;
		default:
			return <CircleDashed aria-hidden className={cls} />;
	}
}

/** Where this signal stands in the EBS steps, as a horizontal rail. */
export function StageRail({
	signal,
	className,
}: {
	signal: RailSignal;
	className?: string;
}) {
	const stages = buildRail(signal);

	return (
		<ol
			aria-label="EBS steps position"
			className={cn("flex items-stretch gap-1 overflow-x-auto", className)}
		>
			{stages.map((stage) => (
				<li
					key={stage.label + String(stage.step)}
					className={cn(
						"flex min-w-[104px] flex-1 flex-col rounded-md border px-2 py-1.5",
						STATE_STYLE[stage.state]
					)}
					aria-current={stage.state === "current" ? "step" : undefined}
				>
					<div className="flex items-center gap-1">
						<StateIcon state={stage.state} />
						<span className="truncate text-[10.5px] font-semibold">
							{stage.label}
						</span>
					</div>
					<span className="mt-0.5 truncate text-[10px] font-normal opacity-80">
						{stage.detail ?? " "}
					</span>
				</li>
			))}
		</ol>
	);
}
