"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import type { GeoFeature, GeoFeatureCollection } from "@/lib/fetch-geo";

export type MapSearchHit =
	| { kind: "region"; feature: GeoFeature }
	| { kind: "district"; feature: GeoFeature; region: GeoFeature | undefined }
	| { kind: "subcounty"; feature: GeoFeature };

interface MapSearchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	regions: GeoFeatureCollection | undefined;
	districts: GeoFeatureCollection | undefined;
	/** The open district's subcounties, when one is open. */
	subcounties: GeoFeature[] | null;
	subcountyParent: string | null;
	onSelect: (hit: MapSearchHit) => void;
}

function Count({ n }: { n: number }) {
	return (
		<span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
			{n.toLocaleString()}
		</span>
	);
}

/**
 * Jump-to-area palette (Ctrl/⌘+K or "/"): every region and district by name,
 * plus the subcounties of the district that is open. Choosing one flies the
 * map there exactly as clicking through would.
 */
export function MapSearchDialog({
	open,
	onOpenChange,
	regions,
	districts,
	subcounties,
	subcountyParent,
	onSelect,
}: MapSearchDialogProps) {
	const regionByUid = useMemo(() => {
		const m = new Map<string, GeoFeature>();
		for (const f of regions?.features ?? []) m.set(f.properties.uid, f);
		return m;
	}, [regions]);

	const byName = (a: GeoFeature, b: GeoFeature) =>
		a.properties.name.localeCompare(b.properties.name);
	const regionList = useMemo(() => [...(regions?.features ?? [])].sort(byName), [regions]);
	const districtList = useMemo(() => [...(districts?.features ?? [])].sort(byName), [districts]);
	const subList = useMemo(() => [...(subcounties ?? [])].sort(byName), [subcounties]);

	const pick = (hit: MapSearchHit) => {
		onOpenChange(false);
		onSelect(hit);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
				<DialogTitle className="sr-only">Find an area on the map</DialogTitle>
				<DialogDescription className="sr-only">
					Search regions, districts and the open district&apos;s subcounties.
				</DialogDescription>
				<Command
					className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
					filter={(value, search, keywords) => {
						const v = value.toLowerCase();
						const q = search.trim().toLowerCase();
						if (!v.includes(q)) return 0;
						// Name-prefix matches first; among equals, areas that carry
						// signals first — so "Gulu" ranks Gulu District (which holds
						// the pair's count) above Gulu City.
						return (v.startsWith(q) ? 2 : 1) + (keywords?.[0] === "signals" ? 0.5 : 0);
					}}
				>
					<CommandInput placeholder="Find a region, district or subcounty…" />
					<CommandList className="max-h-[50vh]">
						<CommandEmpty>No matching area.</CommandEmpty>
						{subList.length > 0 && (
							<CommandGroup heading={`Subcounties in ${subcountyParent}`}>
								{subList.map((f) => (
									<CommandItem
										key={`s-${f.properties.uid}`}
										value={`${f.properties.name} subcounty ${subcountyParent} ${f.properties.uid}`}
										keywords={[f.properties.count > 0 ? "signals" : "none"]}
										onSelect={() => pick({ kind: "subcounty", feature: f })}
									>
										<MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
										<span className="truncate">{f.properties.name}</span>
										<Count n={f.properties.count} />
									</CommandItem>
								))}
							</CommandGroup>
						)}
						<CommandGroup heading="Regions">
							{regionList.map((f) => (
								<CommandItem
									key={`r-${f.properties.uid}`}
									value={`${f.properties.name} region ${f.properties.uid}`}
									keywords={[f.properties.count > 0 ? "signals" : "none"]}
									onSelect={() => pick({ kind: "region", feature: f })}
								>
									<MapPin className="mr-2 h-3.5 w-3.5 text-uganda-red" />
									<span className="truncate">{f.properties.name}</span>
									<Count n={f.properties.count} />
								</CommandItem>
							))}
						</CommandGroup>
						<CommandGroup heading="Districts">
							{districtList.map((f) => {
								const region = regionByUid.get(f.properties.regionUid);
								return (
									<CommandItem
										key={`d-${f.properties.uid}`}
										value={`${f.properties.name} district ${region?.properties.name ?? ""} ${f.properties.uid}`}
										keywords={[f.properties.count > 0 ? "signals" : "none"]}
										onSelect={() => pick({ kind: "district", feature: f, region })}
									>
										<MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
										<span className="truncate">{f.properties.name}</span>
										{region && (
											<span className="ml-2 truncate text-[11px] text-muted-foreground">
												{region.properties.name}
											</span>
										)}
										<Count n={f.properties.count} />
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
