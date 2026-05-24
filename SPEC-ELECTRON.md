# chess-max — Electron (Desktop) Spec

Desktop builds of chess-max for **Windows, macOS, and Linux**, with **auto-update**. The renderer is the existing web app (React SPA) reused verbatim; only a thin Electron shell + build/release pipeline is new.

Like `SPEC.md`, this is built interview-style and committed so a context-wipe is recoverable. Anything marked _TBD_ or "default unless changed" is a working assumption — flag and override at any time.

---

## 0. Decisions locked (interview round 1)

| Decision | Choice | Consequence |
|---|---|---|
| **Code signing** | Defer — start **unsigned** | Linux (AppImage) + Windows (NSIS) auto-update works now. **macOS auto-update is OFF until signed/notarized** (Squirrel.Mac validates the signature). Windows shows a SmartScreen warning on first install. |
| **Engine** | Reuse **single-threaded** Stockfish.wasm | Zero new engine work, exact parity with web. No COOP/COEP / SharedArrayBuffer needed. |
| **Update host** | **GitHub Releases** | Free, first-class `electron-updater` provider; repo is already on GitHub. Release artifacts are public. |
| **Desktop scope** | **Wrapper + essentials** | Reuse web UI as-is, plus native app menu, window-state persistence, single-instance lock, external-link handling. No new game features. |

---

## 1. Goal & scope

- One codebase, two delivery targets: the existing **web/PWA build** (unchanged, still deploys to GitHub Pages) and a new **desktop build** packaged per-OS.
- The desktop app is the same chess game — three modes, drag+tap, themes, eval bar, etc. — running in a native window, working fully offline, and **updating itself** from GitHub Releases.
- **Non-goal for this round:** new gameplay features. The desktop work is shell + pipeline only.

## 2. Tooling

- **Electron** (latest stable LTS-ish line) — _TBD pin exact major at implementation time._
- **electron-builder** for packaging + publishing (chosen over electron-forge for its turnkey multi-platform + GitHub auto-update story via `electron-updater`).
- **electron-updater** for the in-app update flow.
- Renderer build stays **Vite + React + TS** — no change to the app code.
- Main/preload compiled as a small separate bundle — _default:_ a second Vite config (or `tsc`) emitting CommonJS/ESM to `dist-electron/`. _TBD: tsup vs vite vs plain tsc; pick the lightest._

## 3. Repo & project structure

Single repo (monorepo-lite). New top-level pieces only:

```
electron/
  main.ts         # app lifecycle, BrowserWindow, security, updater wiring
  preload.ts      # contextBridge: expose a minimal, typed API to the renderer
  menu.ts         # native application menu
  window-state.ts # persist + restore window bounds
build/            # icons + electron-builder assets (icon.icns/.ico/.png)
electron-builder.yml
```

- `src/` (renderer) is untouched.
- Web build → `dist/` (Pages, base `/chess-max/`).
- Desktop renderer build → a **separate output** (e.g. `dist-web-electron/`) built with **base `./`** so assets resolve under `file://` (see §5).
- Electron main → `dist-electron/`.

## 4. Main process responsibilities

- Create the `BrowserWindow` with strict security (see §11).
- Load the renderer: **dev** → Vite dev server URL; **prod** → packaged renderer (see §5).
- Own the native menu, window-state, single-instance lock, external-link handling (§6).
- Wire `electron-updater` and relay update events to the renderer over IPC (§8).

## 5. Loading the renderer & the base-path problem

