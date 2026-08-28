"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Building2,
	ChevronLeft,
	ChevronRight,
	Edit,
	EyeOff,
	Loader2,
	Plus,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canManageUsers } from "@/lib/auth";
import {
	useFacilities,
	useFacilityFacets,
	useInvalidateFacilities,
} from "@/hooks/use-facilities";
import {
	FACILITY_LEVELS,
	FACILITY_LEVEL_LABELS,
	FACILITY_OWNERSHIPS,
	FACILITY_OWNERSHIP_LABELS,
	FACILITY_REPORTING,
	FACILITY_STATUSES,
	createFacility,
	deleteFacility,
	updateFacility,
	type Facility,
	type FacilityInput,
} from "@/lib/facilities";

/**
 * Administration → Health Facilities.
 *
 * The national Master Facility List (~8,700 rows) as an editable register. It
 * is the reference list behind the facility pickers, and the denominator §8
 * facility EBS needs: every facility is meant to have a trained Surveillance
 * Focal Person, and coverage cannot be measured against a list that does not
 * exist.
 *
 * Everyone signed in can READ this screen — a district biostat needs to look up
 * which facilities exist in their district. Only an admin sees the add/edit/
 * delete controls, and the backend enforces that independently.
 *
 * Every filter and the paging are SERVER-side (see hooks/use-facilities.ts):
 * 8,700 rows must never be pulled into the browser to be filtered there.
 */

const PAGE_SIZE = 25;

/** The empty form — a new facility starts active and otherwise blank. */
const EMPTY_FORM: FacilityInput = {
	uid: "",
	name: "",
	shortName: "",
	subCounty: "",
	district: "",
	region: "",
	level: "",
	ownership: "",
	status: "",
	reporting: "",
	active: true,
};

/** "—" is the value the selects use for "not recorded"; "" is not selectable. */
const NONE = "__none__";

function levelLabel(level: string): string {
	const long = FACILITY_LEVEL_LABELS[level];
	return long ? `${level} — ${long}` : level;
}

