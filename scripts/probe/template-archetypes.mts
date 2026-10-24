// Visual check for the six template archetypes.
//
//   npx --no-install tsx scripts/probe/template-archetypes.mts
//
// Compiles every archetype with (a) a dense one-page resume and (b) a realistic two-page
// CV through the *real* pipeline — `resumeToTypstJson` + `sections.typ` + the archetype's
// own `.typ`, with the archetype's settings defaults applied, exactly as selecting it in
// the editor does. Writes page PNGs to `.probe-shots/` and prints the page count, which is
// the assertion this file exists to make visible:
//
//   * every archetype except Academic fits the dense resume on one page;
//   * Academic runs to two pages and breaks at a section/entry boundary, not mid-line.
//
// Not a test: it shells out to the compiler and writes artefacts. The committed gallery
// (`test/template-gallery.test.ts`) is the CI-pinned version of the first page.

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MARGIN_DEFAULTS, TYPE_SCALE_DEFAULTS } from "@bettaresume/types";
import type { Resume, ResumeSection, ResumeSettings } from "../../src/features/resume-editor/types.ts";
import { TEMPLATE_CONFIGS } from "../../src/features/resume-editor/types.ts";
import { withTemplateDefaults } from "../../src/features/resume-editor/lib/template-defaults.ts";
import { resumeToTypstJson } from "../../src/lib/typst/serialize.ts";

const ROOT = resolve(process.cwd());
const TEMPLATE_DIR = join(ROOT, "src/features/resume-editor/typst_templates");
const OUT = join(ROOT, ".probe-shots");
const TMP = join(ROOT, ".probe-shots", ".typst");

const TYPST = (command: string, args: string[]) =>
	execFileSync(command, args, {
		cwd: TMP,
		stdio: "pipe",
		shell: process.platform === "win32",
	});

const SETTINGS: ResumeSettings = {
	pageSize: "Letter",
	margins: { ...MARGIN_DEFAULTS },
	fontScale: 1,
	typography: { ...TYPE_SCALE_DEFAULTS },
	lineHeight: 1.35,
	fontFamily: "Inter",
	colors: {
		primary: "#000000",
		secondary: "#666666",
		text: "#333333",
		heading: "#000000",
		accent: "#0066cc",
		background: "#ffffff",
		divider: "#e5e5e5",
	},
	sectionSpacing: "normal",
	dateFormat: "MMM YYYY",
	accentStyle: "underline",
};

const PERSONAL = {
	fullName: "Maya Okafor",
	professionalTitle: "Senior Data Engineer",
	email: "maya.okafor@example.com",
	phone: "+1 415 555 0142",
	location: "San Francisco, CA",
	linkedin: "linkedin.com/in/mayaokafor",
	github: "github.com/mayaokafor",
	website: "mayaokafor.dev",
	portfolio: "",
	photoUrl: "",
};

let sectionOrder = 0;
const section = (type: ResumeSection["type"], title: string, content: unknown) =>
	({
		id: `s-${type}`,
		type,
		order: sectionOrder++,
		visible: true,
		content: { title, ...(content as object) },
	}) as ResumeSection;

const experience = (
	id: string,
	company: string,
	position: string,
	startDate: string,
	endDate: string,
	highlights: string[],
	technologies: string[],
) => ({
	id,
	company,
	position,
	location: "Remote",
	startDate,
	endDate,
	current: endDate === "",
	employmentType: "full-time",
	description: "",
	highlights,
	technologies,
});

const education = (
	id: string,
	institution: string,
	degree: string,
	field: string,
	graduationDate: string,
	gpa: string,
	coursework: string[],
	honors: string[],
) => ({
	id,
	institution,
	degree,
	field,
	graduationDate,
	startDate: "",
	current: false,
	gpa,
	location: "",
	honors,
	coursework,
	achievements: [],
});

const skills = (name: string, names: string[]) => ({
	id: `skill-${name}`,
	name,
	order: 0,
	skills: names.map((n) => ({ id: `s-${name}-${n}`, name: n, level: "advanced" })),
});

const project = (
	id: string,
	name: string,
	role: string,
	technologies: string[],
	highlights: string[],
) => ({
	id,
	name,
	role,
	description: "",
	technologies,
	url: "",
	github: "",
	startDate: "",
	endDate: "",
	current: false,
	highlights,
});

