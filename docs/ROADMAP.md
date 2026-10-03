# Roadmap

Derived from a market/technical research pass on 2026-10-03 covering resume builders
(Rezi, Teal, Resume Worded, Kickresume, Enhancv, Zety, Novoresume, Jobscan, Resume
Genius, FreeCV), the open-source set (Reactive Resume, Resume-Matcher, RenderCV), ATS
ingestion internals (Workday, Greenhouse, Lever, iCIMS, Taleo, Ashby,
SmartRecruiters), parsing vendors (Affinda, Textkernel/Sovren, HrFlow), skills
taxonomies (Lightcast, ESCO, O*NET, SFIA), and interchange standards (JSON Resume,
HR Open Standards LER-RS).

Claims are marked **[verified]** (read in a primary source), **[unverified]** (could
not confirm) or **[inference]** (reasoned, not read). Roughly 30 sources; the
vendor-published ones are the weakest and are labelled as such.

## Where we actually are

Better than the gap list suggested. `packages/types/src/schemas.ts` already defines and
the API already persists:

| Schema | Line | Status |
|---|---|---|
| `jobTargetSchema` | 291 | stored, **never computed or displayed** |
| `atsSuggestionSchema` | 300 | stored, **never produced** |
| `atsScoreSchema` | 308 | stored, **never produced** |
| `exportRecordSchema` (`pdf\|json\|docx\|txt`) | 320 | `docx` declared, **no DOCX exporter exists** |

So Features 5 and 3 are **computation + UI**, not data modelling. That moves both up the
list.

Also true as of `main`:

- Typst templates are **single-column**, which is both the ATS-correct choice and a
  structural advantage — see "Why we do not render through a browser".
- `layout: "two-column" | "sidebar"` was accepted by the schema and drawn by the
  preview, but **no Typst template read it**. Removed from the UI in #153; kept in the
  schema so existing stored resumes still load.
- The "offline-first local persistence layer" (`src/lib/api.ts`,
  `src/features/resume-editor/resume.store.ts`, ~1,800 lines) never executed — nothing
  imported it. Deleted in #152. Real persistence is and always was the tRPC path.

## The one thing to understand about this market

Differentiation has moved **downstream of the document, into auto-apply**. Jobloo,
Wobo, LazyApply, FastApply and Sonara all exist. Rezi's most damning review reads:

> "Rezi stops where the work begins… at $29/month it perfects the document."

**[inference]** We should own the *authoring and correctness* half and let apply-tools
consume our output. Auto-apply is an auth/session/scraping arms race against Workday's
and iCIMS's defences, it drags us into EU AI Act Annex III and NY Local Law 144
territory with no compliance budget, and it is already a volume commodity.

### Why we do not render through a browser

Every HTML→PDF competitor uses headless Chromium. Chromium decides its own text-drawing
order, so **none of them can know what a parser will extract.** Their "ATS score" is a
checklist guessing at parser behaviour.

Typst emits a deterministic, correctly-ordered single-column text layer. We can
*guarantee* the input and then *show it to the user*. That is Feature 2, and it is the
cheapest feature on this list (S) and the hardest to copy.

## Ranked plan

Value-per-effort. S ≈ days, M ≈ 1–3 weeks, L ≈ 1–2 months.

| # | Feature | Value | Effort | Verdict |
|---|---|---|---|---|
| 2 | Parse-fidelity diagnostics | Very high | **S** | **First** |
| 7 | Metric/quantification **detector** | Med-high | **S** | **First** |
| 3 | DOCX export | High | M | **First** |
| 1 | Content library + variants | Very high | M | **Second wave** |
| 5 | ATS diagnostics + weighted JD match | High | M | **Second wave** (model exists) |
| 6 | Revision history / diff / restore | Med-high | M | **Second wave** |
| 4 | Tiered PDF/DOCX import | High | M | Third |
| 9 | Skills alias/normalisation map | Med | M | Defer |
| 8 | Optional AI assist (BYO-key) | Med | M | Only if asked |
| 10 | Application tracker | Low | L | **Never** |

### Feature 2 — Parse-fidelity diagnostics (S, no dependencies)

Run checks against the **actual exported PDF bytes**, not a heuristic over the model:

- extract the text layer, assert single-column reading order
- assert no text lives in header/footer layers
- whitelist-check every section heading against parser dictionaries (`Work Experience`,
  `Education`, `Skills`, `Summary`, `Certifications`, `Awards`, `Publications`,
  `Volunteer`, `References`, `Languages`)
- assert every date matches `MMMM YYYY`
- assert no tables for experience/education
- assert the font has complete Unicode embedding
- assert the bullet glyph is `•`

Surface each as *"violation of a documented parser constraint"* with the exact Typst
setting to change, plus a **"copy extracted text"** button so the user can paste it into
Notepad themselves — the Plain Text Test.

**Never emit a single 0–100 number.** That is the incumbents' credibility failure:
users report 94/100 scores on resumes humans reject, and 82-vs-20 disagreement between
tools **[unverified, Reddit]**.

*Depends on:* nothing. *Risk*: the rule list may over-fit one parser — hence the
framing above.

