# R1 — Refactoring UI: extract the operative rules

You are a design researcher. **The book is already extracted to `docs/research/refactoring-ui-extract.md`** (252 pages of text). Read it. Do not re-extract.

Your only output: `docs/research/refactoring-ui-rules.md`.

## Why this matters

A previous pass "applied" this book and produced a token scale. The maintainer says the app **looks exactly the same** — because a token scale is not what the book is about. The book is a *visual design method*. Your job is to extract what was actually missed.

## The book's chapters (from the extracted text)

1. Starting from Scratch (p7–34): Start with a feature not a layout · Detail comes later · Don't design too much · **Choose a personality** · **Limit your choices**
2. Hierarchy is Everything (p35–64): Not all elements are equal · **Size isn't everything** · Don't use grey text on colored backgrounds · **Emphasize by de-emphasizing** · **Labels are a last resort** · Separate visual hierarchy from document hierarchy · Balance weight and contrast · Semantics are secondary
3. Layout and Spacing (p65–100): Start with too much white space · Establish a spacing and sizing system · You don't have to fill the whole screen · **Grids are overrated** · **Relative sizing doesn't scale** · **Avoid ambiguous spacing**
4. Designing Text (p101–136): Establish a type scale · Use good fonts · Keep your line length in check · **Baseline, not center** · **Line-height is proportional** · **Not every link needs a color** · Align with readability in mind · Use letter-spacing effectively
5. Working with Color (p137–170): Ditch hex for HSL · **You need more colors than you think** · **Define your shades up front** · Don't let lightness kill your saturation · **Greys don't have to be grey** · Accessible doesn't have to mean ugly · **Don't rely on color alone**
6. Creating Depth (p171–198): Emulate a light source · **Use shadows to convey elevation** · **Shadows can have two parts** · Even flat designs can have depth · **Overlap elements to create layers**
7. Working with Images (p199–218)
8. Finishing Touches (p219–248): **Supercharge the defaults** · **Add color with accent borders** · **Decorate your backgrounds** · **Don't overlook empty states** · **Use fewer borders** · **Think outside the box**

## Deliverable structure

For **every** sub-section in the book, produce:
1. **The rule**, stated as a checkable instruction.
2. **The mechanism** — exactly how to do it (concrete values, CSS, techniques).
3. **The common mistake** it exists to prevent.
4. **How to apply it to a resume-builder app specifically** — a document tool with an editor, a dashboard, dialogs, and a document preview.

Then, at the end:

5. **"What the previous pass got wrong"** — explicitly contrast a token-scale-only approach with the book's method. Name the chapters that were ignored entirely (I expect: personality, de-emphasis, labels-last-resort, depth/layering, supercharged defaults, fewer borders, accent borders, decorated backgrounds, empty states).
6. **A visual design brief for a resume-builder app** — pick a personality (the book's "Choose a personality" chapter: choose deliberately between e.g. playful/serious, minimal/ornate, neutral/expressive) and specify the resulting look: the mood, the accent usage, the depth model, the density, the border policy, the empty states. Be opinionated and specific enough that someone could build it.
7. **A before/after checklist** — the 20 highest-impact changes that would make the app look visibly different.

## Hard constraints
- The app is a professional document tool. Not playful, not a consumer toy.
- The **resume document** and the **app chrome** are two design surfaces. The book applies to the chrome. The document has its own rules (ATS, print, single-column). Call out where the book's advice must NOT be applied to the document.
- Do not modify any file other than your deliverable.

Be concrete. Quote the book where it matters. This is the specification for a redesign.