- The web build sets `base: '/chess-max/'` (correct for Pages). Under `file://` that absolute base breaks asset/worker/wasm resolution.
- **Plan:** build the renderer for Electron with **`base: './'`** (relative). Either a dedicated Vite mode (`--mode electron`) or a small config override.
- **Loading mechanism (implemented):** prod uses `win.loadFile('dist-electron/renderer/index.html')`; dev loads the Vite dev server URL. Electron's `file://` handler serves `.js`/`.wasm` with correct MIME, and `localStorage` persists per `userData`, so this is the low-risk path. A custom `app://` protocol (`protocol.handle`) remains a documented future option if a real origin (stricter CSP via response headers, cleaner storage origin) becomes worthwhile.
- **PWA service worker:** the `vite-plugin-pwa` SW is **omitted/inert** in the desktop build — updates are electron-updater's job, and SWs don't register under `file://`/custom protocols anyway. _Default:_ disable the PWA plugin in the electron build mode.
- **Stockfish:** `copy-stockfish.mjs` already stages the worker + wasm into the bundle; with relative base they resolve fine. Verify the worker path (`/stockfish/...`) is relative in the engine adapter, or make it base-aware.

## 6. Desktop-native essentials (the "+ essentials")

- **Application menu** (`menu.ts`): standard roles (App/Edit/View/Window/Help) plus a few app actions — _default:_ New Game, Undo/Redo, Hint, Toggle Eval Bar — dispatched to the renderer via IPC. _TBD: final menu item list._ Dev-only: Reload + Toggle DevTools.
- **Window-state persistence**: remember size/position/maximized between launches (stored in `userData`). Restore on next launch, clamped to a visible display.
- **Single-instance lock** (`requestSingleInstanceLock`): second launch focuses the existing window.
- **External links**: intercept `window.open` / target=_blank and open in the system browser, never in-app.
- **Standard niceties**: app name in menu/About, quit behavior (`window-all-closed` quits except macOS), Dock/taskbar icon.

## 7. Engine

- Ship the **single-threaded** `stockfish-nnue-16-single.{js,wasm}` exactly as the web build does. No engine code changes.
- No COOP/COEP headers needed. (A multi-threaded build is a documented future option — see TODO.)

## 8. Auto-update (electron-updater → GitHub Releases)

- **Provider:** GitHub. `electron-builder` publishes `latest.yml` / `latest-mac.yml` / `latest-linux.yml` + artifacts to a Release; `electron-updater` reads them.
- **Flow (implemented):** on launch, check for updates → silent background download → **install on quit** (`autoInstallOnAppQuit`). This is a complete, no-UI update path for v1. The main process also emits status events over IPC so a renderer affordance (a non-blocking "Update ready — Restart" prompt, calling `quitAndInstall()`) can be layered on later. _TBD: exact UI placement (sidebar status vs toast)._
- **IPC surface (preload, implemented):** `window.chessMaxDesktop` exposes `platform`, `getVersion()`, `onUpdateStatus(cb)` (status: `checking | available | none | downloading | downloaded | error`), and `quitAndInstall()`. Minimal and typed via `contextBridge`.
- **Per-platform reality (unsigned, this round):**
  - **Linux (AppImage):** auto-update works.
  - **Windows (NSIS):** auto-update works; first install shows SmartScreen (unsigned).
  - **macOS:** **auto-update disabled** — Squirrel.Mac requires a valid signature. Until signing is set up, mac users re-download from Releases. App still runs (Gatekeeper right-click-open or `xattr` workaround documented in README).
- **Versioning:** `package.json` `version` is the source of truth; a pushed tag `v<version>` triggers a release build (§10). Updates only flow forward.

## 9. Packaging / distribution formats

| OS | Format(s) | Auto-update | Notes |
|---|---|---|---|
| **Windows** | NSIS installer | ✅ | _Default._ Per-user install. Portable build optional later. |
| **macOS** | DMG + ZIP | ⛔ until signed | ZIP is required for Squirrel.Mac once signing lands. Universal (arm64 + x64) — _TBD vs arm64-only._ |
| **Linux** | AppImage (+ deb) | AppImage ✅ / deb ❌ | _Default:_ AppImage for auto-update; `.deb` for convenience (no auto-update). rpm/snap/flatpak deferred. |

## 10. App identity & assets

