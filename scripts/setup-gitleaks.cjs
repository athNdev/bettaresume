#!/usr/bin/env node
// Downloads the gitleaks binary for the current platform into .tools/
// Runs automatically via the "prepare" npm script (i.e. after npm install).
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, '.tools');
const IS_WINDOWS = process.platform === 'win32';
const BINARY_NAME = IS_WINDOWS ? 'gitleaks.exe' : 'gitleaks';
const BINARY_PATH = path.join(TOOLS_DIR, BINARY_NAME);

function getPlatform() {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'darwin';
    default: return 'linux';
  }
}

function getArch() {
  switch (process.arch) {
    case 'arm64': return 'arm64';
    case 'ia32':
    case 'x32': return 'x32';
    default: return 'x64';
  }
}

/** Follow redirects and return { statusCode, body } */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https
        .get(u, { headers: { 'User-Agent': 'bettaresume-setup-gitleaks' } }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            follow(res.headers.location);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        })
        .on('error', reject);
    };
    follow(url);
  });
}

/** Download a URL to a file path, following redirects */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https
        .get(u, { headers: { 'User-Agent': 'bettaresume-setup-gitleaks' } }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            follow(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} downloading ${u}`));
            return;
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
          });
        })
        .on('error', reject);
    };
    follow(url);
  });
}

async function getLatestVersion() {
  const { statusCode, body } = await httpsGet(
    'https://api.github.com/repos/gitleaks/gitleaks/releases/latest'
  );
  if (statusCode !== 200) throw new Error(`GitHub API returned HTTP ${statusCode}`);
  const tag = JSON.parse(body).tag_name;
  return tag.replace(/^v/, '');
}

async function main() {
  const version = await getLatestVersion();

  // Check if already installed at the correct version
  if (fs.existsSync(BINARY_PATH)) {
    const result = spawnSync(BINARY_PATH, ['version'], { encoding: 'utf8' });
    if (result.stdout?.includes(version)) {
      console.log(`  gitleaks v${version} already installed at .tools/${BINARY_NAME}`);
      return;
    }
  }

  const platform = getPlatform();
  const arch = getArch();
  const ext = IS_WINDOWS ? 'zip' : 'tar.gz';
  const fileName = `gitleaks_${version}_${platform}_${arch}.${ext}`;
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${fileName}`;
  const archivePath = path.join(os.tmpdir(), fileName);

  fs.mkdirSync(TOOLS_DIR, { recursive: true });

  console.log(`  Downloading gitleaks v${version} (${platform}/${arch})...`);
  await downloadFile(url, archivePath);

  if (IS_WINDOWS) {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${TOOLS_DIR}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${TOOLS_DIR}" gitleaks`, { stdio: 'inherit' });
    fs.chmodSync(BINARY_PATH, 0o755);
  }

  try { fs.rmSync(archivePath, { force: true }); } catch { /* ignore */ }
  console.log(`  gitleaks v${version} installed to .tools/${BINARY_NAME}`);
}

main().catch((err) => {
  // Non-fatal: warn but don't break npm install (e.g. offline environments)
  console.warn(`\n  Warning: could not auto-install gitleaks: ${err.message}`);
  console.warn('  Install manually and ensure "gitleaks" is on your PATH:');
  console.warn('  https://github.com/gitleaks/gitleaks#installing\n');
});
