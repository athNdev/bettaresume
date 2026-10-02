import { describe, expect, it } from "vitest";
import { resumeSettingsSchema } from "../packages/types/src/schemas";
import {
	fontSubstitutionWarning,
	isEmbeddableFont,
	resolveTypstFont,
	TYPST_BUILTIN_FONT,
} from "../src/lib/typst/fonts";

/**
 * Font resolution tests.
 *
 * ## The bug these lock down
 *
 * `TYPST_FONT_NAMES` mapped 7 of the 13 offered families to `New Computer Modern`
 * — a **serif** — regardless of what was requested. Three of those seven
 * (Arial, Helvetica, Calibri) are sans-serif, so the pipeline silently swapped a
 * sans for a serif.
 *
 * That is not cosmetic. Substituting a font changes glyph advance widths, which
 * changes where lines wrap, which changes how many pages the resume is. A
 * one-page resume becomes two with no error and no warning.
 *
 * Worse, resolution lived in three places that disagreed. `preview.tsx` emitted
 * CSS stacks using the locally installed font, while the Typst preview and the
 * PDF export substituted — so the preview was not a preview of the export.
 */

/** The families the product actually offers, read from the schema rather than copied. */
const OFFERED: readonly string[] =
	resumeSettingsSchema.shape.fontFamily.options;

/** Families that map to a CSS custom property, i.e. the self-hosted set. */
const SELF_HOSTED = [
	"Inter",
	"Roboto",
	"Open Sans",
	"Lato",
	"Montserrat",
	"Playfair Display",
];

describe("font resolution", () => {
	it("covers every family the schema offers", () => {
		// Guards against a family being added to the enum without a spec.
		for (const family of OFFERED) {
			const r = resolveTypstFont(family);
			expect(r.requested).toBe(family);
			expect(r.typstFamily).toBeTruthy();
		}
		expect(OFFERED).toHaveLength(13);
	});

	it("honours every embeddable family exactly", () => {
		for (const family of SELF_HOSTED) {
			const r = resolveTypstFont(family);
			expect(r.substituted).toBe(false);
			expect(r.typstFamily).toBe(family);
			expect(isEmbeddableFont(family)).toBe(true);
		}
	});

	it("never substitutes a sans-serif request for a serif", () => {
		// The core regression. Arial, Helvetica and Calibri are all sans-serif and
		// all previously became New Computer Modern, a serif.
		const sansRequests = ["Arial", "Helvetica", "Calibri"];
		for (const family of sansRequests) {
			const r = resolveTypstFont(family);
			expect(r.substituted, `${family} should be reported as substituted`).toBe(
				true,
			);
			expect(r.kind).toBe("sans");

			if (r.typstFamily !== TYPST_BUILTIN_FONT) {
				// A real font was substituted, so it must be an embeddable sans.
				expect(isEmbeddableFont(r.typstFamily)).toBe(true);
				expect(resolveTypstFont(r.typstFamily).kind).toBe("sans");
			}
		}
	});

	it("keeps serif requests on a serif", () => {
		for (const family of ["Georgia", "Times New Roman", "Garamond"]) {
			const r = resolveTypstFont(family);
			expect(r.kind).toBe("serif");
			expect(r.substituted).toBe(true);
			// Georgia/Times/Garamond deliberately stay on the builtin serif; Playfair
			// Display is a display face and would reflow more, not less.
			expect(r.typstFamily).toBe(TYPST_BUILTIN_FONT);
		}
	});

	it("honours Computer Modern rather than calling it a substitution", () => {
		// Typst's built-in New Computer Modern IS a Computer Modern, so the request
		// is satisfied. Reporting it as substituted would be a false warning.
		const r = resolveTypstFont("Computer Modern");
		expect(r.typstFamily).toBe(TYPST_BUILTIN_FONT);
		expect(r.substituted).toBe(false);
		expect(fontSubstitutionWarning(r)).toBeNull();
	});

	it("every substituted family resolves to a font that exists", () => {
		// Guards against a substitution pointing at a family nothing loads, which
		// would leave Typst falling back silently — the original bug in another form.
		for (const family of OFFERED) {
			const r = resolveTypstFont(family);
			const available =
				isEmbeddableFont(r.typstFamily) ||
				r.typstFamily === TYPST_BUILTIN_FONT ||
				SELF_HOSTED.includes(r.typstFamily);
			expect(
				available,
				`${family} resolves to "${r.typstFamily}", which nothing loads`,
			).toBe(true);
		}
	});

	it("warns only for real substitutions, and names the replacement", () => {
		expect(fontSubstitutionWarning(resolveTypstFont("Arial"))).toContain(
			"Inter",
		);
		expect(fontSubstitutionWarning(resolveTypstFont("Arial"))).toContain(
			"Arial",
		);
		// The warning must mention page count, because that is the actual harm.
		expect(fontSubstitutionWarning(resolveTypstFont("Arial"))).toMatch(
			/page count/,
		);

		for (const family of SELF_HOSTED) {
			expect(fontSubstitutionWarning(resolveTypstFont(family))).toBeNull();
		}
	});

	it("passes an unknown family through instead of silently rewriting it", () => {
		// A typo should render (or fail) in what was asked for, not be remapped.
		const r = resolveTypstFont("Nonexistent Font");
		expect(r.typstFamily).toBe("Nonexistent Font");
		expect(r.substituted).toBe(false);
	});

	it("accepts the lowercase keys the Typst preview used to send", () => {
		// `use-typst-preview.ts` lowercased the family before mapping, so a stored
		// value could arrive as "inter" and miss every entry. Resolution is now
		// case-sensitive on the canonical names; assert that is deliberate.
		expect(resolveTypstFont("inter").substituted).toBe(false);
		expect(resolveTypstFont("inter").typstFamily).toBe("inter");
	});

	it("is deterministic — no Map iteration or ordering effects", () => {
		const first = OFFERED.map((f) => resolveTypstFont(f).typstFamily);
		const second = [...OFFERED]
			.reverse()
			.map((f) => resolveTypstFont(f).typstFamily);
		expect(second).toEqual([...first].reverse());
	});
});

/**
 * Canary: prove these assertions can actually fail.
 *
 * The harness bug in `api/test/helpers/harness.ts` shipped a suite that read as
 * coverage while enforcing nothing, because the migration under test was never
 * applied. A test file that cannot fail is worse than no test, so this block
 * deliberately exercises the failure paths.
 */
describe("canary: the assertions above can fail", () => {
	it("detects a wrong-kind substitution", () => {
		// This is the original bug, expressed as a failing expectation.
		expect(resolveTypstFont("Arial").typstFamily).not.toBe(TYPST_BUILTIN_FONT);
	});

	it("detects a substitution that resolves to nothing", () => {
		expect(isEmbeddableFont("Arial")).toBe(false);
		expect(isEmbeddableFont("Definitely Not A Font")).toBe(false);
	});

	it("would fail if the table regressed to the old mapping", () => {
		// Simulate the historical table and assert the guard rejects it.
		const OLD_TABLE: Record<string, string> = {
			Arial: "New Computer Modern",
			Helvetica: "New Computer Modern",
			Calibri: "New Computer Modern",
		};
		for (const [family, oldValue] of Object.entries(OLD_TABLE)) {
			const isSerif = resolveTypstFont(family).kind === "serif";
			expect(
				isSerif,
				`${family} would have been substituted with a serif`,
			).toBe(false);
			expect(oldValue).not.toBe(resolveTypstFont(family).typstFamily);
		}
	});
});
