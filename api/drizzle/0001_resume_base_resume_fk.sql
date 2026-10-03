-- Give Resume.baseResumeId a real self-referencing FK to Resume(id).
--
-- SQLite cannot ALTER TABLE ... ADD CONSTRAINT, so the only way to add a FK to an
-- existing column is the table-rebuild pattern. That rebuild is NOT safe as
-- drizzle-kit emits it: it runs `DROP TABLE Resume`, and Section.resumeId is
-- ON DELETE CASCADE, so dropping the parent deletes every section row. drizzle-kit
-- guards this with `PRAGMA foreign_keys=OFF`, but that pragma is a no-op inside a
-- transaction, and D1 may wrap migrations in one -- which silently wipes Section.
--
-- Verified against better-sqlite3 in both cases: with the pragma-only form, a
-- rebuild inside a transaction takes Section from 2 rows to 0. `defer_foreign_keys`
-- does not help, because DROP TABLE fires cascade deletes immediately rather than
-- deferring them.
--
-- So: snapshot Section into a scratch table first (unreachable from the main-DB
-- cascade), clear it, rebuild Resume, then restore. Verified to preserve rows and
-- leave the FK enforced both inside and outside a transaction.
--
-- The scratch table is a ORDINARY table, not `CREATE TEMP TABLE`. TEMP requires
-- attaching SQLite's separate temp database, and miniflare's local D1 sandboxes that:
-- it fails the whole migration with `not authorized: SQLITE_AUTH`. An ordinary table
-- works identically for this purpose because it declares no foreign key, so
-- `DROP TABLE Resume`'s cascade cannot reach it -- which is the entire reason the
-- backup is needed. Naming it with a `_br_` prefix keeps it clearly transient.
--
-- NOTE: no `PRAGMA foreign_keys=OFF` here, deliberately. It used to be here, and it
-- broke `wrangler d1 migrations apply --local` with `not authorized: SQLITE_AUTH`,
-- because miniflare's local D1 sandboxes PRAGMA statements. That made
-- `npm run db:reset` / `db:reset-seed` -- and therefore the documented
-- `npm run dev` setup path -- fail outright, on a clean checkout.
--
-- It was never load-bearing. Section is snapshotted into a TEMP table and then fully
-- cleared BEFORE `DROP TABLE Resume`, so the parent-delete cascade has no child rows
-- left to remove. The TEMP snapshot is unreachable from the main-DB cascade, which is
-- the actual protection. Removing the PRAGMA removes no safety; it removes the failure.
UPDATE `Resume` SET `baseResumeId` = NULL WHERE `baseResumeId` IS NOT NULL AND (`baseResumeId` = `id` OR `baseResumeId` NOT IN (SELECT `id` FROM `Resume`));--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `_br_section_backup` AS SELECT * FROM `Section`;--> statement-breakpoint
DELETE FROM `Section`;--> statement-breakpoint
CREATE TABLE `__new_Resume` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`variationType` text DEFAULT 'base' NOT NULL,
	`baseResumeId` text,
	`domain` text,
	`template` text DEFAULT 'minimal' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`isArchived` integer DEFAULT false NOT NULL,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`baseResumeId`) REFERENCES `Resume`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_Resume`("id", "userId", "name", "variationType", "baseResumeId", "domain", "template", "tags", "isArchived", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "name", "variationType", "baseResumeId", "domain", "template", "tags", "isArchived", "metadata", "createdAt", "updatedAt" FROM `Resume`;--> statement-breakpoint
DROP TABLE `Resume`;--> statement-breakpoint
ALTER TABLE `__new_Resume` RENAME TO `Resume`;--> statement-breakpoint
INSERT INTO `Section` SELECT * FROM `_br_section_backup`;--> statement-breakpoint
DROP TABLE `_br_section_backup`;--> statement-breakpoint
CREATE INDEX `Resume_userId_idx` ON `Resume` (`userId`);--> statement-breakpoint
CREATE INDEX `Resume_baseResumeId_idx` ON `Resume` (`baseResumeId`);
