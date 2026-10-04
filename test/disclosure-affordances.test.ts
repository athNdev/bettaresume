/**
 * Disclosure affordances.
 *
 * A chevron that points down while its panel is shut is not a cosmetic flaw. It is the one
 * part of a collapsed control that still looks interactive, so it promises "this opens" while
 * the row underneath stays put — and because the row is hidden, there is nothing else on
 * screen to contradict it.
 *
 * These assert the invariant that would have caught the defect, rather than the single
 * instance of it.
 */
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

const source = codeOf("src/features/resume-editor/resume-editor.tsx");

/** Every `const [flag, setFlag] = useState(...)` declaration in the file. */
function declarations(code: string): { flag: string; setter: string }[] {
	return [...code.matchAll(/const \[(\w+), (set\w+)\] = useState\(/g)].map(
		(match) => ({ flag: match[1] as string, setter: match[2] as string }),
	);
}

/**
 * Comments stripped, because a code comment can satisfy a check about an identifier.
 * See `helpers/code-source.ts` — this is the second time this has mattered.
 */
const codeOnly = source
	.replace(/\/\*[\s\S]*?\*\//g, "")
	.replace(/^([\t ]*)\/\/[^\n]*/gm, "$1");

/** Whether a setter is ever referenced beyond its own declaration. */
function isWritten(setter: string): boolean {
	return codeOnly.includes(setter);
}

/** Flags whose chevron rotation is written as `${flag ? "" : "-rotate-90"}`. */
function chevronFlags(): string[] {
	return [...source.matchAll(/\$\{(\w+) \? "" : "-rotate-90"\}/g)].map(
		(match) => match[1] as string,
	);
}

describe("the editor rail's disclosures", () => {
	it("finds every chevron in the rail, so the checks below cannot pass vacuously", () => {
		// A regex matching nothing returns an empty array, and every assertion over it
		// checks zero cases while reporting success. A guard that silently tests nothing is
		// worse than no guard.
		expect(chevronFlags().length).toBeGreaterThanOrEqual(3);
	});

	it("only rotates chevrons on flags that something can actually change", () => {
		// The defect: the Templates chevron read `designOpen`, but `setDesignOpen` was never
		// referenced outside its own declaration. The flag was pinned `true` for the life of
		// the component, so the chevron could not rotate whatever the user did.
		//
		// Asserting only that the chevron is wired to *a* flag would have passed that code.
		// What made it a bug was not the read — it was the absence of a writer.
		const unwritable = chevronFlags().filter((flag) => {
			const declared = declarations(source).find(
				(entry) => entry.flag === flag,
			);
			return declared ? !isWritten(declared.setter) : true;
		});

		expect(
			unwritable,
			`chevron driven by a flag nothing ever writes: ${unwritable.join(", ")}`,
		).toEqual([]);
	});

	it("drives each disclosure and its chevron from one flag", () => {
		// Why this drifted: `typeOpen` was introduced so the rail's Templates disclosure
		// would stop sharing state with the preview's toolbar, and the disclosure was moved
		// onto the new flag while its chevron was left on the old one. Half a migration is
		// what made it possible.
		const pairs = [
			...source.matchAll(
				/<Collapsible[^>]*onOpenChange=\{(set\w+)\}[^>]*open=\{(\w+)\}/g,
			),
		].map((match) => ({
			setter: match[1] as string,
			flag: match[2] as string,
		}));

		expect(pairs.length).toBeGreaterThan(0);
		for (const { setter, flag } of pairs) {
			// `onOpenChange={setFoo}` is the callback for `open={foo}` — the two halves of
			// one control. A mismatch means the arrow is not the disclosure's own state.
			expect(setter, `open={${flag}} is not driven by its own setter`).toBe(
				`set${flag[0]?.toUpperCase()}${flag.slice(1)}`,
			);
		}
	});

	it("gives every collapsible it controls a flag that can change", () => {
		// A `Collapsible` whose `open` prop comes from a flag with no writer renders
		// permanently open or permanently shut, silently: no error, no lint, no test failure.
		// This is the shape of the bug, so it is pinned even though it passes today.
		const driven = [...source.matchAll(/<Collapsible[^>]*open=\{(\w+)\}/g)].map(
			(match) => match[1] as string,
		);

		expect(driven.length).toBeGreaterThan(0);
		for (const flag of driven) {
			const declared = declarations(source).find(
				(entry) => entry.flag === flag,
			);
			expect(declared, `${flag} is not a useState flag`).toBeDefined();
			expect(
				isWritten(declared?.setter ?? ""),
				`${flag} is never written`,
			).toBe(true);
		}
	});

	it("does not reintroduce the shared flag that caused the drift", () => {
		// This disclosure exists because sharing one flag across two collapsibles on opposite
		// sides of the screen meant opening the rail's template list also shoved the
		// preview's toolbar open. Asserted as a named absence so the coupling cannot come
		// back unnoticed.
		expect(declarations(source).map((entry) => entry.flag)).not.toContain(
			"designOpen",
		);
	});
});
