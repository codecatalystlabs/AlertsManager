import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeConfig = {
	xs: { box: "h-6 w-6 p-0.5", img: 22 },
	sm: { box: "h-9 w-9 p-1", img: 32 },
	md: { box: "h-11 w-11 p-1", img: 40 },
	lg: { box: "h-16 w-16 p-1.5", img: 56 },
	xl: { box: "h-24 w-24 p-2", img: 88 },
} as const;

type MohLogoProps = {
	size?: keyof typeof sizeConfig;
	className?: string;
	/** When true the crest sits inside a soft framed tile (useful on dark/branded surfaces). */
	framed?: boolean;
};

/**
 * Official Ministry of Health Uganda crest, rendered in an editorial container.
 * Use `framed` on dark/coloured surfaces to keep the crest legible.
 */
export function MohLogo({ size = "md", className, framed = false }: MohLogoProps) {
	const { box, img } = sizeConfig[size];
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center",
				framed && "rounded-sm bg-background ring-1 ring-foreground/10",
				box,
				className
			)}
			aria-hidden="true"
		>
			<Image
				src="/logo.png"
				alt="Ministry of Health Uganda crest"
				width={img}
				height={img}
				className="h-full w-full object-contain"
			/>
		</div>
	);
}

/**
 * Brand lockup — crest + "Ministry of Health / Republic of Uganda" labels.
 * Single source of truth for headers, drawers, login, etc.
 */
export function MohBrand({
	size = "md",
	className,
	subtitle = "Republic of Uganda",
	dark = false,
}: {
	size?: "xs" | "sm" | "md" | "lg";
	className?: string;
	subtitle?: string;
	/** When true, render labels in light-on-dark (use over `bg-foreground`). */
	dark?: boolean;
}) {
	const textSize =
		size === "xs"
			? { eyebrow: "text-[8px]", title: "text-[11px]" }
			: size === "sm"
			? { eyebrow: "text-[9px]", title: "text-xs" }
			: { eyebrow: "text-[9px]", title: "text-sm" };

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<MohLogo size={size} framed={dark} />
			<div className="leading-tight min-w-0">
				<p
					className={cn(
						"uppercase tracking-widest font-bold truncate",
						textSize.eyebrow,
						dark ? "text-background/60" : "text-muted-foreground"
					)}
				>
					Ministry of Health
				</p>
				<p
					className={cn(
						"font-medium truncate",
						textSize.title,
						dark ? "text-background" : "text-foreground"
					)}
				>
					{subtitle}
				</p>
			</div>
		</div>
	);
}
