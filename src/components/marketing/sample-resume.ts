import { MARGIN_DEFAULTS, TYPE_SCALE_DEFAULTS } from "@bettaresume/types";
import type { Resume } from "@/features/resume-editor/types";

/**
 * The one sample resume the marketing page renders.
 *
 * The hero used to hand-write its "exported text" panel as a `key: value` list and
 * claim it was "the same lines the exporter writes". It was not, and had not been
 * since the exporter was fixed: the panel advertised
 *
 *     startDate: March 2022
 *     highlights: • Cut p99 checkout latency 41% …
 *
 * while the product had already stopped emitting internal field names. A marketing
 * page that misdescribes the artefact it is selling is worse than no artefact, and
 * keeping a second copy of the shape is how it happened.
 *
 * So the page now renders `buildPlainText(SAMPLE_RESUME)`. The document panel and the
 * text panel are the same object, and neither can drift from the exporter again
 * without `test/marketing-claims.test.ts` failing.
 *
 * Edit this and the hero follows. Edit the exporter and the hero follows too.
 */
export const SAMPLE_RESUME: Resume = {
	id: "marketing-sample",
	userId: "marketing-sample",
	name: "Avery Chen — master",
	variationType: "base",
	baseResumeId: null,
	domain: null,
	template: "standard",
	tags: [],
	isArchived: false,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	metadata: {
		personalInfo: {
			fullName: "Avery Chen",
			professionalTitle: "Senior Backend Engineer",
			email: "avery@chen.dev",
			phone: "+49 30 555 0142",
			location: "Berlin",
			github: "github.com/averychen",
		},
		settings: {
			pageSize: "A4",
			margins: { ...MARGIN_DEFAULTS },
			fontScale: 1,
			typography: { ...TYPE_SCALE_DEFAULTS },
			lineHeight: 1.35,
			fontFamily: "Inter",
			colors: {
				primary: "#2563eb",
				secondary: "#64748b",
				text: "#1e293b",
				heading: "#1e293b",
				accent: "#0891b2",
				background: "#ffffff",
				divider: "#e2e8f0",
			},
			sectionSpacing: "normal",
			dateFormat: "MMM YYYY",
			accentStyle: "none",
		},
	},
	sections: [
		{
			id: "marketing-experience",
			type: "experience",
			order: 0,
			visible: true,
			content: {
				title: "Work Experience",
				data: [
					{
						id: "marketing-experience-1",
						company: "Northwind Systems",
						position: "Senior Backend Engineer",
						startDate: "2022-03",
						current: true,
						highlights: [
							"Cut p99 checkout latency 41% by rewriting the reservation path off the shared connection pool.",
						],
					},
				],
			},
		},
		{
			id: "marketing-skills",
			type: "skills",
			order: 1,
			visible: true,
			content: {
				title: "Skills",
				data: [
					{
						id: "marketing-skills-1",
						name: "Backend",
						skills: [
							{ id: "sample-skill-1", name: "Go" },
							{ id: "sample-skill-2", name: "TypeScript" },
							{ id: "sample-skill-3", name: "Postgres" },
							{ id: "sample-skill-4", name: "Terraform" },
						],
					},
				],
			},
		},
	],
};

/**
 * A fuller document, for the template gallery.
 *
 * The hero's sample is deliberately short: it has to sit beside an exported-text panel
 * and still be readable at a glance. That makes it a poor showcase for a template — three
 * cards each rendering two inches of content on an otherwise blank page.
 *
 * Same person, same voice, more of it. Generated through `resumeToTypstJson` like any
 * other resume, so what the gallery shows is what the export button produces.
 */
/**
 * The sample's own metadata, typed as present.
 *
 * `Resume.metadata` is nullable because a row can be fetched without relations, but
 * this object literal is authored above with a complete one. Reading it through a
 * constant keeps the two non-null assertions out of the spread below and states the
 * assumption once.
 */
const SAMPLE_METADATA = SAMPLE_RESUME.metadata as NonNullable<
	Resume["metadata"]
>;

export const GALLERY_SAMPLE_RESUME: Resume = {
	...SAMPLE_RESUME,
	id: "marketing-gallery",
	name: "Avery Chen — gallery",
	metadata: {
		...SAMPLE_METADATA,
		personalInfo: {
			...SAMPLE_METADATA.personalInfo,
			location: "Berlin",
		},
	},
	sections: [
		{
			id: "gallery-summary",
			type: "summary",
			order: 0,
			visible: true,
			content: {
				title: "Summary",
				html: "<p>Backend engineer with eight years building payment and reservation systems. Rewrites the slow path before adding a new one.</p>",
			},
		},
		{
			id: "gallery-experience",
			type: "experience",
			order: 1,
			visible: true,
			content: {
				title: "Work Experience",
				data: [
					{
						id: "g1",
						company: "Northwind Systems",
						position: "Senior Backend Engineer",
						location: "Berlin",
						startDate: "2022-03",
						current: true,
						highlights: [
							"Cut p99 checkout latency 41% by rewriting the reservation path off the shared connection pool.",
							"Led the migration of 14 services to one audit log, removing 9,000 lines of duplicated writes.",
						],
						technologies: ["Go", "Postgres"],
					},
					{
						id: "g2",
						company: "Kestrel Labs",
						position: "Backend Engineer",
						location: "Munich",
						startDate: "2018-07",
						endDate: "2022-02",
						highlights: [
							"Built the billing service that processed EUR 40M in its first year with no reconciliation incidents.",
						],
						technologies: ["TypeScript", "Postgres"],
					},
				],
			},
		},
		{
			id: "gallery-education",
			type: "education",
			order: 2,
			visible: true,
			content: {
				title: "Education",
				data: [
					{
						id: "ge1",
						institution: "Technical University of Munich",
						degree: "MSc",
						field: "Computer Science",
						location: "Munich",
						startDate: "2016-10",
						endDate: "2018-06",
						// The graduate and academic archetypes draw these; the standard one does
						// not. Carrying them makes each specimen show its own structure rather
						// than a claim in the card copy.
						coursework: ["Distributed Systems", "Databases"],
						honors: ["Dean's List"],
						achievements: [],
					},
				],
			},
		},
		{
			id: "gallery-skills",
			type: "skills",
			order: 3,
			visible: true,
			content: {
				title: "Skills",
				data: [
					{
						id: "gs1",
						name: "Languages",
						skills: [
							{ id: "gs1-1", name: "Go" },
							{ id: "gs1-2", name: "TypeScript" },
							{ id: "gs1-3", name: "Python" },
						],
					},
					{
						id: "gs2",
						name: "Data",
						skills: [
							{ id: "gs2-1", name: "Postgres" },
							{ id: "gs2-2", name: "Redis" },
							{ id: "gs2-3", name: "Kafka" },
						],
					},
					{
						id: "gs3",
						name: "Infrastructure",
						skills: [
							{ id: "gs3-1", name: "Terraform" },
							{ id: "gs3-2", name: "AWS" },
						],
					},
				],
			},
		},
	],
};