- **appId:** `io.github.gregg8.chessmax` _(default — reverse-DNS; confirm)._ 
- **productName:** `Chess Max` _(confirm capitalization/spacing vs the `chess-max` web name)._
- **Icons:** generate `.icns` (mac), `.ico` (win), `512.png` (linux) from a single source SVG. The web app already has `icon-512.svg` to derive from.
- **Category:** Game; theme/background colors reuse the web manifest values.

## 11. Security checklist (non-negotiable)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- All renderer↔main comms via a **typed `contextBridge`** preload — no `remote`, no raw `ipcRenderer` exposed.
- A restrictive **CSP** for the renderer (no remote origins; the app is fully local — Stockfish/wasm are bundled). `wasm-unsafe-eval` permitted as required by the wasm engine.
- `setWindowOpenHandler` denies in-app navigation to external origins; opens them in the system browser.
- Block navigation away from the app origin (`will-navigate`).

## 12. CI/CD

- **Keep** the existing Pages deploy (`deploy.yml`) unchanged.
- **New** release workflow (`.github/workflows/release.yml`):
  - Trigger: push of tag `v*` _(default; manual `workflow_dispatch` also allowed)._
  - **Matrix:** `macos-latest`, `windows-latest`, `ubuntu-latest`.
  - Steps: checkout → setup-node → `npm ci` → build renderer (electron mode) + main → `electron-builder --publish always`.
  - Auth: `GH_TOKEN` = `secrets.GITHUB_TOKEN` (sufficient to publish Releases in this repo).
  - **No signing secrets this round.** Set `mac.identity: null` (or `CSC_IDENTITY_AUTO_DISCOVERY=false`) so mac builds don't try to sign. Signing secrets get added later (see TODO).

## 13. Persistence

- The app's localStorage-based game/settings persistence **carries over unchanged** — Chromium localStorage persists in the app's `userData` partition across launches and across auto-updates.
- _No migration needed._ A desktop user's in-progress game survives quit/relaunch and updates, same as a browser refresh.

## 14. Dev workflow

New scripts (names _TBD_):
- `dev:electron` — Vite dev server + electron pointed at it, with reload.
- `build:electron` — renderer (electron mode) + main → packaged app for the current OS.
- `dist` — `electron-builder` for the current OS (local artifact, no publish).
- Existing `dev` / `build` / `test` / `typecheck` stay as-is for the web target.

## 15. Testing

- Renderer unit/RTL tests are unchanged and still cover game logic.
- **New, light:** a smoke check that the app launches, loads the renderer, and the window appears (Playwright-for-Electron or a minimal spawn check) — _TBD scope; keep small._
- Auto-update is validated manually against a real GitHub pre-release before the first public release.

## 16. v1 (desktop) acceptance criteria

- [ ] App launches on Windows, macOS, and Linux and plays a full game offline.
- [ ] Renderer assets + Stockfish worker/wasm load correctly in the packaged app (no base-path/file:// breakage).
- [ ] Native menu, window-state restore, and single-instance lock work.
- [ ] `electron-builder` produces NSIS / DMG+ZIP / AppImage(+deb) artifacts.
- [ ] Tag push publishes a GitHub Release with update metadata.
- [ ] Auto-update verified working on **Linux** and **Windows** (download → restart → new version).
- [ ] macOS documented as manual-update-for-now (signing parked).
- [ ] Security checklist (§11) satisfied.

## 17. Non-goals (this round)

- Code signing / notarization (parked — see TODO).
- macOS auto-update (blocked on signing).
- Multi-threaded / native engine (parked).
- New gameplay features, in-app store, telemetry/analytics.
- Auto-update channels (beta/stable) — single stable channel for now.
- iOS / mobile (explicitly parked — see TODO).

## 18. Open questions / TBD

- Final `appId` + `productName`.
- macOS: universal binary vs arm64-only.
- Loader: custom `app://` protocol vs `loadFile`.
- Update UX surface (toast vs sidebar status) and whether to add a "Check for updates" menu item.
- Whether to also ship a Windows portable build and Linux `.deb` in the first release.
