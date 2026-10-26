import { describe, expect, it } from "vitest";

import type { Resume } from "../src/features/resume-editor/types";
import {
	designExportFileName,
	exportFileName,
} from "../src/lib/export/filename";

/**
 * Export file naming.
 *
 * The research is blunt: `Resume_Final_v3.pdf` disappears in a recruiter's
 * downloads folder, while `Sarah-Chen-Product-Manager.pdf` is identifiable the
 * moment it lands. Naming is the cheapest legibility win in the product and it
 * was `${name}_${date}.pdf` — recognisable to nobody but the person who saved
 * it, and only if they remember the date.
 */

function resume(name: string, professionalTitle?: string): Resume {
	return {
		name,
		metadata: {
			personalInfo: { professionalTitle: professionalTitle ?? "" },
		},
	} as Resume;
}

describe("export filenames", () => {
	it("names the file for the person and the role", () => {
		expect(exportFileName(resume("Sarah Chen", "Product Manager"), "pdf")).toBe(
			"Sarah-Chen-Product-Manager.pdf",
		);
	});

	it("falls back to a date when there is no role to use", () => {
		const today = new Date().toISOString().split("T")[0];
		expect(exportFileName(resume("Sarah Chen"), "pdf")).toBe(
			`Sarah-Chen-${today}.pdf`,
		);
	});

	it("never carries a version number or the word final", () => {
		// "final", "v3", "copy" are the marks of a file someone is going to send by
		// mistake. The product versions documents for a living; the filename does not
		// have to.
		const name = exportFileName(resume("Sarah Chen", "Product Manager"), "pdf");
		expect(name).not.toMatch(/final|copy|v\d|draft/i);
	});

	it("strips punctuation and collapses whitespace into hyphens", () => {
		expect(
			exportFileName(resume("Sarah  O'Brien, PhD", "Data & AI"), "docx"),
		).toBe("Sarah-OBrien-PhD-Data-AI.docx");
	});

	it("keeps the extension the caller asked for", () => {
		for (const ext of ["pdf", "docx", "txt", "json"]) {
			expect(exportFileName(resume("A B", "C"), ext).endsWith(`.${ext}`)).toBe(
				true,
			);
		}
	});

	it("marks the design CV so it cannot overwrite the standard PDF", () => {
		// Both are PDFs of the same person and role in the same downloads folder. The
		// suffix is the only thing that stops "design" from being mistaken for the
		// parser-safe file, or the other way round.
		expect(
			designExportFileName(resume("Sarah Chen", "Product Manager"), "pdf"),
		).toBe("Sarah-Chen-Product-Manager-design.pdf");
		expect(
			designExportFileName(resume("Sarah Chen", "Product Manager"), "txt"),
		).toBe("Sarah-Chen-Product-Manager-design.txt");
	});

	it("still produces a usable name when the resume is unnamed", () => {
		const name = exportFileName(resume("", "Engineer"), "pdf");
		expect(name).toBe("resume-Engineer.pdf");
	});
});
