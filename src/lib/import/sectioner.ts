import type { SectionType } from "@bettaresume/types";
import { resolveHeading } from "@/lib/analysis/parse-fidelity";

/**
 * Tier-1 resume import: plain text in, reviewed sections out.
 *
 * ## No LLM, deliberately
 *
 * Extraction runs entirely on text the document already contains. An LLM extractor
 * hallucinates skills, and a fabricated skill in a resume is worse than a missing one:
 * the user cannot see the difference on the page, and an interviewer can. So this
 * module never infers a skill, a date, or a job title that is not in the input, and
 * every field it emits carries a confidence the user can see and override.
 *
 * The honest failure mode here is a low-confidence field the user corrects, not a
 * confident guess they have to catch.
 *
 * ## Confidence means something checkable
 *
 * It is not a vibe score. It is derived from how the value was found:
 *
 *  - an exact canonical heading, or a date in an unambiguous format, is high
 *  - a recognised alias heading, or a plausible-but-ambiguous date, is medium
 *  - a structural guess (a line that merely looks like a heading or a date) is low
 *
 * Anything below `REVIEW_THRESHOLD` is expected to be corrected by the user, and the
 * UI is expected to say so rather than presenting it as extracted fact.
 *
 * ## Whitelist, not vocabulary
 *
 * Headings are resolved through `resolveHeading`, the same whitelist the parse audit
 * uses. Import therefore cannot accept a heading the parser will later flag as unsafe.
 */

/** Below this, a field is presented as needing review rather than as extracted. */
export const REVIEW_THRESHOLD = 0.6;

export interface ExtractedField {
	value: string;
	confidence: number;
	/** Why this confidence, in words a user could act on. */
	reason: string;
}

export interface ExtractedEntry {
	/** Fields keyed by name, e.g. "company", "title", "startDate". */
	fields: Record<string, ExtractedField>;
	/** Bullet-ish lines, kept verbatim. */
	bullets: ExtractedField[];
}

export interface ExtractedSection {
	type: SectionType;
	/** The canonical, parser-safe heading. */
	title: string;
	/** The heading as it appeared in the document. */
	rawHeading: string;
	confidence: number;
	fields: Record<string, ExtractedField>;
	bullets: ExtractedField[];
	entries: ExtractedEntry[];
	/** The untouched source text, so nothing is lost in translation. */
	raw: string;
}

export interface ImportResult {
	sections: ExtractedSection[];
	/**
	 * Text that appeared before the first recognised heading.
	 *
	 * Kept rather than dropped: a name at the top of a resume is usually above the
	 * first heading, and silently discarding it would lose the most important field on
	 * the page.
	 */
	preamble: string;
	/** Name/email/phone/link read from the header, when present. */
	contact: Record<string, ExtractedField>;
	warnings: string[];
}

/** Sections whose content is a list of repeated entries rather than one block. */
const ENTRY_SECTIONS = new Set<SectionType>([
	"experience",
	"education",
	"projects",
	"certifications",
	"awards",
	"publications",
	"volunteer",
]);

/**
 * Role wording and organisation wording, as standalone predicates.
 *
 * These were reachable only as `ENTRY_FIELD_HINTS.find(h => h.key === ...)`, which made
 * the "Role, Company" split depend on both halves corroborating. Extracted so the split
 * can treat the role as the evidence and the second half as the organisation.
 */
const TITLE_HINT =
	/\b(engineer|developer|manager|director|analyst|designer|lead|head|intern|scientist|consultant|architect|specialist|officer|professor|researcher)\b/i;

const ORGANISATION_HINT =
	/\b(inc|llc|ltd|corp|corporation|company|university|college|institute|school|academy|hospital|agency|foundation)\b/i;

/** Field names we try to read out of an entry, in priority order. */
const ENTRY_FIELD_HINTS: { key: string; test: (line: string) => boolean }[] = [
	{
		key: "startDate",
		test: (l) =>
			/^\D*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(l),
	},
	{
		key: "organization",
		test: (l) => ORGANISATION_HINT.test(l) || /@/.test(l),
	},
	{
		key: "title",
		test: (l) => TITLE_HINT.test(l),
	},
];

