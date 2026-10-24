# Backup and restore

The Worker and the static site are rebuildable from this repository in minutes. The
D1 database is not: it holds every user's resumes, and nothing else has a copy.

## What runs automatically

`.github/workflows/backup.yml` exports the production database every night at **03:17
UTC** and keeps the result as a workflow artifact for **90 days**.

Each run does more than download bytes. It loads the export into a real SQLite
database, asserts that every table the app reads exists, asserts that `User`,
`Resume` and `Section` hold at least one row, and runs `PRAGMA foreign_key_check` to
prove the data is internally consistent. A backup that cannot be restored fails the
workflow instead of being archived, because an archive that only looks like a backup
is worse than no archive at all.

Retrieve one:

```bash
gh run list --workflow=backup.yml --limit 5
gh run download <run-id> -n d1-backup-YYYY-MM-DD
gunzip -k d1-backup-YYYY-MM-DD/backup.sql.gz
```

## Exporting by hand

The workflow talks to the D1 export API directly rather than to
`wrangler d1 export <name>`, because `api/wrangler.jsonc` carries
`$D1_DATABASE_ID`-style placeholders that CI substitutes at deploy time and a backup
job should not need that substitution to run. The API needs an account id, a database
id and a token:

```bash
ACCOUNT=4f5bf2f9afb0b33d026dd96ca66e3c20
DB=870de713-e81b-4e96-aa87-f2b7a785820b

# 1. Start the export. It runs asynchronously and is CANCELLED if it stops being polled.
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/d1/database/$DB/export" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"output_format":"polling"}'
# -> .result.status, .result.at_bookmark, and on completion .result.result.signed_url

# 2. Poll, passing the bookmark back each time.
curl -sS -X POST ... \
  -d '{"output_format":"polling","current_bookmark":"<at_bookmark>"}'

# 3. Download within the hour. The signed URL expires.
curl -sS -o backup.sql "<signed_url>"
```

The database is briefly unavailable to serve queries while the export runs. That is
why the schedule is 03:17 UTC.

`wrangler d1 export "$D1_DATABASE_NAME" --remote --output backup.sql` also works, but
only from a checkout where the placeholders in `api/wrangler.jsonc` have been
substituted (see the "Substitute wrangler config placeholders" step in
`.github/workflows/cd.yml`).

## Restoring

### The one non-obvious part

**Load with foreign keys disabled.**

D1 writes the export's tables in an order that does not respect their foreign keys:
`Section` appears before `Resume`, and its `INSERT`s name a parent table that does not
exist yet. SQLite refuses to *prepare* such a statement while enforcement is on, with
`no such table: main.Resume` — even though the export itself opens with
`PRAGMA defer_foreign_keys=TRUE`, which only defers checks on tables that already
exist.

So the sequence is: turn enforcement off, load, then verify.

```bash
{ echo "PRAGMA foreign_keys=OFF;"; cat backup.sql; } | sqlite3 restore.db
sqlite3 restore.db "PRAGMA foreign_key_check;"   # must print nothing
```

### Into a local database

Use this to inspect a backup, or to reproduce a user's report:

```bash
npm run db:reset -w api                       # create an empty local D1
npm run db:migrate -w api                     # schema only
# Then copy the data across, table by table, from the export's INSERT statements.
```

Loading the whole export over a freshly migrated database also works and is faster,
but it replaces the schema as well as the data, so it is the right choice only when
you want to reproduce production exactly.

### Into production

This is destructive and there is no undo beyond the backup you are holding. Do it
deliberately:

1. Download and verify the backup you intend to restore (restore it into SQLite and
   run `foreign_key_check` as above).
2. Take a *fresh* export of the current production database first. If the restore
   goes wrong, this is the only way back.
3. Apply the schema as it exists in this repository — do not trust an old dump's
   schema if migrations have run since:

   ```bash
   cd api
   npx wrangler d1 migrations apply "$D1_DATABASE_NAME" --remote
   ```

4. Load the data. Split the export into schema and data (`--no-data` and `--no-schema`
   produce each half) and apply only the data half, so the live schema is the one this
   repository declares:

   ```bash
   npx wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=data.sql
   ```

5. Check `/health`, then open a resume in the app and confirm sections load. A schema
   that does not match the Worker is the failure mode that took the editor down on
   2026-10-24; `resume.getById` selects every `Section` column, so a missing column
   breaks the whole editor rather than one field.

### Restoring a single user's data

Prefer this over a full restore. Find the user id, then export that subset from a
local copy of the backup:

```bash
sqlite3 restore.db ".mode insert Resume" \
  "select * from Resume where userId = '<clerk-user-id>';" > user-resume.sql
```

Re-insert with `wrangler d1 execute --remote --file=user-resume.sql`. The user must
already exist in `User`, because `Resume.userId` references it.

## What is *not* covered

- **No point-in-time recovery.** D1's Time Travel (30 days, `wrangler d1 time-travel`)
  is the closest thing, but it is a paid-plan feature and this project is not
  rehearsing it. The nightly export is the recovery story.
- **Artifacts expire.** After 90 days the backup is gone. If the product ever holds
  data anyone would pay to keep, export to R2 as well; that is a decision about cost,
  not about correctness, so it is left to whoever owns the bill.
