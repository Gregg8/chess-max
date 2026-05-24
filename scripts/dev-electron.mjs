// Dev launcher for the desktop app: stages the engine, bundles the Electron
// main/preload, starts the Vite dev server, then spawns Electron pointed at it.
import './copy-stockfish.mjs';
import './build-electron-main.mjs';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';

const server = await createServer({ mode: 'electron' });
await server.listen();
const url = server.resolvedUrls?.local?.[0];
if (!url) {
  console.error('[dev-electron] could not resolve Vite dev server URL');
  process.exit(1);
}
server.printUrls();

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});

child.on('close', () => {
  server.close().finally(() => process.exit(0));
});
