/**
 * Ambient declarations for bundled third-party entry points that ship no types.
 *
 * `pdfjs-dist` ships types for `pdf.mjs` but its worker build is a bare `.mjs` with no
 * `.d.ts` beside it. The worker module is imported by `src/lib/import/extractors/
 * pdf-text.ts` so pdf.js can parse on the main thread (see that file for why), and
 * without this declaration `tsc` fails the whole build with TS7016.
 *
 * Only the member that is actually read is declared. Declaring the rest of the worker's
 * surface would be a claim this file cannot keep honest.
 */
declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
	export const WorkerMessageHandler: unknown;
}