"use client";

import { htmlToText } from "html-to-text";
import { Download, FileJson, FileText, FileType, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Resume } from "@/features/resume-editor/types";
import { getTemplateSource } from "@/features/resume-editor/typst_templates";
import { DOCX_MIME, resumeToDocx } from "@/lib/export/docx";
import { compileToPdf } from "@/lib/typst/compiler";
import { resumeToTypstJson } from "@/lib/typst/serialize";

interface ExportButtonsProps {
	resume: Resume;
	variant?: "default" | "dropdown";
	/**
	 * Whether `resume` is an unsaved draft rather than the persisted document.
	 *
	 * The editor renders the draft in its preview, so this exporter is handed the draft
	 * too — which makes the exported file match what is on screen, including edits that
	 * have not been written to the server. That is the right trade: a file that matches
	 * the preview but is one save behind beats a file that silently omits the edit the
	 * user is looking at. This flag exists so the menu can say so out loud rather than
	 * leaving the user to assume the server has a copy.
	 */
	hasUnsavedChanges?: boolean;
}

/**
 * Wrap export content in a typed Blob.
 *
 * The `Uint8Array` branch matters more than it looks. `$typst.pdf()` returns a **view**
 * into the WASM heap (`get_artifact` → `new Uint8Array(memory.buffer).subarray(...)`),
 * so `bytes.buffer` is the whole heap — tens of megabytes — while `bytes.byteLength` is
 * the PDF. Wrapping `.buffer` therefore saved a file with the PDF buried at some
 * arbitrary offset inside it, which no reader can open. Passing the view itself copies
 * only its bytes, per the BufferSource rules.
 *
 * `content.slice()` additionally stops the Blob from pinning the entire WASM heap alive
 * for as long as the object URL exists, and `as ArrayBuffer` states the copy we mean:
 * a fresh, exactly-sized buffer rather than a view onto the heap.
 */
export function toDownloadBlob(
	content: string | Blob | Uint8Array,
	type: string,
): Blob {
	if (content instanceof Blob) return content;
	if (content instanceof Uint8Array) {
		return new Blob([content.slice().buffer as ArrayBuffer], { type });
	}
	return new Blob([content], { type });
}

export function ExportButtons({
	resume,
	variant = "default",
	hasUnsavedChanges = false,
}: ExportButtonsProps) {
	const [isExporting, setIsExporting] = useState(false);

	const downloadFile = (
		content: string | Blob | Uint8Array,
		filename: string,
		type: string,
	) => {
		const blob = toDownloadBlob(content, type);
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
			// Handed over as the view, NOT pre-wrapped: wrapping the view's backing
			// ArrayBuffer would have shipped the whole WASM heap with the PDF inside it.
			const filename = `${resume.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
			downloadFile(pdfBytes, filename, "application/pdf");
		} catch (error) {
			// Previously only console.error, so a failed export looked identical to a
			// slow one: the button re-enabled and nothing happened, with no indication
			// that the PDF was never produced. Surface it, and keep the detail in the
			// console for debugging.
			console.error("PDF export error:", error);
			toast.error(
				error instanceof Error && error.message
					? `PDF export failed: ${error.message}`
					: "PDF export failed. See the browser console for details.",
				{ duration: 8000 },
			);
		} finally {
			setIsExporting(false);
		}
	};

	const exportDocx = () => {
		// DOCX is XML with a guaranteed reading order, so it parses more reliably
		// than a PDF whose extraction depends on the producer's text-drawing order.
		// Labelled "parse-optimised" rather than interchangeable with PDF: Word and
		// Typst paginate independently, so page breaks will not match.
		try {
			const bytes = resumeToDocx(resume);
			const filename = `${resume.name.replace(/\s+/g, "_")}_${
				new Date().toISOString().split("T")[0]
			}.docx`;
			downloadFile(bytes, filename, DOCX_MIME);
		} catch (error) {
			console.error("DOCX export error:", error);
			toast.error(
				error instanceof Error && error.message
					? `DOCX export failed: ${error.message}`
					: "DOCX export failed. See the browser console for details.",
				{ duration: 8000 },
			);
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
		if (!metadata) {
			// Previously a bare `return`: clicking "Plain text" did nothing at all,
			// with no way to tell that from a working export.
			console.error("[export] exportText called with no resume metadata");
			toast.error(
				"This resume has no contact details yet, so there is nothing to export as text.",
				{ duration: 6000 },
			);
			return;
		}
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
					{/*
					 * A live region inside the menu: opening the menu with unsaved work
					 * tells you the file will contain edits the server has not seen.
					 */}
					{hasUnsavedChanges ? (
						<p className="max-w-56 px-2 py-1.5 text-muted-foreground text-xs">
							Exports include your unsaved changes. Reload or switch away and
							they will be lost.
						</p>
					) : null}
					<DropdownMenuItem onClick={exportPDF}>
						<FileText className="mr-2 h-4 w-4" />
						Export as PDF
					</DropdownMenuItem>
					<DropdownMenuItem onClick={exportDocx}>
						<FileType className="mr-2 h-4 w-4" />
						Export as DOCX (parse-optimised)
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
