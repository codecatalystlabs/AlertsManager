"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Upload,
	FileText,
	CheckCircle,
	AlertCircle,
	Download,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REQUIRED_FIELDS = [
	"Date",
	"Call Time",
	"Name of Person Reporting",
	"Number of Person Reporting",
	"District",
	"Source of Alert",
	"Case Name",
	"Case Age",
	"Case Sex",
];

const INSTRUCTIONS = [
	"Download the CSV template to ensure proper formatting",
	"Fill in all required fields",
	"Use the exact column headers as shown in the template",
	"Save your file as CSV format",
	"Maximum file size: 10 MB",
];

const RECENT_UPLOADS = [
	{ name: "alerts_batch_001.csv", when: "2 hours ago", records: 150 },
	{ name: "alerts_batch_002.csv", when: "1 day ago", records: 89 },
];

export default function UploadPage() {
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">(
		"idle"
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const acceptFile = (selected?: File | null) => {
		if (!selected) return;
		if (
			selected.type === "text/csv" ||
			selected.name.toLowerCase().endsWith(".csv")
		) {
			setFile(selected);
			setUploadStatus("idle");
		} else {
			alert("Please select a valid CSV file.");
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		acceptFile(event.target.files?.[0] ?? null);
	};

	const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(false);
		acceptFile(e.dataTransfer.files?.[0] ?? null);
	};

	const handleUpload = async () => {
		if (!file) return;
		setUploading(true);
		setTimeout(() => {
			setUploading(false);
			setUploadStatus("success");
		}, 2000);
	};

	const downloadTemplate = () => {
		const csvContent = `Date,Call Time,Alert Reported Before,Name of Person Reporting,Number of Person Reporting,Status,Response,District,Subcounty,Village,Parish,Source of Alert,Case Alert Description,Case Name,Case Age,Case Sex,Name of Next of Kin,Next of Kin Phone Number,Narrative,Signs and Symptoms
2025-01-15,09:30,No,John Doe,0701234567,Pending,Immediate,Kampala,Central,Nakawa,St. Peters,VHT,Fever case,Jane Smith,25,Female,Mary Smith,0709876543,Patient reported high fever,Fever;Headache;General Weakness`;
		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "alert_template.csv";
		a.click();
		window.URL.revokeObjectURL(url);
	};

	const removeFile = () => {
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="space-y-12">
			{/* Header */}
			<header className="animate-reveal">
				<div className="flex items-center gap-3 mb-5">
					<span className="h-1 w-8 bg-accent-red rounded-full" />
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Intelligence · Bulk import
					</span>
				</div>
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
					<div className="max-w-2xl">
						<h1 className="serif text-4xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
							Upload alerts via{" "}
							<em className="italic text-accent-red">CSV</em>
						</h1>
						<p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
							Bulk-import alerts collected offline. Use the template
							to match the exact columns the system expects.
						</p>
					</div>
					<Button
						onClick={downloadTemplate}
						variant="ghost"
						className="px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto border border-foreground/10 shrink-0"
					>
						<Download className="h-3.5 w-3.5" strokeWidth={1.75} />
						<span className="mono uppercase tracking-widest font-bold">
							Download template
						</span>
					</Button>
				</div>
			</header>

			{/* Instructions */}
			<section className="animate-reveal [animation-delay:100ms] grid grid-cols-1 lg:grid-cols-2 gap-px bg-foreground/[0.08] border border-foreground/[0.08] rounded-sm overflow-hidden">
				<article className="bg-card p-6 relative">
					<span className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-foreground/30" />
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
						A · Checklist
					</p>
					<h3 className="serif text-xl font-medium tracking-tight text-foreground mb-4">
						Before you upload
					</h3>
					<ul className="space-y-2.5">
						{INSTRUCTIONS.map((line, i) => (
							<li
								key={line}
								className="flex gap-3 text-sm text-foreground/80 leading-relaxed"
							>
								<span className="mono text-[10px] text-muted-foreground tabular-nums mt-1 shrink-0">
									{String(i + 1).padStart(2, "0")}
								</span>
								<span>{line}</span>
							</li>
						))}
					</ul>
				</article>
				<article className="bg-card p-6 relative">
					<span className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-accent-yellow" />
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
						B · Required columns
					</p>
					<h3 className="serif text-xl font-medium tracking-tight text-foreground mb-4">
						Must be present
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{REQUIRED_FIELDS.map((field) => (
							<span
								key={field}
								className="mono text-[11px] px-2 py-1 bg-accent-yellow/15 text-foreground rounded-sm font-medium"
							>
								{field}
							</span>
						))}
					</div>
				</article>
			</section>

			{/* File dropper */}
			<section className="animate-reveal [animation-delay:200ms] editorial-card">
				<header className="px-6 py-5 border-b border-foreground/[0.08]">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
						§ · Select file
					</p>
					<h2 className="serif text-xl font-medium tracking-tight text-foreground">
						Drop your CSV here
					</h2>
				</header>
				<div className="p-6 space-y-5">
					<label
						htmlFor="file-upload"
						onDragOver={(e) => {
							e.preventDefault();
							setIsDragging(true);
						}}
						onDragLeave={() => setIsDragging(false)}
						onDrop={handleDrop}
						className={cn(
							"block border border-dashed rounded-sm py-12 px-8 text-center cursor-pointer transition-colors",
							isDragging
								? "border-accent-red bg-accent-red/[0.04]"
								: "border-foreground/15 hover:border-foreground/35 hover:bg-foreground/[0.02]"
						)}
					>
						<div className="flex justify-center mb-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-sm bg-foreground/5">
								<Upload
									className="h-5 w-5 text-foreground"
									strokeWidth={1.5}
								/>
							</div>
						</div>
						<p className="text-base font-medium text-foreground mb-1">
							Click to upload or drag and drop
						</p>
						<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
							CSV files only · max 10 MB
						</p>
						<Input
							id="file-upload"
							ref={fileInputRef}
							type="file"
							accept=".csv,text/csv"
							onChange={handleFileSelect}
							className="hidden"
						/>
					</label>

					{file && (
						<div className="flex items-center justify-between gap-4 px-4 py-3 border border-foreground/[0.08] rounded-sm bg-card">
							<div className="flex items-center gap-3 min-w-0">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground/5 shrink-0">
									<FileText
										className="h-4 w-4 text-foreground"
										strokeWidth={1.75}
									/>
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{file.name}
									</p>
									<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
										{(file.size / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
							</div>
							<Button
								onClick={removeFile}
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 text-muted-foreground hover:text-accent-red hover:bg-accent-red/5 rounded-sm shrink-0"
								aria-label="Remove file"
							>
								<X className="h-4 w-4" strokeWidth={1.75} />
							</Button>
						</div>
					)}

					{uploadStatus === "success" && (
						<div className="editorial-card border-l-2 border-l-accent-green px-4 py-3 flex items-start gap-3">
							<CheckCircle
								className="h-4 w-4 text-accent-green mt-0.5 shrink-0"
								strokeWidth={1.75}
							/>
							<div>
								<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-green mb-1">
									Uploaded
								</p>
								<p className="text-sm text-foreground/80">
									File received. Processing alerts in the
									background.
								</p>
							</div>
						</div>
					)}

					{uploadStatus === "error" && (
						<div className="editorial-card border-l-2 border-l-accent-red px-4 py-3 flex items-start gap-3">
							<AlertCircle
								className="h-4 w-4 text-accent-red mt-0.5 shrink-0"
								strokeWidth={1.75}
							/>
							<div>
								<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-1">
									Upload failed
								</p>
								<p className="text-sm text-foreground/80">
									Please check your file format and try again.
								</p>
							</div>
						</div>
					)}

					<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
						<Button
							variant="ghost"
							onClick={() => window.history.back()}
							className="text-xs mono uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm h-10 px-5"
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!file || uploading}
							className="px-5 h-10 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 disabled:opacity-40"
						>
							<Upload
								className={cn(
									"h-3.5 w-3.5",
									uploading && "animate-pulse-soft"
								)}
								strokeWidth={1.75}
							/>
							<span className="mono uppercase tracking-widest font-bold">
								{uploading ? "Uploading" : "Upload CSV"}
							</span>
						</Button>
					</div>
				</div>
			</section>

			{/* Recent uploads */}
			<section className="animate-reveal [animation-delay:300ms] editorial-card">
				<header className="px-6 py-5 border-b border-foreground/[0.08]">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
						§ · History
					</p>
					<h2 className="serif text-xl font-medium tracking-tight text-foreground">
						Recent uploads
					</h2>
				</header>
				<ul>
					{RECENT_UPLOADS.map((u, i) => (
						<li
							key={u.name}
							className={cn(
								"flex items-center justify-between gap-4 px-6 py-4",
								i !== RECENT_UPLOADS.length - 1 &&
									"border-b border-foreground/[0.05]"
							)}
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground/5 shrink-0">
									<FileText
										className="h-4 w-4 text-foreground"
										strokeWidth={1.75}
									/>
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{u.name}
									</p>
									<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
										{u.when} ·{" "}
										{u.records.toLocaleString()} records
									</p>
								</div>
							</div>
							<span className="inline-flex items-center gap-2 mono text-[10px] uppercase tracking-widest font-bold text-accent-green">
								<span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
								Processed
							</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
