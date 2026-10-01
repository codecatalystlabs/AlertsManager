"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ChevronLeft,
	ChevronRight,
	ImageDown,
	LayoutGrid,
	Maximize2,
	MessageSquareText,
	Minimize2,
	MonitorPlay,
	PanelTop,
	Timer,
	X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeckConfig } from "@/lib/management-report-config";
import type { BuiltDeck } from "@/lib/management-report-deck";
import { ScaledSlide, SlideCanvas, slidePixelSize } from "@/components/reports/deck-slide";

/** Width of an element, tracked with a ResizeObserver. */
function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
	const [width, setWidth] = useState(0);
	const observer = useRef<ResizeObserver | null>(null);
	const ref = useCallback((el: T | null) => {
		observer.current?.disconnect();
		if (!el) return;
		setWidth(el.clientWidth);
		observer.current = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width;
			if (w) setWidth(Math.floor(w));
		});
		observer.current.observe(el);
	}, []);
	useEffect(() => () => observer.current?.disconnect(), []);
	return [ref, width];
}

interface DeckPreviewProps {
	deck: BuiltDeck;
	config: DeckConfig;
	selected: number;
	onSelect: (index: number) => void;
	onPresent: () => void;
	/** Saves the selected slide as a PNG. */
	onSlidePng?: (node: HTMLElement) => void;
	/** Dims the slides while fresh data loads. */
	busy?: boolean;
}

/**
 * The studio's right-hand pane: a large stage showing the selected slide with
 * its speaker notes, a filmstrip of every slide, and a grid overview. Every
 * thumbnail is the real slide, scaled — not a placeholder.
 */
