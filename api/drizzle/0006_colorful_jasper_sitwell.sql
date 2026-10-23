-- Linked/detached section semantics for resume variants.
--
-- A variant is a copy of a base resume. Copying gives each section a new id, so nothing in
-- the schema recorded which copy came from which original -- which is why the client used to
-- carry a `linkedToBase` boolean that no column ever stored. Reordering a section, adding one
-- before an existing one, or renaming a section all break matching on `type` or `order`, so the
-- relationship needs an explicit pointer.
--
-- TWO COLUMNS, TWO JOBS:
--
--   baseSectionId  which section in the base resume this row mirrors. NULL for a base
--                  section itself, and for anything the user added to a variant directly.
--   linkedToBase   whether it still follows that original. Editing a linked variant
--                  section clears this: taking a section over is a local edit, and it should
--                  not require a second, separate gesture.
--
-- ON DELETE SET NULL on the pointer, deliberately. Deleting a section from the base must
-- orphan the variant's copy -- which then behaves as an ordinary detached section -- rather
-- than cascade-delete content from a document the user may already have exported and sent.
--
-- A plain `ALTER TABLE ... ADD COLUMN` is enough for both. The new pointer column defaults to
-- NULL, which is the one case SQLite permits a REFERENCES clause on ADD COLUMN, and the
-- boolean has a non-null default so existing rows get a value without a backfill. No table
-- rebuild, so Section.resumeId's ON DELETE CASCADE is never fired by this migration.
ALTER TABLE `Section` ADD `baseSectionId` text REFERENCES `Section`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `Section` ADD `linkedToBase` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `Section_baseSectionId_idx` ON `Section` (`baseSectionId`);
