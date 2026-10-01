"use client";

import { useRef, useState, type ReactNode } from "react";
import hotToast from "react-hot-toast";
import {
	ArrowDown,
	ArrowUp,
	BarChart3,
	BookOpen,
	Check,
	ChevronDown,
	Copy,
	Crosshair,
	Download,
	FileText,
	Flag,
	Gauge,
	GripVertical,
	ImageIcon,
	LayoutTemplate,
	Lightbulb,
	ListOrdered,
	Map as MapIcon,
	MoreHorizontal,
	Palette,
	PieChart,
	Plus,
	RotateCcw,
	Save,
	SeparatorHorizontal,
	Settings2,
	Sparkles,
	Stamp,
	Stethoscope,
	Table2,
	Trash2,
	TrendingUp,
	Type,
	Upload,
	X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { alertResponse } from "@/constants";
import {
	applyTemplate,
	ASPECT_LABEL,
	BACKGROUND_LABEL,
	builtInTemplates,
	CHART_VARIANT_LABEL,
	CLASSIFICATION_PRESETS,
	COVER_LAYOUT_LABEL,
	DECK_FONTS,
	DECK_THEME_PRESETS,
	defaultDeckConfig,
	deriveDeckTheme,
	downscaleImage,
	fontCss,
	INSIGHT_META,
	INSIGHT_ORDER,
	KPI_META,
	KPI_ORDER,
	newCustomSlide,
	newSavedTemplate,
	normalizeHex,
	parseConfigFile,
	serializeConfig,
	SLIDE_KIND_META,
	TEXT_LAYOUT_LABEL,
	TITLE_STYLE_LABEL,
	type ChartVariant,
	type CoverLayout,
	type DeckConfig,
	type DeckSlideItem,
	type DeckTemplate,
	type SlideKind,
	type TitleStyle,
} from "@/lib/management-report-config";

/** Disease options for the focus picker — same taxonomy as the map filter. */
const DISEASE_OPTIONS = [...alertResponse]
	.map((r) => ({ value: r.code, label: r.name }))
	.sort((a, b) => a.label.localeCompare(b.label));

const KIND_ICON: Record<SlideKind, typeof Gauge> = {
	cover: BookOpen,
	agenda: ListOrdered,
	summary: Gauge,
	highlights: Lightbulb,
	tableAll: Table2,
	tableVhf: Table2,
	sourcesPie: PieChart,
	narratives: FileText,
	cascadeAll: BarChart3,
	cascadeVhf: BarChart3,
	sourcesBar: BarChart3,
	diseaseBar: Stethoscope,
	map: MapIcon,
	trend: TrendingUp,
	focus: Crosshair,
	closing: Flag,
	text: Type,
	divider: SeparatorHorizontal,
	image: ImageIcon,
};

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Segmented<T extends string>({
	value,
	options,
	onChange,
	disabled,
	className,
}: {
	value: T;
	options: { value: T; label: ReactNode; title?: string }[];
	onChange: (v: T) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cn("inline-flex flex-wrap gap-0.5 rounded-md border bg-muted/40 p-0.5", className)}>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					title={o.title}
					disabled={disabled}
					onClick={() => onChange(o.value)}
					className={cn(
						"rounded px-2 py-1 text-xs transition-colors disabled:opacity-50",
						value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
	return (
		<div className={cn("space-y-1", className)}>
			<Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
			{children}
			{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
		</div>
	);
}

function Section({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<h4 className="flex items-center gap-1.5 text-xs font-semibold">
					{icon}
					{title}
				</h4>
				{action}
			</div>
			{children}
		</section>
	);
}

function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
	return (
		<label className="flex cursor-pointer items-start justify-between gap-3">
			<span className="text-xs">
				{label}
				{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
			</span>
			<Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5 shrink-0" />
		</label>
	);
}

function ImagePicker({
	value,
	onChange,
	maxPx,
	label,
	disabled,
}: {
	value: string | null;
	onChange: (v: string | null) => void;
	maxPx: number;
	label: string;
	disabled?: boolean;
}) {
	const ref = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	async function pick(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			hotToast.error("Choose an image file (PNG, JPG, SVG…).");
			return;
		}
		setBusy(true);
		try {
			onChange(await downscaleImage(file, maxPx));
		} catch (err) {
			hotToast.error(err instanceof Error ? err.message : "Could not read that image.");
		} finally {
			setBusy(false);
			if (ref.current) ref.current.value = "";
		}
	}
	return (
		<div className="flex items-center gap-2">
			<input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
			{value ? (
				<>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={value} alt={label} className="h-9 w-12 rounded border bg-white object-contain" />
					<Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={disabled || busy} onClick={() => ref.current?.click()}>
						Replace
					</Button>
					<Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={disabled} onClick={() => onChange(null)}>
						<X className="mr-1 h-3.5 w-3.5" />
						Remove
					</Button>
				</>
			) : (
				<Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={disabled || busy} onClick={() => ref.current?.click()}>
					<Upload className="mr-1 h-3.5 w-3.5" />
					{busy ? "Reading…" : `Upload ${label.toLowerCase()}`}
				</Button>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface DeckStudioConfigProps {
	config: DeckConfig;
	onChange: (patch: Partial<DeckConfig>) => void;
	/** Replace the whole config (templates, import, reset). */
	onReplace: (config: DeckConfig) => void;
	regionOptions: { value: string; label: string }[];
	/** Rendered slides per item id (tables/narratives can span pages). */
	pageCounts: Record<string, number>;
	activeItemId: string | null;
	onSelectItem: (itemId: string) => void;
	/** The loaded report carries a disease-focus block. */
	hasFocusData: boolean;
	savedTemplates: DeckTemplate[];
	onSavedTemplatesChange: (templates: DeckTemplate[]) => void;
	disabled?: boolean;
}

/**
 * The studio's configuration panel. Every edit is lifted to the parent, which
 * persists it and rebuilds the deck — the preview updates as you type.
 */
export function DeckConfigSection(props: DeckStudioConfigProps) {
	const { config } = props;
	const enabled = config.slides.filter((s) => s.enabled).length;
	return (
		<div className="rounded-lg border">
			<div className="flex items-center justify-between gap-2 border-b px-3 py-2">
				<span className="flex items-center gap-2 text-sm font-medium">
					<Settings2 className="h-4 w-4 text-uganda-red" />
					Configure presentation
				</span>
				<span className="text-xs text-muted-foreground">
					{enabled}/{config.slides.length} slides on
					{config.focusDiseases.length > 0 && ` · ${config.focusDiseases.length} focus`}
					{config.content.regions.length > 0 && ` · ${config.content.regions.length} region${config.content.regions.length === 1 ? "" : "s"}`}
				</span>
			</div>
			<Tabs defaultValue="slides" className="w-full">
				<div className="overflow-x-auto px-3 pt-3">
					<TabsList className="h-8">
						<TabsTrigger value="slides" className="px-2.5 text-xs">Slides</TabsTrigger>
						<TabsTrigger value="content" className="px-2.5 text-xs">Content</TabsTrigger>
						<TabsTrigger value="design" className="px-2.5 text-xs">Design</TabsTrigger>
						<TabsTrigger value="branding" className="px-2.5 text-xs">Branding</TabsTrigger>
						<TabsTrigger value="templates" className="px-2.5 text-xs">Templates</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="slides" className="mt-0 px-3 pb-3 pt-3">
					<SlidesTab {...props} />
				</TabsContent>
				<TabsContent value="content" className="mt-0 px-3 pb-3 pt-3">
					<ContentTab {...props} />
				</TabsContent>
				<TabsContent value="design" className="mt-0 px-3 pb-3 pt-3">
					<DesignTab {...props} />
				</TabsContent>
				<TabsContent value="branding" className="mt-0 px-3 pb-3 pt-3">
					<BrandingTab {...props} />
				</TabsContent>
				<TabsContent value="templates" className="mt-0 px-3 pb-3 pt-3">
					<TemplatesTab {...props} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Slides tab                                                          */
/* ------------------------------------------------------------------ */

function autoTitle(item: DeckSlideItem): string {
	return SLIDE_KIND_META[item.kind].label;
}

function SlidesTab({ config, onChange, pageCounts, activeItemId, onSelectItem, hasFocusData, disabled }: DeckStudioConfigProps) {
	const [expanded, setExpanded] = useState<string | null>(null);
	const [dragId, setDragId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const slides = config.slides;

	const setSlides = (next: DeckSlideItem[]) => onChange({ slides: next, templateId: null });
	const update = (id: string, patch: Partial<DeckSlideItem>) =>
		setSlides(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));
	const move = (id: string, delta: number) => {
		const i = slides.findIndex((s) => s.id === id);
		const j = i + delta;
		if (i < 0 || j < 0 || j >= slides.length) return;
		const next = [...slides];
		[next[i], next[j]] = [next[j], next[i]];
		setSlides(next);
	};
	const moveTo = (fromId: string, toId: string) => {
		if (fromId === toId) return;
		const from = slides.findIndex((s) => s.id === fromId);
		const to = slides.findIndex((s) => s.id === toId);
		if (from < 0 || to < 0) return;
		const next = [...slides];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		setSlides(next);
	};
	const add = (kind: "text" | "divider" | "image") => {
		const item = newCustomSlide(kind);
		const at = activeItemId ? slides.findIndex((s) => s.id === activeItemId) : -1;
		const next = [...slides];
		next.splice(at >= 0 ? at + 1 : next.length, 0, item);
		setSlides(next);
		setExpanded(item.id);
		onSelectItem(item.id);
	};
	const duplicate = (id: string) => {
		const i = slides.findIndex((s) => s.id === id);
		if (i < 0) return;
		const copy = { ...newCustomSlide(slides[i].kind as "text"), ...slides[i] };
		copy.id = `${slides[i].kind}-${Math.random().toString(36).slice(2, 9)}`;
		const next = [...slides];
		next.splice(i + 1, 0, copy);
		setSlides(next);
	};
	const remove = (id: string) => setSlides(slides.filter((s) => s.id !== id));
	// "All off" keeps the cover so the deck never ends up empty.
	const setAll = (on: boolean) => setSlides(slides.map((s) => ({ ...s, enabled: on || s.kind === "cover" })));

	const totalPages = slides.reduce((n, s) => n + (s.enabled ? pageCounts[s.id] ?? 0 : 0), 0);

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-[11px] text-muted-foreground">
					Drag to reorder · click a row to edit · <span className="font-medium text-foreground">{totalPages}</span> slides in the deck
				</p>
				<div className="flex items-center gap-1">
					<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={disabled} onClick={() => setAll(true)}>
						All on
					</Button>
					<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={disabled} onClick={() => setAll(false)}>
						All off
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={disabled}>
								<Plus className="mr-1 h-3.5 w-3.5" />
								Add slide
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<DropdownMenuLabel className="text-xs">Insert after the selected slide</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{(["text", "divider", "image"] as const).map((k) => {
								const Icon = KIND_ICON[k];
								return (
									<DropdownMenuItem key={k} onClick={() => add(k)} className="items-start gap-2">
										<Icon className="mt-0.5 h-4 w-4 text-uganda-red" />
										<span>
											<span className="block text-xs font-medium">{SLIDE_KIND_META[k].label}</span>
											<span className="block text-[11px] text-muted-foreground">{SLIDE_KIND_META[k].description}</span>
										</span>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<ol className="space-y-1">
				{slides.map((item, i) => {
					const meta = SLIDE_KIND_META[item.kind];
					const Icon = KIND_ICON[item.kind];
					const open = expanded === item.id;
					const active = activeItemId === item.id;
					const pages = pageCounts[item.id] ?? 0;
					const needsFocus = meta.needs === "focus" && (config.focusDiseases.length === 0 || !hasFocusData);
					return (
						<li
							key={item.id}
							draggable={!disabled}
							onDragStart={(e) => {
								setDragId(item.id);
								e.dataTransfer.effectAllowed = "move";
							}}
							onDragOver={(e) => {
								if (!dragId) return;
								e.preventDefault();
								setOverId(item.id);
							}}
							onDragLeave={() => setOverId((o) => (o === item.id ? null : o))}
							onDrop={(e) => {
								e.preventDefault();
								if (dragId) moveTo(dragId, item.id);
								setDragId(null);
								setOverId(null);
							}}
							onDragEnd={() => {
								setDragId(null);
								setOverId(null);
							}}
							className={cn(
								"rounded-md border bg-background transition-colors",
								active && "border-uganda-red/60 bg-uganda-red/[0.03]",
								overId === item.id && dragId !== item.id && "border-dashed border-uganda-red",
								dragId === item.id && "opacity-50",
								!item.enabled && "bg-muted/30"
							)}
						>
							<div className="flex items-center gap-1.5 px-1.5 py-1.5">
								<GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />
								<Switch
									checked={item.enabled}
									disabled={disabled}
									onCheckedChange={(v) => update(item.id, { enabled: v })}
									aria-label={`Include ${item.title || meta.label}`}
									className="scale-90"
								/>
								<button
									type="button"
									className="flex min-w-0 flex-1 items-center gap-2 text-left"
									onClick={() => {
										setExpanded(open ? null : item.id);
										onSelectItem(item.id);
									}}
								>
									<span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
									<Icon className={cn("h-3.5 w-3.5 shrink-0", item.enabled ? "text-uganda-red" : "text-muted-foreground")} />
									<span className={cn("truncate text-xs", !item.enabled && "text-muted-foreground line-through decoration-muted-foreground/40")}>
										{item.title.trim() || autoTitle(item)}
									</span>
									{meta.custom && <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px] font-normal">custom</Badge>}
									{item.enabled && pages > 1 && (
										<Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px] font-normal">{pages} slides</Badge>
									)}
									{item.enabled && needsFocus && (
										<Badge variant="outline" className="h-4 shrink-0 border-amber-300 px-1 text-[9px] font-normal text-amber-700">needs focus</Badge>
									)}
									{item.notes.trim() && <span className="shrink-0 text-[9px] text-muted-foreground" title="Has speaker notes">✎</span>}
								</button>
								<div className="flex shrink-0 items-center">
									<button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={disabled || i === 0} onClick={() => move(item.id, -1)} aria-label="Move up">
										<ArrowUp className="h-3.5 w-3.5" />
									</button>
									<button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" disabled={disabled || i === slides.length - 1} onClick={() => move(item.id, 1)} aria-label="Move down">
										<ArrowDown className="h-3.5 w-3.5" />
									</button>
									{meta.custom && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="More">
													<MoreHorizontal className="h-3.5 w-3.5" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => duplicate(item.id)} className="text-xs">
													<Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => remove(item.id)} className="text-xs text-destructive focus:text-destructive">
													<Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
									<button
										type="button"
										className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
										onClick={() => setExpanded(open ? null : item.id)}
										aria-label={open ? "Collapse" : "Edit"}
									>
										<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
									</button>
								</div>
							</div>
							{open && (
								<SlideEditor item={item} onPatch={(p) => update(item.id, p)} disabled={disabled} needsFocus={needsFocus} />
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function SlideEditor({
	item,
	onPatch,
	disabled,
	needsFocus,
}: {
	item: DeckSlideItem;
	onPatch: (p: Partial<DeckSlideItem>) => void;
	disabled?: boolean;
	needsFocus: boolean;
}) {
	const meta = SLIDE_KIND_META[item.kind];
	return (
		<div className="space-y-3 border-t bg-muted/20 px-3 py-3">
			<p className="text-[11px] text-muted-foreground">{meta.description}</p>
			{needsFocus && (
				<p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
					Pick disease(s) under Content → Disease focus to fill this section; it is skipped until then.
				</p>
			)}
			<Field label={meta.custom ? (item.kind === "divider" ? "Heading" : "Title") : "Title (blank = automatic)"}>
				<Input
					value={item.title}
					disabled={disabled}
					placeholder={meta.custom ? "" : `${meta.label} (automatic, includes the dates)`}
					onChange={(e) => onPatch({ title: e.target.value })}
					className="h-8 text-xs"
				/>
			</Field>

			{meta.charts && (
				<Field label="Draw as">
					<Segmented<ChartVariant>
						value={(item.chart ?? meta.charts[0]) as ChartVariant}
						disabled={disabled}
						options={meta.charts.map((c) => ({ value: c, label: CHART_VARIANT_LABEL[c] }))}
						onChange={(chart) => onPatch({ chart })}
					/>
				</Field>
			)}

			{item.kind === "text" && (
				<>
					<Field label="Layout">
						<Segmented
							value={item.layout ?? "bullets"}
							disabled={disabled}
							options={(Object.keys(TEXT_LAYOUT_LABEL) as (keyof typeof TEXT_LAYOUT_LABEL)[]).map((k) => ({ value: k, label: TEXT_LAYOUT_LABEL[k] }))}
							onChange={(layout) => onPatch({ layout })}
						/>
					</Field>
					<Field
						label="Text"
						hint={
							item.layout === "statement"
								? "First line is the statement; anything after it is shown as the attribution."
								: item.layout === "two-column"
									? "One point per line. A line with just --- splits the two columns."
									: "One bullet per line."
						}
					>
						<Textarea
							value={item.body ?? ""}
							disabled={disabled}
							rows={5}
							onChange={(e) => onPatch({ body: e.target.value })}
							className="text-xs"
						/>
					</Field>
				</>
			)}

			{item.kind === "divider" && (
				<Field label="Sub-heading">
					<Input value={item.subtitle ?? ""} disabled={disabled} onChange={(e) => onPatch({ subtitle: e.target.value })} className="h-8 text-xs" />
				</Field>
			)}

			{item.kind === "image" && (
				<>
					<Field label="Picture" hint="Large photos are shrunk to 1600 px before they are stored.">
						<ImagePicker value={item.imageDataUrl ?? null} onChange={(imageDataUrl) => onPatch({ imageDataUrl })} maxPx={1600} label="Image" disabled={disabled} />
					</Field>
					<Field label="Caption">
						<Input value={item.subtitle ?? ""} disabled={disabled} onChange={(e) => onPatch({ subtitle: e.target.value })} className="h-8 text-xs" />
					</Field>
				</>
			)}

			<Field label="Speaker notes" hint={meta.custom ? undefined : "Added after the automatic notes (when those are on)."}>
				<Textarea
					value={item.notes}
					disabled={disabled}
					rows={3}
					placeholder="What to say on this slide…"
					onChange={(e) => onPatch({ notes: e.target.value })}
					className="text-xs"
				/>
			</Field>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Content tab                                                         */
/* ------------------------------------------------------------------ */

function ContentTab({ config, onChange, regionOptions, disabled }: DeckStudioConfigProps) {
	const c = config.content;
	const set = (patch: Partial<DeckConfig["content"]>) => onChange({ content: { ...c, ...patch }, templateId: null });
	const toggleIn = <T extends string>(list: T[], key: T, order: T[], max?: number): T[] => {
		const on = list.includes(key);
		if (!on && max && list.length >= max) {
			hotToast.error(`Up to ${max} — switch one off first.`);
			return list;
		}
		const next = on ? list.filter((k) => k !== key) : [...list, key];
		return order.filter((k) => next.includes(k));
	};

	return (
		<div className="space-y-5">
			<Section title="Scope" icon={<Crosshair className="h-3.5 w-3.5 text-uganda-red" />}>
				<Field label="Geography" hint="Every number, table and the map are limited to the chosen regions.">
					<MultiSelect
						options={regionOptions}
						selected={c.regions}
						onChange={(regions) => set({ regions })}
						allLabel="National (all regions)"
						searchPlaceholder="Search region…"
						emptyText="No regions."
						ariaLabel="Regions"
						disabled={disabled}
						className="w-full"
						contentClassName="w-[280px]"
					/>
				</Field>
				<Field label="Disease focus" hint="Adds a highlighted section for the chosen disease(s); the full deck stays intact.">
					<MultiSelect
						options={DISEASE_OPTIONS}
						selected={config.focusDiseases}
						onChange={(focusDiseases) => onChange({ focusDiseases })}
						allLabel="No focus"
						searchPlaceholder="Search disease…"
						emptyText="No matches."
						ariaLabel="Focus diseases"
						disabled={disabled}
						className="w-full"
						contentClassName="w-[320px]"
					/>
				</Field>
				<ToggleRow
					label="Compare with the previous period"
					hint="Shows change against the same number of days just before."
					checked={c.compareWithPrevious}
					disabled={disabled}
					onChange={(compareWithPrevious) => set({ compareWithPrevious })}
				/>
			</Section>

			<Separator />

			<Section title="Executive summary tiles" icon={<Gauge className="h-3.5 w-3.5 text-uganda-red" />} action={<span className="text-[11px] text-muted-foreground">{c.kpis.length}/8</span>}>
				<div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
					{KPI_ORDER.map((k) => (
						<label key={k} className="flex cursor-pointer items-center gap-2 text-xs" title={KPI_META[k].hint}>
							<Checkbox checked={c.kpis.includes(k)} disabled={disabled} onCheckedChange={() => set({ kpis: toggleIn(c.kpis, k, KPI_ORDER, 8) })} />
							{KPI_META[k].label}
						</label>
					))}
				</div>
			</Section>

			<Separator />

			<Section title="Key messages" icon={<Sparkles className="h-3.5 w-3.5 text-uganda-red" />}>
				<p className="text-[11px] text-muted-foreground">Written from the data each time the deck is built.</p>
				<div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
					{INSIGHT_ORDER.map((k) => (
						<label key={k} className="flex cursor-pointer items-center gap-2 text-xs">
							<Checkbox checked={c.insights.includes(k)} disabled={disabled} onCheckedChange={() => set({ insights: toggleIn(c.insights, k, INSIGHT_ORDER) })} />
							{INSIGHT_META[k].label}
						</label>
					))}
				</div>
				<Field label="Your own messages" hint="One per line — added after the generated ones (9 messages fit a slide).">
					<Textarea value={c.customHighlights} rows={3} disabled={disabled} onChange={(e) => set({ customHighlights: e.target.value })} className="text-xs" placeholder="e.g. Two RRTs deployed to Mubende; samples shipped to UVRI" />
				</Field>
			</Section>

			<Separator />

			<Section title="District tables" icon={<Table2 className="h-3.5 w-3.5 text-uganda-red" />}>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Layout">
						<Segmented
							value={c.districtLayout}
							disabled={disabled}
							options={[
								{ value: "status", label: "By patient status" },
								{ value: "flat", label: "One row per district" },
							]}
							onChange={(districtLayout) => set({ districtLayout })}
						/>
					</Field>
					<Field label="Sort districts by">
						<Select value={c.districtSort} disabled={disabled} onValueChange={(v) => set({ districtSort: v as typeof c.districtSort })}>
							<SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="signals" className="text-xs">Most signals</SelectItem>
								<SelectItem value="alerts" className="text-xs">Most alerts issued</SelectItem>
								<SelectItem value="pending" className="text-xs">Most pending</SelectItem>
								<SelectItem value="name" className="text-xs">Name (A–Z)</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Districts shown" hint="The rest fold into one “Other districts” row; totals are unchanged.">
						<Select value={String(c.districtLimit)} disabled={disabled} onValueChange={(v) => set({ districtLimit: Number(v) })}>
							<SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="0" className="text-xs">All districts</SelectItem>
								{[5, 10, 15, 20, 30].map((n) => (
									<SelectItem key={n} value={String(n)} className="text-xs">Top {n}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field label="Alert-detail rows" hint="Narratives listed (all are counted).">
						<Select value={String(c.narrativesLimit)} disabled={disabled} onValueChange={(v) => set({ narrativesLimit: Number(v) })}>
							<SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								{[20, 40, 60, 100, 150, 300].map((n) => (
									<SelectItem key={n} value={String(n)} className="text-xs">Up to {n}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</div>
			</Section>

			<Separator />

			<Section title="Charts & map" icon={<BarChart3 className="h-3.5 w-3.5 text-uganda-red" />}>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Trend granularity">
						<Segmented
							value={c.trendGranularity}
							disabled={disabled}
							options={[
								{ value: "day", label: "Daily" },
								{ value: "week", label: "Weekly" },
							]}
							onChange={(trendGranularity) => set({ trendGranularity })}
						/>
					</Field>
					<Field label="Top districts on the map slide">
						<Select value={String(c.topDistricts)} disabled={disabled} onValueChange={(v) => set({ topDistricts: Number(v) })}>
							<SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								{[5, 8, 10, 15, 20].map((n) => (
									<SelectItem key={n} value={String(n)} className="text-xs">Top {n}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field label="District names on the map">
						<Segmented
							value={c.mapLabels}
							disabled={disabled}
							options={[
								{ value: "all", label: "All" },
								{ value: "affected", label: "With alerts" },
								{ value: "none", label: "None" },
							]}
							onChange={(mapLabels) => set({ mapLabels })}
						/>
					</Field>
				</div>
				<div className="space-y-2 pt-1">
					<ToggleRow label="Top-districts chart beside the map" checked={c.mapShowTop} disabled={disabled} onChange={(mapShowTop) => set({ mapShowTop })} />
					<ToggleRow label="Value labels on charts" checked={c.dataLabels} disabled={disabled} onChange={(dataLabels) => set({ dataLabels })} />
					<ToggleRow
						label="Write speaker notes from the data"
						hint="Each slide gets talking points with its key numbers."
						checked={c.autoNotes}
						disabled={disabled}
						onChange={(autoNotes) => set({ autoNotes })}
					/>
				</div>
			</Section>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Design tab                                                          */
/* ------------------------------------------------------------------ */

function TitleStyleSwatch({ style, accent, secondary }: { style: TitleStyle; accent: string; secondary: string }) {
	return (
		<span className="relative block h-9 w-16 overflow-hidden rounded-sm border bg-white">
			{style === "band" && <span className="absolute inset-x-0 top-0 h-3" style={{ background: accent }} />}
			{style === "sidebar" && <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />}
			<span
				className="absolute left-2 top-1 h-1 w-8 rounded-full"
				style={{ background: style === "band" ? "#fff" : style === "minimal" ? accent : "#1f2937" }}
			/>
			{style === "rule" && <span className="absolute left-2 top-3 h-0.5 w-4" style={{ background: accent }} />}
			{style === "sidebar" && <span className="absolute left-2 top-3 h-0.5 w-3" style={{ background: secondary }} />}
			{style === "minimal" && <span className="absolute left-2 right-2 top-3 h-px bg-gray-300" />}
			<span className="absolute bottom-1.5 left-2 right-2 h-3 rounded-[1px] bg-gray-100" />
		</span>
	);
}

function DesignTab({ config, onChange, disabled }: DeckStudioConfigProps) {
	const d = config.design;
	const set = (patch: Partial<DeckConfig["design"]>) => onChange({ design: { ...d, ...patch }, templateId: null });
	const theme = deriveDeckTheme(d.accent, d.secondary, d.background);
	return (
		<div className="space-y-5">
			<Section title="Colours" icon={<Palette className="h-3.5 w-3.5 text-uganda-red" />}>
				<div className="grid grid-cols-2 gap-1.5">
					{DECK_THEME_PRESETS.map((p) => {
						const active = d.themeKey === p.key || (normalizeHex(d.accent) === normalizeHex(p.accent) && normalizeHex(d.secondary) === normalizeHex(p.secondary));
						return (
							<button
								key={p.key}
								type="button"
								disabled={disabled}
								onClick={() => set({ themeKey: p.key, accent: p.accent, secondary: p.secondary })}
								className={cn(
									"flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
									active ? "border-foreground/50 bg-muted font-medium" : "hover:bg-muted/60"
								)}
							>
								<span className="flex shrink-0">
									<span className="h-4 w-4 rounded-l-full border" style={{ background: p.accent }} />
									<span className="h-4 w-4 rounded-r-full border border-l-0" style={{ background: p.secondary }} />
								</span>
								<span className="truncate">{p.label}</span>
								{active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
							</button>
						);
					})}
				</div>
				<div className="grid grid-cols-2 gap-3 pt-1">
					{(["accent", "secondary"] as const).map((key) => (
						<Field key={key} label={key === "accent" ? "Accent" : "Secondary"}>
							<div className="flex items-center gap-1.5">
								<input
									type="color"
									value={normalizeHex(d[key])}
									disabled={disabled}
									onChange={(e) => set({ themeKey: "custom", [key]: e.target.value })}
									className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
									aria-label={`${key} colour`}
								/>
								<Input
									defaultValue={d[key]}
									key={d[key]}
									disabled={disabled}
									onBlur={(e) => set({ themeKey: "custom", [key]: normalizeHex(e.target.value, d[key]) })}
									onKeyDown={(e) => {
										if (e.key === "Enter") (e.target as HTMLInputElement).blur();
									}}
									className="h-8 font-mono text-xs uppercase"
									aria-label={`${key} hex`}
								/>
							</div>
						</Field>
					))}
				</div>
				<div className="flex items-center gap-1 pt-1" aria-hidden title="Derived palette">
					{[theme.accent, theme.secondary, theme.accentSoft, ...theme.mapRamp].map((c, i) => (
						<span key={i} className="h-3 flex-1 rounded-sm border" style={{ background: c }} />
					))}
				</div>
			</Section>

			<Separator />

			<Section title="Typography & layout" icon={<Type className="h-3.5 w-3.5 text-uganda-red" />}>
				<Field label="Font" hint="Embedded as the PowerPoint theme font; the preview uses the closest installed match.">
					<Select value={d.font} disabled={disabled} onValueChange={(v) => set({ font: v as typeof d.font })}>
						<SelectTrigger className="h-8 text-xs" style={{ fontFamily: fontCss(d.font) }}><SelectValue /></SelectTrigger>
						<SelectContent>
							{DECK_FONTS.map((f) => (
								<SelectItem key={f.value} value={f.value} className="text-sm" style={{ fontFamily: f.css }}>
									{f.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Title style">
					<div className="grid grid-cols-4 gap-1.5">
						{(Object.keys(TITLE_STYLE_LABEL) as TitleStyle[]).map((ts) => (
							<button
								key={ts}
								type="button"
								disabled={disabled}
								onClick={() => set({ titleStyle: ts })}
								className={cn(
									"flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] transition-colors",
									d.titleStyle === ts ? "border-foreground/50 bg-muted font-medium" : "hover:bg-muted/60"
								)}
							>
								<TitleStyleSwatch style={ts} accent={d.accent} secondary={d.secondary} />
								{TITLE_STYLE_LABEL[ts]}
							</button>
						))}
					</div>
				</Field>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Background">
						<Segmented
							value={d.background}
							disabled={disabled}
							options={(Object.keys(BACKGROUND_LABEL) as (keyof typeof BACKGROUND_LABEL)[]).map((k) => ({ value: k, label: BACKGROUND_LABEL[k].replace(" (projector)", "") }))}
							onChange={(background) => set({ background })}
						/>
					</Field>
					<Field label="Slide size">
						<Select value={d.aspect} disabled={disabled} onValueChange={(v) => set({ aspect: v as typeof d.aspect })}>
							<SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								{(Object.keys(ASPECT_LABEL) as (keyof typeof ASPECT_LABEL)[]).map((k) => (
									<SelectItem key={k} value={k} className="text-xs">{ASPECT_LABEL[k]}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field label="Chart colours" hint={d.chartPalette === "semantic" ? "Alive green · Dead red · sources categorical" : "Every series in your accent & secondary"}>
						<Segmented
							value={d.chartPalette}
							disabled={disabled}
							options={[
								{ value: "semantic", label: "Meaningful" },
								{ value: "theme", label: "Theme" },
							]}
							onChange={(chartPalette) => set({ chartPalette })}
						/>
					</Field>
					<Field label="Table density" hint={d.density === "compact" ? "More rows per slide" : "Easier to read on a projector"}>
						<Segmented
							value={d.density}
							disabled={disabled}
							options={[
								{ value: "comfortable", label: "Comfortable" },
								{ value: "compact", label: "Compact" },
							]}
							onChange={(density) => set({ density })}
						/>
					</Field>
				</div>
			</Section>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Branding tab                                                        */
/* ------------------------------------------------------------------ */

function CoverSwatch({ layout, accent }: { layout: CoverLayout; accent: string }) {
	return (
		<span className="relative block h-9 w-16 overflow-hidden rounded-sm border" style={{ background: layout === "centered" ? accent : "#fff" }}>
			{layout === "split" && <span className="absolute inset-y-0 left-0 w-6" style={{ background: accent }} />}
			{layout === "minimal" && <span className="absolute left-1.5 top-3 h-4 w-0.5" style={{ background: accent }} />}
			<span
				className={cn("absolute top-3.5 h-1 rounded-full", layout === "centered" ? "left-4 right-4" : layout === "split" ? "left-8 right-2" : "left-3 right-5")}
				style={{ background: layout === "centered" ? "#fff" : "#1f2937" }}
			/>
			<span
				className={cn("absolute h-0.5 rounded-full", layout === "centered" ? "left-6 right-6" : layout === "split" ? "left-8 right-5" : "left-3 right-8")}
				style={{ background: layout === "centered" ? "rgba(255,255,255,0.7)" : accent, top: 22 }}
			/>
		</span>
	);
}

function BrandingTab({ config, onChange, disabled }: DeckStudioConfigProps) {
	const cv = config.cover;
	const b = config.branding;
	const cl = config.closing;
	const setCover = (patch: Partial<DeckConfig["cover"]>) => onChange({ cover: { ...cv, ...patch } });
	const setBrand = (patch: Partial<DeckConfig["branding"]>) => onChange({ branding: { ...b, ...patch } });
	const setClosing = (patch: Partial<DeckConfig["closing"]>) => onChange({ closing: { ...cl, ...patch } });
	const customClass = !CLASSIFICATION_PRESETS.includes(b.classification);

	return (
		<div className="space-y-5">
			<Section title="Cover slide" icon={<BookOpen className="h-3.5 w-3.5 text-uganda-red" />}>
				<Field label="Layout">
					<div className="grid grid-cols-3 gap-1.5">
						{(Object.keys(COVER_LAYOUT_LABEL) as CoverLayout[]).map((l) => (
							<button
								key={l}
								type="button"
								disabled={disabled}
								onClick={() => setCover({ layout: l })}
								className={cn(
									"flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] transition-colors",
									cv.layout === l ? "border-foreground/50 bg-muted font-medium" : "hover:bg-muted/60"
								)}
							>
								<CoverSwatch layout={l} accent={config.design.accent} />
								{COVER_LAYOUT_LABEL[l]}
							</button>
						))}
					</div>
				</Field>
				<div className="grid gap-2 sm:grid-cols-2">
					<Field label="Title">
						<Input value={cv.title} disabled={disabled} placeholder="Alerts Management Report" onChange={(e) => setCover({ title: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Subtitle">
						<Input value={cv.subtitle} disabled={disabled} placeholder="(the date range)" onChange={(e) => setCover({ subtitle: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Organisation">
						<Input value={cv.organization} disabled={disabled} onChange={(e) => setCover({ organization: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Presenter">
						<Input value={cv.presenter} disabled={disabled} placeholder="Name, title" onChange={(e) => setCover({ presenter: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Date line" className="sm:col-span-2">
						<Input value={cv.dateLine} disabled={disabled} placeholder="(Presented <today>)" onChange={(e) => setCover({ dateLine: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Logo" hint="Also used on content slides and the closing slide.">
						<ImagePicker value={cv.logoDataUrl} onChange={(logoDataUrl) => setCover({ logoDataUrl })} maxPx={600} label="Logo" disabled={disabled} />
					</Field>
					<Field label="Partner logo">
						<ImagePicker value={cv.partnerLogoDataUrl} onChange={(partnerLogoDataUrl) => setCover({ partnerLogoDataUrl })} maxPx={600} label="Partner logo" disabled={disabled} />
					</Field>
				</div>
			</Section>

			<Separator />

			<Section title="Every slide" icon={<Stamp className="h-3.5 w-3.5 text-uganda-red" />}>
				<Field label="Footer text">
					<Input value={b.footerText} disabled={disabled} onChange={(e) => setBrand({ footerText: e.target.value })} className="h-8 text-xs" />
				</Field>
				<Field label="Classification marking">
					<div className="flex gap-2">
						<Select
							value={customClass ? "__custom" : b.classification || "__none"}
							disabled={disabled}
							onValueChange={(v) => setBrand({ classification: v === "__none" ? "" : v === "__custom" ? "INTERNAL" : v })}
						>
							<SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="__none" className="text-xs">None</SelectItem>
								{CLASSIFICATION_PRESETS.filter(Boolean).map((p) => (
									<SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
								))}
								<SelectItem value="__custom" className="text-xs">Custom…</SelectItem>
							</SelectContent>
						</Select>
						{customClass && (
							<Input value={b.classification} disabled={disabled} onChange={(e) => setBrand({ classification: e.target.value })} className="h-8 flex-1 text-xs uppercase" />
						)}
					</div>
				</Field>
				<div className="space-y-2">
					<ToggleRow label="Slide numbers (n / total)" checked={b.showSlideNumbers} disabled={disabled} onChange={(showSlideNumbers) => setBrand({ showSlideNumbers })} />
					<ToggleRow label="“Generated <date>” in the footer" checked={b.showGeneratedDate} disabled={disabled} onChange={(showGeneratedDate) => setBrand({ showGeneratedDate })} />
					<ToggleRow label="Logo on every slide" hint={cv.logoDataUrl ? undefined : "Upload a logo under Cover slide first."} checked={b.logoOnSlides} disabled={disabled} onChange={(logoOnSlides) => setBrand({ logoOnSlides })} />
				</div>
				{b.logoOnSlides && (
					<Field label="Logo position">
						<Segmented
							value={b.logoPosition}
							disabled={disabled}
							options={[
								{ value: "top-right", label: "Top right" },
								{ value: "bottom-right", label: "Bottom right" },
								{ value: "bottom-left", label: "Bottom left" },
							]}
							onChange={(logoPosition) => setBrand({ logoPosition })}
						/>
					</Field>
				)}
			</Section>

			<Separator />

			<Section title="Closing slide" icon={<Flag className="h-3.5 w-3.5 text-uganda-red" />}>
				<p className="text-[11px] text-muted-foreground">Switch the “Closing” slide on in the Slides tab to use it.</p>
				<div className="grid gap-2 sm:grid-cols-2">
					<Field label="Heading">
						<Input value={cl.title} disabled={disabled} onChange={(e) => setClosing({ title: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Message">
						<Input value={cl.message} disabled={disabled} onChange={(e) => setClosing({ message: e.target.value })} className="h-8 text-xs" />
					</Field>
					<Field label="Contacts (one per line)" className="sm:col-span-2">
						<Textarea value={cl.contact} rows={2} disabled={disabled} placeholder={"PHEOC hotline: 6767\nsurveillance@health.go.ug"} onChange={(e) => setClosing({ contact: e.target.value })} className="text-xs" />
					</Field>
				</div>
			</Section>

			<Separator />

			<Section title="Downloads" icon={<Download className="h-3.5 w-3.5 text-uganda-red" />}>
				<Field label="File name" hint="Dates are appended automatically. Blank = from the cover title.">
					<Input value={b.fileName} disabled={disabled} placeholder="alerts-management-report" onChange={(e) => setBrand({ fileName: e.target.value })} className="h-8 text-xs" />
				</Field>
			</Section>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Templates tab                                                       */
/* ------------------------------------------------------------------ */

function TemplatesTab({ config, onReplace, savedTemplates, onSavedTemplatesChange, disabled }: DeckStudioConfigProps) {
	const [name, setName] = useState("");
	const [confirmReset, setConfirmReset] = useState(false);
	const importRef = useRef<HTMLInputElement>(null);
	const builtIns = builtInTemplates();

	const apply = (t: DeckTemplate) => {
		onReplace(applyTemplate(config, t));
		hotToast.success(`Applied “${t.name}”.`);
	};

	const save = () => {
		const t = newSavedTemplate(name || `Template ${savedTemplates.length + 1}`, "", config);
		onSavedTemplatesChange([...savedTemplates, t]);
		setName("");
		hotToast.success(`Saved “${t.name}”.`);
	};

	const exportFile = () => {
		const blob = new Blob([serializeConfig(config)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "presentation-settings.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const importFile = async (file: File | undefined) => {
		if (!file) return;
		try {
			onReplace(parseConfigFile(await file.text()));
			hotToast.success("Settings imported.");
		} catch (err) {
			hotToast.error(err instanceof Error ? err.message : "Could not read that file.");
		} finally {
			if (importRef.current) importRef.current.value = "";
		}
	};

	return (
		<div className="space-y-5">
			<Section title="Start from a template" icon={<LayoutTemplate className="h-3.5 w-3.5 text-uganda-red" />}>
				<p className="text-[11px] text-muted-foreground">
					Templates set the slides, content and design. Your cover text, logos, footer and disease focus are kept.
				</p>
				<div className="space-y-1.5">
					{builtIns.map((t) => {
						const active = config.templateId === t.id;
						const count = t.config.slides.filter((s) => s.enabled).length;
						return (
							<div key={t.id} className={cn("flex items-center gap-3 rounded-md border px-2.5 py-2", active && "border-uganda-red/50 bg-uganda-red/[0.03]")}>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded" style={{ background: t.config.design.background === "dark" ? "#0b1220" : t.config.design.accent }}>
									<LayoutTemplate className="h-4 w-4 text-white" />
								</span>
								<div className="min-w-0 flex-1">
									<p className="flex items-center gap-1.5 text-xs font-medium">
										{t.name}
										<span className="font-normal text-muted-foreground">· {count} sections</span>
										{active && <Badge variant="secondary" className="h-4 px-1 text-[9px]">in use</Badge>}
									</p>
									<p className="truncate text-[11px] text-muted-foreground" title={t.description}>{t.description}</p>
								</div>
								<Button type="button" size="sm" variant={active ? "secondary" : "outline"} className="h-7 px-2 text-xs" disabled={disabled} onClick={() => apply(t)}>
									Apply
								</Button>
							</div>
						);
					})}
				</div>
			</Section>

			<Separator />

			<Section title="My templates" icon={<Save className="h-3.5 w-3.5 text-uganda-red" />}>
				<div className="flex gap-2">
					<Input value={name} disabled={disabled} placeholder="Name, e.g. Weekly PHEOC — Acholi" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className="h-8 text-xs" />
					<Button type="button" size="sm" className="h-8 text-xs" disabled={disabled} onClick={save}>
						<Save className="mr-1 h-3.5 w-3.5" />
						Save current
					</Button>
				</div>
				{savedTemplates.length === 0 ? (
					<p className="text-[11px] text-muted-foreground">Nothing saved yet. A saved template remembers everything — slides, text, design and logos — on this browser.</p>
				) : (
					<ul className="space-y-1">
						{savedTemplates.map((t) => (
							<li key={t.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
								<span className="min-w-0 flex-1 truncate text-xs font-medium">{t.name}</span>
								<span className="shrink-0 text-[11px] text-muted-foreground">{t.config.slides.filter((s) => s.enabled).length} sections</span>
								<Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={disabled} onClick={() => apply(t)}>Apply</Button>
								<button
									type="button"
									className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
									aria-label={`Delete ${t.name}`}
									onClick={() => onSavedTemplatesChange(savedTemplates.filter((x) => x.id !== t.id))}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</li>
						))}
					</ul>
				)}
			</Section>

			<Separator />

			<Section title="Share & reset" icon={<RotateCcw className="h-3.5 w-3.5 text-uganda-red" />}>
				<p className="text-[11px] text-muted-foreground">Export the settings as a file to give a colleague the same deck; import theirs here.</p>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={exportFile}>
						<Download className="mr-1 h-3.5 w-3.5" />
						Export settings
					</Button>
					<input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
					<Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={disabled} onClick={() => importRef.current?.click()}>
						<Upload className="mr-1 h-3.5 w-3.5" />
						Import settings
					</Button>
					<Button
						type="button"
						variant={confirmReset ? "destructive" : "ghost"}
						size="sm"
						className="h-8 text-xs"
						disabled={disabled}
						onClick={() => {
							if (!confirmReset) {
								setConfirmReset(true);
								setTimeout(() => setConfirmReset(false), 4000);
								return;
							}
							onReplace(defaultDeckConfig());
							setConfirmReset(false);
							hotToast.success("Reset to the standard deck.");
						}}
					>
						<RotateCcw className="mr-1 h-3.5 w-3.5" />
						{confirmReset ? "Click again to reset everything" : "Reset to defaults"}
					</Button>
				</div>
			</Section>
		</div>
	);
}
