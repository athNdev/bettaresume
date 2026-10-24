/**
 * Serializes a Resume object into a JSON string suitable for injection into
 * a Typst template via `json(...)`.
 *
 * Handles:
 * - Stripping HTML from summary sections
 * - Null-coalescing optional fields to safe defaults
 * - Ensuring all values are Typst-compatible (no undefined)
 */

import {
	MARGIN_DEFAULTS,
	normalizeTypeSettings,
	TYPE_SCALE_DEFAULTS,
} from "@bettaresume/types";
import type {
	Award,
	Certification,
	Education,
	Experience,
	KeepTogether,
	Language,
	PersonalInfo,
	Project,
	Publication,
	Reference,
	Resume,
	ResumeSettings,
	SectionLayout,
	SkillCategory,
	Volunteer,
} from "@/features/resume-editor/types";
import { formatResumeDate } from "@/lib/format-date";
import {
	escapeTypst,
	richContentToTypst,
	richTextToPlain,
} from "@/lib/rich-text";
import { resolveTypstFont } from "./fonts";

// Canonical font names as Typst knows them (keys are lowercase for lookup)
const CANONICAL_FONT_NAMES: Record<string, string> = {
	inter: "Inter",
	roboto: "Roboto",
	"open sans": "Open Sans",
	lato: "Lato",
	montserrat: "Montserrat",
	"playfair display": "Playfair Display",
};

function normalizeFont(name: string): string {
	return CANONICAL_FONT_NAMES[name.toLowerCase()] ?? name;
}

// Default settings mirroring preview.tsx defaults. Typography and margins are true
// points (see `TYPE_SCALE_DEFAULTS`); body renders at 10.5pt and the old px-era 8.25pt
// body is gone with `px-to-pt`.
const defaultSettings: ResumeSettings = {
	fontFamily: "Inter",
	fontScale: 1,
	lineHeight: 1.35,
	margins: { ...MARGIN_DEFAULTS },
	pageSize: "Letter",
	colors: {
		primary: "#2563eb",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#1e293b",
		background: "#ffffff",
		accent: "#f59e0b",
		divider: "#e2e8f0",
	},
	typography: { ...TYPE_SCALE_DEFAULTS },
	sectionSpacing: "normal",
	dateFormat: "MMM YYYY",
	accentStyle: "underline",
};

/**
 * Stored rich text → the string Typst lays out.
 *
 * Was a hand-rolled regex stripper with a partial entity table; it lived beside three
 * other converters (see `src/lib/rich-text.ts`), and they disagreed on entities, on
 * nested tags, and on what a list looks like. The Typst payload is what the PDF is built
 * from, so a disagreement here is a disagreement between the preview the user approved
 * and the file they sent.
 */
function stripHtml(html: string): string {
	return richTextToPlain(html);
}

function safeStr(val: unknown, fallback = ""): string {
	if (typeof val === "string") return val;
	if (val == null) return fallback;
	return String(val);
}

function safeBool(val: unknown, fallback = false): boolean {
	if (typeof val === "boolean") return val;
	return fallback;
}

function safeArr<T>(val: unknown): T[] {
	if (Array.isArray(val)) return val as T[];
	return [];
}

function serializePersonalInfo(pi: PersonalInfo) {
	return {
		fullName: safeStr(pi.fullName, "Your Name"),
		email: safeStr(pi.email),
		phone: safeStr(pi.phone),
		location: safeStr(pi.location),
		linkedin: safeStr(pi.linkedin),
		github: safeStr(pi.github),
		website: safeStr(pi.website),
		portfolio: safeStr(pi.portfolio),
		professionalTitle: safeStr(pi.professionalTitle),
		photoUrl: safeStr(pi.photoUrl),
	};
}

/**
 * The `personal-info` SECTION type is not rendered by the Typst templates at
 * all — the resume header is drawn from the top-level `personalInfo` payload
 * (see `sections.typ` line 20 and the header block in `minimal.typ`). So this
 * section is not a second place the name gets drawn; it is a second place the
 * name gets *stored*.
 */
