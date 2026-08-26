"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	EBS_SIGNALS,
	SIGNAL_DOMAIN_LABEL,
	SIGNAL_SETTING_LABEL,
	normalizeSignalCode,
	signalMatches,
	type EbsSignal,
	type SignalDomain,
	type SignalSetting,
} from "@/lib/ebs-signals";

/**
 * Picks the Annex I / Annex II signal a report matches.
 *
 * Naming the signal is what makes a report countable by TYPE — "how many CH1
 * signals did this district report" is unanswerable while the classification
 * lives only in free text. Triage is where it belongs: it is the first moment
 * someone reads the report against the list.
 *
 * Two deliberate properties:
 *
 *   - It is never required. The guidelines call the signal list a
 *     non-prescriptive guide and encourage reporting anything unusual whether
 *     or not it appears on it, so "none of these" must remain expressible —
 *     hence the Clear control rather than a mandatory choice.
 *   - The full definition is shown, not just the code. Operators pick the
 *     wording they recognise; a grid of bare codes would be guessed at.
 */
export function SignalPicker({
	value,
	onChange,
	className,
}: {
	value: string | null;
	onChange: (code: string | null) => void;
	className?: string;
}) {
	const [query, setQuery] = useState("");
	const [setting, setSetting] = useState<SignalSetting | "all">("all");

	const selected = normalizeSignalCode(value);

	// Grouped by domain within the chosen setting, so an animal-health signal is
	// never hunted for among twenty human ones.
	const groups = useMemo(() => {
		const matching = EBS_SIGNALS.filter(
			(s) =>
				(setting === "all" || s.setting === setting) && signalMatches(s, query),
		);
		const order: SignalDomain[] = ["human", "animal", "environment"];
		return order
			.map((domain) => ({
				domain,
				signals: matching.filter((s) => s.domain === domain),
			}))
			.filter((g) => g.signals.length > 0);
	}, [query, setting]);

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-baseline justify-between gap-2">
				<Label className="text-xs">
					EBS signal <span className="text-muted-foreground">(optional)</span>
				</Label>
				{selected && (
					<button
						type="button"
						onClick={() => onChange(null)}
						className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-uganda-red"
					>
						<X className="h-3 w-3" />
						Clear
					</button>
				)}
			</div>

			<div className="flex gap-1">
				{(
					[
						{ key: "all" as const, label: "All" },
						{ key: "community" as const, label: "Community · II" },
						{ key: "facility" as const, label: "Facility · I" },
					] satisfies { key: SignalSetting | "all"; label: string }[]
				).map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setSetting(tab.key)}
						aria-pressed={setting === tab.key}
						className={cn(
							"flex-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
							setting === tab.key
								? "border-uganda-red bg-uganda-red/5 text-uganda-black"
								: "border-gray-200 text-muted-foreground hover:bg-gray-50",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="relative">
				<Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search the signal list — bleeding, CH1, animal…"
					className="h-8 pl-7 text-xs"
				/>
			</div>

			<div className="max-h-[380px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
				{groups.length === 0 ? (
					<p className="px-1 py-6 text-center text-xs text-muted-foreground">
						Nothing on the list matches “{query}”. That is a valid outcome —
						leave the signal blank and describe it in the note.
					</p>
				) : (
					groups.map((group) => (
						<div key={group.domain} className="space-y-1">
							<p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
								{SIGNAL_DOMAIN_LABEL[group.domain]}
							</p>
							{group.signals.map((signal) => (
								<SignalOption
									key={signal.code}
									signal={signal}
									selected={selected === signal.code}
									onSelect={() =>
										onChange(selected === signal.code ? null : signal.code)
									}
								/>
							))}
						</div>
					))
				)}
			</div>

			<p className="text-[11px] text-muted-foreground">
				Annex I and II are a guide, not a closed set — anything unusual is
				reportable whether or not it appears here. Leave blank when nothing
				matches.
			</p>
		</div>
	);
}

function SignalOption({
	signal,
	selected,
	onSelect,
}: {
	signal: EbsSignal;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			title={SIGNAL_SETTING_LABEL[signal.setting]}
			className={cn(
				"flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors",
				selected
					? "border-uganda-red bg-uganda-red/5 ring-1 ring-uganda-red"
					: "border-transparent hover:bg-gray-50",
			)}
		>
			<span
				className={cn(
					"mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
					selected ? "bg-uganda-red text-white" : "bg-gray-100 text-gray-600",
				)}
			>
				{signal.code}
			</span>
			<span className="text-xs leading-snug">{signal.label}</span>
			{selected && (
				<Check className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-uganda-red" />
			)}
		</button>
	);
}
