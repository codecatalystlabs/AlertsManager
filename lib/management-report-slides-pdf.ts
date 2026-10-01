/**
 * "PDF (slides)" and "PNG (this slide)": pictures of the rendered HTML slides.
 *
 * The document PDF (management-report-pdf.ts) is searchable text and tables;
 * this one is the deck exactly as presented — one landscape page per slide,
 * same size as the .pptx — for people who will only ever look at it on a
 * phone. Each slide node is captured with html-to-image and placed full-bleed.
 */

const CAPTURE = {
	pixelRatio: 2,
	cacheBust: false,
	// Cross-origin font fetches can reject the whole capture; the slides use
	// system font stacks anyway.
	skipFonts: true,
} as const;

/** Wait for layout + one paint so freshly-mounted charts are on screen. */
export function nextFrames(n = 2): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
		step(n);
	});
}

export async function downloadSlidesPdf(opts: {
	nodes: HTMLElement[];
	/** Slide size in inches. */
	size: { w: number; h: number };
	fileName: string;
	background: string;
	onProgress?: (done: number, total: number) => void;
}): Promise<string> {
	const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
	const { w, h } = opts.size;
	const doc = new jsPDF({ unit: "in", format: [w, h], orientation: w >= h ? "landscape" : "portrait" });
	for (let i = 0; i < opts.nodes.length; i++) {
		// JPEG keeps a 25-slide deck to a few MB; PNG would be several times that.
		const data = await toJpeg(opts.nodes[i], { ...CAPTURE, quality: 0.92, backgroundColor: opts.background });
		if (i > 0) doc.addPage([w, h], w >= h ? "landscape" : "portrait");
		doc.addImage(data, "JPEG", 0, 0, w, h, undefined, "FAST");
		opts.onProgress?.(i + 1, opts.nodes.length);
	}
	doc.save(opts.fileName);
	return opts.fileName;
}

export async function downloadSlidePng(node: HTMLElement, fileName: string, background: string): Promise<string> {
	const { toPng } = await import("html-to-image");
	const data = await toPng(node, { ...CAPTURE, backgroundColor: background });
	const a = document.createElement("a");
	a.href = data;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	return fileName;
}
