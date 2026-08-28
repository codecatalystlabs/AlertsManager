import type { SVGProps } from "react";

/**
 * File-type glyphs for the export buttons: a green Excel sheet and a blue CSV
 * page, instead of the monochrome lucide `FileSpreadsheet` / `Download` pair
 * that made the two exports look like the same action.
 *
 * Drawn inline rather than pulled from an icon pack: these are the only two we
 * need, and the Microsoft mark itself is trademarked — this is the familiar
 * green-page-with-an-X shape, not the Excel logo.
 *
 * Sizing is deliberately left to the caller. Inside a <Button> the shared
 * `[&_svg]:size-4` rule already sets it, and that descendant selector outranks
 * an h-4/w-4 utility on the icon anyway.
 */

type FileIconProps = Omit<SVGProps<SVGSVGElement>, "children">;

/** Page silhouette with the folded corner, shared by both icons. */
const PAGE_PATH = "M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z";
const FOLD_PATH = "M14 2l5 5h-4a1 1 0 0 1-1-1z";

export function ExcelIcon(props: FileIconProps) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
			{/* Excel green (#1D6F42); lifted in dark mode so the page still
			    reads against a dark surface. */}
			<path className="fill-[#1D6F42] dark:fill-[#2FA46A]" d={PAGE_PATH} />
			<path className="fill-white/35" d={FOLD_PATH} />
			<path
				d="M9.4 11.4l5.2 6.2M14.6 11.4l-5.2 6.2"
				fill="none"
				stroke="#fff"
				strokeWidth="1.9"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function CsvIcon(props: FileIconProps) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
			{/* Blue, not a second green: CSV is plain text, and the colour is
			    what tells the two export buttons apart at a glance. */}
			<path className="fill-[#1D63C8] dark:fill-[#4C8DF0]" d={PAGE_PATH} />
			<path className="fill-white/35" d={FOLD_PATH} />
			{/* Rows of text, the last one short — the plain-text motif. */}
			<path
				d="M8.5 12h7M8.5 15h7M8.5 18h4"
				fill="none"
				stroke="#fff"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
