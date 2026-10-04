# Dashboard and editor overhaul plan

Status: active. This is the contract for the work, not a wish list. Each item states the
problem, the change, and how it is proved. Nothing here is "make it nicer".

Last updated: 2026-10-04.

---

## 0. Why this document exists

Two facts shaped everything below.

**Nothing had ever loaded the page.** Until PR #178 every check in this repository read
source files or asserted on strings returned by `renderToStaticMarkup`. A page had never
been opened by a test. Three production defects shipped through a fully green suite:

| Defect | Shipped because |
|---|---|
| Six `Encountered two children with the same key, 1` errors on every landing-page load | React keys are not in HTML output, and `renderToStaticMarkup` does not validate them |
| React #418 hydration mismatch on every load | nothing compared the served HTML with the hydrated DOM |
| A `startsWith(root)` "containment check" that let a sibling directory be read | CodeQL was the only thing looking at the data flow |

All three were found in one browser session. That is the return on the audit harness, and
it is the reason the plan below is written around observation rather than intent.

**The dashboard has not been touched since 2026-03-11.** `dashboard.tsx` is 661 lines and
its git log is seven months cold. The editor was overhauled in PR #171 (+2,222/-214). So
this is one overdue surface and one recently-fixed one, and the plan treats them
differently.

## 1. Standing rules for this work

1. **No control ships that does nothing.** PR #171 established this and it extends here:
   a handler that only logs is a defect, not a stub.
2. **A computed-but-unrendered value is a defect.** Seven lint findings were deliberately
   left firing because they mark values the code computes and never displays (see §2).
   The fix is to render the value, never to delete the binding.
3. **Every fix is verified by trying to make it fail.** Mutate the source, watch the check
   go red, restore it. A test that has never been seen failing is an assumption.
4. **No claim of "verified" without a command and its output.** Including in this document.
5. **Prefer deleting to adding.** The repo's own history: ~2,000 lines of unreachable
   "offline-first" code were removed rather than maintained.

---

## 2. Phase A — make state visible (the five unrendered values)

These are the defects PR #176 documented and deliberately did *not* paper over. Each is a
value the code computes and never shows. All five are small; together they are the
difference between a product that reports its state and one that silently swallows it.

| # | Where | What is invisible | Change |
|---|---|---|---|
| A1 | `rich-text-editor.tsx` | `status` and `error` from `useAutoSave` are destructured and unused — the editor renders **no save state at all** | Render `SaveStatusIndicator` (which already exists and is already built for exactly this) from the editor's own save state |
| A2 | `save-status-indicator.tsx` | accepts an `error` prop and never renders it, though its doc comment promises `"Save failed"` with a retry button | Render the message and pass `onRetry` through |
| A3 | `import-review-panel.tsx` | holds `error` state, calls `setError`, never reads it — **import failures are recorded and never displayed** | Surface the message next to the import control, with the failed file name |
| A4 | `resume-editor.tsx` | `useState` for `designOpen` with no `setDesignOpen` call — the design rail's chevron can never rotate | Either wire the disclosure to the setter, or drop the state and the chevron. Not both, and not neither |
| A5 | `dashboard.tsx` | `user` from the auth store and `isDuplicating` from the mutation hook are both unused | Show who is signed in; surface duplicate-in-progress on the control that triggers it |

