# Competitor research — the resume-builder landscape vs BettaResume

Research date: 2026-10-24/25. Method: deep web research across ~25 sources — competitor
sites and pricing pages where reachable, Trustpilot-sentiment digests, Reddit threads
(counted, not cherry-picked), university-distributed vendor manuals, and ATS-side
documentation. Sources are cited inline with URLs. Evidence labels follow repo
convention: **[verified]** = seen in a primary/first-party source during this research or
already verified in-repo; **[unverified]** = secondary source, review farm, or
vendor-run study without published methodology; **[inference]** = my reasoning on top of
the evidence.

A standing caveat that is itself a finding: most "reviews" in this category are written by
competing builders, and several admit it ("Most Kickresume reviews are written by
companies that sell a competing resume builder, this one included" —
https://www.careerkit.me/blog/kickresume-review **[verified]**; see also Teal reviewing
Rezi at https://www.tealhq.com/post/rezi-review and Rezi reviewing Teal at
https://www.rezi.ai/posts/teal-review). Every claim below from such a source is marked
**[unverified]** even when the detail is specific.

---

## 1. Landscape map

Four groups, and the dividing line is what they actually sell:

**A. Document workbenches (direct conceptual competitors).** Teal (master-resume +
tailoring + job tracker), Rezi (ATS-discipline builder + scoring), Kickresume
(design + AI writing), Novoresume (guidance-first, dense templates), FlowCV (generous
free builder), Enhancv (design-forward), Zety (wizard + SEO funnel), Standard Resume
(minimalist, dev-adjacent), VisualCV (analytics/sharing).

**B. Analysis-only tools.** Resume Worded (scoring/coaching, no real builder), Jobscan
(JD match scanning), VMock (institutional 0–100 scoring), Big Interview/"Big Resume"
(career-center-configurable AI review).

**C. Open source / developer lane (our actual nearest neighbours).** Reactive Resume /
RxResu.me (MIT, 44.6k GitHub stars, v5 shipping — https://news.ycombinator.com/item?id=48792299
**[verified]**), OpenResume (local-only, US-best-practice-constrained —
https://www.open-resume.com/ **[verified]**), Overleaf + Jake's Resume (the LaTeX
template standard — https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs
**[verified]**).

**D. Employer-side reference material.** Ashby/Greenhouse/Workday parsing behaviour,
Prismic/Ashby resume guides. Ashby publishes more parsing detail than most (a parsing
threshold below its upload limit — https://www.applyvita.com/ats-guides/ashby
**[unverified]**), and even specialist guides admit "ATS vendors don't publish their
parsers" (https://pastthebots.com/ats-directory/ashby **[verified]** — that page states
its own limits). The "Prismic resume guide" named in the brief could not be located in
this pass; search engines return only Prismic's careers page and unrelated projects.
**[unverified — not found]**

