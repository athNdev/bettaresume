/**
 * Date formatting for everything the user reads.
 *
 * `settings.dateFormat` has been part of the schema since the beginning, offered in the
 * settings UI as a four-way choice, and **nothing read it**. The PDF, the preview and the
 * plain-text export all printed the stored value verbatim, so a resume configured for
 * "MMM YYYY" exported `2020-09 - 2024-05`. A control that does nothing is worse than a
 * control that is missing: it is a promise the document visibly breaks.
 *
 * One implementation, three consumers (Typst serialiser, HTML preview, plain-text
 * export), because three copies of a date formatter is three chances to disagree.
 */

export type DateFormat = "MM/YYYY" | "MMM YYYY" | "MMMM YYYY" | "YYYY";

const SHORT_MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const LONG_MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * Parse the shapes the editor actually stores.
 *
 * The date inputs are `<input type="month">`, so the canonical value is `YYYY-MM`.
 * A few paths write `YYYY-MM-DD` or a bare `YYYY` (a hand-edited import, an older
 * record), and those should format rather than pass through unformatted.
 *
 * Anything unrecognised is returned untouched: a value this function does not
 * understand is more useful shown as-is than blanked.
 */
function parse(value: string): { year: number; month: number } | null {
	const trimmed = value.trim();
	const monthMatch = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(trimmed);
	if (monthMatch) {
		const year = Number(monthMatch[1]);
		const month = Number(monthMatch[2]);
		if (month >= 1 && month <= 12) return { year, month };
		return null;
	}
	const yearOnly = /^(\d{4})$/.exec(trimmed);
	if (yearOnly) return { year: Number(yearOnly[1]), month: 0 };
	return null;
}

/**
 * Format one stored date for display.
 *
 * @param value  the stored value, e.g. `"2024-05"`
 * @param format the user's choice; defaults to `"MMM YYYY"`
 * @param empty  what to return for an empty value (default `""`)
 */
export function formatResumeDate(
	value: string | null | undefined,
	format: DateFormat | string | undefined,
	empty = "",
): string {
	if (!value || value.trim() === "") return empty;

	const parsed = parse(value);
	if (!parsed) return value.trim();

	const { year, month } = parsed;

	// A year-only value cannot honour a month format, and inventing "Jan" would be a
	// claim the document does not support.
	if (month === 0) return String(year);

	switch (format) {
		case "MM/YYYY":
			return `${String(month).padStart(2, "0")}/${year}`;
		case "MMMM YYYY":
			return `${LONG_MONTHS[month - 1]} ${year}`;
		case "YYYY":
			return String(year);
		default:
			// `MMM YYYY` is the schema default and the most parseable of the four.
			return `${SHORT_MONTHS[month - 1]} ${year}`;
	}
}

/**
 * `Sep 2020 - Present`, or `Sep 2020 - May 2024`, or `""` when there is no start.
 *
 * The separator matches the Typst template's `date-range` helper, which is what the PDF
 * draws, so the text export and the document agree character for character.
 */
export function formatDateRange(
	start: string | null | undefined,
	end: string | null | undefined,
	isCurrent: boolean | undefined,
	format: DateFormat | string | undefined,
): string {
	if (!start || start.trim() === "") return "";
	const from = formatResumeDate(start, format);
	const to = isCurrent ? "Present" : formatResumeDate(end, format);
	return to === "" ? from : `${from} - ${to}`;
}

/** Array of months, exported for the settings UI's preview text. */
export const MONTH_NAMES = { short: SHORT_MONTHS, long: LONG_MONTHS };
