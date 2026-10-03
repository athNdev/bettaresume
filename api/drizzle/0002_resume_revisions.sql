-- Append-only revision history for resumes.
--
-- Every commercial resume builder is a black hole you cannot diff: there is no way to
-- see what changed, when, or to get back to a version you liked. This table is the fix,
-- and it is also what makes a future "which variants are stale?" check cheap.
--
-- Design notes:
--
--  * APPEND-ONLY. There is no UPDATE path anywhere in the codebase, and no procedure
--    that mutates a row. That is the property that makes history trustworthy: an
--    append-only log cannot be quietly rewritten.
--
--  * contentHash dedupes snapshots. Saves on the common case of an autosave firing
--    with no actual change, which would otherwise store an identical row every few
--    seconds. The index is UNIQUE so the database enforces it rather than trusting
--    application code to check first.
--
--  * onDelete CASCADE matches Section.resumeId: deleting a resume takes its history
--    with it. A resume revision without its resume is meaningless, and GDPR erasure
--    requires the history to go anyway.
--
--  * seq is per-resume and monotonic. UNIQUE(resumeId, seq) makes a duplicate
--    sequence number impossible even under concurrent writes.

CREATE TABLE IF NOT EXISTS resume_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  resumeId TEXT NOT NULL,
  seq INTEGER NOT NULL,
  -- Full resume snapshot. Deliberately a JSON blob rather than normalised rows: a
  -- diff is computed against snapshots, so normalising would buy nothing and would
  -- make restoring a past version lossy.
  snapshotJson TEXT NOT NULL,
  contentHash TEXT NOT NULL,
  -- Short human label, e.g. "Rewrote summary" or an auto "Autosave".
  label TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (resumeId) REFERENCES Resume(id) ON DELETE CASCADE
);

-- One entry per (resume, sequence). Enforces monotonic history.
CREATE UNIQUE INDEX IF NOT EXISTS resume_revisions_resume_seq_unique
  ON resume_revisions (resumeId, seq);

-- Autosaves repeat identical content; storing each one would bloat the table with
-- rows that carry no information. Enforced by the database, not by application code.
CREATE UNIQUE INDEX IF NOT EXISTS resume_revisions_resume_hash_unique
  ON resume_revisions (resumeId, contentHash);

-- Listing a resume's history newest-first is the only query the UI makes.
CREATE INDEX IF NOT EXISTS resume_revisions_resume_created_idx
  ON resume_revisions (resumeId, createdAt DESC);
