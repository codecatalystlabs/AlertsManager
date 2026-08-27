/**
 * How a user account is written down as a person's name.
 *
 * This matters beyond cosmetics: "Verified By" is the actor recorded against a
 * signal, and it is read months later from exports, the traceability timeline
 * and the confirmation PDF. A record naming "bkroland19" (or, worse, a blank a
 * hurried verifier typed one character into) cannot be traced back to a human,
 * so the verification dialogs prefill this from the signed-in account rather
 * than asking someone to retype their own name.
 */

import type { User } from "@/lib/auth";

/**
 * The name parts an account actually carries, in the order they are written:
 * first, other (middle), last. Blank parts are dropped, so the result is only
 * as long as the profile is complete.
 */
export function userNameParts(user: User | null | undefined): string[] {
	if (!user) return [];
	return [user.firstName, user.otherName, user.lastName]
		// Collapse internal runs of whitespace as well as trimming the ends: a
		// single field often holds two names typed with a stray double space
		// ("kizza  roland"), and that gap is visible wherever the name is shown.
		// Casing is deliberately left alone — title-casing would mangle names
		// like "de Silva" or "McDonald"; the profile page is where it gets fixed.
		.map((part) => (part ?? "").trim().replace(/\s+/g, " "))
		.filter(Boolean);
}

/**
 * A person's full name for display — normally at least two names (first and
 * last), plus a middle name when the account records one.
 *
 * Falls back to the username ONLY when the profile carries no names at all.
 * A profile holding just one name returns that one name rather than padding it
 * with the username: inventing a second name would misidentify the person, and
 * the fields this feeds stay editable so the gap can be filled in by hand.
 */
export function userFullName(user: User | null | undefined): string {
	const parts = userNameParts(user);
	if (parts.length > 0) return parts.join(" ");
	return (user?.username ?? "").trim();
}

/**
 * True when the account can supply the two names a traceable attribution needs.
 * Lets a form point out a thin profile instead of silently recording one name.
 */
export function hasFullName(user: User | null | undefined): boolean {
	return userNameParts(user).length >= 2;
}

/** Two-letter initials for an avatar, from the same name parts. */
export function userInitials(user: User | null | undefined): string {
	const parts = userNameParts(user);
	if (parts.length >= 2) {
		return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
	}
	const source = parts[0] || user?.username || "";
	return source.slice(0, 2).toUpperCase();
}
