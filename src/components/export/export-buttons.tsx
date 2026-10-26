"use client";

import {
	AlignLeft,
	Download,
	FileJson,
	FileText,
	FileType,
	type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Resume } from "@/features/resume-editor/types";
import { getTemplateSource } from "@/features/resume-editor/typst_templates";
import { DOCX_MIME, resumeToDocx } from "@/lib/export/docx";
import { exportFileName } from "@/lib/export/filename";
import { buildPlainText } from "@/lib/export/text";
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

/**
 * The inside of one format row: a 32px icon tile, the format's name, and one line
 * saying what it is *for*.
 *
 * The menu used to be four identical rows with four generic file glyphs and the words
 * "Export as …" four times. It answered "what file types exist?" but not "which one do
 * I want?" — and the payoff moment of a resume tool should not make the user guess.
 * PDF is the only tile that carries accent, because it is the only one most people
 * want.
 */
function FormatBody({
	icon: Icon,
	label,
	description,
	primary = false,
}: {
	icon: LucideIcon;
	label: string;
	description: string;
	primary?: boolean;
}) {
	return (
		<span className="flex items-center gap-3">
			<span
				aria-hidden="true"
				className={
					primary
						? "br-tile size-8 shrink-0"
						: "grid size-8 shrink-0 place-items-center rounded-sm bg-sunken text-fg-muted"
				}
			>
				<Icon className="h-4 w-4" />
			</span>
			<span className="min-w-0">
				<span className="block font-medium text-sm">{label}</span>
				<span className="block text-fg-muted text-xs">{description}</span>
			</span>
		</span>
	);
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
			const templateSource = getTemplateSource(resume.template ?? "standard");
			const dataJson = resumeToTypstJson(resume);
			const fontFamily = resume.metadata?.settings?.fontFamily ?? "Inter";
			const pdfBytes = await compileToPdf(templateSource, dataJson, fontFamily);
			// Handed over as the view, NOT pre-wrapped: wrapping the view's backing
			// ArrayBuffer would have shipped the whole WASM heap with the PDF inside it.
			const filename = exportFileName(resume, "pdf");
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
			const filename = exportFileName(resume, "docx");
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
		const filename = exportFileName(resume, "json");
		downloadFile(json, filename, "application/json");
	};

	const exportText = () => {
		// The text layer is built by `src/lib/export/text.ts`, which the review panel's
		// Plain Text Test and the rubric also read. Keeping one builder is the point:
		// the page tells users "copy this and read it", so the export and the test
		// cannot be allowed to produce different strings.
		if (!resume.metadata) {
			// Previously a bare `return`: clicking "Plain text" did nothing at all,
			// with no way to tell that from a working export.
			console.error("[export] exportText called with no resume metadata");
			toast.error(
				"This resume has no contact details yet, so there is nothing to export as text.",
				{ duration: 6000 },
			);
			return;
		}

		const text = buildPlainText(resume);
		const filename = exportFileName(resume, "txt");
		downloadFile(text, filename, "text/plain");
	};

	if (variant === "dropdown") {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					{/*
					 * The in-progress state is designed, not just disabled: the primitive's
					 * `loading` slot (spinner + `aria-busy` + cursor-progress) and a label
					 * that says what is happening, so a slow compile cannot read as a dead
					 * button.
					 */}
					<Button aria-label="Export" loading={isExporting}>
						{isExporting ? (
							"Exporting…"
						) : (
							<>
								<Download className="mr-2 h-4 w-4" />
								{/*
								 * The label collapses below `sm`; the accessible name does not.
								 * Export is the terminal action, so it keeps a 44px icon target
								 * rather than being dropped from the phone header — the row used
								 * to overflow at 390px because nothing in it could shrink.
								 */}
								<span className="hidden sm:inline" data-collapse-label="">
									Export
								</span>
							</>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72 p-2">
					{/*
					 * A live region inside the menu: opening the menu with unsaved work
					 * tells you the file will contain edits the server has not seen.
					 */}
					{hasUnsavedChanges ? (
						<p className="mb-1 rounded-sm bg-warning-soft px-2 py-1 text-warning text-xs">
							Exports include your unsaved changes. Reload or switch away and
							they will be lost.
						</p>
					) : null}
					<p className="br-micro px-2 pt-1 pb-2">Export</p>
					<DropdownMenuItem onClick={exportPDF}>
						<FormatBody
							description="Typeset, for sending"
							icon={FileText}
							label="PDF"
							primary
						/>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={exportDocx}>
						<FormatBody
							description="Same content, parse-optimised for applicant systems"
							icon={FileType}
							label="DOCX"
						/>
					</DropdownMenuItem>
					<DropdownMenuSeparator className="my-1" />
					<p className="br-micro px-2 pt-1 pb-2">Backup</p>
					<DropdownMenuItem onClick={exportJSON}>
						<FormatBody
							description="Every field, re-importable"
							icon={FileJson}
							label="JSON"
						/>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={exportText}>
						<FormatBody
							description="Exactly what a parser reads"
							icon={AlignLeft}
							label="Plain text"
						/>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<div className="flex gap-2">
			<Button loading={isExporting} onClick={exportPDF}>
				<FileText className="mr-2 h-4 w-4" />
				PDF
			</Button>
			{/*
			 * One primary per region: PDF is the export this product is for, so
			 * JSON is a quiet secondary rather than a second slab of the same size.
			 */}
			<Button onClick={exportJSON} variant="ghost">
				<FileJson className="mr-2 h-4 w-4" />
				JSON
			</Button>
		</div>
	);
}