### Feature 7 — Metric detector (S, no LLM)

Flag bullets that make a claim with no number, and bullets built from duty language
(`responsible for`, `assisted with`, `helped with`, `worked on`, `participated in`).
Pure regex. Render inline in TipTap as an affordance: *"add a number here."*

**Detect, never invent.** Rezi's highest-demand transformation is quantification — it
has a dedicated *"Generate Bullet With Key Numbers"* button — but its *generation* half is
where the documented hallucinations live. Both hallucination failures in the research are
**generation** failures: Rezi users reporting a job suggestion "completely unrelated to
my experience" **[unverified, Trustpilot via secondary]**, and a commercial parser
reportedly inventing "AWS" on a resume that never mentioned it **[unverified, single
vendor source]**.

Shipping metric invention puts fabricated claims in a document the user will sign their
name to. If asked, generate **questions to answer**, not answers.

### Feature 3 — DOCX export (M)

DOCX is XML with guaranteed ordering; **[verified]** the evidence says it parses more
consistently than PDF, whose extraction depends on the producer's text-drawing order.
Only Reactive Resume (OSS) exports it; Novoresume ships `.docx` *templates*.

Serialize the existing intermediate resume model straight to WordprocessingML, reusing
the same content→layout mapping as the Typst path — do **not** use a WYSIWYG docx
library, which would reintroduce exactly the divergence #153 just removed.

*Risk*: DOCX pagination ≠ PDF pagination. Label them "parse-optimised" and "visual
fidelity" respectively rather than pretending they match.

### Feature 1 — Content library + variants (M, biggest UX gap)

Teal's own framing is the spec **[verified]**:

> "Your Teal resume is your complete work history in one place. Not the polished
> one-pager you send to employers, but the comprehensive source document you pull from."

Aim for 15–20 bullets per position in the master, toggle down to 3–5 per variant. Three
distinct sync mechanisms, all worth having:

1. **Additive** — new content auto-appears in all variants, off by default.
2. **Opt-in propagation** — an edit offers "save to all".
3. **Non-destructive divergence** — unsynced edits surface an explicit *"Update
   Available"* flag rather than silently drifting.

Rezi has only "Duplicate Resume" with no sync — this is its single biggest architectural
weakness and the reason Teal beats it.

*Approach*: `content_items` table `{id, userId, kind, type, payload, archivedAt}`;
`sections` gain `content_item_id`; a resume becomes an ordered list of
`(section, contentItemId, visible)`.

*Risk*: the hard part is not storage, it is making toggling fast enough that people use
it. Rezi's users rewrite whole resumes because toggling feels slow. Instrument
toggle-to-export time.

### Feature 5 — ATS diagnostics + weighted JD match (M)

Port the dimensions, not a percentage. Resume Worded's split is cleaner and more
defensible than Rezi's five unexplained categories **[verified]**, and its
required-vs-preferred weighting is something Rezi does not do:

> "required qualifications affect your score more than preferred skills"