const DATE_RANGE =
	/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|–|—|to|until)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}|\d{1,2}\/\d{4}|\d{4}|present|current|now|ongoing)/i;

function normalise(line: string): string {
	return line.replace(/\s+/g, " ").trim();
}

/** Strip bullet glyphs so a bullet's text can be compared to other lines. */
function stripBullet(line: string): string {
	return line.replace(/^\s*(?:[-*•·▪◦‣⁃]|\d+[.)])\s*/, "").trim();
}

/**
 * Does the line carry an explicit bullet glyph?
 *
 * One definition, used by heading classification, entry splitting and the flat
 * section path. Three copies of this regex had already drifted, which is how the flat
 * path came to disagree with the entry path about what a bullet is.
 */
function hasBulletGlyph(line: string): boolean {
	return /^\s*(?:[-*•·▪◦‣⁃]|\d+[.)])\s+/.test(line);
}

/**
 * Does this line look like a section heading?
 *
 * The whitelist is the driver. The structural fallback is deliberately narrow: it fires
 * only on ALL-CAPS lines.
 *
 * That restriction is not timidity, it is a correction. A looser rule (short, no
 * terminal punctuation, mostly capitalised) was tried first and it shredded real input:
 * "Senior Engineer, Acme Corp" and "Jan 2020 - Present" both satisfied it, so every
 * Work Experience block got cut into fragments and its entries came back empty. Wrong
 * headings are far worse than missed ones -- a missed heading leaves the text intact
 * inside the previous section for the user to rename, while a wrong heading scatters
 * their content into sections that do not exist.
 *
 * ALL-CAPS is the shape that survives that trade: it excludes role lines, date lines
 * and contact lines without a whitelist of its own.
 *
 * ## Why the fallback is gated on a known heading having been seen
 *
 * ALL-CAPS is necessary but not sufficient, because a name is very often set in caps.
 * "JOHN DOE" over "jane@example.com" is an ALL-CAPS line, under 40 characters, with a
 * non-empty line after it -- it satisfies every clause above. Treating it as a heading
 * put the mark at line 0, which made `preamble` empty and threw away the name, the
 * email and the phone while inventing two spurious `custom` sections. The guarantee
 * this module documents ("a name at the top of a resume is above the first heading, and
 * silently discarding it would lose the most important field on the page") held only for
 * Title Case names, which is what the test fixture happened to use.
 *
 * So the structural fallback may only fire once the document has proven it has
 * headings at all -- that is, once at least one whitelist heading has matched. Before
 * that point every unrecognised line is preamble text. The cost is that a document whose
 * only heading is an unrecognised ALL-CAPS one is now left with no sections and a warning
 * instead of a flagged guess, which is the correct trade: the text is still in `preamble`
 * and in `raw`, whereas the alternative silently relocates a person's name.
 */
function classifyHeading(
	line: string,
	nextLine: string,
	seenKnownHeading: boolean,
): { raw: string; known: string | null; structural: boolean } {
	const raw = normalise(line);
	const known = resolveHeading(raw);
	if (known) return { raw, known, structural: false };

	const letters = raw.replace(/[^A-Za-z]/g, "");
	const structural =
		seenKnownHeading &&
		letters.length >= 3 &&
		raw.length <= 40 &&
		raw.split(" ").length <= 6 &&
		// ALL-CAPS, compared on letters only so trailing punctuation cannot mask it.
		letters === letters.toUpperCase() &&
		// Digits make it a date, a count, or a metric.
		!/\d/.test(raw) &&
		// A bullet is content by definition.
		!hasBulletGlyph(line) &&
		nextLine.trim().length > 0;

	return { raw, known: null, structural };
}

function field(
	value: string,
	confidence: number,
	reason: string,
): ExtractedField {
	return { value, confidence, reason };
}

/**
 * Read a date range out of a line.
 *
 * "Present"/"current" is treated as high confidence because it is unambiguous in a
 * resume context; a bare year is medium because it is usually a partial date.
 */
