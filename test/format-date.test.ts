import { describe, expect, it } from "vitest";
import { formatDateRange, formatResumeDate } from "../src/lib/format-date";

/**
 * `settings.dateFormat` existed in the schema, was offered in the UI as a four-way choice,
 * and was read by nothing. Every consumer printed the stored value, so a resume configured
 * for "MMM YYYY" exported `2020-09 - 2024-05` in the PDF, the preview and the text export.
 *
 * These pin the four formats plus the shapes that are not `YYYY-MM`, because the failure
 * mode of a date formatter is silence: an unrecognised value passes through looking
 * plausible.
 */

describe("the four offered formats", () => {
	it("MMM YYYY is the schema default and shortens the month", () => {
		expect(formatResumeDate("2024-05", "MMM YYYY")).toBe("May 2024");
		expect(formatResumeDate("2024-09", "MMM YYYY")).toBe("Sep 2024");
	});

	it("MMMM YYYY spells the month", () => {
		expect(formatResumeDate("2024-05", "MMMM YYYY")).toBe("May 2024");
		expect(formatResumeDate("2024-09", "MMMM YYYY")).toBe("September 2024");
	});

	it("MM/YYYY zero-pads the month", () => {
		expect(formatResumeDate("2024-05", "MM/YYYY")).toBe("05/2024");
		expect(formatResumeDate("2024-11", "MM/YYYY")).toBe("11/2024");
	});

	it("YYYY drops the month", () => {
		expect(formatResumeDate("2024-05", "YYYY")).toBe("2024");
	});

	it("defaults to MMM YYYY when the setting is absent", () => {
		expect(formatResumeDate("2024-05", undefined)).toBe("May 2024");
	});
});

describe("the shapes the editor actually stores", () => {
	it("handles a full date by ignoring the day", () => {
		expect(formatResumeDate("2024-05-17", "MMM YYYY")).toBe("May 2024");
	});

	it("handles a year on its own", () => {
		// A year cannot honour a month format, and inventing "Jan" would be a claim the
		// document does not support.
		expect(formatResumeDate("2024", "MMM YYYY")).toBe("2024");
		expect(formatResumeDate("2024", "MM/YYYY")).toBe("2024");
	});

	it("tolerates a single-digit month", () => {
		expect(formatResumeDate("2024-5", "MM/YYYY")).toBe("05/2024");
	});

	it("returns an unrecognised value untouched rather than blanking it", () => {
		// A value this function does not understand is more useful shown as-is than
		// silently removed from the user's document.
		expect(formatResumeDate("Summer 2024", "MMM YYYY")).toBe("Summer 2024");
		expect(formatResumeDate("2024-13", "MMM YYYY")).toBe("2024-13");
	});

	it("returns the empty string for an empty value", () => {
		expect(formatResumeDate("", "MMM YYYY")).toBe("");
		expect(formatResumeDate(null, "MMM YYYY")).toBe("");
		expect(formatResumeDate(undefined, "MMM YYYY")).toBe("");
	});

	it("trims before parsing", () => {
		expect(formatResumeDate("  2024-05  ", "MMM YYYY")).toBe("May 2024");
	});
});

describe("date ranges match what the template draws", () => {
	it("joins start and end with the template's separator", () => {
		// `date-range` in sections.typ writes `start - end`, so the text export and the
		// document agree character for character.
		expect(formatDateRange("2023-06", "2023-08", false, "MMM YYYY")).toBe(
			"Jun 2023 - Aug 2023",
		);
	});

	it("says Present for a current role", () => {
		expect(formatDateRange("2023-06", "", true, "MMM YYYY")).toBe(
			"Jun 2023 - Present",
		);
	});

	it("omits the separator when there is no end", () => {
		expect(formatDateRange("2023-06", "", false, "MMM YYYY")).toBe("Jun 2023");
	});

	it("is empty when there is no start", () => {
		expect(formatDateRange("", "2023-08", false, "MMM YYYY")).toBe("");
		expect(formatDateRange(undefined, undefined, false, "MMM YYYY")).toBe("");
	});
});
