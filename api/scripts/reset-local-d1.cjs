const fs = require('node:fs');
const path = require('node:path');

const stateDir = path.resolve(__dirname, '..', '.wrangler', 'state');

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rmWithRetries(targetPath, attempts = 8) {
	for (let i = 0; i < attempts; i++) {
		try {
			fs.rmSync(targetPath, { recursive: true, force: true });
			return;
		} catch (error) {
			// Try a rename+delete trick on Windows if rm is failing due to locks.
			try {
				if (fs.existsSync(targetPath)) {
					const renamed = `${targetPath}_old_${Date.now()}`;
					fs.renameSync(targetPath, renamed);
					fs.rmSync(renamed, { recursive: true, force: true });
					return;
				}
			} catch (_) {
				// Ignore and retry.
			}

			if (i === attempts - 1) {
				throw error;
			}
			await sleep(150 * (i + 1));
		}
	}
}

(async () => {
	try {
		if (fs.existsSync(stateDir)) {
			await rmWithRetries(stateDir);
		}
		process.stdout.write('[db] Cleared local D1 state\n');
	} catch (error) {
		process.stderr.write(
			`[db] Failed to clear ${stateDir}. If you have a running wrangler dev process, stop it and rerun.\n${error?.message || error}\n`,
		);
		process.exit(1);
	}
})();