Positioning credibility (who is honest): Novoresume is repeatedly described as
trial-trap-free with up-front pricing (https://hiredradar.com/novoresume-review/
**[unverified]**); Reactive Resume and OpenResume are structurally honest because the
code and the data export are inspectable **[verified]**; Rezi is the paradox — its docs
disclaim its own score harder than anyone (in-repo verified), yet it shipped invisible
keywords (§4). Zety/Resume.io-family builders are the industry's dishonesty baseline:
"$2.70 trial quietly auto-renews at $24.95/month"
(https://www.truecv.com/vs/zety **[unverified]**, corroborated by a first-hand billing
complaint at
https://www.linkedin.com/posts/phemelo_be-careful-i-used-zety-resume-builder-activity-7275245522607624192-qEaK).

Auto-apply is a crowded commodity in 2026 — Jobscan shipped "Auto Apply"
(https://www.wobo.ai/blog/jobscan-review **[unverified]**), Wobo's pitch is "applies with
tailored content" (https://www.wobo.ai/blog/rezi-review **[verified]**, it is their own
copy), JobStep and others sell the same. This is direct confirmation of ROADMAP's
"commodity (5+ players on volume)" rationale for rejecting it.

---

## 2. Feature matrix

Legend: ✅ solid · ½ partial/gated · ❌ absent · ? unverified. "Free download" = can a
user get a *usable, clean* file without paying.

### 2a. Product & workflow

| Competitor | Editor model | Templates | Page-fit / length | Import | Export | Versions / tailoring | Content library | Collab / sharing |
|---|---|---|---|---|---|---|---|---|
| Teal | form + check/uncheck content items per version **[verified]** | few, plain | ? | resume upload, LinkedIn **[verified]** | **PDF only** **[verified]** | unlimited resumes per job; % match score **[verified]** | ✅ the core model **[verified]** | job tracker w/ "excitement" rank **[verified]** |
| Rezi | structured form, drag-reorder sections **[verified]** | 20+, 900+ examples **[unverified]** | word-count rule 400–1600 (in-repo verified) | resume upload | DOCX (unlimited), PDF (3 lifetime free), Google Drive **[verified]** | "Duplicate Resume", **no sync** (in-repo verified) | ❌ | ❌ |
| Kickresume | form-based, polished **[unverified]** | 40+ (4 free) **[verified: own pricing page]** | ? | upload | PDF; Word output limited **[unverified]** | basic | ❌ | ❌ |
| Novoresume | form + section guidance **[unverified]** | content-dense, strong at 10y+ histories **[unverified]** | free tier capped at one page **[unverified]** | upload | PDF (free = watermarked) **[unverified]** | basic | ❌ | ❌ |
| FlowCV | form, drag-drop sections, font/color controls **[unverified]** | many, incl. single-column safe ones **[unverified]** | live layout control | no account needed | **PDF only**, no DOCX, no watermark **[verified: multiple]** | basic | ❌ | view-tracking Analytics tier ~$12/mo **[unverified]** |
| Enhancv | drag-drop blocks, design-first **[unverified]** | best-in-class visuals; two-column defaults **[unverified]** | live content-length feedback **[unverified]** | upload | PDF + plain text; DOCX historically absent **[unverified]** | basic | ❌ | share links **[unverified]** |
| Zety | step-by-step wizard **[unverified]** | large library | wizard enforces flow | upload | paywalled download **[verified: complaints]** | basic | ❌ | ❌ |
| Standard Resume | minimal form, live preview **[verified: site]** | one design language | minimal by construction | LinkedIn import **[unverified]** | PDF preview free; **PDF download is paid** **[verified: pricing page]** | basic | ❌ | share link **[unverified]** |
| VisualCV | block-based **[unverified]** | 30+ (Pro) **[unverified]** | ? | upload | PDF **[unverified]** | multiple resumes (Pro) **[unverified]** | ½ | **"who viewed your CV" analytics** **[unverified]** |
| Jobscan | scanner + Power Edit, not a builder **[unverified]** | n/a | n/a | upload | n/a | scan-per-JD workflow | ❌ | ❌ |
| Overleaf + Jake's Resume | free-form LaTeX **[verified]** | 1 template (Jake's), MIT **[verified]** | hand-tuned | .tex | PDF **[verified]** | **full version history + real-time collab** **[verified]** | n/a (git-able source) | ✅ real-time, comments |
| Reactive Resume | form + drag-drop, 18 templates **[verified: site]** | 18, incl. text-PDF exports **[verified]** | multi-page support **[verified]** | PDF, LinkedIn export, JSON Resume, RR export; DOCX via AI key **[verified]** | **PDF, DOCX, Markdown, JSON** (JSON round-trips) **[verified]** | unlimited resumes; per-job workspaces **[verified]** | ½ (import as reusable data) | public/password share links; Discord feedback culture **[verified]** |
| OpenResume | form, deliberately constrained (single column, no photo, core sections) **[verified]** | 1 design | single-column by policy **[verified]** | — | PDF **[verified]** | ❌ | ❌ | ❌ local-only storage **[verified]** |
| VMock | n/a (uploader) | school templates possible | structure scored **[verified: manual]** | PDF | PDF | upload-revise loop **[verified]** | ❌ | school dashboard **[verified]** |
| Big Resume | n/a (uploader) | career centers upload own templates **[verified: site]** | rubric-based feedback **[verified]** | upload | ? | re-upload loop **[unverified]** | ❌ | school-configured rubrics + comments **[verified: site]** |
| BettaResume (us) | structured records + TipTap where free-form; 13 section types | 3 Typst templates | page count in toolbar; **no live fit warning** | PDF/DOCX/MD/TXT/JSON (with review gate) | PDF/DOCX/TXT/JSON | **variants w/ per-section linked/detached + revision history w/ diff/restore** | ✅ with placement divergence | ❌ |

### 2b. Grading, honesty & commerce

