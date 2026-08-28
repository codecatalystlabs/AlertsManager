"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFacilities, useFacilityFacets } from "@/hooks/use-facilities";
import type { Facility } from "@/lib/facilities";

/**
 * Pick one facility from the national Master Facility List.
 *
 * The list is ~8,700 rows, so this is a SERVER-BACKED typeahead, never a
 * <select>: the search box and the region/district filters all narrow the query
 * and only one page of matches is ever rendered.
 *
 * The region and district filters CASCADE — choosing a region narrows the
 * district list to that region's districts, so the picker cannot be put into an
 * impossible state (Region "Ankole" + District "Bukwo District" matches nothing,
 * because Bukwo is in Bugisu).
 *
 * Only ACTIVE facilities are offered: a retired facility stays on the alerts
 * that already name it, but must never be newly selectable.
 */
export function FacilityPicker({
	value,
	onChange,
	/** Seeds the district filter — usually the alert's own district. */
	defaultDistrict,
	label = "Facility",
	placeholder = "Search for a facility…",
	disabled,
}: {
	/** The selected facility name, or "" for none. */
	value: string;
	onChange: (name: string, uid: string) => void;
	defaultDistrict?: string;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
}) {
	// The search box doubles as the selection display: picking a facility writes
	// its name here. That also narrows the query to that one row, so the list
	// below collapses to the chosen facility instead of staying a wall of
	// options — no open/close state machine, and no blur-vs-click race.
	const [search, setSearch] = useState(value);
	const [debounced, setDebounced] = useState("");
	const [region, setRegion] = useState("all");
	const [district, setDistrict] = useState(defaultDistrict?.trim() || "all");

	// One request per pause, not one per keystroke against 8,700 rows.
	useEffect(() => {
		const id = setTimeout(() => setDebounced(search.trim()), 300);
		return () => clearTimeout(id);
	}, [search]);

	const query = useMemo(
		() => ({
			search: debounced,
			region,
			district,
			active: true,
			limit: 25,
		}),
		[debounced, region, district]
	);

	const { facilities, total, loading } = useFacilities(query);
	const { facets } = useFacilityFacets(query);

	// Region -> district is a strict hierarchy, so changing the region clears a
	// district that may not belong to it.
	const changeRegion = (v: string) => {
		setRegion(v);
		setDistrict("all");
	};

	// If the text is edited away from the selected facility, DROP the selection.
	// Otherwise the form would keep a value the input no longer displays, and
	// save a destination the user cannot see — the one genuinely dangerous state
	// for a field that says where a patient was taken.
	useEffect(() => {
		if (value && search.trim() !== value) {
			onChange("", "");
		}
		// onChange is the parent's setter; re-running on its identity would fight
		// the parent's own re-renders.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, value]);

	// A district seeded from the alert may not exist in the facility list at
	// all (alerts store district names as free text). Drop it rather than
	// showing an empty picker the user cannot explain.
	useEffect(() => {
		if (!facets) return;
		if (district !== "all" && !facets.districts.includes(district)) {
			setDistrict("all");
		}
	}, [facets, district]);

	return (
		<div className="space-y-2">
			<Label className="text-xs">{label}</Label>

			<div className="flex flex-wrap items-center gap-2">
				<Select value={region} onValueChange={changeRegion} disabled={disabled}>
					<SelectTrigger className="h-8 w-[150px] text-xs">
						<SelectValue placeholder="All regions" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All regions</SelectItem>
						{(facets?.regions ?? []).map((r) => (
							<SelectItem key={r} value={r}>
								{r}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={district} onValueChange={setDistrict} disabled={disabled}>
					<SelectTrigger className="h-8 w-[170px] text-xs">
						<SelectValue placeholder="All districts" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All districts</SelectItem>
						{(facets?.districts ?? []).map((d) => (
							<SelectItem key={d} value={d}>
								{d}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="relative min-w-[180px] flex-1">
					{value && search.trim() === value ? (
						<Check className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-600" />
					) : (
						<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					)}
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={placeholder}
						disabled={disabled}
						className={cn(
							"h-8 pl-7 pr-7 text-xs",
							value &&
								search.trim() === value &&
								"border-emerald-500 font-medium text-emerald-800"
						)}
					/>
					{search && (
						<button
							type="button"
							onClick={() => {
								setSearch("");
								onChange("", "");
							}}
							disabled={disabled}
							aria-label="Clear facility"
							className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-gray-100 hover:text-gray-700"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
			</div>

			<div className="max-h-56 overflow-y-auto rounded-md border border-gray-200">
				{loading && facilities.length === 0 ? (
					<p className="px-3 py-4 text-center text-xs text-muted-foreground">
						<Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
						Searching…
					</p>
				) : facilities.length === 0 ? (
					<p className="px-3 py-4 text-center text-xs text-muted-foreground">
						No facilities match. Try a different district or search term.
					</p>
				) : (
					<ul className="divide-y divide-gray-100">
						{facilities.map((f: Facility) => {
							const selected = f.name === value;
							return (
								<li key={f.id}>
									<button
										type="button"
										disabled={disabled}
										onClick={() => {
											onChange(f.name, f.uid);
											setSearch(f.name);
										}}
										className={cn(
											"flex w-full items-start justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50",
											selected && "bg-uganda-red/5"
										)}
									>
										<span className="min-w-0">
											<span className="block truncate font-medium text-gray-900">
												{f.name}
											</span>
											<span className="block truncate text-[11px] text-muted-foreground">
												{[f.level, f.district, f.region]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</span>
										{selected && (
											<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-uganda-red" />
										)}
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{/* Say when the list is truncated, so a facility that is missing from
			    view reads as "narrow your search", not "it does not exist". */}
			{total > facilities.length && (
				<p className="text-[11px] text-muted-foreground">
					Showing {facilities.length} of {total.toLocaleString()} matches —
					narrow by district or search to find a specific facility.
				</p>
			)}
		</div>
	);
}
