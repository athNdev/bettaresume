"use client";

import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Resume } from "@/features/resume-editor/types";
import { getTemplateSource } from "@/features/resume-editor/typst_templates";
import { compileToPdf } from "@/lib/typst/compiler";
import { resumeToTypstJson } from "@/lib/typst/serialize";
import { htmlToText } from "html-to-text";

interface ExportButtonsProps {
	resume: Resume;
	variant?: "default" | "dropdown";
}

export function ExportButtons({
	resume,
	variant = "default",
}: ExportButtonsProps) {
	const [isExporting, setIsExporting] = useState(false);

	const downloadFile = (
		content: string | Blob,
		filename: string,
		type: string,
	) => {
		const blob =
			content instanceof Blob ? content : new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const exportPDF = async () => {
		setIsExporting(true);
		try {
			const templateSource = getTemplateSource(resume.template ?? "minimal");
			const dataJson = resumeToTypstJson(resume);
			const fontFamily = resume.metadata?.settings?.fontFamily ?? "Inter";
			const pdfBytes = await compileToPdf(templateSource, dataJson, fontFamily);
			const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
				type: "application/pdf",
			});
			const filename = `${resume.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
			downloadFile(blob, filename, "application/pdf");
		} catch (error) {
			console.error("PDF export error:", error);
		} finally {
			setIsExporting(false);
		}
	};

	const exportJSON = () => {
		const json = JSON.stringify(resume, null, 2);
		const filename = `${resume.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
		downloadFile(json, filename, "application/json");
	};

	const exportText = () => {
		// Generate plain text version of resume
		const { metadata, sections } = resume;
		if (!metadata) return;
		const { personalInfo } = metadata;

		let text = `${personalInfo.fullName}\n`;
		if (personalInfo.professionalTitle)
			text += `${personalInfo.professionalTitle}\n`;
		text += `\n`;

		if (personalInfo.email) text += `Email: ${personalInfo.email}\n`;
		if (personalInfo.phone) text += `Phone: ${personalInfo.phone}\n`;
		if (personalInfo.location) text += `Location: ${personalInfo.location}\n`;
		if (personalInfo.linkedin) text += `LinkedIn: ${personalInfo.linkedin}\n`;
		if (personalInfo.github) text += `GitHub: ${personalInfo.github}\n`;
		text += `\n`;

		sections
			.filter((s) => s.visible)
			.sort((a, b) => a.order - b.order)
			.forEach((section) => {
				const title =
					section.content.title ||
					section.type.replace(/-/g, " ").toUpperCase();
				text += `${"=".repeat(50)}\n${title}\n${"=".repeat(50)}\n\n`;

				if (section.type === "summary") {
					const html = section.content.html || "";
					const plainSummary = htmlToText(html, { wordwrap: false });
					text += `${plainSummary}\n\n`;
				} else if (Array.isArray(section.content.data)) {
					(section.content.data as Array<Record<string, unknown>>).forEach(
						(item) => {
							Object.entries(item).forEach(([key, value]) => {
								if (key !== "id" && value) {
									text += `${key}: ${value}\n`;
								}
							});
							text += "\n";
						},
					);
				}
			});

		const filename = `${resume.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
		downloadFile(text, filename, "text/plain");
	};

	if (variant === "dropdown") {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button disabled={isExporting}>
						{isExporting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Download className="mr-2 h-4 w-4" />
						)}
						Export
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={exportPDF}>
						<FileText className="mr-2 h-4 w-4" />
						Export as PDF
					</DropdownMenuItem>
					<DropdownMenuItem onClick={exportJSON}>
						<FileJson className="mr-2 h-4 w-4" />
						Export as JSON
					</DropdownMenuItem>
					<DropdownMenuItem onClick={exportText}>
						<FileText className="mr-2 h-4 w-4" />
						Export as Text
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<div className="flex gap-2">
			<Button disabled={isExporting} onClick={exportPDF}>
				{isExporting ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<FileText className="mr-2 h-4 w-4" />
				)}
				PDF
			</Button>
			<Button onClick={exportJSON} variant="outline">
				<FileJson className="mr-2 h-4 w-4" />
				JSON
			</Button>
		</div>
	);
}
