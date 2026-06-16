/**
 * Generates a one-page PDF "receipt" of a submitted health alert so the
 * reporter can keep a copy for themselves. Mirrors the lazy-import approach
 * used for Excel export in lib/alert-export.ts to keep jsPDF out of the
 * initial client bundle.
 */

// Ministry of Health Uganda brand colours (see tailwind.config.ts `uganda`).
const UGANDA_RED: [number, number, number] = [217, 0, 0];
const UGANDA_YELLOW: [number, number, number] = [252, 220, 4];
const INK: [number, number, number] = [17, 24, 39]; // gray-900
const MUTED: [number, number, number] = [107, 114, 128]; // gray-500

export interface AlertPdfData {
	/** Numeric id returned by the create endpoint, if available. */
	referenceId?: number | null;
	submittedAt?: Date;
	date: string; // yyyy-mm-dd from the form
	time: string; // HH:MM from the form
	status: string;
	callTaker?: string;
	alertReportedBefore?: string;
	personReporting: string;
	contactNumber: string;
	sourceOfAlert: string;
	response?: string; // human-readable disease name
	region: string;
	district: string;
	subCounty: string;
	village?: string;
	parish?: string;
	caseName: string;
	caseAge: string | number;
	caseSex: string;
	nextOfKinName?: string;
	nextOfKinPhone?: string;
	caseDescription: string;
	narrative?: string;
	symptoms: string[];
}

type Field = { label: string; value: string; full?: boolean };

function dash(value: string | number | null | undefined): string {
	const str = value == null ? "" : String(value).trim();
	return str.length > 0 ? str : "—";
}

/** Parse a yyyy-mm-dd form value as a *local* date to avoid TZ day-shifts. */
function formatFormDate(dateStr: string): string {
	if (!dateStr) return "—";
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
	const d = match
		? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
		: new Date(dateStr);
	return Number.isNaN(d.getTime())
		? dateStr
		: d.toLocaleDateString(undefined, {
				day: "2-digit",
				month: "short",
				year: "numeric",
		  });
}

function formatReference(id?: number | null): string {
	return id != null ? `ALT${String(id).padStart(3, "0")}` : "Pending";
}

export function alertPdfFilename(data: AlertPdfData): string {
	const stamp = (data.submittedAt ?? new Date())
		.toISOString()
		.split("T")[0];
	const ref = data.referenceId != null ? formatReference(data.referenceId) : stamp;
	return `health-alert-${ref}.pdf`;
}

