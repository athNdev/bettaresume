import { describe, expect, it } from "vitest";
import {
	analyzeBullet,
	analyzeHighlights,
	findDutyPhrase,
	hasQuantification,
} from "../src/lib/analysis/metrics";

/**
 * The detector has one job it must never get wrong in the dangerous direction.
 *
 * It must NOT invent a claim — it only ever reports the absence of evidence, so a false
 * negative costs the user nothing but a missed suggestion. A false POSITIVE, though,
 * tells someone their perfectly good bullet is broken. If that happens often enough they
 * dismiss the whole panel, which makes the feature worse than not shipping it.
 *
 * So the false-positive cases get the most attention here.
 */

describe("quantification detection", () => {
	it.each([
		["Reduced p99 latency by 40%"],
		["Cut infrastructure spend by $12,000 per month"],
		["Grew ARR from $1.2M to $3.4M"],
		["Managed a team of 8 engineers"],
		["Shipped to 12,000 users"],
		["Improved throughput 3x"],
		["Reduced build time by 2h"],
		["Processed 1,500 invoices per day"],
		["Delivered 14 features across 3 quarters"],
		["Improved conversion by 18 percent"],
		["Doubled weekly active users"],
		["Cut AWS spend by 30% ($8k -> $5.6k)"],
		["Migrated 40,000 rows with zero downtime"],
	])("detects evidence in %j", (text) => {
		expect(hasQuantification(text)).toBe(true);
	});

	it.each([
		// Version numbers, product codes, dates and bare years prove nothing.
		"Upgraded the platform to v2.1",
		"Migrated to PostgreSQL 15.4",
		"Maintained SOC 2 Type II and ISO-27001 compliance",
		"Built a B2B SaaS onboarding flow",
		"Supported a COVID-19 response programme",
		"Provided 24/7 on-call support",
		"Worked at the company from 2019 to 2024",
		"Delivered Q3 roadmap items",
		"Migrated the auth service to OAuth2",
		"Owned services in the eu-west-1 region",
		// Genuinely unquantified achievement-like text.
		"Led the migration off the legacy monolith",
		"Designed the notification system",
		"Rebuilt the onboarding experience",
	])("does NOT claim evidence in %j", (text) => {
		expect(hasQuantification(text)).toBe(false);
	});

	it("is not fooled by a version that sits next to a real metric", () => {
		// Stripping must not remove the whole sentence.
		expect(hasQuantification("Shipped v2.1 which cut latency by 40%")).toBe(
			true,
		);
	});

	it("handles empty and whitespace input without throwing", () => {
		expect(hasQuantification("")).toBe(false);
		expect(hasQuantification("   ")).toBe(false);
	});
});

describe("duty language", () => {
	it.each([
		"Responsible for maintaining the build server",
		"Assisted with the quarterly reporting",
		"Helped with onboarding new analysts",
		"Worked on the internal wiki",
		"Participated in code reviews",
		"Contributed to the design system",
		"Involved in the migration planning",
	])("detects %j", (text) => {
		expect(findDutyPhrase(text)).not.toBeNull();
	});

	it.each([
		"Led the migration off the legacy monolith",
		"Reduced p99 latency by 40%",
		// "supported" must not fire on a quantified achievement
		"Supported 2M users with 99.9% uptime",
	])("does not fire on %j", (text) => {
		expect(findDutyPhrase(text)).toBeNull();
	});

	it("detects 'worked with' but downgrades severity when the bullet still lands", () => {
		// Honest behaviour, and deliberately not the lazy fix of deleting the phrase
		// from the list: the phrase IS present, but the bullet ends with a hard number
		// and an ownership verb, so it is advice rather than a warning.
		const r = analyzeBullet("Worked with the design team to ship 3x faster");
		expect(r.dutyPhrase).toMatch(/worked with/i);
		expect(r.quantified).toBe(true);
		expect(r.hasStrongVerb).toBe(true);
		expect(r.severity).toBe("advice");
	});
});

describe("analyzeBullet", () => {
	it("reports no reasons for a strong quantified bullet", () => {
		const r = analyzeBullet("Reduced p99 latency by 40% across 12,000 users");
		expect(r.quantified).toBe(true);
		expect(r.severity).toBe("none");
		expect(r.reasons).toEqual([]);
	});

	it("flags a bullet with no evidence and says so specifically", () => {
		const r = analyzeBullet("Designed the notification system");
		expect(r.quantified).toBe(false);
		expect(r.severity).toBe("warning");
		expect(r.reasons.join(" ")).toMatch(/no number, percentage or scale/i);
	});

	it("flags duty phrasing and quotes the phrase back", () => {
		const r = analyzeBullet("Responsible for the deploy pipeline");
		expect(r.dutyPhrase).toMatch(/responsible for/i);
		expect(r.reasons.join(" ")).toMatch(/job description/i);
	});

	it("flags first-person pronouns", () => {
		const r = analyzeBullet("I led the migration and we cut costs 20%");
		expect(r.hasPersonalPronoun).toBe(true);
		expect(r.reasons.join(" ")).toMatch(/first-person/i);
	});

	it("recognises ownership verbs", () => {
		expect(analyzeBullet("Launched the new billing system").hasStrongVerb).toBe(
			true,
		);
		expect(analyzeBullet("Was involved in billing").hasStrongVerb).toBe(false);
	});

	it("never emits a numeric score", () => {
		// Deliberate product decision, pinned by a test so it cannot drift.
		const r = analyzeBullet("Did some work on things");
		expect(
			Object.keys(r).some((k) => /score|rating|grade|percent$/.test(k)),
		).toBe(false);
		expect(JSON.stringify(r)).not.toMatch(/\bscore\b/i);
	});

	it("tolerates undefined-ish input", () => {
		expect(() => analyzeBullet(undefined as unknown as string)).not.toThrow();
	});
});

describe("analyzeHighlights", () => {
	it("reports counts that match the input", () => {
		const report = analyzeHighlights([
			"Reduced p99 latency by 40%",
			"Responsible for the deploy pipeline",
			"Designed the notification system",
		]);
		expect(report.total).toBe(3);
		expect(report.quantifiedCount).toBe(1);
		expect(report.dutyCount).toBe(1);
		expect(report.needsWork).toBe(2);
	});

	it("treats an absent or empty list as nothing to say, not a perfect score", () => {
		for (const input of [undefined, [], ["", "   "]]) {
			const r = analyzeHighlights(input);
			expect(r.total).toBe(0);
			expect(r.needsWork).toBe(0);
			// Nothing flagged, but also nothing praised.
			expect(r.quantifiedCount).toBe(0);
		}
	});

	it("does not reward padding — every bullet flagged means nothing is clean", () => {
		const r = analyzeHighlights([
			"Responsible for A",
			"Helped with B",
			"Worked on C",
		]);
		expect(r.dutyCount).toBe(3);
		expect(r.needsWork).toBe(3);
	});

	it("preserves input order so UI can render in place", () => {
		const r = analyzeHighlights(["First", "Second", "Third"]);
		expect(r.bullets.map((b) => b.text)).toEqual(["First", "Second", "Third"]);
	});
});
