/**
 * The Rapid Response Team on a risk assessment — a lead and a variable number
 * of members, each with a name and a phone number.
 *
 * Both still travel in the two free-text columns the server already has
 * (risk_team_lead VARCHAR(255), risk_team_members TEXT). No schema change, and
 * every existing row keeps working: a legacy value like "DHO Kasese" or
 * "surveillance, clinical, lab" parses back as a single name with no phone,
 * which is exactly what it is.
 *
 * The encoding is chosen to stay READABLE where the raw string still surfaces —
 * the details dialog, the Excel/CSV export, the management deck:
 *
 *   lead     "Dr Jane Doe · 0771234567"
 *   members  "Dr Jane Doe · 0771234567; Okwir Sam · 0772222222"
 *
 * " · " separates a person from their phone (the separator this app already
 * uses for "reporter · number"); "; " separates people. Commas are deliberately
 * NOT a separator: names are routinely written "Doe, John", and the legacy
 * free-text rows are full of comma lists that would split into nonsense.
 */

export interface RrtPerson {
	name: string;
	phone: string;
}

export const EMPTY_RRT_PERSON: RrtPerson = { name: "", phone: "" };

/** A person with nothing in either field is not a person — it is a blank row. */
export function isEmptyPerson(person: RrtPerson): boolean {
	return !person.name.trim() && !person.phone.trim();
}

/**
 * "Name · phone", degrading to whichever half exists. A phone with no name
 * keeps the leading separator so it parses back into the phone field rather
 * than being read as somebody called "0771234567".
 */
export function formatRrtPerson(person: RrtPerson): string {
	const name = person.name.trim();
	const phone = person.phone.trim();
	if (name && phone) return `${name} · ${phone}`;
	if (name) return name;
	if (phone) return `· ${phone}`;
	return "";
}

/** The inverse. Anything without a separator is taken to be a name. */
export function parseRrtPerson(value?: string | null): RrtPerson {
	const raw = (value ?? "").trim();
	if (!raw) return { ...EMPTY_RRT_PERSON };
	const at = raw.indexOf("·");
	if (at === -1) return { name: raw, phone: "" };
	return {
		name: raw.slice(0, at).trim(),
		phone: raw.slice(at + 1).trim(),
	};
}

/** Blank rows are dropped, so an operator can leave spare inputs behind. */
export function formatRrtMembers(members: RrtPerson[]): string {
	return members
		.filter((m) => !isEmptyPerson(m))
		.map(formatRrtPerson)
		.join("; ");
}

/** Split on ";" and newlines only — see the note on commas above. */
export function splitRrtMembers(value?: string | null): RrtPerson[] {
	return (value ?? "")
		.split(/[;\n]/)
		.map((part) => parseRrtPerson(part))
		.filter((person) => !isEmptyPerson(person));
}

/**
 * The same list for the FORM, padded to at least one row so the dialog opens
 * with an input to type into rather than with nothing.
 */
export function parseRrtMembers(value?: string | null): RrtPerson[] {
	const people = splitRrtMembers(value);
	return people.length > 0 ? people : [{ ...EMPTY_RRT_PERSON }];
}

/** "Dr Jane Doe (0771234567)" — one person, for read-only lines. */
export function rrtPersonDisplay(value?: string | null): string {
	const person = parseRrtPerson(value);
	if (person.name && person.phone) return `${person.name} (${person.phone})`;
	return person.name || person.phone;
}

/** The team as a read-only sentence fragment: "A (071…), B (072…)". */
export function rrtMembersDisplay(value?: string | null): string {
	return splitRrtMembers(value)
		.map((person) => rrtPersonDisplay(formatRrtPerson(person)))
		.join(", ");
}
