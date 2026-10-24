# Brief: Competitor research

You are a product researcher. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/competitor-research.md`.

## Why

Deep, multi-dimensional competitor research across every area users want in a resume app: what more we can provide while staying within this project's principles, and how we can make existing features better. The output feeds work items and epics.

## Repo context

`C:\research_learning_new\bettaresume` — resume builder SPA (Next.js 16 static export on GitHub Pages, Cloudflare Worker + tRPC + D1, Clerk auth). Read `CLAUDE.md`, `docs/ROADMAP.md`, `docs/AGENT-CONTEXT.md`, `docs/UI-FEATURE-PASS.md`, `docs/USER-STORIES.md` first so you know what exists.

Current capabilities (verified): 13 section types, 3 templates, PDF/DOCX/TXT/JSON export, PDF/DOCX/Markdown/text/JSON import, variant (fork) system with per-section linked/detached semantics, content library with placement divergence, automatic + named revision history with diff/restore, a parser-fit review (named checks, no score), job-target matching (required vs preferred, acronyms, ambiguity), contrast/legibility checks, Typst-based typesetting with font embedding.

## Non-negotiable principles (from docs/ROADMAP.md)

- **No auto-apply.** No job-board integration, no one-click apply.
- **No application tracker.** Explicitly rejected — it becomes a CRM and pulls toward auto-apply.
- **No 0–100 composite score.** Named pass/fail checks only. A score predicts software that was never run.
- **No hidden-keyword "ATS Hack Mode".** No keyword stuffing, no white text.
- **No invented content.** Nothing writes a claim the user did not make. No generated bullets, no fabricated metrics.
- **No LLM metric invention.**
- Single-column text layer is a structural guarantee for ATS parsing.

## Competitors to research deeply

Teal, Rezi, Kickresume, Novoresume, FlowCV, Resume Worded, Zety, Standard Resume, Enhancv, VisualCV, Jobscan, Overleaf (LaTeX resume templates), Reactive Resume, RxResu.me, OpenResume, Jake's Resume, Prismic/Ashby resume guides, plus at least two ATS-facing tools (Jobscan, Vmock, Big Interview).

For each, cover dimensions:
- Editor model (block-based vs free-form vs form), and how flexible it actually is
- Templates and how they are generated
- Page-fit and length control
- Grading/analysis: what they check, what they score, how honest it is
- ATS features and claims (and whether they are credible)
- Import/export formats
- Versioning / variants / tailoring workflow
- Content library / reusability
- Collaboration, comments, sharing
- Pricing and what is free
- What users complain about (search Reddit, Hacker News, G2, Trustpilot, product forums)

## Deliverable structure

1. **Landscape map** — who is who, positioning, who is credible.
2. **Feature matrix** — dimensions × competitors, and where we already win/lose/parity.
3. **What users actually want but nobody does well** — evidence-backed.
4. **Honesty audit** — which competitor claims are true, which are marketing. This matters: our whole positioning is credibility.
5. **Feature opportunities for us, split into three buckets:**
   - **A. Obvious + on-principle** — implement now.
   - **B. On-principle but needs design/vision input** — flag for the maintainer.
   - **C. Off-principle** — say why, so we do not quietly drift.
6. **How to make our existing features better** — concrete, per feature, referencing what competitors do better.
7. **Open questions for the maintainer.**

Be specific and cite URLs. Prioritise evidence over opinion.