| Competitor | Grading model | Composite score? | ATS claims | What's free | Price (paid) | Top complaints (evidence) |
|---|---|---|---|---|---|---|
| Teal | % match + keyword suggestions **[verified]** | ✅ % (unexplained) | "ATS-friendly" marketing | unlimited resumes + job tracker **[verified]** | $13/wk, $29/mo, $79/quarter **[verified]** | messy UI; AI pulled JD details not in resume **[verified review]**; PDF-only |
| Rezi | Rezi Score: 23 criteria 0–100 **[verified]**; docs disclaim it (in-repo) | ✅ 0–100 | "ATS-proof"; **ATS Hack Mode** | 1 resume, 3 lifetime PDFs, unlimited DOCX **[verified]** | ~$29/mo, lifetime plan exists | free-marketing anger at download; AI hallucinations; invisible keywords (§4) |
| Kickresume | ATS checker on paid **[unverified]** | ½ | "ATS-friendly templates" | 4 templates, unlimited downloads per own page **[verified]** | €24/mo, €18/mo qtr, €96/yr **[verified: pricing page]** | AI caps mid-cycle; refund friction; € pricing misreported as $ |
| Novoresume | guidance nudges; Skill Gap Analyzer vs JD **[unverified]** | ❌ (no big score) | "ATS-friendly" | 1 resume, **watermarked** PDF **[unverified]** | ~$19.99/mo, ~$99.99/yr **[unverified]** | watermark makes free unusable; high monthly |
| FlowCV | ❌ no grading at all **[verified]** | ❌ | "ATS-friendly templates" (multi-column risk, §4) | **everything core**, no watermark **[verified]** | ~$12/mo analytics only | multi-column templates parse badly (vendor-tested); no DOCX |
| Enhancv | live content coach + own checker (27 checks) **[unverified]** | ✅ | "ATS-safe" via selectable text, body contact info; vendor studies | build but **not download** **[unverified]** | Pro, weekly plan auto-renews **[unverified]** | design vs parser conflict; "score trap"; billing |
| Zety | wizard completeness | ½ | "ATS-friendly" templates | build free, pay to download **[verified]** | $2.70 trial → $24.95/mo auto-renew **[unverified]** | **billing complaints are the story** (unexpected debits) |
| Standard Resume | AI resume review (Pro) **[verified: pricing page]** | ? | modern-hiring positioning | editing + PDF preview **[verified]** | $19/mo, $29/qtr, $69/yr **[unverified]** | download paywall on a "free" builder |
| VisualCV | analytics ("who viewed") **[unverified]** | ❌ | "ATS templates" | basic, limited **[unverified]** | $15/mo billed quarterly **[unverified]** | dated designs (inference from reviews) |
| Jobscan | match-rate % + keyword gap lists **[verified]** | ✅ % | the category's ATS brand | 5 scans **[unverified]** | $49.95/mo **[verified: reviews cite own pricing]** | **match rate ≠ real ATS; nondeterministic; billing** (§4) |
| Reactive Resume | ATS checker showing **extracted text** + fixes; but also a 58/100-style score **[verified: site]** | ✅ (despite OSS ethos) | "text-based PDF in reading order" **[verified]** | **everything** **[verified]** | free (donations) | none commercial; v5 churn |
| OpenResume | parser = show what ATS reads **[verified]** | ❌ | "works well with Greenhouse/Lever" **[verified]** | everything | free | feature-poor by design |
| VMock | 3 modules (Impact/Presentation/Competencies), bullet checks on 6 params **[verified: official manual]** | ✅ 0–100, Red/Yellow/Green zones | "recruiter-ready score" | free via universities **[verified]** | institutional | cohort-relative scoring opacity |
| Big Resume | rubric-based, coach-designed; schools modify pre-set scoring **[verified: site]** | ✅ | "AI checker" | free via schools **[verified]** | institutional | new product |
| BettaResume (us) | **named pass/fail checks: parse-fit, impact, brevity, style; required-vs-preferred JD match** | ❌ by principle | claims bounded by "violation of a documented parser constraint" | everything (no watermark policy implied by OSS) | n/a | n/a |

---

## 3. What users actually want but nobody does well

