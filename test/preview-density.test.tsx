import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Preview } from "../src/features/resume-editor/components/preview";
import { gapsFor, SPACING_GAPS } from "../src/lib/layout/density";
import { loadShowcase } from "./helpers/showcase-resume";

/**
 * The density preset must move the HTML preview, not only the PDF.
 *
 * The maintainer's complaint was that "applying space recommendations" changed nothing.
 * Half the reason was that the PDF's entry and bullet gaps were compile-time constants
 * (`docs/research/space-efficiency.md` §3.4); the other half is that the preview carried
 * its own hard-coded `pt(6)`/`pt(3)`/`pt(4)` rhythm, so even the gaps that *were* wired to
 * a preset only moved the export.
 *
 * The preview is a second renderer of the same document, so this asserts the numbers it
 * emits — in CSS pixels, converted at the one place they enter the DOM (`pt = 96/72`) —
 * against the single gap table. `test/density-gaps.test.ts` pins that table to the Typst
 * source; between the two, "the preset changes the whole document" is a test, not a hope.
 */

const pt = (value: number) => (value * 96) / 72;
// React prints the full float, so compare with the same string it prints.
const px = (value: number) => `${pt(value)}px`;

const showcase = loadShowcase();

function withSettings(settings: Record<string, unknown>) {
	return {
		...showcase,
		metadata: {
			...showcase.metadata,
			settings: { ...(showcase.metadata?.settings ?? {}), ...settings },
		},
	} as never;
}

function render(settings: Record<string, unknown>): string {
	return renderToStaticMarkup(
		<div>
			<Preview paginate={false} resume={withSettings(settings)} />
		</div>,
	);
}

describe("a density preset reaches the HTML preview", () => {
	it("spends the table's section gap between sections", () => {
		for (const spacing of ["compact", "normal", "spacious"] as const) {
			const html = render({ sectionSpacing: spacing });
			const expected = px(gapsFor({ sectionSpacing: spacing }).section);
			expect(html, `${spacing} has no ${expected} section gap`).toContain(
				`margin-bottom:${expected}`,
			);
		}
	});

	it("uses a different gap at each density", () => {
		const gaps = new Set(
			(["compact", "normal", "spacious"] as const).map((spacing) =>
				px(gapsFor({ sectionSpacing: spacing }).section),
			),
		);
		expect(gaps.size).toBe(3);
	});

	it("draws skills as `Category: item, item` lines, not a chip cluster", () => {
		const html = render({});
		// The showcase's skill categories, as one flowing line each.
		expect(html).toContain("Languages");
		expect(html).toContain("Go, TypeScript, Python, SQL");
		expect(html).toContain("PostgreSQL, Kafka, Kubernetes, Terraform");
	});

	it("draws headings uppercase and keeps the rule opt-in", () => {
		// The shipped default is `accentStyle: none`, so a default document draws no rule
		// under a heading. The showcase stores `underline`, so it keeps one — which is the
		// point: the control still works, it is just no longer the default.
		const underlined = render({});
		expect(underlined).toContain("text-transform:uppercase");
		expect(underlined).toContain("border-bottom:2px solid");

		const plain = render({ accentStyle: "none" });
		expect(plain).toContain("text-transform:uppercase");
		expect(plain).toContain("border-bottom:none");
	});

	it("takes the header's whole gap from the profile", () => {
		const profile = SPACING_GAPS.normal;
		// The showcase stores `compact` sections, so name the density this asserts.
		const html = render({ sectionSpacing: "normal", accentStyle: "none" });
		// With no rule the header block's bottom padding *is* the header → body gap.
		expect(html).toContain(`padding-bottom:${px(profile.header)}`);
	});
});
