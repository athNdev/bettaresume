/**
 * End-to-end smoke test of the variant lifecycle against the real Worker.
 *
 * Runs against `wrangler dev` with ENVIRONMENT=development and `x-dev-mode`, so it
 * exercises the actual tRPC procedures, the actual D1 schema (including migration
 * 0006), and the actual propagation SQL. The unit tests use better-sqlite3; this uses
 * workerd's D1, which is where a migration that SQLite accepts but D1 refuses would
 * show up.
 */
const API = "http://localhost:4100/trpc";
const H = {
	"content-type": "application/json",
	"x-dev-mode": "true",
	origin: "http://localhost:3000",
};

async function query(path, input) {
	const res = await fetch(
		`${API}/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
		{ headers: H },
	);
	return res.json();
}

async function mutate(path, input) {
	const res = await fetch(`${API}/${path}`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ json: input }),
	});
	return res.json();
}

function payload(r) {
	if (r.error) {
		throw new Error(`${r.error.json?.data?.code}: ${r.error.message}`);
	}
	return r.result?.data?.json;
}

const created = payload(
	await mutate("resume.create", { name: "Smoke master", template: "minimal" }),
);
const baseId = created.id;
console.log("resume.create            ", baseId);

const section = payload(
	await mutate("section.create", {
		resumeId: baseId,
		type: "experience",
		content: {
			title: "Work Experience",
			data: [{ id: "e1", company: "Acme", position: "Engineer" }],
		},
	}),
);
console.log("section.create           ", section.id);

const variation = payload(
	await mutate("resume.createVariation", {
		baseResumeId: baseId,
		name: "Smoke variant",
		domain: "Backend",
	}),
);
console.log(
	"resume.createVariation   ",
	`base=${variation.baseResumeId === baseId}`,
	`sections=${variation.sections.length}`,
	`linked=${variation.sections[0].linkedToBase}`,
	`baseSectionId=${variation.sections[0].baseSectionId === section.id}`,
);

await mutate("section.update", {
	id: section.id,
	data: {
		content: {
			title: "Work Experience",
			data: [{ id: "e1", company: "Acme Renamed", position: "Engineer" }],
		},
	},
});

const variantFull = payload(
	await query("resume.getById", { id: variation.id }),
);
console.log(
	"propagation              ",
	JSON.stringify(variantFull.sections[0].content).includes("Acme Renamed"),
);

await mutate("section.update", {
	id: variation.sections[0].id,
	data: { content: { title: "Work Experience", data: [{ company: "Local" }] } },
});
const detached = payload(await query("resume.getById", { id: variation.id }));
const baseAfter = payload(await query("resume.getById", { id: baseId }));
console.log(
	"detach on variant edit   ",
	`linked=${detached.sections[0].linkedToBase}`,
	`base untouched=${JSON.stringify(baseAfter.sections[0].content).includes("Acme Renamed")}`,
);

const pulled = payload(
	await mutate("resume.pullFromBase", { resumeId: variation.id }),
);
console.log(
	"pullFromBase             ",
	`updated=${pulled.updated} (detached, so 0)`,
);

const relinked = payload(
	await mutate("section.setLink", {
		id: variation.sections[0].id,
		linked: true,
	}),
);
console.log(
	"section.setLink          ",
	`linked=${relinked.linkedToBase}`,
	`pulled base=${JSON.stringify(relinked.content).includes("Acme Renamed")}`,
);

const variations = payload(
	await query("resume.listVariations", { baseResumeId: variation.id }),
);
console.log("listVariations (from var)", variations.length);

const history = payload(await query("revision.list", { resumeId: baseId }));
console.log(
	"revision.list            ",
	history.length,
	JSON.stringify(history.map((r) => r.label)),
);

const bad = await mutate("resume.createVariation", {
	baseResumeId: "does-not-exist",
	name: "nope",
});
console.log("missing base rejected    ", Boolean(bad.error));