> **Phase A is complete (PRs #182–#185).** Every row above is closed at the rendering layer
> and every one of the seven §2.20 findings is zero *because the value is now rendered* — not
> because a binding was deleted. Biome `321 → 312`, `1107` tests passing.
>
> Two rows did not survive contact with the code as written, and the difference is worth
> recording:
>
> - **A5's `user` was not unwired, it was redundant.** `UserMenu` opens the same auth store
>   itself, so the dashboard's subscription was duplicative. The defect was not "the name is
>   unavailable" but "the page has no heading and never names you" — which the plan had not
>   noticed. Fixed by rendering a greeting (`greetingName()` in `dashboard/greeting.ts`), with
>   the email local part as fallback for social logins that carry no name.
> - **A5's `isDuplicating` could not be used as specified.** The plan says "surface
>   duplicate-in-progress on the control that triggers it", but the hook's boolean is
>   dashboard-wide: wired alone it would spin the duplicate control on *every* card at once.
>   It is now used to guard re-entry, with a per-row `duplicatingId` deciding which control
>   shows it. That also closed a real hole — `duplicateResume` is not idempotent.

**Acceptance:** after Phase A, the seven lint findings in `docs/AGENT-CONTEXT.md` §2.20 are
zero, and each is zero *because the value is now rendered*. A test asserts each of the five
surfaces carries the state, not that a variable is unused.

**Proof:** `npx biome check --max-diagnostics=2000 .` drops from 321 with no suppression,
`noUnusedVariables`/`noUnusedFunctionParameters`/`noUnusedImports` all at zero for these
files, and the visual audit shows the states.

---

## 3. Phase B — dashboard

The dashboard's job: get a person to a finished, tailored resume with the least friction.
Today it lists resumes and offers mutations. It does not answer "what should I do next".

### B1. Orientation — who am I, what do I have
`user` is already fetched and unused. The header carries a user menu; the identity is
invisible until you open it. Put identity and resume count in the header, and an empty
state on the list that says what to do when there are no resumes (currently the difference
between "nothing here" and "not loaded yet" is not visible).

### B2. Empty and loading states, distinguished
The repo's hardest-won lesson (`docs/AGENT-CONTEXT.md` §2.15, §2.19) is that a fallback
that renders successfully hides corruption. The dashboard must distinguish, visually and in
the DOM:
- loading (skeleton, announced)
- loaded and empty (guidance + primary action)
- loaded with resumes
- **error** (what failed, and a retry that actually retries)

Today `PanelEmpty`/`PanelError` exist and are used in the editor. The dashboard should use
the same primitives so the two surfaces cannot drift.

### B3. Mutation feedback on every control
`isDuplicating` is unused, so duplicating a resume gives no feedback and no way to tell a
slow duplicate from a failed one. Every mutation (`createResume`, `deleteResume`,
`duplicateResume`, `archiveResume`) gets: disabled-while-pending, an announced result, and
a surfaced failure. This is Phase A5 extended to all four.

### B4. Search and filtering that announces itself
`searchQuery` filters the list client-side. It must declare how many results matched, and
what happens when the query matches nothing — an empty result with no explanation reads as
a broken list.

### B5. Layout and hierarchy
The editor already has the pattern the dashboard lacks: the document gets the room, the
rail is subordinate, nothing collapses to nothing, and the disclosure controls start
collapsed. The dashboard gets the same treatment — a primary column of resume cards, a
secondary rail for filters and account actions, and proportions that survive a narrow
viewport.

**Acceptance for Phase B:** every control has a pending state, a success state and a
failure state; every list has distinct loading/empty/error/loaded renderings; the dashboard
renders without console errors at 390px and 1440px; no unnamed interactive elements.

---

## 4. Phase C — editor

The editor was overhauled in PR #171. This phase is not a redo; it is closing what that
overhaul left open, plus what Phase A exposed.

### C1. Close Phase A in the editor (A1, A2, A4)
The editor's save state is the highest-value item in this document. A user who cannot see
whether their work saved will not trust the editor, and today they cannot see it at all.

### C2. Preview fidelity
PR #153 made the preview match the Typst single-column output and removed the unrendered
sidebar/two-column options from the toolbar. The remaining question is whether the preview
and the export agree at the *pixel* level, which no test has checked because no test has
rendered both. With the browser harness this becomes possible for the first time: render
the preview, export the same resume, compare. Until that comparison exists, "preview
matches export" is a source-level belief.

### C3. Error surfaces converge on one place
`test/editor-view.test.ts` asserts "reports through one surface rather than eight
consoles". That principle now needs extending to *display*: one error region in the editor,
announced to assistive technology, with every producer (autosave, sections, import,
content library, export) feeding it. Today each panel owns its own error rendering, which
is why A3's error state is invisible — it was never connected.

### C4. The rail's disclosures are honest
`designOpen`, `contentOpen`, and the typography group all have state. After A4 every one of
them must be reachable by a keyboard and must actually move something.

### C5. Keyboard and screen-reader pass over the real rendered DOM
The a11y work to date has been contrast ratios and source assertions. With Chromium
available, the editor can be audited as rendered: focus order, names, roles, live regions,
and the disclosure/menu/tab semantics. This is the first time that has been possible.

**Acceptance for Phase C:** save, failure and pending state are visible in the editor for
every producer; the preview/export comparison runs in CI; one error region with
`aria-live`; a keyboard-only pass over every control with no traps; no unnamed controls.

---

## 5. What is deliberately not in this plan

- **Rate limiting** — blocked on Durable Object/KV infrastructure access.
- **Custom editor nodes, content library modelling, resume variants** — blocked on the
  owner decision recorded in `docs/adr/0001-content-model.md`. Phase A/B/C do not depend on
  it, which is why the ordering is safe.
- **A visual-regression screenshot diff** — the harness captures a screenshot and a report
  today. A pixel-diff baseline is deliberately deferred until the harness has a week of
  green runs, because a baseline captured from a page that is already wrong locks the
  wrong thing in.
- **Authenticated browser flows.** The audit cannot reach `/app` past Clerk: sign-in is
  served behind a Cloudflare interstitial that a headless browser cannot solve, and there
  are no Clerk dev keys in the cluster. This is the single largest verification gap and it
  needs the owner — see §7.

---

## 6. How each phase is verified

| Phase | Gates beyond the standing set |
|---|---|
| A | biome count falls with no suppression; a test asserts each state is rendered |
| B | visual audit at 390px and 1440px; a test per state transition; no unnamed controls |
| C | visual audit of the editor; preview/export comparison; keyboard pass over the rendered DOM |

The standing set is unchanged: `npm run typecheck`, `npm test`, the Biome ratchet,
`npm run build`, and `.github/workflows/visual.yml`.

## 7. Blocked on the owner

| Item | Blocks | Evidence |
|---|---|---|
| Clerk dev keys (`pk_test_`/`sk_test_`) | every authenticated browser check — the dashboard and editor are both behind Clerk, so §3 and §4 cannot be visually verified until this exists | no `.env.local`, no `api/.dev.vars`, no Clerk keys anywhere in the cluster; `/app/` navigation ends at a Cloudflare interstitial |
| `CLOUDFLARE_API_TOKEN` with D1 read/write | production migrations 0001 and 0005 are unapplied | `The given account is not valid or is not authorized to access this service [code: 7403]` in today's CD log |
| ADR-0001 decision | custom editor nodes, content library, variants | owner decision recorded in the ADR |
| Cloudflare dashboard access | alternative to the `<!--email_off-->` opt-out if obfuscation is wanted back | per-zone Scrape Shield setting |