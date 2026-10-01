"use client";

import { memo, type CSSProperties, type ReactNode } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";

import type { DeckConfig } from "@/lib/management-report-config";
import {
	crowdedLabels,
	footerParts,
	type BuiltDeck,
	type ChartSpec,
	type DeckSlide,
	type DeckStyle,
} from "@/lib/management-report-deck";
import {
	agendaLayout,
	bulletsLayout,
	chartLayout,
	chromeLayout,
	closingLayout,
	contentBox,
	coverLayout,
	decorations,
	dividerLayout,
	fitFont,
	imageLayout,
	kpiLayout,
	kpiTileParts,
	mapLayout,
	narrativesLayout,
	PX_PER_IN,
	ptPx,
	statementLayout,
	tableLayout,
	twoColumnLayout,
	type Box,
} from "@/lib/management-report-layout";

/**
 * One slide of the Alerts Management deck as HTML, drawn at the slide's true
 * geometry (inches × 96 px) from the same layout boxes the .pptx renderer uses,
 * so the preview, the presenter and the slide-PDF are faithful pictures of the
 * PowerPoint. Native PowerPoint charts are stood in for by recharts with the
 * same series, colours, orientation and labels.
 */

const px = (inches: number) => inches * PX_PER_IN;

function abs(b: Box, extra?: CSSProperties): CSSProperties {
	return { position: "absolute", left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h), ...extra };
}

function T({
	box,
	children,
	size,
	color,
	bold,
	italic,
	align = "left",
	valign = "middle",
	lineHeight = 1.2,
	nowrap,
}: {
	box: Box;
	children: ReactNode;
	size: number;
	color: string;
	bold?: boolean;
	italic?: boolean;
	align?: "left" | "center" | "right";
	valign?: "top" | "middle" | "bottom";
	lineHeight?: number;
	nowrap?: boolean;
}) {
	return (
		<div
			style={abs(box, {
				display: "flex",
				flexDirection: "column",
				justifyContent: valign === "top" ? "flex-start" : valign === "bottom" ? "flex-end" : "center",
				textAlign: align,
				fontSize: ptPx(size),
				lineHeight,
				color,
				fontWeight: bold ? 700 : 400,
				fontStyle: italic ? "italic" : "normal",
				overflow: "hidden",
				whiteSpace: nowrap ? "nowrap" : "pre-wrap",
				textOverflow: nowrap ? "ellipsis" : undefined,
				overflowWrap: "anywhere",
			})}
		>
			{children}
		</div>
	);
}

function Rect({ box, color, opacity = 1, round }: { box: Box; color: string; opacity?: number; round?: boolean }) {
	return <div style={abs(box, { background: color, opacity, borderRadius: round ? "50%" : undefined })} />;
}

function Img({ src, box, alt }: { src: string; box: Box; alt: string }) {
	// eslint-disable-next-line @next/next/no-img-element
	return <img src={src} alt={alt} style={abs(box, { objectFit: "contain" })} draggable={false} />;
}

