/**
 * Regenerate the showcase section of `api/src/db/seed.sql` from `showcase.json`.
 *
 * The fixture has two consumers — the local dev seed and `user.upsert` on a first
 * sign-in — and this script is how the SQL half stays honest. Everything from
 * `SHOWCASE_SEED_HEADER` to the end of `seed.sql` is replaced; the rest of the dev seed
 * (the demo user and the four hand-written resumes) is left untouched.
 *
 * Run: `npm run showcase:render`
 *
 * `api/test/showcase-seed.test.ts` fails when the committed block and this output differ,
 * so forgetting to re-run is a red test rather than a stale fixture.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	renderShowcaseSqlBlock,
	SHOWCASE_SEED_HEADER,
} from "../src/db/showcase";

const SEED_SQL = fileURLToPath(new URL("../src/db/seed.sql", import.meta.url));

const seed = readFileSync(SEED_SQL, "utf8");
const headerAt = seed.indexOf(SHOWCASE_SEED_HEADER);
if (headerAt === -1) {
	throw new Error(
		`Could not find the showcase header in seed.sql. Expected:\n${SHOWCASE_SEED_HEADER}`,
	);
}

const head = seed.slice(0, headerAt);
const next = `${head}${renderShowcaseSqlBlock()}\n`;

if (next === seed) {
	console.log("showcase: seed.sql is already up to date");
} else {
	writeFileSync(SEED_SQL, next);
	console.log(
		`showcase: rewrote the generated block in api/src/db/seed.sql (${next.length - head.length} bytes)`,
	);
}
