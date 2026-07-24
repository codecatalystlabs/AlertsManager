"use client";

import { useRef } from "react";
import { ChevronDown, ImageIcon, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { alertResponse } from "@/constants";
import {
	DECK_THEME_PRESETS,
	SLIDE_TOGGLE_META,
	normalizeHex,
	type DeckConfig,
} from "@/lib/management-report-config";

/** Disease options for the focus picker — same taxonomy as the map filter. */
const DISEASE_OPTIONS = [...alertResponse]
	.map((r) => ({ value: r.code, label: r.name }))
	.sort((a, b) => a.label.localeCompare(b.label));

interface DeckConfigSectionProps {
	config: DeckConfig;
	onChange: (patch: Partial<DeckConfig>) => void;
	/** Whether a disease focus is currently active on the OPEN report (drives a hint). */
	focusPendingReload?: boolean;
	disabled?: boolean;
}

/**
 * The collapsible "Configure presentation" panel: disease focus, colour theme,
 * which sections to include, and cover/branding. Edits are lifted to the parent
 * (which persists them); colour/section/cover changes apply to the preview and
 * download instantly, while a disease-focus change needs the report reloaded.
 */
export function DeckConfigSection({
	config,
	onChange,
	focusPendingReload,
	disabled,
}: DeckConfigSectionProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const setSlide = (key: keyof DeckConfig["slides"], value: boolean) =>
		onChange({ slides: { ...config.slides, [key]: value } });
	const setCover = (patch: Partial<DeckConfig["cover"]>) =>
		onChange({ cover: { ...config.cover, ...patch } });

	function onLogoPicked(file: File | undefined) {
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => setCover({ logoDataUrl: String(reader.result) });
		reader.readAsDataURL(file);
	}

	const activeCount = SLIDE_TOGGLE_META.filter((s) => config.slides[s.key]).length;

	return (
		<Collapsible className="rounded-md border">
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
				>
					<span className="flex items-center gap-2">
						<Settings2 className="h-4 w-4 text-uganda-red" />
						Configure presentation
					</span>
					<span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
						{config.focusDiseases.length > 0 &&
							`${config.focusDiseases.length} disease${config.focusDiseases.length === 1 ? "" : "s"} · `}
						{activeCount}/{SLIDE_TOGGLE_META.length} sections
						<ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
					</span>
				</button>
			</CollapsibleTrigger>

			<CollapsibleContent className="space-y-5 border-t px-3 py-4">
				{/* Disease focus */}
				<div className="space-y-1.5">
					<Label className="text-xs font-semibold">Disease focus</Label>
					<MultiSelect
						options={DISEASE_OPTIONS}
						selected={config.focusDiseases}
						onChange={(focusDiseases) => onChange({ focusDiseases })}
						allLabel="No focus (standard deck)"
						searchPlaceholder="Search disease…"
						emptyText="No matches."
						ariaLabel="Focus diseases"
						disabled={disabled}
						className="w-full"
						contentClassName="w-[320px]"
					/>
					<p className="text-[11px] text-muted-foreground">
						Adds a highlighted focus section for the selected disease(s) — the full
						All-PHEs / VHFs deck stays intact.
						{focusPendingReload && (
							<span className="ml-1 text-amber-700">
								Changed — click &ldquo;View report&rdquo; to reload.
							</span>
						)}
					</p>
				</div>

				<Separator />

				{/* Theme */}
				<div className="space-y-2">
					<Label className="text-xs font-semibold">Theme colour</Label>
					<div className="flex flex-wrap items-center gap-2">
						{DECK_THEME_PRESETS.map((preset) => {
							const active =
								config.themeKey === preset.key ||
								normalizeHex(config.accent) === normalizeHex(preset.accent);
							return (
								<button
									key={preset.key}
									type="button"
									disabled={disabled}
									onClick={() =>
										onChange({ themeKey: preset.key, accent: preset.accent })
									}
									className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
										active
											? "border-foreground/40 bg-muted font-medium"
											: "border-transparent hover:bg-muted/60"
									}`}
									title={preset.accent}
								>
									<span
										className="h-3.5 w-3.5 rounded-full border"
										style={{ backgroundColor: preset.accent }}
									/>
									{preset.label}
								</button>
							);
						})}
					</div>
					<div className="flex items-center gap-2 pt-1">
						<Label htmlFor="deck-accent" className="text-[11px] text-muted-foreground">
							Custom
						</Label>
						<input
							id="deck-accent"
							type="color"
							value={normalizeHex(config.accent)}
							disabled={disabled}
							onChange={(e) =>
								onChange({ themeKey: "custom", accent: e.target.value })
							}
							className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5"
							aria-label="Custom accent colour"
						/>
						<Input
							value={config.accent}
							disabled={disabled}
							onChange={(e) =>
								onChange({ themeKey: "custom", accent: normalizeHex(e.target.value, config.accent) })
							}
							className="h-7 w-24 font-mono text-xs uppercase"
							aria-label="Accent hex"
						/>
					</div>
				</div>

				<Separator />

				{/* Sections */}
				<div className="space-y-2">
					<Label className="text-xs font-semibold">Sections to include</Label>
					<div className="grid gap-2 sm:grid-cols-2">
						{SLIDE_TOGGLE_META.map((s) => (
							<label
								key={s.key}
								className="flex cursor-pointer items-center gap-2 text-xs"
							>
								<Checkbox
									checked={config.slides[s.key]}
									disabled={disabled}
									onCheckedChange={(v) => setSlide(s.key, v === true)}
								/>
								{s.label}
							</label>
						))}
					</div>
				</div>

				<Separator />

				{/* Cover / branding */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-semibold">Cover slide &amp; branding</Label>
						<Switch
							checked={config.cover.enabled}
							disabled={disabled}
							onCheckedChange={(enabled) => setCover({ enabled })}
							aria-label="Enable cover slide"
						/>
					</div>
					{config.cover.enabled && (
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor="cover-title" className="text-[11px] text-muted-foreground">
									Title
								</Label>
								<Input
									id="cover-title"
									value={config.cover.title}
									disabled={disabled}
									placeholder="Alerts Management Report"
									onChange={(e) => setCover({ title: e.target.value })}
									className="h-8 text-xs"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="cover-subtitle" className="text-[11px] text-muted-foreground">
									Subtitle
								</Label>
								<Input
									id="cover-subtitle"
									value={config.cover.subtitle}
									disabled={disabled}
									placeholder="(defaults to the date range)"
									onChange={(e) => setCover({ subtitle: e.target.value })}
									className="h-8 text-xs"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="cover-org" className="text-[11px] text-muted-foreground">
									Organization
								</Label>
								<Input
									id="cover-org"
									value={config.cover.organization}
									disabled={disabled}
									onChange={(e) => setCover({ organization: e.target.value })}
									className="h-8 text-xs"
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-[11px] text-muted-foreground">Logo</Label>
								<div className="flex items-center gap-2">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={(e) => onLogoPicked(e.target.files?.[0])}
									/>
									{config.cover.logoDataUrl ? (
										<>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={config.cover.logoDataUrl}
												alt="Logo preview"
												className="h-8 w-8 rounded border object-contain"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-8 px-2 text-xs"
												disabled={disabled}
												onClick={() => setCover({ logoDataUrl: null })}
											>
												<X className="mr-1 h-3.5 w-3.5" />
												Remove
											</Button>
										</>
									) : (
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-8 text-xs"
											disabled={disabled}
											onClick={() => fileInputRef.current?.click()}
										>
											<ImageIcon className="mr-1 h-3.5 w-3.5" />
											Upload
										</Button>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