function readDateRange(line: string): ExtractedField | null {
	const m = DATE_RANGE.exec(line);
	if (!m) return null;
	const start = normalise(m[1] ?? "");
	const end = normalise(m[2] ?? "");
	const full = `${start} - ${end}`;
	if (/present|current|now|ongoing/i.test(end)) {
		return field(full, 0.9, "Date range with an explicit current end");
	}
	if (/\b(19|20)\d{2}\b/.test(start) && /\b(19|20)\d{2}\b/.test(end)) {
		return field(full, 0.9, "Two four-digit years");
	}
	return field(full, 0.65, "Date range with an abbreviated year or month");
}

/**
 * Could this second half of a "Role, X" line be an organisation name at all?
 *
 * Accepting the second half of any comma split means also accepting the second half of
 * "AWS Certified Solutions Architect, 2021", which filed `2021` as the employer. That is
 * the inventing failure this module exists to avoid, so the half has to look like a
 * name: it must contain letters that are not part of a month. "Initech" and "Google"
 * pass; "2021", "42" and "Mar 2024" do not.
 */
function looksLikeOrganisation(candidate: string): boolean {
	return /[A-Za-z]{2,}/.test(candidate) && !MONTH_NAME.test(candidate);
}

/**
 * Split a section body into entries.
 *
 * A blank line, or a new date range starting, begins a new entry. Bullets belong to
 * the entry above them.
 */
function splitEntries(body: string[]): ExtractedEntry[] {
	const entries: ExtractedEntry[] = [];
	let current: ExtractedEntry | null = null;

	const push = () => {
		if (
			current &&
			(Object.keys(current.fields).length > 0 || current.bullets.length > 0)
		) {
			entries.push(current);
		}
		current = null;
	};

	for (const rawLine of body) {
		const line = normalise(rawLine);
		if (!line) {
			push();
			continue;
		}

		const isBullet = hasBulletGlyph(rawLine);
		const text = stripBullet(rawLine);
		if (!text) continue;

		if (!current) current = { fields: {}, bullets: [] };

		// A bullet is content, and that has to be settled BEFORE the date read below.
		// A bullet can contain a year range -- "Rebuilt the 2016-2019 legacy stack" -- and
		// reading that as an entry boundary fabricated a second job whose only field was
		// a date lifted out of the middle of a sentence, with the bullet itself orphaned
		// into it. The bullet is the unit; the year range inside it is prose.
		if (isBullet) {
			current.bullets.push(field(text, 0.8, "Explicit bullet"));
			continue;
		}

		const range = readDateRange(text);
		if (range) {
			// A date belongs to the entry that is already open -- "Senior Engineer,
			// Acme Corp" on one line and "Jan 2020 - Present" on the next are one job,
			// not two. A date only opens a new entry when this entry already has one,
			// which is what separates the second role from the first.
			if (current.fields.startDate) {
				push();
				current = { fields: { startDate: range }, bullets: [] };
			} else {
				current.fields.startDate = range;
			}
			// Keep any residual text from the same line, e.g. "Acme Corp - Jan 2020".
			const residual = normalise(text.replace(range.value, ""));
			if (residual) {
				current.bullets.push(field(residual, 0.7, "Text on the date line"));
			}
			continue;
		}

		const entry = current;

		// The commonest entry opener is "Role, Company" or "Role at Company". Assigning
		// the whole line to one field loses half the entry, so split it first.
		if (text.length <= 90 && !("title" in entry.fields)) {
			const parts = text.split(/,\s|\s+at\s+/, 2);
			const role = parts[0];
			const org = parts[1];
			if (role && org && TITLE_HINT.test(role) && looksLikeOrganisation(org)) {
				// "Initech" and "Google" carry no legal suffix, so requiring
				// `organization` to match as well filed the employer of most real jobs
				// under `title`. The role half is the evidence and the separator is real
				// evidence that a second field exists -- `split` yields one element when
				// there is no separator, so nothing is invented when there was nothing.
				//
				// Confidence follows the corroboration: a legal suffix is independent
				// evidence that the second half is an organisation (0.7); without one
				// this is a structural inference only, so it sits below the review
				// threshold and the user is asked to confirm rather than told.
				const corroborated = ORGANISATION_HINT.test(org);
				entry.fields.title = field(
					normalise(role),
					0.7,
					"Role before the organisation on the same line",
				);
				entry.fields.organization = field(
					normalise(org),
					corroborated ? 0.7 : 0.55,
					corroborated
						? "Organisation after the role on the same line, with a legal suffix"
						: "Second half of a 'Role, Company' line, with no legal suffix to confirm it",
				);
				continue;
			}
		}

		// A short leading line in an entry is usually the role or organisation.
		const hinted = ENTRY_FIELD_HINTS.find(
			(h) => !(h.key in entry.fields) && h.test(text),
		);
		if (hinted && text.length <= 90) {
			entry.fields[hinted.key] = field(
				text,
				hinted.key === "title" ? 0.6 : 0.7,
				`Matched an entry field by its ${hinted.key === "title" ? "role" : "organisation"} wording`,
			);
			continue;
		}

		entry.bullets.push(
			field(text, 0.6, "Unlabelled line, treated as a bullet"),
		);
	}

	push();
	return entries;
}

