// Bundles the Electron main + preload TypeScript into CommonJS (.cjs) so they
// load regardless of the root package.json "type": "module". Everything except
// the `electron` runtime is inlined, so the packaged app needs no node_modules.
import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'info',
};

await build({
  ...common,
  entryPoints: ['electron/main.ts'],
  outfile: 'dist-electron/main.cjs',
});

await build({
  ...common,
  entryPoints: ['electron/preload.ts'],
  outfile: 'dist-electron/preload.cjs',
});
