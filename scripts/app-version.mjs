// Prints the semver build version: MAJOR.MINOR from package.json, with the
// PATCH set to the CI build number (GITHUB_RUN_NUMBER). Run numbers increase
// monotonically, so every published build gets a strictly-greater, semver-valid
// version — which is what electron-updater needs to detect updates. Outside CI
// (local builds) the patch falls back to 0.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const [major, minor] = pkg.version.split('.');
const patch = process.env.GITHUB_RUN_NUMBER ?? '0';

process.stdout.write(`${major}.${minor}.${patch}`);
