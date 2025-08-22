"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/auth";
import Link from "next/link";
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
} from "lucide-react";

const caseDefinitions = [
	{
		id: "community",
		title: "Community Case Definition",
		icon: Users,
		color: "bg-blue-500",
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
		color: "bg-yellow-500",
		description: "Detailed criteria for suspected EVD cases",
		criteria: {
			primary: "Illness with onset of fever and no response to treatment for usual causes of fever",
			and: "At least three of the following signs:",
			signs: [
				"Headache",
				"Vomiting",
				"Diarrhea",
				"Anorexia/loss of appetite",
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
						"Sudden/unexplained death",
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
		color: "bg-orange-500",
		description:
			"Cases with epidemiological links but no lab confirmation",
		criteria: {
			primary: "Any person who died from a 'suspected' EVD and had an epidemiological link to a confirmed case but was not tested and did not have laboratory confirmation of the disease",
		},
	},
	{
		id: "confirmed",
		title: "Confirmed Case",
		icon: CheckCircle,
		color: "bg-green-500",
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

const symptoms = [
	{ name: "Fever", icon: Thermometer, severity: "high" },
	{ name: "Headache", icon: Brain, severity: "high" },
	{ name: "Bleeding", icon: Droplets, severity: "critical" },
	{ name: "Vomiting", icon: Heart, severity: "medium" },
	{ name: "Diarrhea", icon: Heart, severity: "medium" },
	{ name: "Eye symptoms", icon: Eye, severity: "medium" },
];

export default function EVDDefinitionPage() {
	const isAuthenticated = AuthService.isAuthenticated();

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center space-x-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
								<span className="text-lg font-bold text-white">
									MoH
								</span>
							</div>
							<div>
								<h1 className="text-xl font-bold">
									Uganda Health Alert System
								</h1>
								<p className="text-sm text-white/90">
									Ministry of Health Uganda
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							{isAuthenticated ? (
								<>
									<Link href="/dashboard">
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<Home className="w-4 h-4 mr-2" />
											Dashboard
										</Button>
									</Link>
									<Button
										variant="secondary"
										className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										onClick={async () => {
											try {
												await AuthService.logout();
												window.location.href =
													"/evd-definition";
											} catch (error) {
												console.error(
													"Logout error:",
													error
												);
												window.location.href =
													"/evd-definition";
											}
										}}
									>
										<LogIn className="w-4 h-4 mr-2 rotate-180" />
										Logout
									</Button>
								</>
							) : (
								<>
									<Link href="/add-alert">
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<Home className="w-4 h-4 mr-2" />
											Report Alert
										</Button>
									</Link>
									<Link href="/login">
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<LogIn className="w-4 h-4 mr-2" />
											Login
										</Button>
									</Link>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="space-y-8">
					{/* Header */}
					<div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-2xl p-8 text-white relative overflow-hidden">
						<div className="absolute inset-0 bg-black/10"></div>
						<div className="relative">
							<div className="flex items-center space-x-4 mb-4">
								<div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
									<Stethoscope className="h-8 w-8 text-white" />
								</div>
								<div>
									<h1 className="text-3xl font-bold mb-2">
										Public Health
									</h1>
									<p className="text-red-100 text-lg">
										Case Definitions and Clinical
										Guidelines
									</p>
								</div>
							</div>
							<div className="flex items-center space-x-6 mt-6">
								<Badge
									variant="secondary"
									className="bg-white/20 text-white border-white/30"
								>
									WHO Guidelines
								</Badge>
								<Badge
									variant="secondary"
									className="bg-white/20 text-white border-white/30"
								>
									Updated 2024
								</Badge>
								<Badge
									variant="secondary"
									className="bg-white/20 text-white border-white/30"
								>
									Ministry of Health Uganda
								</Badge>
							</div>
						</div>
					</div>

					{/* Quick Reference Symptoms */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Microscope className="h-5 w-5 text-red-600" />
								Key Symptoms Quick Reference
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
								{symptoms.map((symptom) => (
									<div
										key={symptom.name}
										className={`p-4 rounded-lg border-2 text-center transition-all hover:shadow-md ${
											symptom.severity ===
											"critical"
												? "border-red-200 bg-red-50 hover:border-red-300"
												: symptom.severity ===
												  "high"
												? "border-orange-200 bg-orange-50 hover:border-orange-300"
												: "border-yellow-200 bg-yellow-50 hover:border-yellow-300"
										}`}
									>
										<symptom.icon
											className={`h-8 w-8 mx-auto mb-2 ${
												symptom.severity ===
												"critical"
													? "text-red-600"
													: symptom.severity ===
													  "high"
													? "text-orange-600"
													: "text-yellow-600"
											}`}
										/>
										<p className="text-sm font-medium text-gray-900">
											{symptom.name}
										</p>
										<Badge
											variant="secondary"
											className={`mt-1 text-xs ${
												symptom.severity ===
												"critical"
													? "bg-red-100 text-red-700"
													: symptom.severity ===
													  "high"
													? "bg-orange-100 text-orange-700"
													: "bg-yellow-100 text-yellow-700"
											}`}
										>
											{symptom.severity}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Case Definitions */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{caseDefinitions.map((definition, index) => (
							<Card
								key={definition.id}
								className="hover:shadow-lg transition-all duration-300"
							>
								<CardHeader>
									<div className="flex items-center space-x-4">
										<div
											className={`h-12 w-12 ${definition.color} rounded-xl flex items-center justify-center shadow-lg`}
										>
											<definition.icon className="h-6 w-6 text-white" />
										</div>
										<div>
											<CardTitle className="text-xl">
												{definition.title}
											</CardTitle>
											<p className="text-sm text-gray-600 mt-1">
												{
													definition.description
												}
											</p>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<ScrollArea className="h-96">
										<div className="space-y-4">
											{/* Primary Criteria */}
											<div className="bg-gray-50 p-4 rounded-lg">
												<h4 className="font-semibold text-gray-900 mb-2">
													Primary
													Criteria:
												</h4>
												<p className="text-sm text-gray-700">
													{
														definition
															.criteria
															.primary
													}
												</p>
											</div>

											{/* Additional Criteria */}
											{definition.criteria
												.and && (
												<div>
													<h4 className="font-semibold text-gray-900 mb-2">
														AND{" "}
														{
															definition
																.criteria
																.and
														}
													</h4>
													{definition
														.criteria
														.signs && (
														<div className="grid grid-cols-1 gap-2">
															{definition.criteria.signs.map(
																(
																	sign,
																	idx
																) => (
																	<div
																		key={
																			idx
																		}
																		className="flex items-center space-x-2"
																	>
																		<div className="h-2 w-2 bg-blue-500 rounded-full"></div>
																		<span className="text-sm text-gray-700">
																			{
																				sign
																			}
																		</span>
																	</div>
																)
															)}
														</div>
													)}
												</div>
											)}

											{/* OR Criteria */}
											{definition.criteria
												.or && (
												<div>
													<Separator className="my-4" />
													<h4 className="font-semibold text-gray-900 mb-3">
														OR any of
														the
														following:
													</h4>
													<div className="space-y-3">
														{definition.criteria.or.map(
															(
																item,
																idx
															) => (
																<div
																	key={
																		idx
																	}
																	className="bg-blue-50 p-3 rounded-lg"
																>
																	{typeof item ===
																	"string" ? (
																		<p className="text-sm text-gray-700">
																			{
																				item
																			}
																		</p>
																	) : (
																		<div>
																			<p className="text-sm font-medium text-gray-900 mb-2">
																				{
																					item.condition
																				}
																			</p>
																			<div className="grid grid-cols-1 gap-1 ml-4">
																				{item.signs.map(
																					(
																						sign,
																						signIdx
																					) => (
																						<div
																							key={
																								signIdx
																							}
																							className="flex items-center space-x-2"
																						>
																							<div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
																							<span className="text-xs text-gray-600">
																								{
																									sign
																								}
																							</span>
																						</div>
																					)
																				)}
																			</div>
																		</div>
																	)}
																</div>
															)
														)}
													</div>
												</div>
											)}

											{/* Laboratory Tests */}
											{definition.criteria
												.tests && (
												<div>
													<Separator className="my-4" />
													<h4 className="font-semibold text-gray-900 mb-3">
														Laboratory
														Tests:
													</h4>
													<div className="space-y-2">
														{definition.criteria.tests.map(
															(
																test,
																idx
															) => (
																<div
																	key={
																		idx
																	}
																	className="flex items-center space-x-2 bg-green-50 p-2 rounded"
																>
																	<Microscope className="h-4 w-4 text-green-600" />
																	<span className="text-sm text-gray-700">
																		{
																			test
																		}
																	</span>
																</div>
															)
														)}
													</div>
												</div>
											)}
										</div>
									</ScrollArea>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Important Notes */}
					<Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-red-800">
								<AlertTriangle className="h-5 w-5" />
								Important Clinical Notes
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<h4 className="font-semibold text-red-800 mb-3">
										Immediate Actions Required:
									</h4>
									<ul className="space-y-2 text-sm text-red-700">
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Isolate suspected
												cases immediately
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Use appropriate PPE
												for all interactions
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Report to health
												authorities within
												24 hours
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Collect samples for
												laboratory testing
											</span>
										</li>
									</ul>
								</div>
								<div>
									<h4 className="font-semibold text-red-800 mb-3">
										Contact Tracing:
									</h4>
									<ul className="space-y-2 text-sm text-red-700">
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Identify all close
												contacts in past 21
												days
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Monitor contacts for
												symptoms daily
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Document all contact
												information
											</span>
										</li>
										<li className="flex items-start space-x-2">
											<div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2"></div>
											<span>
												Provide health
												education to
												contacts
											</span>
										</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
