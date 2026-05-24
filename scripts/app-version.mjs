// Prints the semver build version, chosen by trigger:
//
//   Tag build (refs/tags/v*) — a real release. The tag IS the version, so the
//   git tag, the published GitHub Release, and the in-app version all agree.
//   (Tags must be full semver, e.g. v0.3.0 or v0.3.0-beta.1.)
//
//   Anything else (push to main, manual dispatch) — an auto build. Version is
//   MAJOR.MINOR.<GITHUB_RUN_NUMBER + 1000> from package.json. The +1000 keeps
//   auto builds in a patch band no hand-picked tag will ever use, so an auto
//   version can never duplicate a tagged one. Run numbers increase per workflow
//   run, giving a strictly-greater, semver-valid version each time.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

if (process.env.GITHUB_REF_TYPE === 'tag') {
  process.stdout.write((process.env.GITHUB_REF_NAME ?? '').replace(/^v/, ''));
} else {
  const [major, minor] = pkg.version.split('.');
  const patch = Number(process.env.GITHUB_RUN_NUMBER ?? '0') + 1000;
  process.stdout.write(`${major}.${minor}.${patch}`);
}