const PERSONAL_INFO_SECTION = "personal-info";

/** The fields of `personalInfoSchema`, in declaration order. */
const PERSONAL_INFO_FIELDS = [
	"fullName",
	"email",
	"phone",
	"location",
	"linkedin",
	"github",
	"website",
	"portfolio",
	"professionalTitle",
	"photoUrl",
] as const;

/**
 * Resolve personal info from its two storage locations into ONE object.
 *
 * Personal info is stored twice: in `resume.metadata.personalInfo` and in a
 * `personal-info` section's `content.data`. `metadata.personalInfo` is the
 * source of truth — it is the only one the editor writes to
 * (`resume-editor.tsx:385 handlePersonalInfoChange` calls `resume.update` with
 * `metadata.personalInfo`, and never touches the section). The section copy is
 * written only by `api/src/db/seed.sql`, and the seeded `resume-1` has a
 * `personal-info` section with a full name while its `metadata` has NO
 * `personalInfo` key at all.
 *
 * So neither store can be the sole answer: trust `metadata` first and fall back
 * to the section per field. That keeps the header correct for rows written by
 * either path. An earlier version of this bug exported `resume-1` with a blank
 * header precisely because only `metadata` was consulted.
 */
/**
 * Resolve personal info for display as well as for export.
 *
 * Exported so the editor can show the same values the exporter will render. When
 * the two resolved differently, the Personal Information form could display empty
 * fields while the exported PDF showed a full name — the user had no way to see
 * or edit what was actually in their resume.
 */
export function resolvePersonalInfo(
	metadataInfo: Partial<PersonalInfo> | undefined,
	sectionData: Record<string, unknown> | undefined,
): PersonalInfo {
	const resolved: Record<string, string> = {};

	for (const field of PERSONAL_INFO_FIELDS) {
		const fromMetadata = metadataInfo?.[field];
		if (typeof fromMetadata === "string" && fromMetadata.trim() !== "") {
			resolved[field] = fromMetadata;
			continue;
		}
		// `content.data` is only an object for personal-info; a newly added
		// personal-info section is seeded with `data: []` (see
		// `resume-editor.tsx:412 handleAddSection`), so the array case must be
		// handled rather than assumed away.
		const fromSection = sectionData?.[field];
		resolved[field] =
			typeof fromSection === "string" ? fromSection : (fromMetadata ?? "");
	}

	return resolved as unknown as PersonalInfo;
}

function serializeSettings(settings: ResumeSettings) {
	const merged: ResumeSettings = {
		...defaultSettings,
		...settings,
		colors: { ...defaultSettings.colors, ...settings.colors },
		typography: { ...defaultSettings.typography, ...settings.typography },
		margins: { ...defaultSettings.margins, ...settings.margins },
	};
	return {
		pageSize: merged.pageSize ?? defaultSettings.pageSize,
		/*
		 * The type scale and the margins, in points, through the one migration point:
		 * `normalizeTypeSettings` converts px-era stored values to points and clamps into
		 * the researched bands (body floor 10pt, small floor 9pt, margins floor 36pt).
		 * This is the serialiser half of the clamp the formatting toolbar mirrors on its
		 * sliders; a document never exports below the floors.
		 */
		...normalizeTypeSettings({
			typography: merged.typography,
			margins: merged.margins,
		}),
		/*
		 * The **resolved** family, not the requested one.
		 *
		 * This is the end of the substitution chain, and it was missing. `prepareFont`
		 * resolved "Times New Roman" to a family it then loaded, and the document still
		 * said `fontFamily: "Times New Roman"` — a family Typst does not have — so Typst
		 * picked its own fallback and the loaded file went unused. The export of a
		 * Times New Roman resume embedded LibertinusSerif, and the app's carefully chosen
		 * metric-compatible substitute never appeared in a single PDF.
		 *
		 * Only the Typst document is affected: the HTML preview resolves independently
		 * (see `resolveFontFamily` in preview.tsx), and `resumeToTypstJson` has no other
		 * consumer.
		 */
		fontFamily: resolveTypstFont(
			normalizeFont(merged.fontFamily ?? defaultSettings.fontFamily),
		).typstFamily,
		fontScale: merged.fontScale ?? defaultSettings.fontScale,
		lineHeight: merged.lineHeight ?? defaultSettings.lineHeight,
		colors: {
			primary: merged.colors.primary,
			secondary: merged.colors.secondary,
			text: merged.colors.text,
			heading: merged.colors.heading,
			accent: merged.colors.accent,
			background: merged.colors.background,
			divider: merged.colors.divider,
		},
		sectionSpacing: merged.sectionSpacing,
		dateFormat: merged.dateFormat,
		accentStyle: merged.accentStyle,
	};
}