export default function FacilitiesPage() {
	const { toast } = useToast();
	const user = useCurrentUser();
	const isAdmin = canManageUsers(user);
	const invalidate = useInvalidateFacilities();

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [district, setDistrict] = useState("all");
	const [region, setRegion] = useState("all");
	const [level, setLevel] = useState("all");
	const [ownership, setOwnership] = useState("all");
	const [status, setStatus] = useState("all");
	const [page, setPage] = useState(0);

	// Debounced so typing a facility name is one request per pause, not one per
	// keystroke against an 8,700-row LIKE.
	useEffect(() => {
		const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(id);
	}, [search]);

	// Any filter change invalidates the current page number — staying on page 12
	// of a result set that now has 2 pages shows an empty table.
	useEffect(() => {
		setPage(0);
	}, [debouncedSearch, district, region, level, ownership, status]);

	// Region -> district is a strict hierarchy, so changing the region clears the
	// district outright rather than waiting for the facets to come back. Without
	// this the bar could sit on Region "Ankole" + District "Bukwo District" —
	// offerable, and matching nothing, because Bukwo is in Bugisu.
	const changeRegion = useCallback((value: string) => {
		setRegion(value);
		setDistrict("all");
	}, []);


	const query = useMemo(
		() => ({
			search: debouncedSearch,
			district,
			region,
			level,
			ownership,
			status,
			limit: PAGE_SIZE,
			offset: page * PAGE_SIZE,
		}),
		[debouncedSearch, district, region, level, ownership, status, page]
	);

	const { facilities, total, loading, validating, error, refetch } =
		useFacilities(query);
	// Facets take the SAME scope as the rows, so each dropdown only offers what
	// is still reachable — the cascade.
	const { facets } = useFacilityFacets(query);
	// The non-hierarchical filters can also strand: pick level "NRH", then a
	// district with no national referral hospital, and the bar shows a filter
	// that cannot match. Once the new facets arrive, drop any selection they no
	// longer contain. Guarded on `facets` being loaded so the first render — when
	// every list is still empty — does not wipe the user's filters.
	useEffect(() => {
		if (!facets) return;
		const drop = (
			value: string,
			available: string[],
			reset: (v: string) => void
		) => {
			if (value !== "all" && !available.includes(value)) reset("all");
		};
		drop(region, facets.regions, setRegion);
		drop(district, facets.districts, setDistrict);
		drop(level, facets.levels, setLevel);
		drop(ownership, facets.ownerships, setOwnership);
		drop(status, facets.statuses, setStatus);
	}, [facets, region, district, level, ownership, status]);

	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Facility | null>(null);
	const [form, setForm] = useState<FacilityInput>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<Facility | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const openCreate = useCallback(() => {
		setEditing(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setFormOpen(true);
	}, []);

	const openEdit = useCallback((facility: Facility) => {
		setEditing(facility);
		setForm({
			uid: facility.uid,
			name: facility.name,
			shortName: facility.shortName,
			subCounty: facility.subCounty,
			district: facility.district,
			region: facility.region,
			level: facility.level,
			ownership: facility.ownership,
			status: facility.status,
			reporting: facility.reporting,
			active: facility.active,
		});
		setFormError(null);
		setFormOpen(true);
	}, []);

	const handleSave = useCallback(async () => {
		setSaving(true);
		setFormError(null);
		try {
			if (editing) {
				await updateFacility(editing.id, form);
				toast({ title: `${form.name ?? editing.name} updated` });
			} else {
				await createFacility(form);
				toast({ title: `${form.name} added to the facility list` });
			}
			invalidate();
			void refetch();
			setFormOpen(false);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Could not save the facility.");
		} finally {
			setSaving(false);
		}
	}, [editing, form, invalidate, refetch, toast]);

	/** Retire/restore — the non-destructive path, offered before deletion. */
	const toggleActive = useCallback(
		async (facility: Facility) => {
			try {
				await updateFacility(facility.id, { active: !facility.active });
				toast({
					title: facility.active
						? `${facility.name} retired`
						: `${facility.name} restored`,
					description: facility.active
						? "It stays on existing alerts but no longer appears in the pickers."
						: undefined,
				});
				invalidate();
				void refetch();
			} catch (err) {
				toast({
					title: "Could not update the facility",
					description: err instanceof Error ? err.message : undefined,
					variant: "destructive",
				});
			}
		},
		[invalidate, refetch, toast]
	);

	const handleDelete = useCallback(async () => {
		if (!deleting) return;
		setIsDeleting(true);
		try {
			await deleteFacility(deleting.id);
			toast({ title: `${deleting.name} deleted` });
			invalidate();
			void refetch();
			setDeleting(null);
		} catch (err) {
			// The API refuses (409) when alerts name this facility. Surface that
			// verbatim and point at retiring rather than silently forcing.
			toast({
				title: "Could not delete the facility",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
			setDeleting(null);
		} finally {
			setIsDeleting(false);
		}
	}, [deleting, invalidate, refetch, toast]);

	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
	const showingTo = Math.min(total, (page + 1) * PAGE_SIZE);

	const set = (patch: Partial<FacilityInput>) =>
		setForm((prev) => ({ ...prev, ...patch }));

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
						<Building2 className="h-4 w-4 text-uganda-red" />
						Health Facilities
					</h2>
					<p className="text-xs text-muted-foreground">
						The national Master Facility List — the reference list behind
						every facility picker.
						{!isAdmin && " Read-only: only an administrator can change it."}
					</p>
				</div>
				{isAdmin && (
					<Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
						<Plus className="h-4 w-4" />
						Add facility
					</Button>
				)}
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle className="text-sm">
							{total.toLocaleString()} facilit{total === 1 ? "y" : "ies"}
							{validating && (
								<Loader2 className="ml-2 inline h-3 w-3 animate-spin text-muted-foreground" />
							)}
						</CardTitle>
					</div>

					<div className="flex flex-wrap items-center gap-2 pt-1.5">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search name or uid…"
								className="h-8 w-56 pl-7 text-xs"
							/>
						</div>

						<FilterSelect
							value={region}
							onChange={changeRegion}
							placeholder="All regions"
							options={facets?.regions ?? []}
						/>
						<FilterSelect
							value={district}
							onChange={setDistrict}
							placeholder="All districts"
							options={facets?.districts ?? []}
						/>
						<FilterSelect
							value={level}
							onChange={setLevel}
							placeholder="All levels"
							options={facets?.levels ?? []}
						/>
						<FilterSelect
							value={ownership}
							onChange={setOwnership}
							placeholder="All ownership"
							options={facets?.ownerships ?? []}
							labelFor={(v) => FACILITY_OWNERSHIP_LABELS[v] ?? v}
						/>
						<FilterSelect
							value={status}
							onChange={setStatus}
							placeholder="Any status"
							options={facets?.statuses ?? []}
						/>
					</div>
				</CardHeader>

				<CardContent className="px-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Facility</TableHead>
									<TableHead>Level</TableHead>
									<TableHead>Ownership</TableHead>
									<TableHead>District</TableHead>
									<TableHead>Subcounty</TableHead>
									<TableHead>Region</TableHead>
									<TableHead>Status</TableHead>
									{isAdmin && <TableHead className="w-28">Actions</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading && facilities.length === 0 ? (
									<TableRow>
										<TableCell colSpan={isAdmin ? 8 : 7} className="py-6 text-center text-xs text-muted-foreground">
											<Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
											Loading facilities…
										</TableCell>
									</TableRow>
								) : facilities.length === 0 ? (
									<TableRow>
										<TableCell colSpan={isAdmin ? 8 : 7} className="py-6 text-center text-xs text-muted-foreground">
											No facilities match these filters.
										</TableCell>
									</TableRow>
								) : (
									facilities.map((f) => (
										<TableRow key={f.id} className={f.active ? undefined : "opacity-60"}>
											<TableCell>
												<div className="font-medium">{f.name}</div>
												<div className="text-[11px] text-muted-foreground">
													{f.uid}
													{!f.active && " · retired"}
												</div>
											</TableCell>
											<TableCell>{f.level || "—"}</TableCell>
											<TableCell>
												{f.ownership ? (
													<span title={FACILITY_OWNERSHIP_LABELS[f.ownership]}>
														{f.ownership}
													</span>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell>{f.district || "—"}</TableCell>
											<TableCell>{f.subCounty || "—"}</TableCell>
											<TableCell>{f.region || "—"}</TableCell>
											<TableCell>
												<div className="flex flex-col gap-0.5">
													<Badge
														variant={
															f.status === "Functional" ? "default" : "secondary"
														}
														className="w-fit text-[10px]"
													>
														{f.status || "Unknown"}
													</Badge>
													{/* Reporting is a DIFFERENT question from functional —
													    a functional facility that never reports is the gap
													    facility-EBS supervision exists to find. */}
													{f.reporting === "Non-Reporting" && (
														<span className="text-[10px] text-amber-700">
															Non-reporting
														</span>
													)}
												</div>
											</TableCell>
											{isAdmin && (
												<TableCell>
													<div className="flex items-center gap-0.5">
														<Button
															size="sm"
															variant="ghost"
															className="h-6 w-6 p-0"
															title="Edit"
															onClick={() => openEdit(f)}
														>
															<Edit className="h-3.5 w-3.5" />
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="h-6 w-6 p-0"
															title={f.active ? "Retire" : "Restore"}
															onClick={() => void toggleActive(f)}
														>
															{f.active ? (
																<EyeOff className="h-3.5 w-3.5" />
															) : (
																<RotateCcw className="h-3.5 w-3.5" />
															)}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="h-6 w-6 p-0 text-destructive"
															title="Delete"
															onClick={() => setDeleting(f)}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</TableCell>
											)}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground">
						<span>
							Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of{" "}
							{total.toLocaleString()}
						</span>
						<div className="flex items-center gap-1.5">
							<Button
								size="sm"
								variant="outline"
								className="h-7 w-7 p-0"
								disabled={page === 0}
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								aria-label="Previous page"
							>
								<ChevronLeft className="h-3.5 w-3.5" />
							</Button>
							<span className="tabular-nums">
								Page {page + 1} of {pageCount.toLocaleString()}
							</span>
							<Button
								size="sm"
								variant="outline"
								className="h-7 w-7 p-0"
								disabled={page + 1 >= pageCount}
								onClick={() => setPage((p) => p + 1)}
								aria-label="Next page"
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Edit facility" : "Add facility"}
						</DialogTitle>
						<DialogDescription>
							{editing
								? "Changes take effect in every facility picker immediately."
								: "The uid is the facility's business key — facility names are not unique, so it is required."}
						</DialogDescription>
					</DialogHeader>

					{formError && (
						<Alert variant="destructive">
							<AlertDescription>{formError}</AlertDescription>
						</Alert>
					)}

					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Name" required>
							<Input
								value={form.name ?? ""}
								onChange={(e) => set({ name: e.target.value })}
								className="h-8 text-xs"
							/>
						</Field>
						<Field
							label="UID"
							required
							hint="DHIS2 organisation-unit uid; unique across the list"
						>
							<Input
								value={form.uid ?? ""}
								onChange={(e) => set({ uid: e.target.value })}
								className="h-8 font-mono text-xs"
							/>
						</Field>
						<Field label="Short name">
							<Input
								value={form.shortName ?? ""}
								onChange={(e) => set({ shortName: e.target.value })}
								className="h-8 text-xs"
							/>
						</Field>
						<Field label="Level">
							<VocabSelect
								value={form.level ?? ""}
								onChange={(v) => set({ level: v })}
								options={[...FACILITY_LEVELS]}
								labelFor={levelLabel}
							/>
						</Field>
						<Field label="Ownership">
							<VocabSelect
								value={form.ownership ?? ""}
								onChange={(v) => set({ ownership: v })}
								options={[...FACILITY_OWNERSHIPS]}
								labelFor={(v) => `${v} — ${FACILITY_OWNERSHIP_LABELS[v] ?? v}`}
							/>
						</Field>
						<Field label="Region">
							<Input
								value={form.region ?? ""}
								onChange={(e) => set({ region: e.target.value })}
								className="h-8 text-xs"
							/>
						</Field>
						<Field label="District">
							<Input
								value={form.district ?? ""}
								onChange={(e) => set({ district: e.target.value })}
								className="h-8 text-xs"
							/>
						</Field>
						<Field label="Subcounty">
							<Input
								value={form.subCounty ?? ""}
								onChange={(e) => set({ subCounty: e.target.value })}
								className="h-8 text-xs"
							/>
						</Field>
						<Field label="Operational status">
							<VocabSelect
								value={form.status ?? ""}
								onChange={(v) => set({ status: v })}
								options={[...FACILITY_STATUSES]}
							/>
						</Field>
						<Field
							label="Routine reporting"
							hint="A facility can be functional but non-reporting"
						>
							<VocabSelect
								value={form.reporting ?? ""}
								onChange={(v) => set({ reporting: v })}
								options={[...FACILITY_REPORTING]}
							/>
						</Field>
					</div>

					<div className="flex items-center gap-2 pt-1">
						<Switch
							id="facility-active"
							checked={form.active !== false}
							onCheckedChange={(v) => set({ active: v })}
						/>
						<Label htmlFor="facility-active" className="text-xs">
							Selectable in facility pickers
						</Label>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setFormOpen(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => void handleSave()}
							disabled={saving || !form.name?.trim() || !form.uid?.trim()}
						>
							{saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
							{editing ? "Save changes" : "Add facility"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<ConfirmDeleteDialog
				open={deleting !== null}
				onOpenChange={(open) => !open && setDeleting(null)}
				title="Delete this facility?"
				description={
					deleting
						? `${deleting.name} (${deleting.uid}) will be removed from the master list. If any alert names it, the API will refuse — retire it instead, which keeps it on those alerts but hides it from the pickers.`
						: ""
				}
				isDeleting={isDeleting}
				onConfirm={() => void handleDelete()}
			/>
		</div>
	);
}

/** A filter dropdown whose options come from the data, plus an "all" escape. */
function FilterSelect({
	value,
	onChange,
	placeholder,
	options,
	labelFor,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	options: string[];
	labelFor?: (v: string) => string;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="h-8 w-[150px] text-xs">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">{placeholder}</SelectItem>
				{options.map((o) => (
					<SelectItem key={o} value={o}>
						{labelFor ? labelFor(o) : o}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/**
 * A controlled-vocabulary select. "Not recorded" is a real choice — the source
 * list genuinely has blanks, and forcing a level onto a facility that has none
 * would invent the very data this register exists to hold honestly.
 */
function VocabSelect({
	value,
	onChange,
	options,
	labelFor,
}: {
	value: string;
	onChange: (v: string) => void;
	options: string[];
	labelFor?: (v: string) => string;
}) {
	return (
		<Select
			value={value || NONE}
			onValueChange={(v) => onChange(v === NONE ? "" : v)}
		>
			<SelectTrigger className="h-8 text-xs">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NONE}>Not recorded</SelectItem>
				{options.map((o) => (
					<SelectItem key={o} value={o}>
						{labelFor ? labelFor(o) : o}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function Field({
	label,
	required,
	hint,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-xs">
				{label}
				{required && <span className="text-destructive"> *</span>}
			</Label>
			{children}
			{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
		</div>
	);
}
