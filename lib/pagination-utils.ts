/** Page index list with ellipsis for table pagination controls */

export function getPaginationRange(
	currentPage: number,
	totalPages: number
): (number | "ellipsis")[] {
	if (totalPages <= 1) return totalPages === 1 ? [0] : [];
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i);
	}

	const range: (number | "ellipsis")[] = [];
	const siblings = 1;

	for (let i = 0; i < totalPages; i++) {
		const isFirst = i === 0;
		const isLast = i === totalPages - 1;
		const isSibling =
			i >= currentPage - siblings && i <= currentPage + siblings;

		if (isFirst || isLast || isSibling) {
			range.push(i);
		} else if (range[range.length - 1] !== "ellipsis") {
			range.push("ellipsis");
		}
	}

	return range;
}