1. **Feedback they can trust to be stable and explain itself.** A user ran identical
   inputs through Jobscan twice and got 85% then 61%; Teal scored the same resume 40%
   (https://www.reddit.com/r/jobsearchhacks/comments/1li07kk/are_those_website_really_worth_jobscan_teal_etc/
   **[verified — thread read directly]**). A user who already *got the job* scored 30% on
   Jobscan (https://www.resumity.org/jobscan-reddit, counted across 20 threads / 93
   replies: 12 against vs 5 for **[unverified digest, quotes verifiable]**). Resume
   Worded users ask "are its ATS predictions even accurate?"
   (https://www.reddit.com/r/resumes/comments/13ythi1/ **[verified]**). Nobody publishes
   determinism guarantees or per-check reasoning. Our named-checks, no-score model is the
   structural answer; the missing piece is *showing the evidence span* for each check.

2. **Tailoring per job without reworking everything.** "It took me an hour to tailor my
   resume for ONE JOB and get the recommended score of 85" (r/resumes 13ythi1
   **[verified]**). Teal's check/uncheck-items-per-version is the single most-praised
   workflow in the category (https://resumegenius.com/reviews/teal-resume-builder-reviews
   **[verified]**); Rezi's sync-less "Duplicate Resume" is its "single biggest
   architectural weakness" (in-repo verified). Everyone else has no variant model at all.
   Our linked/detached per-section semantics + Update-Available divergence beats both —
   if toggling stays fast (roadmap's own risk note).

3. **Provenance over AI output.** Both documented hallucination complaints in this
   research are generation failures: Rezi's "wildest hallucination I have ever seen"
   (Trustpilot via https://www.wobo.ai/blog/rezi-review **[unverified]**), Teal's AI
   pulling "details from the imported job description that didn't match our test resume"
   (resumegenius **[verified — reviewer's own test]**). Nobody shows *what the machine
   changed* as a diff. Our "suggestions as diffs, never auto-applied" stance (Feature 8,
   roadmap) is the answer almost nobody implements.

4. **Real versioning.** Zero commercial builders offer history/diff/restore; the dev
   audience hand-rolls Typst + git (in-repo verified). Overleaf's version history is
   loved precisely because it exists (https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs
   **[verified]**). Reactive Resume's JSON round-trip is the only commercial-grade
   portability story (https://rxresu.me/ **[verified]**). We already ship this; the gap
   is "diff any two revisions" (currently version-vs-current — docs/UI-FEATURE-PASS 8.2).

5. **See what the parser actually extracted, at the moment of export.** Checker tools
   promise it (Reactive Resume's checker "shows the text software extracts and what to
   fix" **[verified]**; OpenResume's parser **[verified]**), but *builders* don't surface
   it at export time. The community DIY advice is literally "paste into Notepad" (Jobscan
   threads **[verified]**; FlowCV review's Ctrl+A test **[unverified]**). Our planned
   plain-text test + copy-extracted-text is exactly this want.

6. **A clean file for free.** The most common anger across the category is paywalled or
   watermarked downloads (Zety trial traps **[verified complaints]**; Novoresume
   watermark **[unverified]**; Enhancv "build but not download" **[unverified]**;
   Standard Resume paid PDFs **[verified: pricing page]**; Rezi's 3-lifetime-PDFs anger
   **[verified]**). An explicit "the file is always free and un-watermarked" policy is a
   credible differentiator — costs nothing to state.

7. **DOCX when a portal demands it.** Enhancv's PDF+TXT-only export generates real
   friction ("a handful of older portals still ask for .docx" —
   https://atsresumechecker.ai/blog/enhancv-review **[unverified]**); FlowCV has none
   **[verified]**; only Reactive Resume among builders ships it **[verified]**. Roadmap
   Feature 3 is right.

8. **Length/page-fit guidance while writing (moderate evidence).** Rezi's own rules
   (400–1600 words, 3–6 bullets/role — in-repo verified), Enhancv's live length flags
   **[unverified]**, Novoresume's one-page free cap **[unverified]**. We show page count
   after the fact but nothing warns about orphan lines or section overflow live.

---

## 4. Honesty audit

Our positioning is credibility, so this section is the core deliverable.

**Claims that hold up:**

- *Rezi's score disclaimers.* Its docs warn harder against over-reading the score than
  any competitor (in-repo verified). Honest — while its marketing says "ATS-proof"
  (**[verified]** homepage copy), which is not a claim anyone can honestly make.
- *Novoresume's pricing transparency.* Up-front recurring price, no trial trap
  (https://hiredradar.com/novoresume-review/ **[unverified]**, consistent across 3+
  independent reviews).
- *Reactive Resume / OpenResume structural claims.* "Text-based PDF in reading order",
  no-tracking, data export — all inspectable in public repos
  (https://github.com/Reactive-Resume/Reactive-Resume, https://www.open-resume.com/
  **[verified]**).
- *Enhancv's parsing mitigations.* Selectable text, contact info in page body,
  single-column-per-section two-column strategy (https://www.onetworesume.com/compare/enhancv-review
  **[unverified]**) — technically coherent claims, unlike blanket "beats the ATS" copy.

**Marketing, not evidence:**

- User counts: Rezi "4.3M users" vs its own on-page counter (~4,005,400 *since September
  2019*, a cumulative signup count) **[verified via https://www.wobo.ai/blog/rezi-review]**;
  Novoresume "18M" **[unverified]**; FlowCV "5M" **[unverified]**; VisualCV "3M"
  **[unverified]**; Teal "650k members" **[unverified]**. None publish methodology. Treat
  all as unverifiable.
- "ATS-friendly/ATS-proof" template claims across Kickresume, Zety, FlowCV, Enhancv:
  plausible for single-column templates, contradicted for multi-column ones. A
  competitor's simulator measured FlowCV's popular two-column templates at 44–52% field
  extraction on iCIMS/Taleo vs 89–96% for its single-column ones
  (https://resumeoptimizerpro.com/blog/flowcv-alternative **[unverified — vendor-run
  simulator, no published methodology]**). Directionally consistent with everything we
  know about linear parsers; the *numbers* should not be quoted as fact.
- *Every composite score in the category.* Jobscan's % diverges from real ATS behaviour
  and even from itself between runs (§3.1 evidence). VMock's 0–100 is benchmarked against
  a cohort of "high scoring resumes of students in your community"
  (https://cdn.uconnectlabs.com/wp-content/uploads/sites/139/2024/08/VMock-Guide_SMART-Resume.pdf
  **[verified — official manual]**) — a relative grading curve presented as absolute
  quality. Enhancv's checker number is "Enhancv's own grade against its own rules… no
  real ATS shows a recruiter a score" (https://atsresumechecker.ai/blog/enhancv-review
  **[unverified]**). Even Reactive Resume shows 58/100-style values **[verified]**.
  The scores cannot all be right; users notice (§3.1). *This is the trust failure our
  no-score rule answers; do not drift.*
- *Vendor-run studies.* Enhancv's "92% of recruiters say ATS doesn't auto-reject"
  (25 US recruiters via HR.com — https://hrsea.economictimes.indiatimes.com/news/industry/job-seekers-misled-92-of-recruiters-say-ats-doesnt-auto-reject-resumes/125151204
  **[unverified, vendor-run survey]**) is directionally consistent with the recruiter-side
  account (https://joblabs.ai/resume/how-the-ats-really-works/ **[unverified]**) but n=25
  and self-published by a builder. Use the direction, not the number.
- *The "75% auto-reject" myth* traces to Preptel (2012), a company that shut down in
  2013, with no supporting study (https://ooofferly.com/blog/ats-resume-checker
  **[unverified — but the absence of any source for the myth is itself checkable]**). The
  "~23% of early rejections from parse errors" figure is already flagged synthetic
  in-repo (ROADMAP "What I would not trust").

**Actively false / harmful:**

- *Rezi's ATS Hack Mode* (June 2024): the founder announced invisible-keyword injection
  on r/jobsearchhacks ("you can now inject invisible keywords, prompts, and metadata" —
  https://www.reddit.com/r/jobsearchhacks/comments/1d9akhh/ **[verified — announcement is
  first-party]**; corroboration https://www.wobo.ai/blog/rezi-review **[verified]**). A
  parser test of the white-text variant shows modern parsers extract the raw text
  regardless of colour, the hidden block appears **duplicated** in parsed output (keyword
  stuffing), and select-all reveals it to any recruiter
  (https://jd2cv.uk/blog/invisible-white-text-ats-hack-tested **[verified — a documented
  test]**). Leaving it is now a documented reason users cite for abandoning Rezi
  (https://clickhired.ai/blog/best-rezi-alternatives-in-2026 **[unverified]**). Our "we
  will never do this" policy (ROADMAP) is a marketing asset precisely because this exists.
- *Zety-family billing.* "$2.70 trial" auto-renewing at $24.95/mo
  (https://www.truecv.com/vs/zety **[unverified]**; first-hand account
  https://www.linkedin.com/posts/phemelo_be-careful-i-used-zety-resume-builder-activity-7275245522607624192-qEaK).
  The pattern is consistent across Zety/MyPerfectResume reviews
  (https://hiredradar.com/novoresume-review/ **[unverified]**).
- *AI bullet generation as a category.* Rezi's "Generate Bullet With Key Numbers" is the
  demand; its generation half is where the hallucinations live (in-repo verified; §3.3).

---

## 5. Feature opportunities for BettaResume

### A. Obvious + on-principle — implement now

1. **Determinism + evidence spans on every named check** (small): same input ⇒ identical
   findings, asserted in a test; each JD-match finding cites the JD span that demanded
   it. Direct answer to Jobscan's 85/61 nondeterminism (§3.1). Nobody does this.
2. **Export-time "what the parser sees" panel** — plain-text test with copy button and
   named violations against the *actual exported bytes* (this is roadmap Feature 2 + the
   promised plain-text test; the research confirms the want is real and unfilled by
   builders — §3.5).
3. **Acronym dual-form reminder in JD match** — "write both `AWS` and `Amazon Web
   Services`" (roadmap's Workday finding, in-repo verified). Zero competitors do it;
   cheap and uniquely credible.
4. **Never-charge-at-download / no-watermark pledge**, stated in README + marketing and
   test-pinned like the other marketing claims (`test/marketing-claims.test.ts`). Costs
   nothing; answers the category's #1 complaint (§3.6).
5. **Detect-not-invent metric prompts** (roadmap Feature 7), with VMock's six bullet
   parameters adopted as the named rule list: action-oriented, active voice, specifics,
   over-usage, filler words, bullet length (VMock manual **[verified]**), plus duty-language
   regex. If a rewrite is ever requested, generate *questions to answer*, not answers.
6. **"This is not what an employer sees" disclaimer** on the review surface (roadmap
   compliance posture). Enhancv's "score trap" confusion (§4) shows exactly how users
   misread checkers; our wording should pre-empt it.
7. **Live page-fit warning** (orphan lines / section overflow / bullet count per role)
   while editing — moderate evidence (§3.8), small effort on top of existing page-count
   and Rezi-rule checks already planned in UI-FEATURE-PASS Wave 3.

### B. On-principle but needs maintainer design/vision input

1. **Cover-letter document type.** Every competitor ships one (Kickresume, Rezi,
   Novoresume, Reactive Resume **[verified]**). On-principle (user writes the claims) but
   needs a decision on data model (is it a resume variant? a sibling document?).
2. **Share links** (read-only public or password-protected URL — Reactive Resume
   **[verified]**, VisualCV/FlowCV **[unverified]**). Privacy/self-hosting story makes
   this delicate; needs the maintainer's data-posture ruling.
3. **Resume view analytics** ("who opened my CV" — VisualCV/FlowCV Analytics
   **[unverified]**). Real want, but it is tracking infrastructure one step from a
   tracker; explicit ruling needed.
4. **Full "diff any two revisions"** (we currently diff version-vs-current;
   UI-FEATURE-PASS 8.2 flagged the overclaim). Product is easy; the question is whether
   diff UX is worth polishing now vs later.
5. **More templates vs the "Three templates" marketing claim** (UI-FEATURE-PASS 5.4
   pinned by two tests). A 4th template is a marketing + authoring job; sequencing call.
6. **Tiered import external adapters (BYO parser key)** — roadmap Feature 4 Tier 2;
   budget/privacy call on which adapters.
7. **Multi-language / RTL** (Reactive Resume ships 54 languages **[verified]**). Genuine
   differentiator for EU users alongside self-hosting; needs a product-language decision.
8. **Job-prep workspace** (Reactive Resume v5 has per-job interview prep + offer
   comparison **[verified]**). Strong demand signal, but every version of this drifts
   toward the rejected tracker; scope ruling required before any design.

### C. Off-principle — rejected, do not drift

1. **Auto-apply / form autofill** (Rezi Chrome extension **[verified]**, Jobscan Auto
   Apply **[unverified]**, Wobo/JobStep **[verified/unverified]**). ROADMAP-rejected:
   scraping arms race, EU AI Act Annex III / NY LL144 pull, and now visibly commoditised.
2. **Application/CRM tracker** (Teal Job Tracker with "excitement" ranking
   **[verified]**; Reactive Resume's tracker **[verified]** — even OSS drifts here).
   ROADMAP-rejected. `metadata.jobTarget` is the on-principle remnant and already exists.
3. **Any 0–100 composite score** (Rezi Score, VMock, Enhancv, Teal %, Jobscan %, Reactive
   Resume checker). The category's documented trust failure (§3.1, §4).
4. **Hidden-keyword "ATS Hack Mode"** (Rezi, June 2024). Deception in a signed document,
   and detectable (§4). Keep the public "never" pledge.
5. **LLM generation of bullets/metrics** (Rezi/Teal/Kickresume AI writers; documented
   hallucinations §3.3). Fabricated claims in a signed document. Detection yes,
   invention no.
6. **Per-ATS scoring à la Jobscan** — ROADMAP-rejected as commoditised; the research
   agrees (the long tail of micro-checkers is itself the evidence).
7. **Blind keyword-stuffing suggestions** ("add these keywords to increase match" —
   Teal/Jobscan pattern **[verified/unverified]**). Where a keyword maps to a claim the
   user never made, it is invented content. Our required-vs-preferred evidence match is
   the honest form.

---

## 6. How to make our existing features better (vs what competitors do well)

- **Parser-fit review (Feature 2 / rubric surface).** Reactive Resume and OpenResume show
  extracted text too; we win by anchoring each finding to the *exported bytes*, the exact
  Typst setting to change, and a determinism guarantee (A1/A2). Add the hidden-text
  detector note: our exported PDFs contain no invisible text by construction — make that
  a named check so the JD2CV-style trap is *provably* absent
  (https://jd2cv.uk/blog/invisible-white-text-ats-hack-tested **[verified]**).
- **Job-target matching (Feature 5).** Jobscan's keyword lists drown in soft skills
  ("interpersonal") and company-background words (resumity digest **[unverified]**); fix:
  only flag terms traceable to a JD requirement span, weight required 3:1 over preferred
  (roadmap), emit both acronym forms (A3), and name the section where the term should
  live rather than counting occurrences. Rezi's rule set (400–1600 words, 3–6 bullets) is
  a sane Brevity baseline to adopt as named checks (in-repo verified).
- **Variants.** Teal proves check/uncheck toggling is the beloved interaction
  (resumegenius **[verified]**); Rezi proves sync-less duplication is fatal (in-repo). Our
  linked/detached model is stronger than both — protect it by keeping
  toggle-to-export fast (roadmap instrumentation) and surfacing "Update Available"
  divergence prominently (this is the anti-Rezi feature).
- **Content library.** Already ahead of Teal (placement divergence beats a flat toggle
  list). Improvement: import lands as *unreviewed items* with per-field confidence
  (roadmap Feature 4) — no competitor does review-gated import well; we shipped the gate
  (UI-FEATURE-PASS 5.2) and should keep every entry point behind it.
- **Revision history.** Category-zero feature (confirmed: no commercial builder has it,
  §3.4). Improvement: implement true any-two diff so the marketing claim can be restored
  honestly, and consider contentHash-deduped "session" grouping (roadmap) so the list
  reads like Overleaf's history people already love.
- **Export.** Ship DOCX as "parse-optimised" vs PDF "visual fidelity" labels (roadmap);
  keep `Name-Role.pdf` naming (shipped); add the page-fit live warnings (A7); consider a
  Markdown export since Reactive Resume proves there is a portable-text audience
  (**[verified]**).
- **Grading surface.** Keep named pass/fail checks ranked by effort (UI-FEATURE-PASS
  4.1). Steal from VMock the *breadth* of named rules (six bullet parameters, structure
  checks — **[verified]**) and from Enhancv the inline writing-coach placement
  (**[unverified]**), never their number. Add the "not what an employer sees" disclaimer
  (A6).
- **Import.** Keep tiered design; the plain-text/paste-and-parse audience (§3.5) suggests
  also accepting a pasted JD as a *job target* with zero friction — Teal's JD import is
  the bar (resumegenius **[verified]**).
- **Marketing honesty as a feature surface.** Competitors bury the free-tier truth at
  download time (the category's most-verified complaint). Put the full "what's free"
  table on the marketing page and pin it with tests like `marketing-claims.test.ts` —
  honesty is our positioning, so it should be checkable, not just claimed.

---

## 7. Open questions for the maintainer

1. Share links (read-only, optional password) — allowed by the privacy posture, and if
   so, hosted on our origin or user-controlled? (B2)
2. Are cover letters in scope as a first-class document type, and how do they relate to
   resume variants? (B1)
3. Is "who viewed my resume" analytics acceptable at all, or tracker-adjacent by
   definition? (B3)
4. Template #4: do we update the marketing/tests first (the known blocker from
   UI-FEATURE-PASS 5.4), and is template count a stated commitment?
5. Do we want "diff any two revisions" now, or is version-vs-current acceptable with the
   claim removed? (B4)
6. Where exactly is the line for job-prep tooling (Reactive Resume v5 territory):
   everything that doesn't store application state, or nothing? (B8)
7. Multi-language/RTL — is the target user base global or US/EU-ATS-first? (B7)
8. Do we codify determinism of all checks as a tested product promise? (A1)
9. Do we publish the "free forever, no watermark, no download paywall" pledge formally?
   (A4)
10. Which "Prismic/Ashby resume guides" did the brief mean? The Ashby-side material is
    reachable via third parties (§1-D); a Prismic resume guide could not be located —
    please supply the intended URL if a specific one matters.

---

## Appendix — source list (most-cited)

| Source | Type | Used for |
|---|---|---|
| https://www.wobo.ai/blog/rezi-review | competitor review (admitted) | Rezi free tier, score, ATS Hack Mode, user-count discrepancy |
| https://www.reddit.com/r/jobsearchhacks/comments/1d9akhh/ | first-party (Rezi founder) | ATS Hack Mode announcement, June 2024 |
| https://jd2cv.uk/blog/invisible-white-text-ats-hack-tested | documented test | hidden keywords survive parsing, duplication risk |
| https://resumegenius.com/reviews/teal-resume-builder-reviews | reviewer hands-on | Teal pricing, match %, check/uncheck tailoring, AI issues |
| https://www.reddit.com/r/jobsearchhacks/comments/1li07kk/ | Reddit (read directly) | Jobscan 85/61 nondeterminism, Teal 40% |
| https://www.resumity.org/jobscan-reddit | counted digest (20 threads/93 replies) | Jobscan criticism pattern, ChatGPT substitution |
| https://www.reddit.com/r/resumes/comments/13ythi1/ | Reddit (read directly) | one hour per tailored resume; Resume Worded accuracy doubt |
| https://www.careerkit.me/blog/kickresume-review | competitor review (admitted) | Kickresume pricing (EUR), Trustpilot 3,831 reviews, AI-cap complaints |
| https://hiredradar.com/novoresume-review/ | competitor review | Novoresume watermark, pricing, Zety-family trial traps |
| https://resumeoptimizerpro.com/blog/flowcv-alternative | competitor review + vendor test | FlowCV free tier; multi-column parse-rate table (unverified numbers) |
| https://hireflow.net/blog/is-resume-wordeds-ats-score-accurate | analysis | third-party score vs real ATS gap; Workday-extraction case |
| https://atsresumechecker.ai/blog/enhancv-review | competitor review | Enhancv design-vs-parser, score trap, free-build-not-download |
| https://cdn.uconnectlabs.com/wp-content/uploads/sites/139/2024/08/VMock-Guide_SMART-Resume.pdf | official vendor manual | VMock 0–100, 3 modules, cohort benchmarking, 6 bullet params |
| https://www.biginterview.com/get-big-resume | first-party | school-configurable rubrics, AI review |
| https://rxresu.me/ | first-party | Reactive Resume features, formats, ATS checker w/ extracted text |
| https://www.open-resume.com/ | first-party | constrained-by-design editor, parser, local-only data |
| https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs | first-party | Jake's Resume, Overleaf collab/versioning |
| https://standardresume.co/pricing | first-party | free preview vs paid PDF download |
| https://hrsea.economictimes.indiatimes.com/.../125151204 | news on vendor survey | 92% recruiters / no auto-reject (n=25, vendor-run) |
| https://ooofferly.com/blog/ats-resume-checker | secondary | "75% auto-reject" myth trace to Preptel 2012 |
| https://www.applyvita.com/ats-guides/ashby ; https://pastthebots.com/ats-directory/ashby | ATS-side guides | Ashby parsing specifics; "vendors don't publish parsers" |
