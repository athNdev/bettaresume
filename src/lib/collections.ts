/**
 * Reorder one list entry, moving the rest around it.
 *
 * Every section form has an up/down control, and each one implemented the swap by hand:
 *
 *     const temp = newData[index]!;
 *     newData[index] = newData[newIndex]!;
 *     newData[newIndex] = temp;
 *
 * Two non-null assertions per form, nine forms, all for a range check the caller has
 * already done. TypeScript cannot narrow an array index under `noUncheckedIndexedAccess`,
 * so the `!` was the only way to make the swap typecheck — and it silenced the one check
 * that would catch a stale index after a delete.
 *
 * An out-of-range move returns the list unchanged rather than throwing. The caller's
 * bounds test is a guard, not an invariant: this runs inside a `setState` updater, where
 * throwing would replace the form with an error boundary over a click on a disabled
 * button.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
	const result = [...list];
	const moving = result[from];
	const displaced = result[to];
	if (moving === undefined || displaced === undefined) return result;
	result[from] = displaced;
	result[to] = moving;
	return result;
}

/**
 * Pair each entry with a stable key, without using its position.
 *
 * Lists in resume content are arrays of plain strings — achievements, technologies,
 * highlights. React needs a key, and the only identity those strings have is their text,
 * which is not unique: two bullets can legitimately start the same way. Index keys fix
 * the uniqueness and break the identity, so deleting the first of two entries makes React
 * reuse the second element's DOM for the first.
 *
 * The key here is the text plus the number of times that text has already appeared. It is
 * unique within the list, it survives a deletion, and it does not invent an id that the
 * stored shape would have to carry.
 */
export function keyedByContent<T>(
	items: readonly T[],
	keyOf: (item: T) => string,
): Array<{ key: string; item: T }> {
	const seen = new Map<string, number>();

	return items.map((item) => {
		const base = keyOf(item);
		const occurrence = (seen.get(base) ?? 0) + 1;
		seen.set(base, occurrence);
		return { key: `${occurrence}:${base}`, item };
	});
}
