import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Uganda Health Alert System - Ministry of Health",
	description:
		"Report health alerts and monitor disease surveillance in Uganda",
	generator: "Uganda Health Alert System",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={dmSans.variable} suppressHydrationWarning>
			<body className="font-sans">
				<Providers>{children}</Providers>
				<Toaster />
			</body>
		</html>
	);
}
