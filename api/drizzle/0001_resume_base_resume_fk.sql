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
-- So: snapshot Section into the TEMP schema first (unreachable from the main-DB
-- cascade), clear it, rebuild Resume, then restore. Verified to preserve rows and
-- leave the FK enforced both inside and outside a transaction.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `Resume` SET `baseResumeId` = NULL WHERE `baseResumeId` IS NOT NULL AND (`baseResumeId` = `id` OR `baseResumeId` NOT IN (SELECT `id` FROM `Resume`));--> statement-breakpoint
CREATE TEMP TABLE IF NOT EXISTS `_br_section_backup` AS SELECT * FROM `Section`;--> statement-breakpoint
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
CREATE INDEX `Resume_baseResumeId_idx` ON `Resume` (`baseResumeId`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