/**
 * Resolve an entry's break behaviour.
 *
 * `auto` is the documented default: keep an entry together *when it is small enough to
 * move as a unit*. Measuring the rendered height would need `measure(...)` in the
 * template, and that call's signature differs between the bundled Typst 0.14 and the
 * 0.10 CLI used by the test suite, so the shape heuristic lives here instead: an entry
 * with no description and at most three bullets is a few lines and moves as one;
 * anything longer is allowed to split rather than push half a page of whitespace onto
 * the previous page.
 *
 * `always` is the user's explicit choice, with one safety rail: an entry estimated to be
 * taller than a whole page is downgraded to `never`. A `breakable: false` block that
 * cannot fit on a page is clipped by Typst rather than moved, so honouring the flag
 * literally would silently delete bullets. A split entry is a layout flaw; a truncated
 * one is lost content.
 *
 * These are layout decisions, never content ones: nothing is hidden, shortened or
 * reflowed by them.
 */
export interface LayoutSettings {
	pageSize?: "A4" | "Letter";
	margins?: Partial<{
		top: number;
		right: number;
		bottom: number;
		left: number;
	}>;
	fontScale?: number;
	lineHeight?: number;
	typography?: Partial<ResumeSettings["typography"]>;
}

export function resolveKeepTogether(
	layout: SectionLayout | undefined,
	item: { id?: unknown; description?: unknown; highlights?: unknown[] },
	settings?: LayoutSettings,
): "always" | "never" {
	const id = typeof item.id === "string" ? item.id : "";
	const mode: KeepTogether = (layout?.entries?.[id] ??
		layout?.keepTogether ??
		"auto") as KeepTogether;
	if (mode === "always") {
		return entryFitsOnOnePage(item, settings) ? "always" : "never";
	}
	if (mode === "never") return "never";

	const hasDescription =
		typeof item.description === "string" && item.description.trim() !== "";
	const bullets = Array.isArray(item.highlights) ? item.highlights.length : 0;
	return !hasDescription && bullets <= 3 ? "always" : "never";
}

/**
 * A conservative height estimate for one entry, against the usable page height.
 *
 * Deliberately pessimistic: it assumes a bullet wraps to 1.15 lines and a description
 * line holds 90 characters. The cost of being wrong in this direction is an entry that
 * is allowed to split; the cost of being wrong the other way is clipped bullets.
 */
export function entryFitsOnOnePage(
	item: { description?: unknown; highlights?: unknown[] },
	settings?: LayoutSettings,
): boolean {
	const body = Math.max(
		1,
		(settings?.typography?.body ?? 10.5) * (settings?.fontScale ?? 1),
	);
	const leading = settings?.lineHeight ?? 1.35;
	const paperHeight = settings?.pageSize === "A4" ? 841.89 : 792;
	const margins = { top: 43, bottom: 43, ...settings?.margins };
	const usable = paperHeight - margins.top - margins.bottom;

	const description =
		typeof item.description === "string" ? item.description.trim() : "";
	const descriptionLines = description ? Math.ceil(description.length / 90) : 0;
	const bullets = Array.isArray(item.highlights) ? item.highlights.length : 0;

	// Title + company/date line, the wrapped description, and 1.15 lines per bullet
	// (a short bullet is one line, a long one wraps), plus the 3pt inter-bullet gaps.
	const lines = 2 + descriptionLines + bullets * 1.15;
	const height = lines * body * leading + bullets * 3 + 8;
	return height <= usable;
}

