# Brand

The Betta Resume identity, as code and as rules. Everything here is generated
from one geometry definition plus the self-hosted Inter files — there is no
hand-drawn asset to drift.

- Live reference: [`/design-system#brand`](../../src/app/design-system/page.tsx)
- Source components: `src/components/brand/`
- Generator: `scripts/brand-assets.cjs` (`node scripts/brand-assets.cjs`)
- Assets: `public/brand/`, `public/icon.svg`, `public/favicon.ico`, `public/logo.svg`

---

## 1. The personality the brand has to carry

**Serious, precise, quiet.** The product is a workbench for a document people
are anxious about: a resume, on its way to an interview. The book's four axes
(`refactoring-ui-rules.md` §1.4) settle it:

| Axis | Decision | Why |
|---|---|---|
| Font | Neutral sans (Inter) | A serif reads editorial/masthead; a rounded sans reads playful. A neutral sans lets the *documents* carry the personality. |
| Colour | One blue, used as an event | Blue is "safe and familiar"; the accent marks action, never decoration. |
| Radius | Small (4/6/8, 12 for modals) | Large radii read consumer-soft; none reads merely austere. |
| Language | Plain, professional | No exclamation marks next to ATS copy. |

The brand does not try to be distinctive through shape comedy. It is
distinctive through **finish**: one precise mark, one weight contrast, one
accent.

---

## 2. The mark

Two offset sheets. The back sheet is the master record; the front sheet is the
variant. It is the product's thesis in one glyph — **fork, don't retype** — and
it is structurally honest: a resume is a sheet, a variant is a second sheet.

```
     ┌────────┐
     │ ▬▬▬▬   │   front sheet: solid, text lines knocked out
     │ ▬▬▬▬   │
  ┌──└────────┘
  │  ▬▬▬       back sheet: open outline, 1.2-unit gutter
  └────────────┘
```

Construction rules:

- **One solid shape.** The front sheet's three lines are knocked out with
  `fill-rule="evenodd"`, not drawn on top. It survives one colour, a photocopier,
  a 16px favicon and a single-colour print run.
- **The gutter is geometry, not a mask.** The back outline is an *open path*
  that stops 1.2 units short of the front sheet. A `<mask>` would need a unique
  id, which needs `useId`, which would make the mark a client component and put
  JavaScript on the marketing page. The drawable result is identical.
- **32-unit grid.** Front sheet `(4,4)–(20,20)`, back `(12,12)–(28,28)`, radii
  3.5, stroke 2. Overall ink box 24×24 with 4 units of padding — the mark is
  optically centred in its viewBox.

### Sizes

| Context | Size | Rule |
|---|---|---|
| Favicon / app icon | 16px | Mark only. The tile version in `public/icon.svg`. |
| Inline mark | 16–96px | Mark only; scales cleanly because it is geometry. |
| Lockup `sm` | 20px mark / 14px wordmark | **Minimum lockup.** Below this, use the mark alone. |
| Lockup `md` | 28 / 16 | Default: header, footer, docs. |
| Lockup `lg` | 40 / 20 | Section headers, covers. |
| Lockup `xl` | 56 / 32 | Marketing and documentation only. |

### Clear space

**One mark width (x) on all four sides.** At the default `md` size x = 28px.
Nothing — type, an edge, another mark — enters that box. When the lockup sits in
a header, the padding on the *other* elements does not count as clear space.

### Colour

- **Mono is the default.** Both sheets inherit `currentColor`, so the mark works
  on paper and on ink with no second asset and no theme branch.
- **Accent is an event.** In the accent variant the *back* sheet takes
  `--primary` (accent-600 in light, accent-400 in dark) and the front sheet stays
  ink/currentColor. Use it where the brand is the subject — the design-system
  page, a cover — never as a status, never twice on one screen.
- The accent is hue **255**, the same hue as focus, links and the primary
  button. One hue for the whole product is what makes a rebrand one constant
  (`--br-accent-*`).
- Monochrome variant: `public/brand/lockup-mono.svg` and `public/brand/mark.svg`.
- Never recolour the wordmark, and never introduce a second accent hue.

---

## 3. The wordmark

**“Betta” in Inter 700, “Resume” in Inter 400, tracking −0.01em.**

Why this and not a display face:

- The book's font axis says a neutral sans is *plain, letting other elements
  carry the personality*. That is the correct register for a tool used while
  anxious. A display serif would make the product name a masthead it has not
  earned; a geometric/rounded face would read playful.
- Inter is already self-hosted for the entire UI (`src/lib/fonts.ts`), so the
  wordmark costs **no extra request**, cannot flash a fallback, and cannot drift
  from the interface.
- Personality comes from two weights: the first word is the emphasis (700), the
  second is the counterweight (400). This is the same two-weight discipline the
  hierarchy rule applies to the UI, so the brand and the product speak the same
  language.
- −0.01em is the `title` tracking step (T9). Tight tracking at display sizes is
  what makes the name read as *machined* rather than typed.
- Cap height aligns with the mark; the gap between them is one quarter of the
  mark width, so the two read as one object.

The outlined wordmark in `public/brand/wordmark.svg` is generated with `fontkit`
from `public/fonts/inter-400.ttf` and `inter-700.ttf` — the same files the PDF
pipeline ships. A `<text>` element would defer the typeface choice to whatever
font the viewer happens to have, which is the opposite of a wordmark.

---

## 4. Do / don't

**Do**

- Set the lockup on a flat surface with one mark-width of clear space.
- Use the mono mark on both paper and ink.
- Use the accent variant once per screen, where the brand is the subject.
- Keep the wordmark at 14px or larger.

**Don't**

- Rotate, stretch, outline, or add a drop shadow to the mark.
- Recolour the wordmark or set it in another typeface.
- Put the accent variant on a tint where the accent's 3:1 edge disappears.
- Set a lockup below 20px — use the mark alone.
- Reuse the mark as a bullet, an icon in a list, or a loading spinner.

---

## 5. Using it

```tsx
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BrandMark } from "@/components/brand/brand-mark";

<BrandLockup size="md" />              {/* mark + wordmark, mono */}
<BrandLockup size="lg" variant="accent" />
<BrandMark className="size-4" label={null} />   {/* decorative, beside a wordmark */}
```

`BrandLockup` renders `role="img"` with an accessible name of “Betta Resume”.
`BrandMark` takes `label={null}` when a visible wordmark already says the name,
so a screen reader does not hear it twice.

The markup is a **server component** (no hooks, no client directive) so the
marketing page keeps its zero-client-JS property.

---

## 6. Assets

| File | What it is |
|---|---|
| `public/brand/mark.svg` | Mark, monochrome (`currentColor`) |
| `public/brand/mark-accent.svg` | Mark, accent back sheet |
| `public/brand/wordmark.svg` | “Betta Resume”, outlined, monochrome |
| `public/brand/lockup.svg` | Mark + wordmark, accent |
| `public/brand/lockup-accent.svg` | Same, named for discoverability |
| `public/brand/lockup-mono.svg` | One-colour lockup for print |
| `public/icon.svg` | 32px app icon: white mark on the accent tile |
| `public/favicon.ico` | 16 / 32 / 48 PNG-in-ICO of the app icon |
| `public/logo.svg` | The lockup, kept at the historical path |

Regenerate after changing the geometry or the type:

```
node scripts/brand-assets.cjs
```

The generator is the source of truth. `public/brand/`, `public/icon.svg` and
`public/logo.svg` are excluded from Biome for that reason (see `biome.jsonc`).
`test/design-system-page.test.ts` asserts every asset exists, is titled and
viewBoxed, and that the favicon carries three sizes.
