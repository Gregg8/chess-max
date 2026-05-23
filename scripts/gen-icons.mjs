// Generates desktop app icons from public/icon-512.svg into build/:
//   build/icon.png  (1024px, Linux + electron-builder source)
//   build/icon.ico  (Windows)
//   build/icon.icns (macOS)
// electron-builder auto-detects these from the buildResources dir. Re-run
// after changing the source SVG: `npm run gen-icons`.
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { Icns, IcnsImage } from '@fiahfy/icns';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = join(root, 'public', 'icon-512.svg');
const build = join(root, 'build');
mkdirSync(build, { recursive: true });

const render = (size) => sharp(svg, { density: 256 }).resize(size, size).png().toBuffer();

// 1024px master → Linux icon + electron-builder source.
const master = await render(1024);
writeFileSync(join(build, 'icon.png'), master);
console.log('[gen-icons] icon.png (1024)');

// Windows .ico (multi-resolution).
const icoBuffers = [];
for (const size of [16, 24, 32, 48, 64, 128, 256]) icoBuffers.push(await render(size));
writeFileSync(join(build, 'icon.ico'), await pngToIco(icoBuffers));
console.log('[gen-icons] icon.ico');

// macOS .icns (PNG-backed OSTypes; sizes must match exactly).
const icns = new Icns();
for (const [osType, size] of [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
]) {
  const buf = size === 1024 ? master : await render(size);
  icns.append(IcnsImage.fromPNG(buf, osType));
}
writeFileSync(join(build, 'icon.icns'), icns.data);
console.log('[gen-icons] icon.icns');
