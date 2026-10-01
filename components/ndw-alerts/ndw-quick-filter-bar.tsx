"use client";

import {
	memo,
	useEffect,
	useId,
	useMemo,
	useState,
	type ComponentProps,
	type ReactNode,
} from "react";
import {
	CalendarRange,
	Check,
	ChevronDown,
	Radar,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DATE_RANGE_PRESETS,
	matchActiveDateRangePreset,
	resolveDateRangePreset,
} from "@/lib/date-range-presets";
import { cn } from "@/lib/utils";

// ── Config ────────────────────────────────────────────────────────────────

export interface QuickOption {
	value: string;
	label: string;
	count?: number;
	/** Parent value for a cascading chip (e.g. a district's region). */
	group?: string;
}

export type QuickChip =
	| {
			kind: "select";
			param: string;
			label: string;
			options: QuickOption[];
			/** Adds a type-to-find box; for long lists (nationalities, districts). */
			searchable?: boolean;
			/** Narrow options to those whose group equals the staged value of this param. */
			groupParam?: string;
	  }
	| { kind: "dateRange"; fromParam: string; toParam: string; label: string };

export type MoreField =
	| { kind: "text"; param: string; label: string; placeholder?: string }
	| {
			kind: "select";
			param: string;
			label: string;
			options: { value: string; label: string }[];
	  }
	| { kind: "dateRange"; fromParam: string; toParam: string; label: string };

type Filter = QuickChip | MoreField;

function paramsOf(f: Filter): string[] {
	return f.kind === "dateRange" ? [f.fromParam, f.toParam] : [f.param];
}

function filterId(f: Filter): string {
	return paramsOf(f).join("+");
}

type Params = Record<string, string>;

function clean(p: Params): Params {
	const out: Params = {};
	for (const [k, v] of Object.entries(p)) if (v.trim()) out[k] = v.trim();
	return out;
}

function differs(f: Filter, a: Params, b: Params): boolean {
	return paramsOf(f).some((p) => (a[p] ?? "") !== (b[p] ?? ""));
}

function hasValue(f: Filter, p: Params): boolean {
	return paramsOf(f).some((k) => Boolean(p[k]));
}

// ── Date helpers ──────────────────────────────────────────────────────────

