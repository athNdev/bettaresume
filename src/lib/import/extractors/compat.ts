/**
 * The two recently-standardised built-ins pdf.js relies on.
 *
 * Both are behind a feature test and both are the specification's semantics, not an
 * approximation. They live in their own module so the reason they exist is readable in
 * one place instead of scattered through the extractor.
 *
 * ## Why polyfill at all
 *
 * pdf.js is the reference PDF implementation and the only serious option for a text layer
 * in the browser. Every maintained release -- 4.10, 5.7, 6.4 -- calls both of these, so
 * there is no version to downgrade to. The alternative is shipping an old library with
 * known advisories to avoid twenty lines, which is the worse trade.
 *
 * ## What it costs the product
 *
 * A browser without these would have thrown inside `pdf.js` and produced an import error
 * with no explanation. With them, pdf.js runs on Chrome 128+, Firefox 134+, Safari 18.4+
 * and Node 20.16+/22.13+ -- a wider range than pdf.js 6.4 claims for itself, and the
 * floor this app already targets.
 */

/**
 * `Promise.try(fn, ...args)`
 *
 * Stage 4, in V8 from 13.6 (Node 23, Chrome 128). Not in Node 22, whose V8 is 12.4.
 * pdf.js uses it in every stream and message handler, so without it every parse fails at
 * the first chunk.
 *
 * A synchronous throw becomes a rejection, and the return value goes through `resolve`,
 * so a returned promise is awaited rather than adopted one level deep -- which is the
 * part that is easy to get wrong.
 */
function installPromiseTry(): void {
	if (typeof (Promise as { try?: unknown }).try === "function") return;
	Object.defineProperty(Promise, "try", {
		configurable: true,
		writable: true,
		value: function promiseTry<T, A extends unknown[]>(
			fn: (...args: A) => T,
			...args: A
		): Promise<Awaited<T>> {
			return new Promise((resolve, reject) => {
				try {
					resolve(fn(...args) as Awaited<T>);
				} catch (cause) {
					reject(cause);
				}
			});
		},
	});
}

/**
 * `Uint8Array.prototype.toHex()`
 *
 * Used by pdf.js for document fingerprints. Newer than `Promise.try` and with less
 * browser coverage, so the floor it sets is the one that matters.
 *
 * Lower-case hex, two characters per byte, which is what the specification requires and
 * what the two pdf.js call sites assume.
 */
function installUint8ArrayToHex(): void {
	if (typeof (Uint8Array.prototype as { toHex?: unknown }).toHex === "function")
		return;
	Object.defineProperty(Uint8Array.prototype, "toHex", {
		configurable: true,
		writable: true,
		value: function toHex(this: Uint8Array): string {
			let out = "";
			for (const byte of this) out += byte.toString(16).padStart(2, "0");
			return out;
		},
	});
}

installPromiseTry();
installUint8ArrayToHex();
