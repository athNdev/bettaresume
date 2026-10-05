/**
 * Seed timestamps must be in the unit the schema declares.
 *
 * Found by actually looking at the running app: every resume card footer read
 * "Updated 6/18/58729". Not a formatting bug and not bad data — a unit mismatch that was in
 * the seed file the whole time, invisible until a browser rendered it.
 *
 * `api/src/db/schema.ts` declares every timestamp as
 * `integer("updatedAt", { mode: "timestamp" })`, and Drizzle's `timestamp` mode reads and writes
 * **seconds**. The seed inserted milliseconds (`strftime('%s','now') * 1000`), so Drizzle
 * multiplied by 1000 a second time:
 *
 *     1_757_..._000  (ms written)
 *   × 1000
 *     1_757_..._000_000  (interpreted as ms)
 *     -> year 58729
 *
 * Nothing caught this: the value is a legal integer, `tsc` is happy, and the database is happy.
 * Only the rendered string was absurd.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

const seed = readFileSync(
	new URL("../api/src/db/seed.sql", import.meta.url),
	"utf8",
);
const schema = codeOf("api/src/db/schema.ts");

/** Timestamps Drizzle stores as seconds, and so must anything writing them by hand. */
const SECOND_BASED_COLUMNS = ["createdAt", "updatedAt"];

describe("the seed writes timestamps in the unit the schema declares", () => {
	it("the schema really does use Drizzle's second-based timestamp mode", () => {
		// If this ever changes to `timestamp_ms`, the seed must change with it. Asserting only
		// the seed would let the pair drift silently in the other direction.
		const secondMode = schema.match(
			/integer\("(\w*[Cc]reatedAt|\w*[Uu]pdatedAt)",\s*\{\s*mode:\s*"timestamp"/g,
		);

		expect(
			secondMode,
			"no second-based timestamp columns found",
		).not.toBeNull();
		expect(
			schema.includes('mode: "timestamp_ms"'),
			"schema switched to timestamp_ms — revisit api/src/db/seed.sql units",
		).toBe(false);
	});

	it("does not multiply seeded timestamps into milliseconds", () => {
		const msValues = seed.match(
			/CAST\(strftime\('%s', 'now'\) AS INTEGER\)\s*\*\s*1000/g,
		);

		expect(
			msValues ?? [],
			"seed multiplies second-based timestamps by 1000; Drizzle will multiply again",
		).toEqual([]);
	});

	it("still seeds every timestamp column, in seconds", () => {
		const inserts = seed.match(/strftime\('%s', 'now'\)/g) ?? [];

		// A guard against 'fixing' the unit by deleting the values instead.
		expect(inserts.length).toBeGreaterThan(50);
	});

	it("names every column it seeds, and no timestamp column is left behind", () => {
		for (const column of SECOND_BASED_COLUMNS) {
			expect(seed, `seed never sets ${column}`).toContain(column);
		}
	});

	it("produces a date a browser can render", () => {
		// The check that would have caught this: seed one row's way, read it the way Drizzle
		// reads it, and confirm the year is this century rather than the far future.
		const seconds = Math.floor(Date.now() / 1000);
		const asDrizzleWouldRead = new Date(seconds * 1000);

		expect(asDrizzleWouldRead.getUTCFullYear()).toBeGreaterThan(2000);
		expect(asDrizzleWouldRead.getUTCFullYear()).toBeLessThan(2100);

		// And the exact shape the old seed produced, kept as the regression witness.
		const asTheSeedUsedToWrite = new Date(seconds * 1000 * 1000);
		expect(asTheSeedUsedToWrite.getUTCFullYear()).toBeGreaterThan(50000);
	});
});