function serializeSection(
	section: {
		id: string;
		type: string;
		order: number;
		visible: boolean;
		content: Record<string, unknown>;
		layout?: SectionLayout;
	},
	resolved: {
		personalInfo: PersonalInfo;
		dateFormat: string;
		/** The compiled settings, for the keep-together height guard. */
		settings: LayoutSettings;
	},
) {
	const documentSettings = resolved.settings;
	// One formatter for the whole document, driven by settings.dateFormat. The setting
	// existed and nothing read it: the PDF printed the stored value, so a resume set to
	// "MMM YYYY" exported "2020-09 - 2024-05".
	const fmt = (value: unknown) =>
		formatResumeDate(safeStr(value), resolved.dateFormat);
	const { type, content } = section;
	const base = {
		id: section.id,
		type,
		order: section.order,
		visible: section.visible,
		title: safeStr(content.title as string),
		/*
		 * Break semantics reach Typst verbatim. `keepTogether` on the section is only the
		 * per-entry default; `serializeSection` resolves it onto each item below, so the
		 * template never has to walk a second lookup table.
		 */
		layout: {
			keepSectionTogether: section.layout?.keepSectionTogether === true,
			pageBreakBefore: section.layout?.pageBreakBefore === true,
		},
	};

	switch (type) {
		case "summary": {
			const html = safeStr(
				(content.html as string) ||
					((content.data as { summary?: string })?.summary ?? ""),
			);
			/*
			 * The summary is the one field the editor writes marks into
			 * (`content.json`). `summaryText` is therefore Typst MARKUP, laid out with
			 * `#eval(..., mode: "markup")` in `sections.typ` — marks survive the PDF,
			 * and every markup character in the text is escaped on the way in.
			 * Content without a stored document is escaped plain text: the same
			 * bytes this field always carried, now parse-safe.
			 */
			return {
				...base,
				summaryText: richContentToTypst(content.json, stripHtml(html)),
			};
		}

		case "experience": {
			const items = safeArr<Experience>(content.data);
			return {
				...base,
				items: items.map((exp) => ({
					id: safeStr(exp.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						exp,
						documentSettings,
					),
					company: safeStr(exp.company),
					position: safeStr(exp.position),
					startDate: fmt(exp.startDate),
					endDate: fmt(exp.endDate),
					current: safeBool(exp.current),
					location: safeStr(exp.location),
					description: safeStr(exp.description),
					highlights: safeArr<string>(exp.highlights),
					technologies: safeArr<string>(exp.technologies),
				})),
			};
		}

		case "education": {
			const items = safeArr<Education>(content.data);
			return {
				...base,
				items: items.map((edu) => ({
					id: safeStr(edu.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						edu,
						documentSettings,
					),
					institution: safeStr(edu.institution),
					degree: safeStr(edu.degree),
					field: safeStr(edu.field),
					graduationDate: fmt(edu.graduationDate),
					startDate: fmt(edu.startDate),
					current: safeBool(edu.current),
					gpa: safeStr(edu.gpa),
					location: safeStr(edu.location),
					honors: safeArr<string>(edu.honors),
					coursework: safeArr<string>(edu.coursework),
					achievements: safeArr<string>(edu.achievements),
				})),
			};
		}

		case "skills": {
			const items = safeArr<SkillCategory>(content.data);
			return {
				...base,
				categories: items.map((cat) => ({
					id: safeStr(cat.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						cat,
						documentSettings,
					),
					name: safeStr(cat.name),
					skills: safeArr<{ id: string; name: string; level?: string }>(
						cat.skills,
					).map((s) => ({
						id: safeStr(s.id),
						name: safeStr(s.name),
						level: safeStr(s.level),
					})),
				})),
			};
		}

		case "projects": {
			const items = safeArr<Project>(content.data);
			return {
				...base,
				items: items.map((p) => ({
					id: safeStr(p.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						p,
						documentSettings,
					),
					name: safeStr(p.name),
					description: safeStr(p.description),
					role: safeStr(p.role),
					technologies: safeArr<string>(p.technologies),
					url: safeStr(p.url),
					github: safeStr(p.github),
					startDate: fmt(p.startDate),
					endDate: fmt(p.endDate),
					current: safeBool(p.current),
					highlights: safeArr<string>(p.highlights),
				})),
			};
		}

		case "certifications": {
			const items = safeArr<Certification>(content.data);
			return {
				...base,
				items: items.map((c) => ({
					id: safeStr(c.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						c,
						documentSettings,
					),
					name: safeStr(c.name),
					issuer: safeStr(c.issuer),
					date: fmt(c.date),
					expirationDate: fmt(c.expirationDate),
					credentialId: safeStr(c.credentialId),
					url: safeStr(c.url),
					description: safeStr(c.description),
				})),
			};
		}

		case "awards": {
			const items = safeArr<Award>(content.data);
			return {
				...base,
				items: items.map((a) => ({
					id: safeStr(a.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						a,
						documentSettings,
					),
					title: safeStr(a.title),
					issuer: safeStr(a.issuer),
					date: fmt(a.date),
					description: safeStr(a.description),
				})),
			};
		}

		case "languages": {
			const items = safeArr<Language>(content.data);
			return {
				...base,
				items: items.map((l) => ({
					id: safeStr(l.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						l,
						documentSettings,
					),
					name: safeStr(l.name),
					proficiency: safeStr(l.proficiency),
					certification: safeStr(l.certification),
				})),
			};
		}

		case "publications": {
			const items = safeArr<Publication>(content.data);
			return {
				...base,
				items: items.map((p) => ({
					id: safeStr(p.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						p,
						documentSettings,
					),
					title: safeStr(p.title),
					publisher: safeStr(p.publisher),
					date: fmt(p.date),
					authors: safeArr<string>(p.authors),
					url: safeStr(p.url),
					summary: safeStr(p.summary),
				})),
			};
		}

		case "volunteer": {
			const items = safeArr<Volunteer>(content.data);
			return {
				...base,
				items: items.map((v) => ({
					id: safeStr(v.id),
					keepTogether: resolveKeepTogether(
						section.layout,
						v,
						documentSettings,
					),
					organization: safeStr(v.organization),
					role: safeStr(v.role),
					startDate: fmt(v.startDate),
					endDate: fmt(v.endDate),
					current: safeBool(v.current),
					location: safeStr(v.location),
					description: safeStr(v.description),
					highlights: safeArr<string>(v.highlights),
				})),
			};
		}

		case "references": {
			const items = safeArr<Reference>(content.data);
			return {
				...base,
				items: items
					.filter((r) => !r.isHidden)
					.map((r) => ({
						id: safeStr(r.id),
						name: safeStr(r.name),
						position: safeStr(r.position),
						company: safeStr(r.company),
						email: safeStr(r.email),
						phone: safeStr(r.phone),
					})),
			};
		}

		case "personal-info": {
			// Resolved by the caller: `personal-info` may carry the name that
			// `metadata.personalInfo` is missing, and vice versa. The templates do
			// not render this section — the header comes from the top-level
			// `personalInfo` — but it must still serialize to something real so a
			// newly added type cannot export blank.
			return {
				...base,
				personalInfo: serializePersonalInfo(resolved.personalInfo),
			};
		}

		case "custom": {
			// Free-form section: a title plus a rich body. `content.html` is the
			// shape the rich-text editor produces; `content.json` is the document it
			// derives the HTML from and the only place marks live. `content.data` is
			// accepted as an array of blocks or a plain string.
			const html = safeStr(content.html as string);
			// The body is markup for the same reason `summaryText` is (see above).
			const body = richContentToTypst(content.json, stripHtml(html));
			const raw = content.data;
			const items: Array<{
				id: string;
				title: string;
				body: string;
				keepTogether: "always" | "never";
			}> = [];

			if (Array.isArray(raw)) {
				for (const entry of raw) {
					if (typeof entry === "string") {
						// Plain strings, escaped: `render-custom` evals item bodies too.
						items.push({
							id: "",
							title: "",
							body: escapeTypst(stripHtml(entry)),
							keepTogether: resolveKeepTogether(
								section.layout,
								{},
								documentSettings,
							),
						});
					} else if (entry && typeof entry === "object") {
						const rec = entry as Record<string, unknown>;
						items.push({
							id: safeStr(rec.id),
							title: safeStr(rec.title ?? rec.name ?? rec.heading),
							body: escapeTypst(
								stripHtml(
									safeStr(
										rec.body ?? rec.content ?? rec.text ?? rec.description,
									),
								),
							),
							keepTogether: resolveKeepTogether(
								section.layout,
								{
									id: rec.id,
									description:
										rec.body ?? rec.content ?? rec.text ?? rec.description,
								},
								documentSettings,
							),
						});
					}
				}
			} else if (raw && typeof raw === "object") {
				const rec = raw as Record<string, unknown>;
				items.push({
					id: safeStr(rec.id),
					title: safeStr(rec.title ?? rec.name ?? rec.heading),
					body: escapeTypst(
						stripHtml(
							safeStr(rec.body ?? rec.content ?? rec.text ?? rec.description),
						),
					),
					keepTogether: resolveKeepTogether(
						section.layout,
						{
							id: rec.id,
							description:
								rec.body ?? rec.content ?? rec.text ?? rec.description,
						},
						documentSettings,
					),
				});
			}

			return { ...base, body, items };
		}

		default:
			// Loud on purpose. Before this, an unhandled type exported as a silently
			// empty section — which is how `personal-info` and `custom` shipped a
			// blank header and a blank custom block with nothing in the logs.
			console.warn(
				`[typst] No serializer for section type "${type}" (section ${section.id}); it will export empty. Add a case to serializeSection().`,
			);
			return { ...base, items: [] };
	}
}