function Muted({ style, text, box }: { style: DeckStyle; text: string; box?: Box }) {
	return (
		<T box={box ?? contentBox(style)} size={13} color={style.theme.muted} italic align="center">
			{text}
		</T>
	);
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function Chrome({
	slide,
	deck,
	config,
	number,
	total,
}: {
	slide: DeckSlide;
	deck: BuiltDeck;
	config: DeckConfig;
	number: number;
	total: number;
}) {
	const style = deck.style;
	const t = style.theme;
	const logo = config.cover.logoDataUrl;
	const L = chromeLayout(style, config, Boolean(logo));
	const f = footerParts(config, deck, number, total);
	const titleColor = L.titleColor === "onAccent" ? t.onAccent : L.titleColor === "accent" ? t.accent : t.ink;
	return (
		<>
			{L.band && <Rect box={L.band} color={t.accent} />}
			{L.stripe && <Rect box={L.stripe} color={t.accent} />}
			{L.rule && <Rect box={L.rule} color={style.design.titleStyle === "sidebar" ? t.secondary : t.accent} />}
			{L.hairline && <Rect box={L.hairline} color={t.border} />}
			<T box={L.title} size={fitFont(slide.title, L.title, L.titleFont, 12)} bold color={titleColor}>
				{slide.title}
			</T>
			{L.logo && logo && <Img src={logo} box={L.logo} alt="Logo" />}
			<Rect box={L.footerLine} color={t.border} />
			{f.left && (
				<T box={L.footerLeft} size={8} color={t.muted} nowrap>
					{f.left}
				</T>
			)}
			{f.center && (
				<T
					box={L.footerCenter}
					size={8}
					bold
					align="center"
					color={/CONFIDENTIAL|RESTRICTED|SECRET/.test(f.center) ? t.bad : t.accent}
					nowrap
				>
					{f.center}
				</T>
			)}
			{f.right && (
				<T box={L.footerRight} size={8} color={t.muted} align="right" nowrap>
					{f.right}
				</T>
			)}
		</>
	);
}

function Decorations({ style, color }: { style: DeckStyle; color: string }) {
	return (
		<>
			{decorations(style).map((d, i) => (
				<Rect key={i} box={d.circle} color={color} opacity={d.opacity} round />
			))}
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function ChartView({ spec, box, style }: { spec: ChartSpec; box: Box; style: DeckStyle }) {
	const t = style.theme;
	if (spec.empty) return <Muted style={style} text={spec.empty} box={box} />;

	const plot = spec.heading ? { x: box.x, y: box.y + 0.32, w: box.w, h: box.h - 0.32 } : box;
	const w = Math.round(px(plot.w));
	const h = Math.round(px(plot.h));
	const tick = { fontSize: 12, fill: t.muted, fontFamily: style.fontCss };
	const legend = (
		<Legend
			verticalAlign="bottom"
			iconType="square"
			wrapperStyle={{ fontSize: 13, color: t.ink, fontFamily: style.fontCss }}
		/>
	);
	const heading = spec.heading ? (
		<T box={{ x: box.x, y: box.y, w: box.w, h: 0.3 }} size={11} bold color={t.ink} align="center">
			{spec.heading}
		</T>
	) : null;

	let chart: ReactNode;
	if (spec.variant === "pie" || spec.variant === "doughnut") {
		const doughnut = spec.variant === "doughnut";
		const s = spec.series[0];
		const data = spec.labels.map((name, i) => ({ name, value: s.values[i] }));
		const total = data.reduce((a, d) => a + d.value, 0);
		const outer = Math.max(40, Math.min(w * 0.62, h) / 2 - 34);
		const colors = spec.pointColors ?? spec.labels.map(() => s.color);
		chart = (
			<PieChart width={w} height={h}>
				<Pie
					data={data}
					dataKey="value"
					nameKey="name"
					cx="38%"
					cy="50%"
					outerRadius={outer}
					innerRadius={doughnut ? outer * 0.55 : 0}
					stroke={t.bg}
					strokeWidth={1.5}
					isAnimationActive={false}
					labelLine={spec.dataLabels && !doughnut ? { stroke: t.muted } : false}
					label={
						spec.dataLabels
							? (p: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number }) => {
									const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 } = p;
									const rad = (-midAngle * Math.PI) / 180;
									const share = total > 0 ? Math.round((value / total) * 100) : 0;
									if (doughnut) {
										if (share < 4) return <g />;
										const r = (innerRadius + outerRadius) / 2;
										return (
											<text x={cx + r * Math.cos(rad)} y={cy + r * Math.sin(rad)} fill="#ffffff" fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="central">
												{share}%
											</text>
										);
									}
									const r = outerRadius + 16;
									const x = cx + r * Math.cos(rad);
									return (
										<text x={x} y={cy + r * Math.sin(rad)} fill={t.ink} fontSize={12} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
											{`${value.toLocaleString("en-US")} (${share}%)`}
										</text>
									);
								}
							: false
					}
				>
					{data.map((d, i) => (
						<Cell key={d.name} fill={colors[i]} />
					))}
				</Pie>
				<Legend
					layout="vertical"
					align="right"
					verticalAlign="middle"
					iconType="square"
					wrapperStyle={{ fontSize: 13, color: t.ink, fontFamily: style.fontCss, maxWidth: w * 0.36 }}
				/>
			</PieChart>
		);
	} else {
		const data = spec.labels.map((label, i) => {
			const row: Record<string, string | number> = { label };
			spec.series.forEach((s, k) => (row[`s${k}`] = s.values[i]));
			return row;
		});
		const many = spec.labels.length;
		const interval = many > 18 ? Math.ceil(many / 18) - 1 : 0;
		const grid = <CartesianGrid strokeDasharray="4 4" stroke={t.border} vertical={false} />;

		if (spec.variant === "line" || spec.variant === "area") {
			const xAxis = (
				<XAxis
					dataKey="label"
					tick={tick}
					tickLine={false}
					axisLine={false}
					interval={interval}
					angle={many > 12 ? -40 : 0}
					textAnchor={many > 12 ? "end" : "middle"}
					height={many > 12 ? 58 : 28}
				/>
			);
			const yAxis = <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} width={44} />;
			chart =
				spec.variant === "line" ? (
					<LineChart width={w} height={h} data={data} margin={{ top: 14, right: 18, left: 0, bottom: 4 }}>
						{grid}
						{xAxis}
						{yAxis}
						{spec.series.map((s, k) => (
							<Line
								key={s.name}
								type="linear"
								dataKey={`s${k}`}
								name={s.name}
								stroke={s.color}
								strokeWidth={3}
								dot={many <= 31 ? { r: 3.5, fill: s.color, strokeWidth: 0 } : false}
								isAnimationActive={false}
							/>
						))}
						{spec.showLegend && legend}
					</LineChart>
				) : (
					<AreaChart width={w} height={h} data={data} margin={{ top: 14, right: 18, left: 0, bottom: 4 }}>
						{grid}
						{xAxis}
						{yAxis}
						{spec.series.map((s, k) => (
							<Area
								key={s.name}
								type="linear"
								dataKey={`s${k}`}
								name={s.name}
								stroke={s.color}
								fill={s.color}
								fillOpacity={0.45}
								strokeWidth={1.5}
								isAnimationActive={false}
							/>
						))}
						{spec.showLegend && legend}
					</AreaChart>
				);
		} else {
			const horizontal = spec.variant === "bar" || spec.orientation === "horizontal";
			const stacked = spec.variant === "stacked";
			const slant = crowdedLabels(spec.labels, plot.w);
			const labelWidth = Math.min(150, Math.max(70, Math.max(...spec.labels.map((l) => l.length)) * 7));
			chart = horizontal ? (
				<BarChart width={w} height={h} data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }} barCategoryGap="22%">
					<CartesianGrid strokeDasharray="4 4" stroke={t.border} horizontal={false} />
					<XAxis type="number" tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
					<YAxis type="category" dataKey="label" tick={{ ...tick, fontSize: 11 }} tickLine={false} axisLine={false} width={labelWidth} interval={0} />
					{spec.series.map((s, k) => (
						<Bar key={s.name} dataKey={`s${k}`} name={s.name} fill={s.color} stackId={stacked ? "a" : undefined} isAnimationActive={false}>
							{spec.dataLabels && (
								<LabelList
									dataKey={`s${k}`}
									position={stacked ? "center" : "right"}
									fill={stacked ? "#ffffff" : t.ink}
									fontSize={11}
									formatter={(v: number) => (v ? v.toLocaleString("en-US") : "")}
								/>
							)}
						</Bar>
					))}
					{spec.showLegend && legend}
				</BarChart>
			) : (
				<BarChart width={w} height={h} data={data} margin={{ top: 20, right: 10, left: 0, bottom: 4 }} barCategoryGap="22%">
					{grid}
					<XAxis
						dataKey="label"
						tick={{ ...tick, fontSize: many > 10 ? 11 : 12 }}
						tickLine={false}
						axisLine={false}
						interval={interval}
						angle={slant ? -35 : 0}
						textAnchor={slant ? "end" : "middle"}
						height={slant ? 72 : 30}
					/>
					<YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
					{spec.series.map((s, k) => (
						<Bar key={s.name} dataKey={`s${k}`} name={s.name} fill={s.color} stackId={stacked ? "a" : undefined} isAnimationActive={false}>
							{spec.dataLabels && (
								<LabelList
									dataKey={`s${k}`}
									position={stacked ? "center" : "top"}
									fill={stacked ? "#ffffff" : t.ink}
									fontSize={11}
									formatter={(v: number) => (stacked && !v ? "" : (v ?? 0).toLocaleString("en-US"))}
								/>
							)}
						</Bar>
					))}
					{spec.showLegend && legend}
				</BarChart>
			);
		}
	}

	return (
		<>
			{heading}
			<div style={abs(plot)}>{chart}</div>
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

const cellPad = `${px(0.02)}px ${px(0.06)}px`;

function TableView({ slide, style }: { slide: Extract<DeckSlide, { type: "table" }>; style: DeckStyle }) {
	const t = style.theme;
	if (slide.empty) return <Muted style={style} text={slide.empty} />;
	const L = tableLayout(style, slide);
	const border = `0.67px solid ${t.border}`;
	return (
		<>
			<table
				style={{
					...abs({ ...L.box, h: L.box.h }),
					borderCollapse: "collapse",
					tableLayout: "fixed",
					fontSize: ptPx(style.table.font),
					fontFamily: style.fontCss,
				}}
			>
				<colgroup>
					{L.colW.map((w, i) => (
						<col key={i} style={{ width: px(w) }} />
					))}
				</colgroup>
				<tbody>
					{slide.rows.map((r, ri) => {
						const bg =
							r.style === "header" ? t.accent : r.style === "section" ? t.sectionFill : r.style === "total" ? t.totalFill : t.surface;
						const color = r.style === "header" ? t.onAccent : r.style === "fold" ? t.muted : t.ink;
						return (
							<tr key={ri} style={{ height: px(L.rowH[ri]) }}>
								{r.cells.map((c, ci) => (
									<td
										key={ci}
										style={{
											border,
											padding: r.style === "body" && ci === 0 ? `${px(0.02)}px ${px(0.06)}px ${px(0.02)}px ${px(0.16)}px` : cellPad,
											background: bg,
											color,
											fontWeight: r.style === "header" || r.style === "section" || r.style === "total" ? 700 : 400,
											fontStyle: r.style === "fold" ? "italic" : "normal",
											textAlign: ci === 0 ? "left" : "center",
											verticalAlign: "middle",
											lineHeight: 1.1,
											overflow: "hidden",
											whiteSpace: r.style === "header" ? "normal" : "nowrap",
											textOverflow: "ellipsis",
										}}
									>
										{c}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
			{L.note && slide.note && (
				<T box={L.note} size={8} italic color={t.muted}>
					{slide.note}
				</T>
			)}
		</>
	);
}

function NarrativesView({ slide, style }: { slide: Extract<DeckSlide, { type: "narratives" }>; style: DeckStyle }) {
	const t = style.theme;
	if (slide.empty) return <Muted style={style} text={slide.empty} />;
	const L = narrativesLayout(style, slide);
	const border = `0.67px solid ${t.border}`;
	const pad = `${px(0.03)}px ${px(0.06)}px`;
	const head: CSSProperties = { border, padding: pad, background: t.accent, color: t.onAccent, fontWeight: 700, textAlign: "left", verticalAlign: "middle" };
	const cell: CSSProperties = { border, padding: pad, background: t.surface, color: t.ink, verticalAlign: "top", lineHeight: 1.22, overflowWrap: "anywhere" };
	return (
		<>
			<table
				style={{
					...abs(L.box),
					borderCollapse: "collapse",
					tableLayout: "fixed",
					fontSize: ptPx(style.narrative.font),
					fontFamily: style.fontCss,
				}}
			>
				<colgroup>
					{L.colW.map((w, i) => (
						<col key={i} style={{ width: px(w) }} />
					))}
				</colgroup>
				<tbody>
					<tr style={{ height: px(L.rowH[0]) }}>
						<th style={head}>Source</th>
						<th style={head}>District</th>
						<th style={head}>Narrative</th>
					</tr>
					{slide.rows.map((d, i) => (
						<tr key={i} style={{ height: px(L.rowH[i + 1]) }}>
							<td style={cell}>{d.source}</td>
							<td style={cell}>{d.district}</td>
							<td style={cell}>{d.narrative}</td>
						</tr>
					))}
				</tbody>
			</table>
			{L.note && slide.note && (
				<T box={L.note} size={8.5} italic color={t.muted}>
					{slide.note}
				</T>
			)}
		</>
	);
}

function KpisView({ slide, style }: { slide: Extract<DeckSlide, { type: "kpis" }>; style: DeckStyle }) {
	const t = style.theme;
	if (slide.tiles.length === 0) return <Muted style={style} text="Pick some KPIs in the Content tab." />;
	const L = kpiLayout(style, slide.tiles.length, Boolean(slide.comparison));
	return (
		<>
			{slide.tiles.map((tile, i) => {
				const box = L.tiles[i];
				const p = kpiTileParts(box);
				const deltaColor = tile.delta
					? tile.delta.tone === "good" ? t.good : tile.delta.tone === "bad" ? t.bad : t.muted
					: t.muted;
				return (
					<div key={tile.key}>
						<div style={abs(box, { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.dark ? "none" : "0 1px 2px rgba(0,0,0,0.06)" })} />
						<Rect box={p.strip} color={i % 2 === 0 ? t.accent : t.secondary} />
						<T box={p.label} size={9.5} bold color={t.muted} nowrap>
							{tile.label.toUpperCase()}
						</T>
						<T box={p.value} size={fitFont(tile.value, p.value, L.valueFont, 14)} bold color={t.ink} nowrap>
							{tile.value}
						</T>
						{tile.delta && (
							<T box={p.delta} size={9.5} color={deltaColor} nowrap>
								<span>
									<b>
										{tile.delta.direction === "up" ? "▲" : tile.delta.direction === "down" ? "▼" : "■"} {tile.delta.text}
									</b>
									<span style={{ color: t.muted }}>{`  prev ${tile.delta.previous}`}</span>
								</span>
							</T>
						)}
						<T box={p.hint} size={8} italic color={t.muted} nowrap>
							{tile.hint}
						</T>
					</div>
				);
			})}
			{L.comparison && slide.comparison && (
				<T box={L.comparison} size={9} italic color={t.muted}>
					{`Change ${slide.comparison}.`}
				</T>
			)}
		</>
	);
}

function toneColor(style: DeckStyle, tone: "good" | "bad" | "neutral" | "info"): string {
	const t = style.theme;
	// Info takes the secondary colour so it never reads as "bad" on a red accent.
	return tone === "good" ? t.good : tone === "bad" ? t.bad : tone === "info" ? t.secondary : t.muted;
}

function BulletsView({ slide, style }: { slide: Extract<DeckSlide, { type: "bullets" }>; style: DeckStyle }) {
	const t = style.theme;
	if (slide.bullets.length === 0) return slide.empty ? <Muted style={style} text={slide.empty} /> : null;
	const L = bulletsLayout(style, slide.bullets);
	return (
		<>
			{slide.bullets.map((b, i) => {
				const row = L.rows[i];
				return (
					<div key={i}>
						<Rect box={row.marker} color={toneColor(style, b.tone)} round />
						<T box={row.marker} size={L.markerFont} bold color="#ffffff" align="center" lineHeight={1}>
							{b.mark}
						</T>
						<T box={row.text} size={L.font} color={t.ink} valign="top">
							{b.text}
						</T>
					</div>
				);
			})}
		</>
	);
}

function AgendaView({ slide, style }: { slide: Extract<DeckSlide, { type: "agenda" }>; style: DeckStyle }) {
	const t = style.theme;
	if (slide.items.length === 0) return <Muted style={style} text="Nothing after the agenda yet." />;
	const L = agendaLayout(style, slide.items.length);
	return (
		<>
			{slide.items.map((label, i) => {
				const row = L.rows[i];
				const fill = i % 2 === 0 ? t.accent : t.secondary;
				return (
					<div key={label}>
						<Rect box={row.marker} color={fill} round />
						<T box={row.marker} size={12} bold align="center" lineHeight={1} color={i % 2 === 0 ? t.onAccent : t.onSecondary}>
							{i + 1}
						</T>
						<T box={row.text} size={L.font} color={t.ink}>
							{label}
						</T>
					</div>
				);
			})}
		</>
	);
}

function BulletList({ items, box, style }: { items: string[]; box: Box; style: DeckStyle }) {
	return (
		<ul
			style={abs(box, {
				margin: 0,
				paddingLeft: 22,
				fontSize: ptPx(15),
				lineHeight: 1.2,
				color: style.theme.ink,
				listStyle: "disc",
				overflow: "hidden",
			})}
		>
			{items.map((l, i) => (
				<li key={i} style={{ marginBottom: ptPx(8) }}>
					{l}
				</li>
			))}
		</ul>
	);
}

function CoverView({ slide, style }: { slide: Extract<DeckSlide, { type: "cover" }>; style: DeckStyle }) {
	const t = style.theme;
	const c = slide.cover;
	const logos = [c.logo, c.partnerLogo].filter((l): l is string => Boolean(l));
	const L = coverLayout(style, c.layout, logos.length);
	const centered = c.layout === "centered";
	const g = style.geometry;
	return (
		<>
			<Rect box={{ x: 0, y: 0, w: g.w, h: g.h }} color={centered ? t.accent : t.bg} />
			{centered && <Decorations style={style} color={t.onAccent} />}
			{L.panel && (
				<>
					<Rect box={L.panel} color={t.accent} />
					<Rect box={{ x: L.panel.w - 2.4, y: L.panel.h - 2.4, w: 2.0, h: 2.0 }} color={t.onAccent} opacity={0.1} round />
				</>
			)}
			{L.bottomBar && <Rect box={L.bottomBar} color={centered ? t.secondary : t.accent} />}
			{L.verticalRule && <Rect box={L.verticalRule} color={t.accent} />}
			{logos.map((src, i) => (
				<Img key={i} src={src} box={L.logos[i]} alt="Logo" />
			))}
			<T box={L.title} size={fitFont(c.title, L.title, L.titleFont, 18)} bold color={centered ? t.onAccent : t.ink} align={L.align} valign="bottom">
				{c.title}
			</T>
			<T box={L.subtitle} size={17} color={centered ? t.onAccent : t.accent} align={L.align}>
				{c.subtitle}
			</T>
			{c.scope && (
				<T box={L.scope} size={13} bold color={centered ? t.onAccent : t.secondary} align={L.align}>
					{c.scope}
				</T>
			)}
			{c.organization && (
				<T
					box={L.organization}
					size={14}
					bold
					color={c.layout === "split" ? t.onAccent : centered ? t.onAccent : t.ink}
					align={c.layout === "split" ? "left" : L.align}
					valign={c.layout === "split" ? "bottom" : "middle"}
				>
					{c.organization}
				</T>
			)}
			{c.presenter && (
				<T box={L.presenter} size={12} color={centered ? t.onAccent : t.muted} align={L.align}>
					{c.presenter}
				</T>
			)}
			<T box={L.date} size={11} italic color={centered ? t.onAccent : t.muted} align={c.layout === "minimal" ? "right" : L.align}>
				{c.dateLine}
			</T>
		</>
	);
}

function DividerView({ slide, style }: { slide: Extract<DeckSlide, { type: "divider" }>; style: DeckStyle }) {
	const t = style.theme;
	const fill = slide.tone === "accent" ? t.accent : t.secondary;
	const on = slide.tone === "accent" ? t.onAccent : t.onSecondary;
	const L = dividerLayout(style);
	const g = style.geometry;
	return (
		<>
			<Rect box={{ x: 0, y: 0, w: g.w, h: g.h }} color={fill} />
			<Decorations style={style} color={on} />
			<T box={L.heading} size={fitFont(slide.heading, L.heading, 36, 20)} bold color={on} valign="bottom">
				{slide.heading}
			</T>
			<Rect box={L.rule} color={slide.tone === "accent" ? t.secondary : t.accent} />
			{slide.subheading && (
				<T box={L.subheading} size={16} color={on} valign="top">
					{slide.subheading}
				</T>
			)}
		</>
	);
}

function ClosingView({ slide, style, logo }: { slide: Extract<DeckSlide, { type: "closing" }>; style: DeckStyle; logo: string | null }) {
	const t = style.theme;
	const L = closingLayout(style, Boolean(logo));
	const g = style.geometry;
	return (
		<>
			<Rect box={{ x: 0, y: 0, w: g.w, h: g.h }} color={t.accent} />
			<Decorations style={style} color={t.onAccent} />
			{L.logo && logo && <Img src={logo} box={L.logo} alt="Logo" />}
			<T box={L.heading} size={fitFont(slide.heading, L.heading, 40, 20)} bold color={t.onAccent} align="center">
				{slide.heading}
			</T>
			{slide.message && (
				<T box={L.message} size={18} color={t.onAccent} align="center">
					{slide.message}
				</T>
			)}
			{slide.contact.length > 0 && (
				<T box={L.contact} size={12} color={t.onAccent} align="center" valign="bottom">
					{slide.contact.join("\n")}
				</T>
			)}
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Slide                                                               */
/* ------------------------------------------------------------------ */

export interface SlideCanvasProps {
	slide: DeckSlide;
	deck: BuiltDeck;
	config: DeckConfig;
	number: number;
	total: number;
}

/** A slide at its natural size (slide inches × 96 px). */
export const SlideCanvas = memo(function SlideCanvas({ slide, deck, config, number, total }: SlideCanvasProps) {
	const style = deck.style;
	const t = style.theme;
	const g = style.geometry;
	let body: ReactNode = null;
	switch (slide.type) {
		case "cover": body = <CoverView slide={slide} style={style} />; break;
		case "agenda": body = <AgendaView slide={slide} style={style} />; break;
		case "kpis": body = <KpisView slide={slide} style={style} />; break;
		case "bullets": body = <BulletsView slide={slide} style={style} />; break;
		case "twoColumn": {
			const L = twoColumnLayout(style);
			body = (
				<>
					<Rect box={L.divider} color={t.border} />
					<BulletList items={slide.left} box={L.left} style={style} />
					<BulletList items={slide.right} box={L.right} style={style} />
				</>
			);
			break;
		}
		case "statement": {
			const L = statementLayout(style, slide.text);
			body = (
				<>
					<T box={L.quote} size={96} bold color={t.accentSoft} valign="top" lineHeight={1}>
						{"“"}
					</T>
					<T box={L.text} size={L.font} italic color={t.accent}>
						{slide.text}
					</T>
					{slide.attribution && (
						<T box={L.attribution} size={13} color={t.muted} align="right">
							{`— ${slide.attribution}`}
						</T>
					)}
				</>
			);
			break;
		}
		case "table": body = <TableView slide={slide} style={style} />; break;
		case "narratives": body = <NarrativesView slide={slide} style={style} />; break;
		case "chart": body = <ChartView spec={slide.chart} box={chartLayout(style, false).plot} style={style} />; break;
		case "map": {
			const L = mapLayout(style, Boolean(slide.top));
			body = (
				<>
					{slide.map ? (
						<Img src={slide.map.dataUrl} box={L.map} alt="District choropleth of alerts issued" />
					) : (
						<Muted style={style} text="Map unavailable (no boundary data)." box={L.map} />
					)}
					{slide.top && L.top && <ChartView spec={slide.top} box={L.top} style={style} />}
				</>
			);
			break;
		}
		case "divider": body = <DividerView slide={slide} style={style} />; break;
		case "image": {
			const L = imageLayout(style, Boolean(slide.caption));
			body = (
				<>
					{slide.image ? <Img src={slide.image} box={L.image} alt={slide.caption || slide.title} /> : <Muted style={style} text="No image chosen — upload one in the Slides tab." box={L.image} />}
					{L.caption && slide.caption && (
						<T box={L.caption} size={11} italic color={t.muted} align="center">
							{slide.caption}
						</T>
					)}
				</>
			);
			break;
		}
		case "closing": body = <ClosingView slide={slide} style={style} logo={config.cover.logoDataUrl} />; break;
	}
	return (
		<div
			style={{
				position: "relative",
				width: px(g.w),
				height: px(g.h),
				overflow: "hidden",
				background: t.bg,
				color: t.ink,
				fontFamily: style.fontCss,
			}}
			data-slide-key={slide.key}
		>
			{slide.chrome === "content" && <Chrome slide={slide} deck={deck} config={config} number={number} total={total} />}
			{body}
		</div>
	);
});

/** A slide scaled to `width` CSS px (keeps the slide's aspect ratio). */
export function ScaledSlide({ width, ...props }: SlideCanvasProps & { width: number }) {
	const g = props.deck.style.geometry;
	const W = px(g.w);
	const H = px(g.h);
	const s = width / W;
	return (
		<div style={{ width, height: H * s, position: "relative", overflow: "hidden" }}>
			<div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: "top left" }}>
				<SlideCanvas {...props} />
			</div>
		</div>
	);
}

export function slidePixelSize(deck: BuiltDeck): { w: number; h: number } {
	return { w: px(deck.style.geometry.w), h: px(deck.style.geometry.h) };
}
