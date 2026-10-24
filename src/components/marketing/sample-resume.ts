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
	template: "minimal",
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
			margins: { top: 40, right: 40, bottom: 40, left: 40 },
			fontSize: 11,
			fontScale: 1,
			typography: {
				name: 24,
				title: 14,
				sectionHeading: 14,
				itemTitle: 12,
				body: 11,
				small: 9,
			},
			lineHeight: 1.5,
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
			accentStyle: "underline",
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
						skills: ["Go", "TypeScript", "Postgres", "Terraform"],
					},
				],
			},
		},
	],
};