const publication = (
	id: string,
	title: string,
	publisher: string,
	date: string,
	authors: string[],
) => ({ id, title, publisher, date, authors, url: "", summary: "" });

const resume = (name: string, sections: ResumeSection[]): Resume =>
	({
		id: `probe-${name}`,
		userId: "probe",
		name,
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "standard",
		tags: [],
		isArchived: false,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		metadata: { personalInfo: PERSONAL, settings: SETTINGS },
		sections,
	}) as Resume;

/** A resume that must hold on one page: five sections, real evidence, no padding. */
function dense(): Resume {
	sectionOrder = 0;
	return resume("dense", [
		section("summary", "Summary", {
			html: "<p>Data engineer with eight years building batch and streaming pipelines for payments and logistics. Owns the path from event to warehouse, and the on-call rota that keeps it honest.</p>",
		}),
		section("experience", "Work Experience", {
			data: [
				experience(
					"e1",
					"Northwind Systems",
					"Senior Data Engineer",
					"2022-03",
					"",
					[
						"Cut nightly warehouse load time from 4 h to 38 min by partitioning the event table and rewriting the join order.",
						"Led the migration of 14 services to one schema registry, removing 9,000 lines of duplicated validation.",
						"Mentored three engineers; two now own production pipelines end to end.",
					],
					["Python", "dbt", "BigQuery", "Airflow"],
				),
				experience(
					"e2",
					"Kestrel Labs",
					"Data Engineer",
					"2018-07",
					"2022-02",
					[
						"Built the billing pipeline that processed EUR 40M in its first year with no reconciliation incidents.",
						"Introduced contract tests for every warehouse model; schema breakage fell to zero.",
					],
					["Scala", "Spark", "Postgres", "Kafka"],
				),
			],
		}),
		section("education", "Education", {
			data: [
				education(
					"ed1",
					"Technical University of Munich",
					"MSc",
					"Computer Science",
					"2018-06",
					"3.8 / 4.0",
					["Distributed Systems", "Statistical Learning", "Database Internals"],
					["Deutschlandstipendium"],
				),
			],
		}),
		section("skills", "Skills", {
			data: [
				skills("Languages", ["Python", "SQL", "Scala", "TypeScript"]),
				skills("Data", ["dbt", "Airflow", "Spark", "Kafka", "BigQuery"]),
				skills("Platform", ["Terraform", "AWS", "Docker", "Kubernetes"]),
			],
		}),
		section("projects", "Projects", {
			data: [
				project("p1", "Ledger replay", "Maintainer", ["Go", "Postgres"], [
					"Rebuilt 90 days of ledger events from the raw log in 11 minutes, verified to the cent.",
					"Used by the finance team during every month-end close.",
				]),
			],
		}),
	]);
}

