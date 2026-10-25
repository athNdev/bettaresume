/**
 * Test-side re-export of the shared resolver.
 *
 * The implementation moved to `src/lib/design-system/token-theme.ts` so the
 * `/design-system` page can render *measured* contrast figures from the same
 * code the tests enforce, rather than a hand-maintained copy that drifts. This
 * file stays as the test suite's import path so no test needed rewriting.
 */
export * from "../../src/lib/design-system/token-theme";
