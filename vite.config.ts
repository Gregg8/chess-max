/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Version shown in the UI. CI sets APP_VERSION to MAJOR.MINOR.<run-number>
// (see scripts/app-version.mjs); local builds fall back to package.json.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const appVersion = process.env.APP_VERSION ?? pkg.version;

// `electron` mode builds the renderer for the desktop shell: relative asset
// paths (so it loads from file://) and no PWA service worker (updates are
// handled by electron-updater, and SWs don't run under file://). The web
// build is unchanged and still targets the GitHub Pages base path.
export default defineConfig(({ command, mode }) => {
  const isElectron = mode === 'electron';

  return {
    base: isElectron ? (command === 'build' ? './' : '/') : '/chess-max/',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      ...(isElectron
        ? []
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.svg'],
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,wasm}'],
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
              },
              manifest: {
                name: 'chess-max',
                short_name: 'chess-max',
                description: 'Browser chess vs Stockfish, with pass-and-play and engine-vs-engine modes.',
                theme_color: '#779556',
                background_color: '#1a1a1a',
                display: 'standalone',
                start_url: '/chess-max/',
                scope: '/chess-max/',
                icons: [
                  {
                    src: 'icon-192.svg',
                    sizes: '192x192',
                    type: 'image/svg+xml',
                    purpose: 'any maskable',
                  },
                  {
                    src: 'icon-512.svg',
                    sizes: '512x512',
                    type: 'image/svg+xml',
                    purpose: 'any maskable',
                  },
                ],
              },
            }),
          ]),
    ],
    worker: {
      format: 'es',
    },
    ...(isElectron
      ? { build: { outDir: 'dist-electron/renderer', emptyOutDir: true } }
      : {}),
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