export async function downloadAlertConfirmationPdf(
	data: AlertPdfData
): Promise<void> {
	if (typeof window === "undefined") {
		throw new Error("PDF export is only available in the browser");
	}

	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "mm", format: "a4" });

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	const contentWidth = pageWidth - margin * 2;
	const submittedAt = data.submittedAt ?? new Date();

	// ---- Header band -----------------------------------------------------
	doc.setFillColor(...UGANDA_RED);
	doc.rect(0, 0, pageWidth, 26, "F");
	doc.setFillColor(...UGANDA_YELLOW);
	doc.rect(0, 26, pageWidth, 2, "F");

	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("Uganda Health Alert System", margin, 13);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text("Ministry of Health Uganda", margin, 20);

	let y = 38;

	// ---- Document title + reference --------------------------------------
	doc.setTextColor(...INK);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.text("Health Alert Report — Confirmation", margin, y);
	y += 7;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(9.5);
	doc.setTextColor(...MUTED);
	doc.text(`Reference: ${formatReference(data.referenceId)}`, margin, y);
	doc.text(
		`Submitted: ${submittedAt.toLocaleString()}`,
		pageWidth - margin,
		y,
		{ align: "right" }
	);
	y += 7;

	// Intro note
	doc.setTextColor(...INK);
	const intro =
		"This is your copy of the health alert reported to the Ministry of Health. " +
		"The relevant authorities have been notified. Please keep this for your records.";
	const introLines = doc.splitTextToSize(intro, contentWidth);
	doc.text(introLines, margin, y);
	y += introLines.length * 4.6 + 3;

	// ---- Body section renderers ------------------------------------------
	const ensureSpace = (needed: number) => {
		if (y + needed > pageHeight - 18) {
			doc.addPage();
			y = margin + 4;
		}
	};

	const sectionHeader = (title: string) => {
		ensureSpace(12);
		y += 2;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(...UGANDA_RED);
		doc.text(title, margin, y);
		y += 1.5;
		doc.setDrawColor(...UGANDA_YELLOW);
		doc.setLineWidth(0.6);
		doc.line(margin, y, pageWidth - margin, y);
		y += 5;
	};

	// Wrap a value at the given width (font size must match drawCell's value).
	const wrap = (value: string, cellWidth: number): string[] => {
		doc.setFontSize(9.5);
		return doc.splitTextToSize(value, cellWidth);
	};

	const cellHeight = (lineCount: number): number =>
		4.2 + lineCount * 4.4 + 3;

	const drawCell = (
		field: Field,
		x: number,
		cellWidth: number,
		top: number
	): void => {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...MUTED);
		doc.text(field.label.toUpperCase(), x, top);

		doc.setFontSize(9.5);
		doc.setTextColor(...INK);
		doc.text(wrap(field.value, cellWidth), x, top + 4.2);
	};

	const renderFields = (fields: Field[]) => {
		const gap = 8;
		const colWidth = (contentWidth - gap) / 2;
		let i = 0;
		while (i < fields.length) {
			const field = fields[i];
			if (field.full) {
				const height = cellHeight(
					wrap(field.value, contentWidth).length
				);
				ensureSpace(height);
				drawCell(field, margin, contentWidth, y);
				y += height;
				i += 1;
				continue;
			}

			const right =
				fields[i + 1] && !fields[i + 1].full ? fields[i + 1] : null;
			const leftHeight = cellHeight(wrap(field.value, colWidth).length);
			const rightHeight = right
				? cellHeight(wrap(right.value, colWidth).length)
				: 0;
			const rowHeight = Math.max(leftHeight, rightHeight);
			ensureSpace(rowHeight);
			drawCell(field, margin, colWidth, y);
			if (right) drawCell(right, margin + colWidth + gap, colWidth, y);
			y += rowHeight;
			i += right ? 2 : 1;
		}
	};

	sectionHeader("Basic Information");
	renderFields([
		{ label: "Date", value: formatFormDate(data.date) },
		{ label: "Time", value: dash(data.time) },
		{ label: "Alert Status", value: dash(data.status) },
		{ label: "Response", value: dash(data.response) },
		{ label: "Call Taker", value: dash(data.callTaker) },
		{
			label: "Reported Before",
			value: dash(data.alertReportedBefore),
		},
	]);

	sectionHeader("Reporter Information");
	renderFields([
		{ label: "Name", value: dash(data.personReporting) },
		{ label: "Phone Number", value: dash(data.contactNumber) },
		{ label: "Source of Alert", value: dash(data.sourceOfAlert), full: true },
	]);

	sectionHeader("Case Location");
	renderFields([
		{ label: "Region", value: dash(data.region) },
		{ label: "District", value: dash(data.district) },
		{ label: "Subcounty", value: dash(data.subCounty) },
		{ label: "Parish", value: dash(data.parish) },
		{ label: "Village", value: dash(data.village) },
	]);

	sectionHeader("Case Information");
	renderFields([
		{ label: "Patient Name", value: dash(data.caseName) },
		{ label: "Age", value: dash(data.caseAge) },
		{ label: "Sex", value: dash(data.caseSex) },
		{ label: "Next of Kin", value: dash(data.nextOfKinName) },
		{ label: "Next of Kin Phone", value: dash(data.nextOfKinPhone) },
		{
			label: "Case Description",
			value: dash(data.caseDescription),
			full: true,
		},
	]);

	sectionHeader("Signs & Symptoms");
	renderFields([
		{
			label: "Reported Symptoms",
			value:
				data.symptoms.length > 0 ? data.symptoms.join(", ") : "—",
			full: true,
		},
	]);

	if (data.narrative && data.narrative.trim()) {
		sectionHeader("Additional Notes");
		renderFields([
			{ label: "Notes", value: data.narrative.trim(), full: true },
		]);
	}

	// ---- Footer (all pages) ---------------------------------------------
	const pageCount = doc.getNumberOfPages();
	for (let p = 1; p <= pageCount; p++) {
		doc.setPage(p);
		doc.setDrawColor(...MUTED);
		doc.setLineWidth(0.2);
		doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...MUTED);
		doc.text(
			"Emergency: 0800-100-066  •  SMS 6767  •  Ministry of Health Uganda",
			margin,
			pageHeight - 9
		);
		doc.text(
			`Page ${p} of ${pageCount}`,
			pageWidth - margin,
			pageHeight - 9,
			{ align: "right" }
		);
	}

	doc.save(alertPdfFilename(data));
}