export function DeckPreview({ deck, config, selected, onSelect, onPresent, onSlidePng, busy }: DeckPreviewProps) {
	const [mode, setMode] = useState<"stage" | "grid">("stage");
	const [showNotes, setShowNotes] = useState(true);
	const [stageRef, stageWidth] = useElementWidth<HTMLDivElement>();
	const [gridRef, gridWidth] = useElementWidth<HTMLDivElement>();
	const stageSlideRef = useRef<HTMLDivElement>(null);
	const stripRef = useRef<HTMLDivElement>(null);
	const total = deck.slides.length;
	const index = Math.min(selected, Math.max(0, total - 1));
	const slide = deck.slides[index];

	// Keep the selected thumbnail in view.
	useEffect(() => {
		const el = stripRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
		el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
	}, [index, mode]);

	const go = (d: number) => onSelect(Math.max(0, Math.min(total - 1, index + d)));

	if (total === 0) {
		return (
			<div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
				No slides are enabled — switch some on in the Slides tab.
			</div>
		);
	}

	const gridCols = gridWidth > 900 ? 4 : gridWidth > 620 ? 3 : 2;
	const gridThumbW = gridWidth ? Math.floor((gridWidth - (gridCols - 1) * 12) / gridCols) : 200;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1 rounded-md border p-0.5">
					<Button
						type="button"
						size="sm"
						variant={mode === "stage" ? "secondary" : "ghost"}
						className="h-7 px-2 text-xs"
						onClick={() => setMode("stage")}
					>
						<PanelTop className="mr-1 h-3.5 w-3.5" />
						Stage
					</Button>
					<Button
						type="button"
						size="sm"
						variant={mode === "grid" ? "secondary" : "ghost"}
						className="h-7 px-2 text-xs"
						onClick={() => setMode("grid")}
					>
						<LayoutGrid className="mr-1 h-3.5 w-3.5" />
						All slides
					</Button>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-xs tabular-nums text-muted-foreground">
						Slide {index + 1} of {total}
					</span>
					{mode === "stage" && (
						<Button
							type="button"
							size="sm"
							variant={showNotes ? "secondary" : "ghost"}
							className="h-7 px-2 text-xs"
							onClick={() => setShowNotes((v) => !v)}
							title="Speaker notes"
						>
							<MessageSquareText className="h-3.5 w-3.5" />
						</Button>
					)}
					{onSlidePng && mode === "stage" && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							title="Save this slide as a PNG"
							onClick={() => {
								const node = stageSlideRef.current?.querySelector<HTMLElement>("[data-slide-key]");
								if (node) onSlidePng(node);
							}}
						>
							<ImageDown className="h-3.5 w-3.5" />
						</Button>
					)}
					<Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onPresent}>
						<MonitorPlay className="mr-1 h-3.5 w-3.5" />
						Present
					</Button>
				</div>
			</div>

			{mode === "stage" ? (
				<>
					<div ref={stageRef} className={cn("group relative transition-opacity", busy && "opacity-60")}>
						<div ref={stageSlideRef} className="overflow-hidden rounded-lg border shadow-sm">
							{stageWidth > 0 && slide && (
								<ScaledSlide width={stageWidth - 2} slide={slide} deck={deck} config={config} number={index + 1} total={total} />
							)}
						</div>
						<button
							type="button"
							aria-label="Previous slide"
							onClick={() => go(-1)}
							disabled={index === 0}
							className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/60 disabled:hidden group-hover:opacity-100"
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button
							type="button"
							aria-label="Next slide"
							onClick={() => go(1)}
							disabled={index === total - 1}
							className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/60 disabled:hidden group-hover:opacity-100"
						>
							<ChevronRight className="h-5 w-5" />
						</button>
					</div>

					{showNotes && (
						<div className="rounded-md border bg-muted/30 px-3 py-2">
							<p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
								Speaker notes
							</p>
							<p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
								{slide?.notes || <span className="italic text-muted-foreground">No notes for this slide.</span>}
							</p>
						</div>
					)}

					<div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2">
						{deck.slides.map((s, i) => (
							<button
								key={s.key}
								type="button"
								data-thumb={i}
								onClick={() => onSelect(i)}
								className={cn(
									"shrink-0 rounded-md p-0.5 text-left transition-shadow",
									i === index ? "ring-2 ring-uganda-red" : "ring-1 ring-border hover:ring-foreground/40"
								)}
								title={s.title}
							>
								<div className="pointer-events-none overflow-hidden rounded-[3px]">
									<ScaledSlide width={150} slide={s} deck={deck} config={config} number={i + 1} total={total} />
								</div>
								<p className="mt-0.5 w-[150px] truncate px-0.5 text-[10px] text-muted-foreground">
									<span className="font-semibold tabular-nums text-foreground">{i + 1}</span> · {s.title}
								</p>
							</button>
						))}
					</div>
				</>
			) : (
				<div ref={gridRef} className={cn("grid gap-3", busy && "opacity-60")} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
					{gridWidth > 0 &&
						deck.slides.map((s, i) => (
							<button
								key={s.key}
								type="button"
								onClick={() => {
									onSelect(i);
									setMode("stage");
								}}
								className={cn(
									"rounded-md p-0.5 text-left transition-shadow",
									i === index ? "ring-2 ring-uganda-red" : "ring-1 ring-border hover:ring-foreground/40"
								)}
							>
								<div className="pointer-events-none overflow-hidden rounded-[3px]">
									<ScaledSlide width={gridThumbW - 4} slide={s} deck={deck} config={config} number={i + 1} total={total} />
								</div>
								<p className="mt-1 truncate px-0.5 text-[11px] text-muted-foreground">
									<span className="font-semibold tabular-nums text-foreground">{i + 1}</span> · {s.title}
								</p>
							</button>
						))}
				</div>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Fullscreen presenter                                                */
/* ------------------------------------------------------------------ */

function useViewport() {
	const [size, setSize] = useState({ w: 1280, h: 720 });
	useEffect(() => {
		const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
		read();
		window.addEventListener("resize", read);
		return () => window.removeEventListener("resize", read);
	}, []);
	return size;
}

function clock(ms: number): string {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Fullscreen slideshow. Keys: → / Space / PgDn next, ← / PgUp previous,
 * Home / End, N notes, B blackout, F fullscreen, Esc exit. Click advances.
 */
export function DeckPresenter({
	deck,
	config,
	start,
	onClose,
	onIndexChange,
}: {
	deck: BuiltDeck;
	config: DeckConfig;
	start: number;
	onClose: () => void;
	onIndexChange?: (index: number) => void;
}) {
	const total = deck.slides.length;
	const [index, setIndex] = useState(Math.min(start, Math.max(0, total - 1)));
	const [notes, setNotes] = useState(false);
	const [black, setBlack] = useState(false);
	const [chrome, setChrome] = useState(true);
	const [isFull, setIsFull] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const startedAt = useRef(Date.now());
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wasFull = useRef(false);
	const vp = useViewport();
	const { w: W, h: H } = slidePixelSize(deck);
	// Effects below must not re-run when the parent re-renders with a new
	// callback identity (that would bounce fullscreen), so read it via a ref.
	const closeRef = useRef(onClose);
	useEffect(() => {
		closeRef.current = onClose;
	}, [onClose]);

	const go = useCallback(
		(d: number) =>
			setIndex((i) => {
				const next = Math.max(0, Math.min(total - 1, i + d));
				return next;
			}),
		[total]
	);

	useEffect(() => onIndexChange?.(index), [index, onIndexChange]);

	useEffect(() => {
		const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
		return () => clearInterval(t);
	}, []);

	const toggleFull = useCallback(() => {
		if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
		else void rootRef.current?.requestFullscreen?.().catch(() => {});
	}, []);

	// Enter fullscreen on open; leaving fullscreen (Esc) ends the show.
	useEffect(() => {
		void rootRef.current?.requestFullscreen?.().catch(() => {});
		const onChange = () => {
			const full = Boolean(document.fullscreenElement);
			setIsFull(full);
			if (full) wasFull.current = true;
			else if (wasFull.current) closeRef.current();
		};
		document.addEventListener("fullscreenchange", onChange);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("fullscreenchange", onChange);
			document.body.style.overflow = prevOverflow;
			if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
		};
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			switch (e.key) {
				case "ArrowRight":
				case "ArrowDown":
				case "PageDown":
				case " ":
				case "Enter":
					e.preventDefault();
					setBlack(false);
					go(1);
					break;
				case "ArrowLeft":
				case "ArrowUp":
				case "PageUp":
				case "Backspace":
					e.preventDefault();
					setBlack(false);
					go(-1);
					break;
				case "Home":
					setIndex(0);
					break;
				case "End":
					setIndex(total - 1);
					break;
				case "n":
				case "N":
					setNotes((v) => !v);
					break;
				case "b":
				case "B":
				case ".":
					setBlack((v) => !v);
					break;
				case "f":
				case "F":
					toggleFull();
					break;
				case "Escape":
					// Usually the browser eats Esc to leave fullscreen (handled by
					// fullscreenchange); when it reaches us, end the show directly.
					closeRef.current();
					break;
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [go, toggleFull, total]);

	const poke = () => {
		setChrome(true);
		if (hideTimer.current) clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setChrome(false), 2500);
	};
	useEffect(() => {
		poke();
		return () => {
			if (hideTimer.current) clearTimeout(hideTimer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const notesH = notes ? Math.min(220, vp.h * 0.28) : 0;
	const scale = Math.min(vp.w / W, (vp.h - notesH) / H);
	const slide = deck.slides[index];

	const body = (
		<div
			ref={rootRef}
			className="fixed inset-0 z-[200] flex flex-col bg-black text-white"
			onMouseMove={poke}
			role="dialog"
			aria-modal="true"
			aria-label="Presentation"
		>
			<div
				className="relative flex flex-1 items-center justify-center overflow-hidden"
				onClick={() => {
					setBlack(false);
					go(1);
				}}
				style={{ cursor: chrome ? "pointer" : "none" }}
			>
				{slide && (
					<div style={{ width: W * scale, height: H * scale }} className={cn("relative transition-opacity duration-200", black && "opacity-0")}>
						<div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
							<SlideCanvas slide={slide} deck={deck} config={config} number={index + 1} total={total} />
						</div>
					</div>
				)}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/10">
					<div className="h-full bg-white/70 transition-all duration-300" style={{ width: `${((index + 1) / Math.max(1, total)) * 100}%` }} />
				</div>
			</div>

			{notes && (
				<div className="shrink-0 overflow-y-auto border-t border-white/10 bg-neutral-900 px-6 py-3" style={{ height: notesH }}>
					<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
						Notes · slide {index + 1}
						{index + 1 < total && <span className="ml-3 normal-case text-white/40">Next: {deck.slides[index + 1].title}</span>}
					</p>
					<p className="whitespace-pre-wrap text-base leading-relaxed text-white/90">
						{slide?.notes || <span className="italic text-white/40">No notes.</span>}
					</p>
				</div>
			)}

			<div
				className={cn(
					"absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-900/85 px-2 py-1 text-xs shadow-lg backdrop-blur transition-opacity",
					chrome ? "opacity-100" : "pointer-events-none opacity-0"
				)}
				onClick={(e) => e.stopPropagation()}
			>
				<button type="button" className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous">
					<ChevronLeft className="h-4 w-4" />
				</button>
				<span className="min-w-[64px] text-center tabular-nums">
					{index + 1} / {total}
				</span>
				<button type="button" className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30" onClick={() => go(1)} disabled={index === total - 1} aria-label="Next">
					<ChevronRight className="h-4 w-4" />
				</button>
				<span className="mx-1 h-4 w-px bg-white/20" />
				<span className="flex items-center gap-1 px-1 tabular-nums text-white/80" title="Elapsed">
					<Timer className="h-3.5 w-3.5" />
					{clock(elapsed)}
				</span>
				<button type="button" className={cn("rounded-full p-1.5 hover:bg-white/10", notes && "bg-white/15")} onClick={() => setNotes((v) => !v)} title="Notes (N)">
					<MessageSquareText className="h-4 w-4" />
				</button>
				<button type="button" className="rounded-full p-1.5 hover:bg-white/10" onClick={toggleFull} title="Fullscreen (F)">
					{isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
				</button>
				<button type="button" className="rounded-full p-1.5 hover:bg-white/10" onClick={onClose} title="Exit (Esc)">
					<X className="h-4 w-4" />
				</button>
			</div>

			<p
				className={cn(
					"pointer-events-none absolute bottom-3 right-4 text-[11px] text-white/40 transition-opacity",
					chrome ? "opacity-100" : "opacity-0"
				)}
			>
				← → navigate · N notes · B blackout · F fullscreen · Esc exit
			</p>
		</div>
	);

	return typeof document === "undefined" ? null : createPortal(body, document.body);
}

/**
 * Every slide at natural size, off-screen — the source the slide PDF captures.
 * Mounted only while an export runs.
 */
export function DeckExportRack({
	deck,
	config,
	containerRef,
}: {
	deck: BuiltDeck;
	config: DeckConfig;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	return createPortal(
		<div
			ref={containerRef}
			aria-hidden
			style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none", zIndex: -1 }}
		>
			{deck.slides.map((s, i) => (
				<SlideCanvas key={s.key} slide={s} deck={deck} config={config} number={i + 1} total={deck.slides.length} />
			))}
		</div>,
		document.body
	);
}
