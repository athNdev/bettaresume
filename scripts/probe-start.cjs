// Start the local stack detached so it survives the shell that launched it.
//
// The `terminal` tool kills the process group when a command returns, so `nohup … &`
// is not enough here. `detached: true` + `unref()` puts the child in its own group and
// lets this script exit immediately.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

/** name -> { command, args, cwd, log } */
const PROCS = {
	api: {
		command: "npx",
		args: [
			"wrangler",
			"dev",
			"--config",
			"wrangler.dev.jsonc",
			"--port",
			"4100",
		],
		cwd: path.join(ROOT, "api"),
		log: path.join(ROOT, ".probe-api.log"),
	},
	web: {
		command: "npx",
		args: ["next", "dev", "--webpack", "--port", "3000"],
		cwd: ROOT,
		log: path.join(ROOT, ".probe-web.log"),
	},
};

const wanted = process.argv.slice(2);
const names = wanted.length > 0 ? wanted : Object.keys(PROCS);

for (const name of names) {
	const spec = PROCS[name];
	if (!spec) throw new Error(`unknown process ${name}`);

	fs.writeFileSync(spec.log, "");
	const out = fs.openSync(spec.log, "a");
	const child = spawn(spec.command, spec.args, {
		cwd: spec.cwd,
		detached: true,
		stdio: ["ignore", out, out],
		shell: true,
		env: process.env,
	});
	child.unref();
	fs.writeFileSync(path.join(ROOT, `.probe-${name}.pid`), String(child.pid));
	console.log(`${name}: pid ${child.pid} -> ${spec.log}`);
}