- **Impact** — quantified-bullet ratio, weak-verb detection, duty-vs-achievement
- **Brevity** — word count 400–1600 **[verified, Rezi's own rule]**, 3–6 bullets per role, page count
- **Style** — this *is* Feature 2

Keyword match: tokenise the JD, detect required-vs-preferred by proximity to
"required/must" vs "preferred/nice to have", weight 3:1, normalise acronyms against the
Feature 9 alias map.

**Emit both acronym forms.** **[verified]** Workday's classifier was empirically observed
to match `AWS` but *not* `Amazon Web Services`, and to drop `GCP` entirely — the inverse
of what you would design for. Writing both is a real differentiator.

Seniority-adaptive weights.

### Feature 6 — Revision history (M)

**Zero competitors.** Every commercial builder is a black hole you cannot diff. The
OSS/dev audience already hand-rolls this with Typst + git **[verified, jagatsingh.com
Apr 2026]**.

Append-only `resume_revisions` (`resumeId`, `seq`, `snapshotJson`, `contentHash`,
`createdAt`), debounced snapshot on structural change, side-by-side diff reusing the
existing section model. Dedup by `contentHash` plus a retention window.

*Depends on*: nothing structurally; Feature 1 makes the diff per-item and much better.

### Feature 4 — Tiered import (M)

- **Tier 1 (default, free, private)** — `pdf.js` text layer + `mammoth` for DOCX +
  heuristic sectioner driven by Feature 2's whitelist. 70–80% field accuracy on clean
  single-column input.
- **Tier 2 (opt-in, BYO key)** — adapter interface (`AffindaParseAdapter` etc.).

Import lands in the **content library** as unreviewed items, never directly into a
resume.

**Do not use an LLM for extraction by default.** Hallucinated skills are the documented
failure mode, and an invented skill in a resume is worse than a missing one. Show
per-field confidence and a review UI.

*Depends on*: Features 1 and 2.

### Feature 9 — Skills normalisation (M, defer)

Normalise `React` / `ReactJS` / `React.js` to one entity **at read time, not write
time**, so the taxonomy can be swapped without a migration. Never store a taxonomy ID
on user content.

**[verified]** Lightcast went commercial in April 2026 (free-with-attribution ended
except nonprofits). **ESCO** (~14k skills, 20+ languages) and **O\*NET** remain free and
are the realistic picks for a zero-budget OSS project.

**[verified]** Copy Lightcast's extraction mechanics: one display name plus aliases,
acronyms, abbreviations and historic names, with context disambiguation — their own
example is exactly our acronym problem, *"when 'AWS' appears, the surrounding context
helps determine whether it refers to the 'American Welding Society' or 'Amazon Web
Services.'"*

Start with ~2–3k tech skills plus aliases. The alias map is ~80% of the value; do not
over-invest.

### Feature 8 — Optional AI (M, only if asked)

Never proxy through our server. Either the user pastes their own key, called from the
browser, or an in-browser model. Every suggestion is a **suggestion** — never
auto-applied, and always shown as a diff.

## Explicitly rejected

| Rejected | Why |
|---|---|
| **Auto-apply** | Scraping/auth arms race vs Workday + iCIMS; drags us into EU AI Act Annex III and NY LL144; commodity (5+ players on volume) |
| **Application tracker** | It is a CRM that competes with Teal's free unlimited tier and pulls us toward job-aggregation and auto-apply |
| **Hidden-keyword "ATS Hack Mode"** | Rezi shipped this June 2024 **[verified]**; hidden text is now detectable and can trigger auto-rejection **[unverified but directionally consistent]**. A company whose brand is ATS legitimacy shipping ATS deception. **Make "we will never do this" an explicit README policy** — it is a credible differentiator precisely because a major competitor did it |
| **Per-ATS scoring** (Jobscan-style) | Already commoditised into a long tail of micro-tools (getdreamrole, talenttuner, atsresumechecker…), which is itself the evidence it is low-value |
| **A single 0–100 score** | The category's trust failure |
| **LLM-based metric invention** | Fabricated claims in a signed document |
| **Job-description Language (JDL)** | **[unverified]** No current credible standard. Several sources conflate it with HRBOS's older JDL. Do not plan against it |
| **Contorting the internal model to JSON Resume** | Adopt it as export/import for interoperability with an explicit lossy-mapping report; our 13-section model is richer (`summary`, `personal-info`, `custom` have no JSON Resume equivalent) |

## Standards: adopt for interchange, not for modelling

- **JSON Resume** v1.0.0, MIT, the most-deployed community schema **[verified]**.
  Reactive Resume imports it; the `jq`-friendly JSON shape is why.
- **HR Open Standards LER-RS v2** is a release candidate **[verified]** — institutionally
  credible, no ecosystem. Watch, do not depend.

**[inference]** There is no adopted standard. Bidirectional JSON Resume mapping with an
honest lossy-mapping report is the right call.

## Compliance posture

**[verified]** Employment AI is Annex III high-risk under the EU AI Act, but obligations
attach to **providers and deployers of recruitment/evaluation systems** — the ATS side,
not a candidate's own writing tool. **[inference]** This is a structural argument
*against* following the market into auto-apply.

**[inference]** Cheap inoculations worth shipping regardless: no automated ranking or
rejection of *other people's* resumes; an explicit "this is not what an employer sees"
disclaimer (Rezi's own docs disclaim their score harder than anyone); a documented
AI-feature disclosure; and consent modelled as **data** rather than buried in a ToS —
copy Greenhouse's `gdpr_consent_given` / `gdpr_processing_consent_given` /
`gdpr_retention_consent_given` shape **[verified]**.

**[inference]** Self-hosting genuinely escapes the processor chain (Clerk and
Cloudflare/D1 are both third-party processors). That is a real, defensible privacy
differentiator for EU users, and it is free.

## What I would not trust

Vendor marketing numbers, with no published methodology **[unverified]**: Rezi's "4.3M
users", "62.18% interview rate", "8.23/10 average review"; Affinda's "median 50ms/parse";
HrFlow's "43+ languages". The one self-reported counter on Rezi's own site shows a
*different* number and is a cumulative signup count, not actives.

Also unreliable: the widely-repeated claim that parsing errors cause "~23% of
early-stage rejections", attributed to a citation named "ResumeAdapter (2026)" that
looks synthetic **[unverified]**. And the "87% field accuracy vs 96% for humans (IEEE,
2023)" figure, whose paper could not be located **[unverified]** — treat as directional.

## Sequencing

```
Wave 1 (no dependencies)     Feature 2  ──┐
                             Feature 7  ──┤
                             Editor revamp┘
Wave 2 (needs wave 1)        Feature 5 (Style dim *is* Feature 2)
                             Feature 3 (DOCX)
                             Feature 6
Wave 3 (needs wave 2)        Feature 1 (content items)
                             Feature 4 (import → library)
Wave 4                       Feature 9 (improves Feature 5)
                             Feature 8 (only if asked)
```

Feature 1 is deliberately **not** first despite being the highest value: it is a large
content-model migration, and Features 2/7 are cheap, independent, and each make Feature 1
easier to justify. Doing the cheap structural wins first also means the content-model
migration lands on a codebase that already has honest diagnostics.