/** A two-page CV: enough publications and roles that no archetype can compress it. */
function twoPage(): Resume {
	sectionOrder = 0;
	return resume("two-page", [
		section("summary", "Research Statement", {
			html: "<p>I study how storage systems fail under partial information: what a database can prove about a write it never acknowledged, and what an operator can infer from the evidence that remains.</p>",
		}),
		section("experience", "Research Experience", {
			data: [
				experience(
					"e1",
					"Northwind Systems",
					"Senior Data Engineer",
					"2022-03",
					"",
					[
						"Cut nightly warehouse load time from 4 h to 38 min by partitioning the event table and rewriting the join order.",
						"Led the migration of 14 services to one schema registry, removing 9,000 lines of duplicated validation.",
						"Mentored three engineers; two now own production pipelines end to end.",
					],
					["Python", "dbt", "BigQuery", "Airflow"],
				),
				experience(
					"e2",
					"Kestrel Labs",
					"Data Engineer",
					"2018-07",
					"2022-02",
					[
						"Built the billing pipeline that processed EUR 40M in its first year with no reconciliation incidents.",
						"Introduced contract tests for every warehouse model; schema breakage fell to zero.",
					],
					["Scala", "Spark", "Postgres", "Kafka"],
				),
				experience(
					"e3",
					"Institute for Data Systems",
					"Research Assistant",
					"2016-10",
					"2018-05",
					[
						"Built the workload generator used in four published papers on index maintenance.",
						"Implemented the recovery model that became Chapter 4 of my thesis.",
					],
					["C++", "RocksDB", "Python"],
				),
			],
		}),
		section("education", "Education", {
			data: [
				education(
					"ed1",
					"Technical University of Munich",
					"MSc",
					"Computer Science",
					"2018-06",
					"3.8 / 4.0",
					["Distributed Systems", "Statistical Learning", "Database Internals"],
					["Deutschlandstipendium"],
				),
				education(
					"ed2",
					"University of Lagos",
					"BSc",
					"Computer Engineering",
					"2013-11",
					"First Class",
					["Operating Systems", "Algorithms", "Digital Design"],
					["Vice-Chancellor's Prize"],
				),
			],
		}),
		section("publications", "Publications", {
			data: [
				publication(
					"pub1",
					"Proving a write it never acknowledged",
					"Proc. VLDB",
					"2024-08",
					["M. Okafor", "A. Lindqvist", "R. Patel"],
				),
				publication(
					"pub2",
					"Index maintenance under skewed inserts",
					"Proc. SIGMOD",
					"2023-06",
					["M. Okafor", "R. Patel"],
				),
				publication(
					"pub3",
					"Recovery evidence in a shared-nothing store",
					"Proc. ICDE",
					"2022-04",
					["M. Okafor"],
				),
			],
		}),
		section("awards", "Grants & Awards", {
			data: [
				{
					id: "a1",
					title: "Research Grant",
					issuer: "National Science Foundation",
					date: "2023-05",
					description: "$60,000 for recovery-evidence work.",
				},
				{
					id: "a2",
					title: "Best Paper Award",
					issuer: "ICDE",
					date: "2022-04",
					description: "For recovery evidence in a shared-nothing store.",
				},
			],
		}),
		section("skills", "Skills", {
			data: [
				skills("Languages", ["Python", "SQL", "Scala", "C++", "TypeScript"]),
				skills("Data", ["dbt", "Airflow", "Spark", "Kafka", "BigQuery"]),
				skills("Platform", ["Terraform", "AWS", "Docker", "Kubernetes"]),
			],
		}),
		section("projects", "Projects", {
			data: [
				project("p1", "Ledger replay", "Maintainer", ["Go", "Postgres"], [
					"Rebuilt 90 days of ledger events from the raw log in 11 minutes, verified to the cent.",
					"Used by the finance team during every month-end close.",
				]),
			],
		}),
	]);
}

function compile(template: keyof typeof TEMPLATE_CONFIGS, kind: string, input: Resume) {
	const config = TEMPLATE_CONFIGS[template];
	const settings = withTemplateDefaults(template, SETTINGS);
	const data = resumeToTypstJson({
		...input,
		template,
		metadata: { ...input.metadata, settings },
	} as Resume);

	const id = `${template}-${kind}`;
	writeFileSync(join(TMP, `${id}.json`), data);
	writeFileSync(
		join(TMP, `${id}.typ`),
		`#let data = json("${id}.json")\n${readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8")}\n\n${readFileSync(
			join(TEMPLATE_DIR, `${config.sourceFile}.typ`),
			"utf8",
		)}`,
	);

	const pattern = join(OUT, `archetype-${id}-p{n}.png`);
	for (const file of readdirSync(OUT)) {
		if (file.startsWith(`archetype-${id}-p`)) rmSync(join(OUT, file));
	}
	TYPST("npx", [
		"--no-install",
		"typst",
		"compile",
		"--format",
		"png",
		"--ppi",
		"100",
		`${id}.typ`,
		pattern,
	]);
	const pages = readdirSync(OUT).filter((f) => f.startsWith(`archetype-${id}-p`)).length;
	return pages;
}

mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const results: Array<{ template: string; dense: number; twoPage: number }> = [];
for (const template of Object.keys(TEMPLATE_CONFIGS) as Array<
	keyof typeof TEMPLATE_CONFIGS
>) {
	const densePages = compile(template, "dense", dense());
	const twoPages = compile(template, "two-page", twoPage());
	results.push({ template, dense: densePages, twoPage: twoPages });
}

console.table(results);

const onePageFailures = results.filter(
	(r) => r.template !== "academic" && r.dense !== 1,
);
if (onePageFailures.length > 0) {
	console.error(
		"these archetypes did not fit the dense resume on one page:",
		onePageFailures,
	);
	process.exit(1);
}
if (results.find((r) => r.template === "academic")?.twoPage !== 2) {
	console.error("the academic CV did not settle on two pages");
	process.exit(1);
}

console.log(`screenshots: ${OUT}\\archetype-<archetype>-<dense|two-page>-p<n>.png`);
