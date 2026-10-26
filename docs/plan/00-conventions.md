# Shipping conventions

Everything ships as a PR to `main`. This is not negotiable — CI is the only gate, and a direct push to `main` skips it.

## The loop

1. **Branch** from an up-to-date `main`:
   ```
   git fetch origin && git switch -c <type>/<short-name> origin/main -q
   ```
2. **Work.** Keep the diff focused. One concern per PR.
3. **Verify locally before pushing** (see the checklist below).
4. **Commit.** Identity:
   ```
   git -c user.name="Atharv N" -c user.email="55657682+athNdev@users.noreply.github.com" commit
   ```
   Message style: imperative, subject ≤50 chars, capitalised, no trailing punctuation. Body wrapped at 72. Omit the body if the subject says it all. **Do not commit `.pr-body.md`.**
5. **Push and open a PR** with `gh pr create`. Write a body that explains *why*, not just what.
6. **Wait for CI.** `gh pr checks <n>`. Fix failures; do not merge red.
7. **Merge**: `gh pr merge <n> --merge --admin`.
8. **Move the Plane item** to Done and add a resolution comment.

## Worktrees — the shared parent is shared

Several agents run in this repo at once, each in its own worktree under `.worktrees/`.
**Never delete `.worktrees/` itself.** An agent did (`rm -rf .worktrees`, thinking it was
its own scratch directory) and it destroyed two concurrent agents' checkouts. Always:

create your own:  `git worktree add .worktrees/<your-unique-name> -b <branch> origin/main`
clean up only it: `git worktree remove .worktrees/<your-unique-name>`
never:            `rm -rf .worktrees`, `git worktree prune`, `git clean -fdx` at the parent

Also: `git worktree prune` and a `reset --hard` in the main checkout can invalidate a
sibling's worktree mid-run. Leave other worktrees alone entirely.

## Local verification checklist

```
npm run build:types
npm run typecheck
npm run typecheck -w api
npx vitest run
npm test -w api          # see the warning below
npx biome check .
npm run build
```

Biome is gated at a **baseline of 0**. Any finding you introduce fails CI. If you fix
findings, the baseline stays at 0 — never raise `.github/biome-baseline.txt`.

## Two traps that cost real time here

1. **`npm test -w api` deletes the local D1 database.** `migration-portability.test.ts`
   wipes `api/.wrangler/state/v3/d1` by design. Re-run `npm run db:reset-seed` after it,
   or the dashboard will look empty and you will chase a phantom regression.
2. **Kill orphaned `wrangler dev` / `workerd` processes before running the API suite**, or
   you get `EPERM` on that same path. There is a script pattern in `scripts/probe/`.

## Browser verification

Playwright is installed but **must be launched with `channel: "chrome"`** — this host has
Chrome but no Playwright Chromium. `scripts/probe/lib.cjs` exports `launch`, `newPage`,
`goto`, `shoot`, `bodyText`, `openResume`, `waitForEditor`. Screenshots go to
`.probe-shots/`.

```
node scripts/probe-start.cjs api web   # detached
npm run db:reset-seed
node scripts/probe/full-pass.cjs       # 8 checks
node scripts/probe/export.cjs          # PDF + embedded font
node scripts/probe/production.cjs      # against app.bettaresume.com
```

Other traps:
- **Never run two Playwright browser processes concurrently** against the dev server while
  one holds the Typst WASM; the second never mounts within 30s.
- **The dev server serves stale chunks.** `rm -rf .next` and restart before concluding a
  change "did not work".
- `getByRole("button", { name: /^LIBRARY/ })` returns 0 but `{ name: "LIBRARY" }` returns 1 —
  the accessible name has surrounding whitespace. Prefer exact strings.
- The variation selector is `header button` nth(1); its accessible name is the resume name.
- The `terminal` tool intermittently fails with `missing field cd`. Re-issue with an explicit `cd`.
- Write probe files with the file tool, not shell heredocs — `$` and `{}` get mangled.

## Path and lint rules

- Never use `new URL(...).pathname` on Windows. Use `resolve(process.cwd(), p)`.
- Source-absence assertions in tests must use `codeOf()` from `test/helpers/code-source.ts`,
  not raw `readFileSync` — comments otherwise satisfy the assertion.
- CRLF: after editing, normalise with Biome (`npx biome check --write <file>`).
- `scripts/probe/**` is excluded from lint.

## Templates and the gallery

`public/templates/*.svg` are generated. After touching any `.typ`:
```
npm run templates:render
```
`test/template-gallery.test.ts` fails if they are stale.

## The resume text layer is a guarantee

Single column, reading order preserved. `test/preview-matches-exporter.test.ts`,
`test/typst-compile.test.ts` and the text-layer assertions exist to protect it. If a change
would make a multi-column or reordered text layer possible, it is the wrong change.
