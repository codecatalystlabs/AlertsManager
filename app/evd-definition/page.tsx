"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService } from "@/lib/auth";
import Link from "next/link";
import { MohLogo, MohBrand } from "@/components/moh-logo";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { useIsAuthenticated } from "@/hooks/use-auth-status";
import {
	Stethoscope,
	Users,
	AlertTriangle,
	CheckCircle,
	Microscope,
	Thermometer,
	Heart,
	Eye,
	Droplets,
	Brain,
	LogIn,
	Home,
	BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "red" | "yellow" | "green" | "neutral";

const accentBar: Record<Accent, string> = {
	red: "bg-accent-red",
	yellow: "bg-accent-yellow",
	green: "bg-accent-green",
	neutral: "bg-foreground/30",
};

const accentText: Record<Accent, string> = {
	red: "text-accent-red",
	yellow: "text-foreground",
	green: "text-accent-green",
	neutral: "text-muted-foreground",
};

interface OrCondition {
	condition: string;
	signs: string[];
}

interface CaseDefinition {
	id: string;
	title: string;
	icon: typeof Users;
	accent: Accent;
	description: string;
	criteria: {
		primary: string;
		and?: string;
		signs?: string[];
		or?: (string | OrCondition)[];
		tests?: string[];
	};
}

const caseDefinitions: CaseDefinition[] = [
	{
		id: "community",
		title: "Community Case Definition",
		icon: Users,
		accent: "neutral",
		description: "Basic definition for community-level identification",
		criteria: {
			primary: "Illness with onset of fever and no response to treatment",
			or: [
				"Bleeding (from the nose or any other part of the body, bloody diarrhea, blood in urine)",
				"Any sudden death",
			],
		},
	},
	{
		id: "suspect",
		title: "Suspect Case Definition",
		icon: AlertTriangle,
		accent: "yellow",
		description: "Detailed criteria for suspected EVD cases",
		criteria: {
			primary:
				"Illness with onset of fever and no response to treatment for usual causes of fever",
			and: "At least three of the following signs:",
			signs: [
				"Headache",
				"Vomiting",
				"Diarrhea",
				"Anorexia / loss of appetite",
				"Lethargy",
				"Stomach pain",
				"Aching muscles or joints",
				"Difficulty swallowing",
				"Breathing difficulties",
				"Hiccups",
				"Convulsions",
			],
			or: [
				{
					condition:
						"Illness with onset of fever and no response to treatment AND at least one of the following signs of unexplained bleeding:",
					signs: [
						"Bloody diarrhea",
						"Bleeding from gums",
						"Bleeding into skin (purpura)",
						"Bleeding into eyes and urine",
						"Bleeding from the nose",
						"Sudden / unexplained death",
					],
				},
				"Any person with history of contact with a probable or confirmed Ebola case and having any one sign and symptom of Ebola Virus Disease",
				"Any person with history of travel to an area with a probable or confirmed Ebola case and having signs and symptoms of Ebola Virus Disease",
			],
		},
	},
	{
		id: "probable",
		title: "Probable Case",
		icon: Stethoscope,
		accent: "red",
		description: "Cases with epidemiological links but no lab confirmation",
		criteria: {
			primary:
				"Any person who died from a 'suspected' EVD and had an epidemiological link to a confirmed case but was not tested and did not have laboratory confirmation of the disease",
		},
	},
	{
		id: "confirmed",
		title: "Confirmed Case",
		icon: CheckCircle,
		accent: "green",
		description: "Laboratory-confirmed EVD cases",
		criteria: {
			primary: "A suspected case with a positive laboratory result for either:",
			tests: [
				"Virus antigen",
				"Viral RNA detected by RT-PCR",
				"IgM antibodies against Ebola",
			],
		},
	},
];

const symptoms: { name: string; icon: typeof Thermometer; severity: "high" | "medium" | "critical" }[] =
	[
		{ name: "Fever", icon: Thermometer, severity: "high" },
		{ name: "Headache", icon: Brain, severity: "high" },
		{ name: "Bleeding", icon: Droplets, severity: "critical" },
		{ name: "Vomiting", icon: Heart, severity: "medium" },
		{ name: "Diarrhea", icon: Heart, severity: "medium" },
		{ name: "Eye symptoms", icon: Eye, severity: "medium" },
	];

function severityAccent(severity: string): Accent {
	if (severity === "critical") return "red";
	if (severity === "high") return "yellow";
	return "neutral";
}

export default function EVDDefinitionPage() {
	const isAuthenticated = useIsAuthenticated();

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Header */}
			<header className="border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
					<MohBrand size="md" />
					<nav className="flex items-center gap-2">
						<ThemeToggleCompact className="mr-1" />
						{isAuthenticated ? (
							<>
								<Link href="/dashboard">
									<Button
										variant="ghost"
										className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
									>
										<Home
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											Dashboard
										</span>
									</Button>
								</Link>
								<Button
									variant="ghost"
									className="px-3 py-2 text-xs text-muted-foreground hover:text-accent-red hover:bg-accent-red/5 rounded-sm gap-2 h-auto"
									onClick={async () => {
										try {
											await AuthService.logout();
										} catch {
											/* ignore */
										} finally {
											window.location.href =
												"/evd-definition";
										}
									}}
								>
									<LogIn
										className="h-3.5 w-3.5 rotate-180"
										strokeWidth={1.75}
									/>
									<span className="mono uppercase tracking-widest font-bold">
										Logout
									</span>
								</Button>
							</>
						) : (
							<>
								<Link href="/add-alert">
									<Button
										variant="ghost"
										className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
									>
										<Home
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											Report alert
										</span>
									</Button>
								</Link>
								<Link href="/login">
									<Button className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto">
										<LogIn
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											Login
										</span>
									</Button>
								</Link>
							</>
						)}
					</nav>
				</div>
			</header>

			<main className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-12">
				{/* Hero */}
				<section className="animate-reveal">
					<div className="flex items-center gap-3 mb-5">
						<span className="h-1 w-8 bg-accent-red rounded-full" />
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
							Clinical Reference · Ebola Virus Disease
						</span>
					</div>
					<h1 className="serif text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-foreground text-balance">
						Case definitions &{" "}
						<em className="italic text-accent-red">
							clinical guidelines
						</em>
					</h1>
					<p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
						The four-tier case definition framework used by Uganda
						Ministry of Health surveillance teams, aligned with WHO
						guidance. Updated 2024.
					</p>
					<div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground inline-flex items-center gap-2">
							<span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
							WHO Guidelines
						</span>
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
							Updated 2024
						</span>
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground inline-flex items-center gap-2">
							<BookOpen
								className="h-3 w-3"
								strokeWidth={1.75}
							/>
							Ministry of Health Uganda
						</span>
					</div>
				</section>

				{/* Quick Reference Symptoms */}
				<section className="animate-reveal [animation-delay:100ms] editorial-card">
					<header className="px-6 py-5 border-b border-foreground/[0.08]">
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ 01 · Quick reference
						</p>
						<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
							Key symptoms
						</h2>
					</header>
					<div className="p-6">
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
							{symptoms.map((symptom) => {
								const accent = severityAccent(symptom.severity);
								return (
									<div
										key={symptom.name}
										className="relative bg-card px-4 py-5 text-center"
									>
										<span
											className={cn(
												"absolute left-0 top-5 bottom-5 w-[2px] rounded-full",
												accentBar[accent]
											)}
											aria-hidden="true"
										/>
										<symptom.icon
											className={cn(
												"h-5 w-5 mx-auto mb-2",
												accentText[accent]
											)}
											strokeWidth={1.5}
										/>
										<p className="text-sm font-medium text-foreground mb-1">
											{symptom.name}
										</p>
										<p
											className={cn(
												"mono text-[10px] uppercase tracking-widest font-bold",
												accentText[accent]
											)}
										>
											{symptom.severity}
										</p>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				{/* Case Definitions */}
				<section className="space-y-6 animate-reveal [animation-delay:200ms]">
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
							§ 02 · Framework
						</p>
						<h2 className="serif text-3xl font-medium tracking-tight text-foreground">
							The four-tier case definition
						</h2>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{caseDefinitions.map((definition) => (
							<article
								key={definition.id}
								className="editorial-card flex flex-col"
							>
								<header className="relative px-6 py-5 border-b border-foreground/[0.08]">
									<span
										className={cn(
											"absolute left-0 top-5 bottom-5 w-[2px] rounded-full",
											accentBar[definition.accent]
										)}
										aria-hidden="true"
									/>
									<div className="flex items-start gap-4">
										<definition.icon
											className={cn(
												"h-5 w-5 mt-1 shrink-0",
												accentText[definition.accent]
											)}
											strokeWidth={1.75}
										/>
										<div>
											<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
												{definition.id}
											</p>
											<h3 className="serif text-xl font-medium tracking-tight text-foreground">
												{definition.title}
											</h3>
											<p className="mt-1 text-sm text-muted-foreground leading-relaxed">
												{definition.description}
											</p>
										</div>
									</div>
								</header>
								<ScrollArea className="h-96 p-6">
									<div className="space-y-5">
										<div>
											<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
												Primary criteria
											</p>
											<p className="text-sm text-foreground/80 leading-relaxed">
												{definition.criteria.primary}
											</p>
										</div>

										{definition.criteria.and && (
											<div className="pt-4 border-t border-foreground/[0.08]">
												<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
													AND
												</p>
												<p className="text-sm text-foreground/80 leading-relaxed mb-3">
													{definition.criteria.and}
												</p>
												{definition.criteria.signs && (
													<ul className="space-y-2">
														{definition.criteria.signs.map(
															(sign) => (
																<li
																	key={sign}
																	className="flex items-center gap-3 text-sm text-foreground/80"
																>
																	<span className="h-1 w-1 rounded-full bg-accent-yellow shrink-0" />
																	{sign}
																</li>
															)
														)}
													</ul>
												)}
											</div>
										)}

										{definition.criteria.or && (
											<div className="pt-4 border-t border-foreground/[0.08]">
												<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
													OR any of the following
												</p>
												<div className="space-y-3">
													{definition.criteria.or.map(
														(item, idx) => (
															<div
																key={idx}
																className="border-l-2 border-accent-red/30 pl-4 py-1"
															>
																{typeof item ===
																"string" ? (
																	<p className="text-sm text-foreground/80 leading-relaxed">
																		{item}
																	</p>
																) : (
																	<>
																		<p className="text-sm font-medium text-foreground mb-2 leading-relaxed">
																			{
																				item.condition
																			}
																		</p>
																		<ul className="space-y-1.5">
																			{item.signs.map(
																				(
																					sign
																				) => (
																					<li
																						key={
																							sign
																						}
																						className="flex items-center gap-3 text-sm text-foreground/70"
																					>
																						<span className="h-1 w-1 rounded-full bg-accent-red shrink-0" />
																						{
																							sign
																						}
																					</li>
																				)
																			)}
																		</ul>
																	</>
																)}
															</div>
														)
													)}
												</div>
											</div>
										)}

										{definition.criteria.tests && (
											<div className="pt-4 border-t border-foreground/[0.08]">
												<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
													Laboratory tests
												</p>
												<ul className="space-y-2">
													{definition.criteria.tests.map(
														(test) => (
															<li
																key={test}
																className="flex items-center gap-3 text-sm text-foreground/80"
															>
																<Microscope
																	className="h-3.5 w-3.5 text-accent-green shrink-0"
																	strokeWidth={1.75}
																/>
																{test}
															</li>
														)
													)}
												</ul>
											</div>
										)}
									</div>
								</ScrollArea>
							</article>
						))}
					</div>
				</section>

				{/* Important Notes */}
				<section className="animate-reveal [animation-delay:300ms] editorial-card border-l-2 border-l-accent-red">
					<header className="px-6 py-5 border-b border-foreground/[0.08]">
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-2">
							§ 03 · Clinical protocol
						</p>
						<h2 className="serif text-2xl font-medium tracking-tight text-foreground">
							Important clinical notes
						</h2>
					</header>
					<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h4 className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
								Immediate actions required
							</h4>
							<ul className="space-y-3">
								{[
									"Isolate suspected cases immediately",
									"Use appropriate PPE for all interactions",
									"Report to health authorities within 24 hours",
									"Collect samples for laboratory testing",
								].map((line) => (
									<li
										key={line}
										className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
									>
										<span className="h-1.5 w-1.5 rounded-full bg-accent-red shrink-0 mt-2" />
										{line}
									</li>
								))}
							</ul>
						</div>
						<div>
							<h4 className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
								Contact tracing
							</h4>
							<ul className="space-y-3">
								{[
									"Identify all close contacts in past 21 days",
									"Monitor contacts for symptoms daily",
									"Document all contact information",
									"Provide health education to contacts",
								].map((line) => (
									<li
										key={line}
										className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
									>
										<span className="h-1.5 w-1.5 rounded-full bg-accent-red shrink-0 mt-2" />
										{line}
									</li>
								))}
							</ul>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-border mt-12 px-6 md:px-12 py-6">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<MohLogo size="xs" />
						<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
							Ministry of Health · Republic of Uganda · Clinical
							Reference
						</p>
					</div>
					<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
						v.2026.05 — Editorial release
					</p>
				</div>
			</footer>
		</div>
	);
}
