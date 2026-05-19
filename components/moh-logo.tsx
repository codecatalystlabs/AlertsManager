import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeConfig = {
	sm: { container: "h-10 w-10", image: 32 },
	md: { container: "h-12 w-12", image: 40 },
} as const;

type MohLogoProps = {
	size?: keyof typeof sizeConfig;
	className?: string;
};

export function MohLogo({ size = "sm", className }: MohLogoProps) {
	const { container, image } = sizeConfig[size];

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/95 p-1 shadow-sm",
				container,
				className
			)}
		>
			<Image
				src="/logo.png"
				alt="Ministry of Health Uganda logo"
				width={image}
				height={image}
				className="h-full w-full object-contain"
			/>
		</div>
	);
}
