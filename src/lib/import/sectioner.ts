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

/** Field names we try to read out of an entry, in priority order. */
const ENTRY_FIELD_HINTS: { key: string; test: (line: string) => boolean }[] = [
	{
		key: "startDate",
		test: (l) =>
			/^\D*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(l),
	},
	{
		key: "organization",
		test: (l) =>
			/\b(inc|llc|ltd|corp|corporation|company|university|college|institute|school|academy|hospital|agency|foundation)\b/i.test(
				l,
			) || /@/.test(l),
	},
	{
		key: "title",
		test: (l) =>
			/\b(engineer|developer|manager|director|analyst|designer|lead|head|intern|scientist|consultant|architect|specialist|officer|professor|researcher)\b/i.test(
				l,
			),
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
 */
function classifyHeading(
	line: string,
	nextLine: string,
): { raw: string; known: string | null; structural: boolean } {
	const raw = normalise(line);
	const known = resolveHeading(raw);
	if (known) return { raw, known, structural: false };

	const letters = raw.replace(/[^A-Za-z]/g, "");
	const structural =
		letters.length >= 3 &&
		raw.length <= 40 &&
		raw.split(" ").length <= 6 &&
		// ALL-CAPS, compared on letters only so trailing punctuation cannot mask it.
		letters === letters.toUpperCase() &&
		// Digits make it a date, a count, or a metric.
		!/\d/.test(raw) &&
		// A bullet is content by definition.
		!/^\s*(?:[-*\u2022\u00b7\u25aa\u25e6\u2023\u2043]|\d+[.)])\s+/.test(line) &&
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

		const isBullet = /^\s*(?:[-*•·▪◦‣⁃]|\d+[.)])\s+/.test(rawLine);
		const text = stripBullet(rawLine);
		if (!text) continue;

		const range = readDateRange(text);
		if (range) {
			// A date belongs to the entry that is already open -- "Senior Engineer,
			// Acme Corp" on one line and "Jan 2020 - Present" on the next are one job,
			// not two. A date only opens a new entry when this entry already has one,
			// which is what separates the second role from the first.
			if (current?.fields.startDate) {
				push();
				current = { fields: { startDate: range }, bullets: [] };
			} else {
				if (!current) current = { fields: {}, bullets: [] };
				current.fields.startDate = range;
			}
			// Keep any residual text from the same line, e.g. "Acme Corp - Jan 2020".
			const residual = normalise(text.replace(range.value, ""));
			if (residual) {
				current.bullets.push(field(residual, 0.7, "Text on the date line"));
			}
			continue;
		}

		if (!current) current = { fields: {}, bullets: [] };

		if (isBullet) {
			current.bullets.push(field(text, 0.8, "Explicit bullet"));
			continue;
		}

		const entry = current;

		// The commonest entry opener is "Role, Company" or "Role at Company". Assigning
		// the whole line to one field loses half the entry, so split it first.
		if (text.length <= 90 && !("title" in entry.fields)) {
			const [role, org] = text.split(/,\s|\s+at\s+/, 2);
			if (
				role &&
				org &&
				ENTRY_FIELD_HINTS.find((h) => h.key === "title")?.test(role) &&
				ENTRY_FIELD_HINTS.find((h) => h.key === "organization")?.test(org)
			) {
				entry.fields.title = field(
					normalise(role),
					0.7,
					"Role before the organisation on the same line",
				);
				entry.fields.organization = field(
					normalise(org),
					0.7,
					"Organisation after the role on the same line",
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

/** Extract the block above the first heading, which usually holds name and contact. */
function readPreamble(text: string): Record<string, ExtractedField> {
	const lines = text.split(/\r?\n/).map(normalise).filter(Boolean).slice(0, 6);
	const out: Record<string, ExtractedField> = {};

	for (const line of lines) {
		const email = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(line);
		if (email && !("email" in out)) {
			out.email = field(email[0], 0.95, "Email address found in the header");
		}
		const phone = /(\+?\d[\d\s().-]{7,}\d)/.exec(line);
		if (phone && !("phone" in out)) {
			out.phone = field(
				normalise(phone[1] ?? ""),
				0.85,
				"Phone-shaped number in the header",
			);
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

	for (let i = 0; i < lines.length; i++) {
		const line = normalise(lines[i] ?? "");
		if (!line) continue;
		const next = lines[i + 1] ?? "";
		const c = classifyHeading(line, next);
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
		const flatBullets = entrySections
			? []
			: body
					.filter((l) => /^\s*(?:[-*•·▪◦‣⁃]|\d+[.)])\s+/.test(l))
					.map((l) => field(stripBullet(l), 0.8, "Explicit bullet"));

		const fields: Record<string, ExtractedField> = {};
		if (!entrySections) {
			for (const line of body) {
				const range = readDateRange(normalise(line));
				if (range && !("dateRange" in fields)) {
					fields.dateRange = range;
					break;
				}
			}
			const inlineTitle = body
				.map(normalise)
				.find((l) => l.length > 0 && l.length <= 60);
			if (inlineTitle && !("summary" in fields)) {
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
 */
export function sectionScore(section: ExtractedSection): number {
	const hasContent =
		Object.keys(section.fields).length > 0 ||
		section.bullets.length > 0 ||
		section.entries.length > 0;
	if (!hasContent) return 0;
	const bodyConfidence = section.entries.length
		? Math.max(
				...section.entries.map((e) =>
					Math.max(
						...Object.values(e.fields).map((f) => f.confidence),
						...e.bullets.map((b) => b.confidence),
						0,
					),
				),
			)
		: Math.max(
				...Object.values(section.fields).map((f) => f.confidence),
				...section.bullets.map((b) => b.confidence),
				0,
			);
	return Math.min(section.confidence, bodyConfidence);
}