function parseDay(v: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function rangeLabel(from: string, to: string): string {
	if (!from && !to) return "Any time";
	const preset = matchActiveDateRangePreset(from, to);
	if (preset) return DATE_RANGE_PRESETS.find((p) => p.key === preset)?.label ?? "";
	const f = parseDay(from);
	const t = parseDay(to);
	const md: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
	const mdy: Intl.DateTimeFormatOptions = { ...md, year: "numeric" };
	if (f && t) {
		const sameYear = f.getFullYear() === t.getFullYear();
		return `${f.toLocaleDateString(undefined, sameYear ? md : mdy)} – ${t.toLocaleDateString(undefined, mdy)}`;
	}
	if (f) return `Since ${f.toLocaleDateString(undefined, mdy)}`;
	return `Until ${t!.toLocaleDateString(undefined, mdy)}`;
}

function DateRangeEditor({
	from,
	to,
	onChange,
}: {
	from: string;
	to: string;
	onChange: (from: string, to: string) => void;
}) {
	const id = useId();
	const active = matchActiveDateRangePreset(from, to);
	return (
		<div className="space-y-2">
			<div className="grid grid-cols-2 gap-1">
				{DATE_RANGE_PRESETS.map((p) => (
					<Button
						key={p.key}
						type="button"
						size="sm"
						variant={active === p.key ? "default" : "outline"}
						className="h-7 justify-start px-2 text-[11px]"
						onClick={() => {
							const r = resolveDateRangePreset(p.key);
							onChange(r.fromDate, r.toDate);
						}}
					>
						{p.label}
					</Button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1">
					<Label htmlFor={`${id}-from`} className="text-[11px]">
						From
					</Label>
					<Input
						id={`${id}-from`}
						type="date"
						max={to || undefined}
						value={from}
						onChange={(e) => onChange(e.target.value, to)}
						className="h-8 text-xs"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor={`${id}-to`} className="text-[11px]">
						To
					</Label>
					<Input
						id={`${id}-to`}
						type="date"
						min={from || undefined}
						value={to}
						onChange={(e) => onChange(from, e.target.value)}
						className="h-8 text-xs"
					/>
				</div>
			</div>
		</div>
	);
}

// ── Chip shell ────────────────────────────────────────────────────────────

function ChipButton({
	label,
	value,
	icon,
	active,
	changed,
	...rest
}: {
	label: string;
	value: ReactNode;
	icon?: ReactNode;
	active: boolean;
	changed: boolean;
} & ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(
				"relative inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
				active
					? "border-foreground/50 bg-muted"
					: "border-input bg-background hover:bg-muted/60"
			)}
			{...rest}
		>
			{icon}
			<span className="shrink-0 text-muted-foreground">{label}</span>
			<span className="truncate font-semibold">{value}</span>
			<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
			{changed && (
				<span
					className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-uganda-yellow ring-2 ring-background"
					aria-label="changed, not applied"
				/>
			)}
		</button>
	);
}

function SelectChip({
	chip,
	staged,
	applied,
	onPick,
}: {
	chip: Extract<QuickChip, { kind: "select" }>;
	staged: Params;
	applied: Params;
	onPick: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const value = staged[chip.param] ?? "";
	const groupValue = chip.groupParam ? staged[chip.groupParam] : "";

	const options = useMemo(() => {
		let list = chip.options;
		if (chip.groupParam && groupValue) list = list.filter((o) => o.group === groupValue);
		// A value can appear once per group; show it once with the summed count.
		const merged = new Map<string, QuickOption>();
		for (const o of list) {
			const prev = merged.get(o.value);
			merged.set(
				o.value,
				prev ? { ...prev, count: (prev.count ?? 0) + (o.count ?? 0) } : { ...o }
			);
		}
		// Keep the picked value listed even when the other filters leave it at 0.
		if (value && !merged.has(value)) {
			const known = chip.options.find((o) => o.value === value);
			merged.set(value, { value, label: known?.label ?? value, count: 0 });
		}
		return [...merged.values()].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
	}, [chip.options, chip.groupParam, groupValue, value]);

	const current = options.find((o) => o.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<ChipButton
					label={chip.label}
					value={value ? (current?.label ?? value) : "Any"}
					active={Boolean(value)}
					changed={differs(chip, staged, applied)}
					aria-label={`${chip.label}: ${value ? (current?.label ?? value) : "any"}`}
				/>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-0" align="start">
				<Command>
					{chip.searchable && (
						<CommandInput placeholder={`Find ${chip.label.toLowerCase()}…`} className="h-9 text-xs" />
					)}
					<CommandList>
						<CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
							No match.
						</CommandEmpty>
						<CommandGroup>
							<CommandItem
								value={`any ${chip.label}`}
								onSelect={() => {
									onPick("");
									setOpen(false);
								}}
								className="text-xs"
							>
								<Check className={cn("h-3.5 w-3.5", value ? "opacity-0" : "opacity-100")} />
								Any {chip.label.toLowerCase()}
							</CommandItem>
							{options.map((o) => (
								<CommandItem
									key={o.value}
									value={`${o.label} ${o.value}`}
									onSelect={() => {
										onPick(o.value);
										setOpen(false);
									}}
									className="text-xs"
								>
									<Check
										className={cn(
											"h-3.5 w-3.5",
											o.value === value ? "opacity-100" : "opacity-0"
										)}
									/>
									<span className="truncate">{o.label}</span>
									{o.count !== undefined && (
										<span className="ml-auto pl-2 tabular-nums text-muted-foreground">
											{o.count.toLocaleString()}
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function DateChip({
	chip,
	staged,
	applied,
	onChange,
}: {
	chip: Extract<QuickChip, { kind: "dateRange" }>;
	staged: Params;
	applied: Params;
	onChange: (from: string, to: string) => void;
}) {
	const from = staged[chip.fromParam] ?? "";
	const to = staged[chip.toParam] ?? "";
	return (
		<Popover>
			<PopoverTrigger asChild>
				<ChipButton
					label={chip.label}
					value={rangeLabel(from, to)}
					icon={<CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
					active={Boolean(from || to)}
					changed={differs(chip, staged, applied)}
					aria-label={`${chip.label}: ${rangeLabel(from, to)}`}
				/>
			</PopoverTrigger>
			<PopoverContent className="w-72 space-y-2 p-3" align="start">
				<DateRangeEditor from={from} to={to} onChange={onChange} />
				{(from || to) && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-[11px]"
						onClick={() => onChange("", "")}
					>
						Any time
					</Button>
				)}
			</PopoverContent>
		</Popover>
	);
}

const ANY = "__any__";

function MoreFieldControl({
	field,
	staged,
	patch,
}: {
	field: MoreField;
	staged: Params;
	patch: (p: Params) => void;
}) {
	const id = useId();
	if (field.kind === "dateRange") {
		return (
			<div className="space-y-1">
				<p className="text-[11px] font-medium">{field.label}</p>
				<DateRangeEditor
					from={staged[field.fromParam] ?? ""}
					to={staged[field.toParam] ?? ""}
					onChange={(f, t) => patch({ [field.fromParam]: f, [field.toParam]: t })}
				/>
			</div>
		);
	}
	if (field.kind === "select") {
		const v = staged[field.param] ?? "";
		return (
			<div className="space-y-1">
				<Label htmlFor={id} className="text-[11px]">
					{field.label}
				</Label>
				<Select
					value={v || ANY}
					onValueChange={(nv) => patch({ [field.param]: nv === ANY ? "" : nv })}
				>
					<SelectTrigger id={id} className="h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ANY}>Any</SelectItem>
						{field.options.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}
	return (
		<div className="space-y-1">
			<Label htmlFor={id} className="text-[11px]">
				{field.label}
			</Label>
			<Input
				id={id}
				value={staged[field.param] ?? ""}
				placeholder={field.placeholder}
				onChange={(e) => patch({ [field.param]: e.target.value })}
				className="h-8 text-xs"
			/>
		</div>
	);
}

// ── Bar ───────────────────────────────────────────────────────────────────

interface NdwQuickFilterBarProps {
	searchPlaceholder: string;
	chips: QuickChip[];
	moreFields?: MoreField[];
	/**
	 * What the list currently shows; the bar stages edits against it. Must be
	 * referentially stable between commits (pass the data hook's `applied`).
	 */
	applied: { search: string; local: Params };
	onApply: (search: string, local: Params) => void;
	/** Opens the live NDW query sheet (from the More menu). */
	onOpenLive?: () => void;
	isLoading?: boolean;
}

/**
 * Search + filter chips over the synced records. Edits are staged: every
 * changed chip gets a yellow dot and a dark bar says how many filters changed,
 * so several can be set before the (large) query runs once. Enter in the search
 * box applies straight away.
 */
export const NdwQuickFilterBar = memo<NdwQuickFilterBarProps>(
	({ searchPlaceholder, chips, moreFields = [], applied, onApply, onOpenLive, isLoading }) => {
		const [search, setSearch] = useState(applied.search);
		const [staged, setStaged] = useState<Params>(applied.local);

		// Follow outside changes to what is applied (Clear, live mode, …). Pass
		// the hook's `applied` state itself: its identity changes only on commit,
		// so re-renders never wipe what the user is staging.
		useEffect(() => {
			setSearch(applied.search);
			setStaged(applied.local);
		}, [applied]);

		const patch = (p: Params) => setStaged((s) => ({ ...s, ...p }));
		// Changing a parent chip clears the chips that cascade from it (region →
		// district → division), so the bar never stages a district outside the
		// region it shows, which would match nothing.
		const pick = (param: string, value: string) => {
			if (value === (staged[param] ?? "")) return;
			const p: Params = { [param]: value };
			const clearBelow = (parent: string) => {
				for (const c of chips) {
					if (c.kind === "select" && c.groupParam === parent && !(c.param in p)) {
						p[c.param] = "";
						clearBelow(c.param);
					}
				}
			};
			clearBelow(param);
			patch(p);
		};

		const all: Filter[] = [...chips, ...moreFields];
		const changedFilters = all.filter((f) => differs(f, staged, applied.local)).length;
		const searchChanged = search.trim() !== applied.search.trim();
		const pending = changedFilters + (searchChanged ? 1 : 0);
		const anyApplied =
			Boolean(applied.search) || all.some((f) => hasValue(f, applied.local));
		const moreActive = moreFields.filter((f) => hasValue(f, staged)).length;
		const moreChanged = moreFields.some((f) => differs(f, staged, applied.local));

		const apply = () => onApply(search.trim(), clean(staged));
		const reset = () => {
			setSearch(applied.search);
			setStaged(applied.local);
		};

		return (
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative min-w-[14rem] flex-1 basis-full sm:basis-64">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") apply();
							}}
							placeholder={searchPlaceholder}
							aria-label="Search"
							className={cn("h-8 pl-8 text-sm", searchChanged && "border-foreground/50")}
						/>
					</div>

					{chips.map((chip) =>
						chip.kind === "select" ? (
							<SelectChip
								key={filterId(chip)}
								chip={chip}
								staged={staged}
								applied={applied.local}
								onPick={(v) => pick(chip.param, v)}
							/>
						) : (
							<DateChip
								key={filterId(chip)}
								chip={chip}
								staged={staged}
								applied={applied.local}
								onChange={(f, t) => patch({ [chip.fromParam]: f, [chip.toParam]: t })}
							/>
						)
					)}

					{(moreFields.length > 0 || onOpenLive) && (
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									className={cn(
										"relative inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
										moreActive
											? "border-foreground/50 bg-muted"
											: "border-input bg-background hover:bg-muted/60"
									)}
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									More
									{moreActive > 0 && (
										<span className="rounded bg-foreground px-1 text-[10px] leading-4 text-background">
											{moreActive}
										</span>
									)}
									{moreChanged && (
										<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-uganda-yellow ring-2 ring-background" />
									)}
								</button>
							</PopoverTrigger>
							<PopoverContent className="max-h-[70vh] w-80 space-y-3 overflow-y-auto p-3" align="end">
								{moreFields.length > 0 && (
									<>
										<p className="text-xs font-semibold">More filters</p>
										{moreFields.map((f) => (
											<MoreFieldControl
												key={filterId(f)}
												field={f}
												staged={staged}
												patch={patch}
											/>
										))}
									</>
								)}
								{onOpenLive && (
									<div className={cn(moreFields.length > 0 && "border-t pt-3")}>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-8 w-full justify-start gap-2 text-xs"
											onClick={onOpenLive}
										>
											<Radar className="h-3.5 w-3.5" />
											Query NDW live…
										</Button>
										<p className="mt-1 text-[10px] leading-snug text-muted-foreground">
											Searches the NDW source directly instead of the synced
											copy. Tiles and quick filters pause while it is on.
										</p>
									</div>
								)}
							</PopoverContent>
						</Popover>
					)}

					{anyApplied && pending === 0 && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 gap-1 px-2 text-xs text-muted-foreground"
							onClick={() => onApply("", {})}
							disabled={isLoading}
						>
							<X className="h-3.5 w-3.5" />
							Clear filters
						</Button>
					)}
				</div>

				{pending > 0 && (
					<div
						role="status"
						className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-uganda-black px-3 py-2 text-white shadow-sm animate-in fade-in-0 slide-in-from-top-1"
					>
						<span className="h-2 w-2 shrink-0 rounded-full bg-uganda-yellow" />
						<span className="text-xs">
							<span className="font-semibold">
								{pending} {pending === 1 ? "filter" : "filters"} changed
							</span>
							<span className="text-white/70"> · results update when you apply</span>
						</span>
						<div className="ml-auto flex gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-7 border-white/25 bg-transparent text-xs text-white hover:bg-white/10 hover:text-white"
								onClick={reset}
							>
								Reset
							</Button>
							<Button
								type="button"
								size="sm"
								className="h-7 bg-white text-xs text-uganda-black hover:bg-white/90"
								onClick={apply}
								disabled={isLoading}
							>
								Apply filters
							</Button>
						</div>
					</div>
				)}
			</div>
		);
	}
);
NdwQuickFilterBar.displayName = "NdwQuickFilterBar";
