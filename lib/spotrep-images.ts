/**
 * Pictures for a spot report — the template's last row, "Pictorials".
 *
 * A district spot report is routinely a photo of a line list, a ward, or a
 * burial site with two lines of text around it, and a generator that could not
 * carry the picture would send people back to Word to paste it in. So the
 * composer takes attachments and both renderers embed them.
 *
 * Everything here is BROWSER-only (FileReader, Image, fetch) and deliberately
 * kept out of lib/spotrep.ts, which stays pure so it can be tested under plain
 * node.
 */

/** One attached picture, already read into memory. */
export interface SpotRepImage {
	/** `data:image/png;base64,…` — self-contained, so nothing re-fetches later. */
	dataUrl: string;
	/** Natural pixel size, for laying the picture out at its true aspect. */
	width: number;
	height: number;
	/** The submitter's caption; the file name when they write none. */
	caption: string;
}

/**
 * How many, and how large.
 *
 * A spot report is emailed and forwarded from a phone on a district connection.
 * Four full-size photos is already a document nobody can send, so the cap is a
 * feature rather than a limitation — and the downscale below is what makes the
 * four that ARE allowed survive the trip.
 */
export const SPOTREP_MAX_IMAGES = 4;
export const SPOTREP_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Longest edge after downscaling. A4 at 150dpi is ~1240px wide. */
const MAX_EDGE = 1400;

/** Formats both renderers can actually embed. */
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
export const SPOTREP_IMAGE_ACCEPT = ACCEPTED.join(",");

/**
 * Read a picked file into an embeddable image, downscaling anything larger than
 * MAX_EDGE and re-encoding to JPEG.
 *
 * Re-encoding is not cosmetic: a 12-megapixel phone photo is ~6MB, and four of
 * them make a 24MB Word file that the district mail server rejects. WebP is
 * accepted at the input and converted here, because neither `docx` nor jsPDF
 * can embed it.
 */
export async function readSpotRepImage(file: File): Promise<SpotRepImage> {
	if (!ACCEPTED.includes(file.type)) {
		throw new Error(`${file.name}: only PNG, JPEG or WebP images can be attached`);
	}
	if (file.size > SPOTREP_MAX_IMAGE_BYTES) {
		throw new Error(`${file.name}: larger than 8MB`);
	}

	const source = await readAsDataUrl(file);
	const image = await decode(source);
	const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	// Below the cap and already embeddable — keep the original bytes rather than
	// re-encoding a screenshot of a line list into something blurrier.
	if (scale === 1 && file.type !== "image/webp") {
		return { dataUrl: source, width, height, caption: baseName(file.name) };
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) return { dataUrl: source, width, height, caption: baseName(file.name) };
	context.drawImage(image, 0, 0, width, height);

	return {
		dataUrl: canvas.toDataURL("image/jpeg", 0.85),
		width,
		height,
		caption: baseName(file.name),
	};
}

function baseName(name: string): string {
	return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function readAsDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
		reader.readAsDataURL(blob);
	});
}

function decode(dataUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Could not read that image"));
		img.src = dataUrl;
	});
}

/**
 * The Ministry crest for the letterhead, as a data URL — or null.
 *
 * Null is a normal outcome, not an error: the file is served by the app itself,
 * so a failure here means the page is offline, and a spot report without a crest
 * is still a spot report. Both renderers fall back to the text letterhead.
 */
export async function loadCrestDataUrl(
	path = "/logo.png"
): Promise<string | null> {
	try {
		const response = await fetch(path);
		if (!response.ok) return null;
		return await readAsDataUrl(await response.blob());
	} catch {
		return null;
	}
}

/** `data:image/png;base64,…` → the raw bytes `docx` wants. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
	const base64 = dataUrl.split(",")[1] ?? "";
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** The `docx` image type for a data URL, defaulting to png. */
export function dataUrlDocxType(dataUrl: string): "png" | "jpg" | "gif" | "bmp" {
	const mime = /^data:([^;]+)/.exec(dataUrl)?.[1] ?? "";
	if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
	if (mime === "image/gif") return "gif";
	if (mime === "image/bmp") return "bmp";
	return "png";
}

/** The jsPDF format string for a data URL. */
export function dataUrlPdfFormat(dataUrl: string): "PNG" | "JPEG" {
	return dataUrlDocxType(dataUrl) === "jpg" ? "JPEG" : "PNG";
}

/** Trigger the browser download for a generated file. */
export function saveBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