/**
 * Does this candidate read like a phone number rather than a date or a count?
 *
 * The original regex was `(\+?\d[\d\s().-]{7,}\d)`, whose character class includes the
 * range separator, so it matched any run of digits, spaces, parens, dots and dashes --
 * including "2015 - 2020", which it then reported as a phone number at 0.85 confidence.
 * 0.85 is above `REVIEW_THRESHOLD`, so the UI showed a date range to the user as an
 * extracted phone with no review flag.
 *
 * Rejected shapes:
 *
 *   - a year range, e.g. "2015 - 2020" or "2015 to 2020". Two bare four-digit years
 *     joined by a range separator is the overwhelmingly common false positive, and a
 *     digit count does not catch it: "2015 - 2020" has eight digits.
 *   - a line carrying a month name. The candidate character class contains no letters,
 *     so a month can never appear inside the match itself -- it has to be checked on the
 *     surrounding line, where "Mar 2015 - 2020" does carry one.
 *   - a digit count outside 7..15. Below 7 is not dialable; above 15 exceeds E.164 and
 *     in practice means a run of unrelated numbers.
 */
function looksLikePhone(candidate: string, line: string): boolean {
	const digits = candidate.replace(/\D/g, "");
	if (digits.length < 7 || digits.length > 15) return false;
	if (
		/\b(?:19|20)\d{2}\b\s*(?:-|–|—|to|until)\s*\b(?:19|20)\d{2}\b/i.test(
			candidate,
		)
	) {
		return false;
	}
	if (MONTH_NAME.test(line)) return false;
	return true;
}

