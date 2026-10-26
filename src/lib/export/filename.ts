import type { Resume } from "@/features/resume-editor/types";

/**
 * Export file naming.
 *
 * The research is blunt about this: `Resume_Final_v3.pdf` disappears in a downloads
 * folder, while `Sarah-Chen-Product-Manager.pdf` is instantly identifiable to whoever
 * opens it — which is usually a recruiter with forty other files in the same folder.
 *
 * So: `Name-Role.ext`, falling back to `Name-Date.ext` when there is no professional
 * title to use. Never a version number, never "final", never "copy".
 */

/** Collapse anything that is not a letter, digit or hyphen into a single hyphen. */
function slug(value: string): string {
	return value
		.trim()
		.replace(/['".,()]/g, "")
		.replace(/[^A-Za-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function exportFileName(
	resume: Resume,
	extension: string,
	/**
	 * An optional distinguisher between two exports of the same document.
	 *
	 * The design CV shares a resume and a format with the standard PDF but is a
	 * different document, so a filename that does not say which one it is would download
	 * over the other. `-design` is the whole contract; nothing else passes one.
	 */
	qualifier?: string,
): string {
	const name = slug(resume.name || "resume") || "resume";
	const title = slug(resume.metadata?.personalInfo?.professionalTitle ?? "");
	const today = new Date().toISOString().split("T")[0];

	const stem = title ? `${name}-${title}` : `${name}-${today}`;
	const suffix = qualifier ? `-${slug(qualifier)}` : "";
	return `${stem}${suffix}.${extension}`;
}

/**
 * The design CV shares `Name-Role` with the standard export, so it must not be able to
 * overwrite it in a downloads folder. One qualifier, one word, stated here.
 */
export function designExportFileName(
	resume: Resume,
	extension: string,
): string {
	return exportFileName(resume, extension, "design");
}
