/**
 * Export an on-screen charts area to a multi-page PDF. Charts are a mix of
 * recharts SVG and HTML, so we rasterise the DOM with html-to-image and place
 * each chart card into the PDF as an image — capturing per-card so no chart is
 * ever split across a page boundary. Both libraries are lazy-imported to keep
 * them out of the initial bundle.
 */

const UGANDA_RED: [number, number, number] = [217, 0, 0];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];

export interface ChartsPdfOptions {
	title?: string;
	subtitle?: string;
	filename?: string;
}

function dateStamp(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * Find the individual chart cards inside the captured container so each can be
 * rasterised on its own. Falls back to the whole container when the expected
 * grid structure isn't found.
 */
function collectChartNodes(container: HTMLElement): HTMLElement[] {
	// The container wraps the DashboardCharts grid; the grid's children are the
	// chart cards. Walk one or two levels to find a multi-child grid.
	const candidates = [container, container.firstElementChild];
	for (const node of candidates) {
		if (!node) continue;
		const children = Array.from(node.children).filter(
			(c): c is HTMLElement => c instanceof HTMLElement
		);
		if (children.length > 1) return children;
	}
	return [container];
}

export async function downloadChartsAsPdf(
	container: HTMLElement,
	options: ChartsPdfOptions = {}
): Promise<void> {
	if (typeof window === "undefined") {
		throw new Error("PDF export is only available in the browser");
	}

	const [{ toPng }, { jsPDF }] = await Promise.all([
		import("html-to-image"),
		import("jspdf"),
	]);

	const nodes = collectChartNodes(container);

	const doc = new jsPDF({ unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 12;
	const usableWidth = pageWidth - margin * 2;
	const title = options.title ?? "Dashboard Charts";

	// ---- Header (first page) --------------------------------------------
	doc.setTextColor(...UGANDA_RED);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(15);
	doc.text(title, margin, margin + 4);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(9.5);
	doc.setTextColor(...MUTED);
	if (options.subtitle) {
		doc.text(options.subtitle, margin, margin + 10);
	}
	doc.text(
		`Generated ${new Date().toLocaleString()}`,
		pageWidth - margin,
		margin + 4,
		{ align: "right" }
	);

	let cursorY = margin + (options.subtitle ? 15 : 11);

	const renderOpts = {
		pixelRatio: 2,
		backgroundColor: "#ffffff",
		cacheBust: true,
		// Avoid cross-origin font fetches that can reject the whole capture.
		skipFonts: true,
	} as const;

	for (const node of nodes) {
		const width = node.offsetWidth || node.clientWidth || 1;
		const height = node.offsetHeight || node.clientHeight || 1;
		const drawHeight = usableWidth * (height / width);

		// New page when this card won't fit in the remaining space.
		if (cursorY + drawHeight > pageHeight - margin) {
			doc.addPage();
			cursorY = margin;
		}

		let dataUrl: string;
		try {
			dataUrl = await toPng(node, renderOpts);
		} catch (err) {
			console.error("Chart capture failed for a card:", err);
			continue; // skip the problem card rather than failing the whole export
		}

		doc.addImage(dataUrl, "PNG", margin, cursorY, usableWidth, drawHeight);
		cursorY += drawHeight + 6;
	}

	// ---- Footer on every page -------------------------------------------
	const pageCount = doc.getNumberOfPages();
	for (let p = 1; p <= pageCount; p++) {
		doc.setPage(p);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...INK);
		doc.text(
			"Uganda Health Alert System — Ministry of Health",
			margin,
			pageHeight - 6
		);
		doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, pageHeight - 6, {
			align: "right",
		});
	}

	doc.save(options.filename ?? `dashboard-charts-${dateStamp()}.pdf`);
}
