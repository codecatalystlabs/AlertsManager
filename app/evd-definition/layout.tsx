import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Public Health - Uganda Health Alert System",
	description:
		"Public health case definitions and clinical guidelines for Uganda",
};

export default function EVDDefinitionLayout({
	children,
}: {
	children: React.ReactNode;
    }) {
	return <>{children}</>;
}