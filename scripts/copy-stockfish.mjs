// Copies the single-threaded Stockfish.wasm bundle into public/stockfish/
// so it can be loaded as a Worker at runtime. Single-threaded variant avoids
// the SharedArrayBuffer / COOP+COEP requirement (GitHub Pages doesn't set
// those headers).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'node_modules', 'stockfish', 'src');
const dest = join(root, 'public', 'stockfish');

if (!existsSync(src)) {
  console.error('[copy-stockfish] node_modules/stockfish not found — run npm install first');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

const files = ['stockfish-nnue-16-single.js', 'stockfish-nnue-16-single.wasm'];
for (const f of files) {
  copyFileSync(join(src, f), join(dest, f));
  console.log(`[copy-stockfish] ${f}`);
}
