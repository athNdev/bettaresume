// Regenerates public/templates/*.svg from the real Typst pipeline.
//
// Thin wrapper around `test/template-gallery.test.ts`, which owns the rendering: the test
// already compiles every template to compare against the committed file, so "regenerate"
// is the same work with the comparison replaced by a write. Running it through the test
// keeps one implementation of the render instead of a second script that can drift.
//
// `cross-env` is not a dependency, and a bare `FOO=1 vitest` does not work in cmd.exe, so
// the environment is set here.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const vitest = path.join(
	path.dirname(require.resolve("vitest/package.json")),
	"vitest.mjs",
);

const result = spawnSync(
	process.execPath,
	[vitest, "run", "test/template-gallery.test.ts"],
	{
		stdio: "inherit",
		env: { ...process.env, UPDATE_TEMPLATE_GALLERY: "1" },
	},
);

process.exit(result.status ?? 1);