/**
 * Converts a Resume object to a JSON string safe for Typst's `json()`.
 */
export function resumeToTypstJson(resume: Resume): string {
	const settings = serializeSettings(
		resume.metadata?.settings ?? defaultSettings,
	);

	/*
	 * Personal info is stored twice: in `resume.metadata.personalInfo` and in a
	 * `personal-info` section's `content.data`. Neither is a reliable sole
	 * source. The editor only ever writes `metadata.personalInfo`
	 * (`resume-editor.tsx` handlePersonalInfoChange), but the seed writes the
	 * section copy and leaves `metadata.personalInfo` absent entirely. Merge
	 * them so both kinds of row export a correct header.
	 */
	const personalInfoSection = resume.sections.find(
		(s) => s.type === PERSONAL_INFO_SECTION,
	);
	// The section stores its personal info under `content.data` as a record.
	// `sectionContentSchema` allows `data` to be an array too (a newly added
	// section is seeded with `data: []`), so only a record is treated as a
	// source.
	const personalInfoData = (() => {
		const raw = personalInfoSection?.content?.data;
		return raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: undefined;
	})();
	const personalInfo = serializePersonalInfo(
		resolvePersonalInfo(resume.metadata?.personalInfo, personalInfoData),
	);

	const visibleSections = resume.sections
		.filter((s) => s.visible)
		.sort((a, b) => a.order - b.order)
		.map((s) =>
			serializeSection(
				{
					id: s.id,
					type: s.type,
					order: s.order,
					visible: s.visible,
					content: s.content as Record<string, unknown>,
					layout: s.layout,
				},
				{ personalInfo, dateFormat: settings.dateFormat, settings },
			),
		);

	const data = {
		template: resume.template,
		settings,
		personalInfo,
		sections: visibleSections,
	};

	return JSON.stringify(data);
}
