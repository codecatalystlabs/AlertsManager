import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
				serif: ["Instrument Serif", "Times New Roman", "Georgia", "serif"],
				mono: [
					"JetBrains Mono",
					"ui-monospace",
					"SFMono-Regular",
					"monospace",
				],
			},
			colors: {
				border: "oklch(var(--border) / <alpha-value>)",
				input: "oklch(var(--input) / <alpha-value>)",
				ring: "oklch(var(--ring))",
				background: "oklch(var(--background))",
				foreground: "oklch(var(--foreground))",
				primary: {
					DEFAULT: "oklch(var(--primary))",
					foreground: "oklch(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "oklch(var(--secondary))",
					foreground: "oklch(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "oklch(var(--destructive))",
					foreground: "oklch(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "oklch(var(--muted))",
					foreground: "oklch(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "oklch(var(--accent))",
					foreground: "oklch(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "oklch(var(--popover))",
					foreground: "oklch(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "oklch(var(--card))",
					foreground: "oklch(var(--card-foreground))",
				},
				"accent-red": "oklch(var(--accent-red))",
				"accent-yellow": "oklch(var(--accent-yellow))",
				"accent-green": "oklch(var(--accent-green))",
				// Legacy aliases — map old uganda-* tokens onto the editorial palette
				// so any unmigrated call sites still render in-palette.
				uganda: {
					black: "oklch(var(--foreground))",
					yellow: "oklch(var(--accent-yellow))",
					red: "oklch(var(--accent-red))",
					blue: "oklch(var(--foreground))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				reveal: {
					"0%": { opacity: "0", transform: "translateY(12px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				reveal: "reveal 0.6s cubic-bezier(0.2,0.7,0.2,1) both",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