const MONTH_NAME =
	/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+\d{1,2})?\s*,?\s*(?:\d{4}|'|’\d{2})/i;

/**
 * Find a phone number in one header line.
 *
 * Every candidate in the line is tested, not just the first: an implausible leading run
 * ("500 - 1000 employees") must not consume the slot and hide a real number later on
 * the same line.
 */
function readPhone(line: string): ExtractedField | null {
	const candidates = line.match(/\+?\d[\d\s().-]{7,}\d/g) ?? [];
	for (const candidate of candidates) {
		if (looksLikePhone(candidate, line)) {
			return field(
				normalise(candidate),
				0.85,
				"Phone-shaped number in the header",
			);
		}
	}
	return null;
}

/** Extract the block above the first heading, which usually holds name and contact. */
function readPreamble(text: string): Record<string, ExtractedField> {
	const lines = text.split(/\r?\n/).map(normalise).filter(Boolean).slice(0, 6);
	const out: Record<string, ExtractedField> = {};

	for (const line of lines) {
		const email = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(line);
		if (email && !("email" in out)) {
			out.email = field(email[0], 0.95, "Email address found in the header");
		}
		if (!("phone" in out)) {
			const phone = readPhone(line);
			if (phone) out.phone = phone;
		}
		const url = /\b(?:https?:\/\/|www\.)[^\s]+/.exec(line);
		if (url && !("url" in out)) {
			out.url = field(url[0], 0.9, "Link in the header");
		}
		if (
			!("name" in out) &&
			line.length <= 60 &&
			!/[@\d]/.test(line) &&
			line.split(" ").length >= 2 &&
			line.split(" ").length <= 5 &&
			/^[\p{Lu}][\p{L}\p{N}\s.'-]*$/u.test(line)
		) {
			out.name = field(line, 0.5, "Short capitalised line in the header");
		}
	}

	return out;
}

/**
 * Segment raw document text into sections.
 *
 * `text` is whatever the extractor produced: for PDF that is the text layer, for DOCX
 * the flattened document. Lines are preserved verbatim in `raw` so a user can always
 * see the source behind an extracted field.
 */
export function sectionResumeText(text: string): ImportResult {
	const warnings: string[] = [];
	const lines = (text ?? "").split(/\r?\n/);

	if (!text?.trim()) {
		return {
			sections: [],
			preamble: "",
			contact: {},
			warnings: ["The document contained no text."],
		};
	}

	// Locate heading lines first, then slice the document between them.
	const marks: {
		index: number;
		raw: string;
		known: string | null;
		structural: boolean;
	}[] = [];

	// `seenKnownHeading` gates the structural (ALL-CAPS) fallback: before the document
	// has shown one whitelist heading, an unrecognised line is assumed to be the
	// header, not a section. See `classifyHeading` for why.
	let seenKnownHeading = false;
	for (let i = 0; i < lines.length; i++) {
		const line = normalise(lines[i] ?? "");
		if (!line) continue;
		const next = lines[i + 1] ?? "";
		const c = classifyHeading(line, next, seenKnownHeading);
		if (c.known) seenKnownHeading = true;
		if (c.known || c.structural) {
			marks.push({ index: i, ...c });
		}
	}

	if (marks.length === 0) {
		warnings.push(
			"No section headings were recognised. The text was left unattached rather than guessed into sections.",
		);
	}

	const preamble = lines
		.slice(0, marks[0]?.index ?? lines.length)
		.join("\n")
		.trim();
	// Contact details live above the first heading, so read them before slicing the
	// body into sections. Otherwise the name and email are extracted and then dropped.
	const contact = readPreamble(preamble);

	const sections: ExtractedSection[] = [];

	for (let m = 0; m < marks.length; m++) {
		const mark = marks[m];
		if (!mark) continue;
		const next = marks[m + 1];
		const rawBody = lines.slice(mark.index + 1, next?.index ?? lines.length);
		// Blank lines are the separator between entries, so the entry splitter needs
		// them. Only the flat (non-entry) path wants them gone.
		const body = rawBody.filter((l) => normalise(l).length > 0);

		// A structural match with no whitelist backing is reported, not accepted as
		// fact. The user renames it; we do not pretend we knew.
		const confidence = mark.known
			? mark.known.toLowerCase() === mark.raw.toLowerCase()
				? 0.95
				: 0.8
			: 0.35;

		if (!mark.known) {
			warnings.push(
				`"${mark.raw}" looked like a heading but is not on the parser-safe list. Review it before importing.`,
			);
		}

		const title = mark.known ?? mark.raw;
		const type = (
			mark.known === "Work Experience"
				? "experience"
				: (mark.known?.toLowerCase() ?? "custom")
		) as SectionType;

		const entrySections = ENTRY_SECTIONS.has(type);
		const entries = entrySections ? splitEntries(rawBody) : [];

		// Every non-empty body line survives as a bullet, not just the glyph-prefixed
		// ones. The previous filter kept only explicit bullets, so on a three-line
		// SKILLS block "Python, Go, PostgreSQL" became a 0.5-confidence `summary` and
		// "Kubernetes" and "Terraform" survived nowhere except `raw` -- two thirds of a
		// user's skills silently absent from everything an importer would apply.
		//
		// Dropping content and inventing it are the same failure from the user's side:
		// either way the field they see is not what they wrote. The confidence splits by
		// evidence, an explicit glyph is a statement of structure (0.8) and a bare line
		// is not (0.6).
		const flatBullets = entrySections
			? []
			: body.map((l) => {
					const value = stripBullet(l);
					const glyphed = hasBulletGlyph(l);
					return field(
						value,
						glyphed ? 0.8 : 0.6,
						glyphed
							? "Explicit bullet"
							: "Unlabelled line, kept so no content is dropped",
					);
				});

		const fields: Record<string, ExtractedField> = {};
		if (!entrySections) {
			for (const line of body) {
				const range = readDateRange(normalise(line));
				if (range && !("dateRange" in fields)) {
					fields.dateRange = range;
					break;
				}
			}
			// Stripped, so `summary` is not a second copy of a bullet with its glyph
			// still attached, and never the same string already captured as `dateRange`
			// -- both of which put one line into two fields with two confidences.
			const inlineTitle = body
				.map((l) => normalise(stripBullet(l)))
				.find((l) => l.length > 0 && l.length <= 60);
			if (
				inlineTitle &&
				!("summary" in fields) &&
				inlineTitle !== fields.dateRange?.value
			) {
				fields.summary = field(inlineTitle, 0.5, "First line of the section");
			}
		}

		sections.push({
			type,
			title,
			rawHeading: mark.raw,
			confidence,
			fields,
			bullets: flatBullets,
			entries,
			raw: lines.slice(mark.index, next?.index ?? lines.length).join("\n"),
		});
	}

	return { sections, preamble, contact, warnings };
}

/**
 * Overall confidence for one section: its heading confidence, lowered when it carries
 * nothing a user can act on.
 *
 * An empty section is not "confidently extracted nothing" — it is a failure to
 * extract, and must not read as a clean result.
 *
 * ## Why the median, and not the maximum
 *
 * The body aggregate used to be `Math.max`, twice nested (over fields, then over
 * entries). A maximum is the one aggregate a single field can set on its own, so a
 * section whose prose was entirely guesses -- two unlabelled lines at 0.6 -- scored
 * 0.9 the moment one date line sat alongside them. That is precisely the inversion this
 * function's own comment warns about: the field that was found most confidently was the
 * only field found at all, and it spoke for the ones that were invented.
 *
 * The median asks "is a *typical* field confident?", which is the question a user is
 * asking when they read a section score. It is an order statistic, so it ignores
 * outliers in both directions:
 *
 *   - one confident field cannot dress a section of guesses, because it is one value
 *     among several rather than the winner;
 *   - one shaky field cannot discredit a well-extracted section, which matters just as
 *     much -- telling a user to review something already extracted correctly is its own
 *     kind of dishonesty, and a `Math.min` would do exactly that to a 20-field section
 *     that happened to contain one 0.65 date.
 *
 * Every field contributes equally. Weighting by entry importance would be a claim about
 * which fields matter, and this module has no basis for making it.
 *
 * Note what the median cannot do: if every extracted field sits at 0.6, the median is
 * 0.6, because no aggregate of values that are all >= 0.6 can fall below 0.6. The
 * verified case -- two 0.6 guesses and one 0.9 date -- moves from 0.9 to 0.6, which is
 * the review boundary and no longer above it. Pushing it lower would mean inventing a
 * score the underlying confidences do not support.
 */
export function sectionScore(section: ExtractedSection): number {
	const confidences: number[] = [
		...Object.values(section.fields).map((f) => f.confidence),
		...section.bullets.map((b) => b.confidence),
		...section.entries.flatMap((e) => [
			...Object.values(e.fields).map((f) => f.confidence),
			...e.bullets.map((b) => b.confidence),
		]),
	];

	// Nothing a user can act on is a failure to extract, not a clean zero-content result.
	if (confidences.length === 0) return 0;

	const sorted = [...confidences].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 1
			? (sorted[mid] ?? 0)
			: ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

	// Never above the heading confidence: an unrecognised heading caps the whole section
	// however well its body parsed.
	return Math.min(section.confidence, Math.min(1, Math.max(0, median)));
}
