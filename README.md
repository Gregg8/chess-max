# chess-max

A single-page browser chess game. Play against Stockfish, pass-and-play with another human on the same device, or watch two engines battle. No backend — runs entirely in your browser. Installable as a PWA so it works offline.

**Live:** https://gregg8.github.io/chess-max/

## Features

- **Three modes**: human vs Stockfish, pass-and-play (same device), and engine-vs-engine with per-side difficulty + playback speed.
- **Drag-and-drop _and_ tap-tap input** — both always live, auto-detected per gesture. Designed to feel native on iPad touch and desktop pointer.
- **Skill slider 1–20** (Beginner → Master), mapped to Stockfish's UCI `Skill Level` plus a per-tier movetime cap.
- **Move list** with click-to-jump navigation, undo / redo, full-strength hint (drawn as an arrow on the board), and resign.
- **On-board promotion picker** at the destination square.
- **Captured-pieces strips** above and below the board, with a `+N` material-advantage badge.
- **Stockfish evaluation bar** alongside the board (toggleable in settings; on by default). Reflects the currently-displayed position, so undo / redo / click-to-jump in the move list all update it.
- **Four themes**: classic wood, tournament green, midnight, high-contrast.
- **Sound** synthesized via Web Audio (no asset files); animation respects `prefers-reduced-motion`.
- **Keyboard accessible** — arrow keys navigate, Enter / Space picks up and drops pieces; ARIA grid with per-square labels and a live region announcing moves.
- **Persists** the current game + settings to `localStorage` (versioned schema, debounced writes).
- **PWA**: app shell + Stockfish.wasm precached, so the game works offline after the first load.

## Stack

- Vite + React 18 + TypeScript (strict)
- [chess.js](https://github.com/jhlywa/chess.js) — move legality and FEN/SAN handling
- [Stockfish.wasm](https://github.com/nmrugg/stockfish.js) — single-threaded build (no SharedArrayBuffer, works on GitHub Pages without COOP+COEP headers)
- [Cburnett](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett) piece set
- vite-plugin-pwa for the service worker
- Vitest + React Testing Library

## Run locally

```sh
npm install        # postinstall copies Stockfish into public/stockfish/
npm run dev        # http://localhost:5173/chess-max/
```

Other scripts:

```sh
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

## Deploy

Pushes to `main` are auto-deployed to GitHub Pages by `.github/workflows/deploy.yml` (typecheck → tests → build → publish to the `github-pages` environment).

## Versioning & releases

Versions are semver. `MAJOR.MINOR` are set by hand in `package.json`; the patch is derived automatically by CI (`scripts/app-version.mjs`). The version is injected into the bundle at build time as `__APP_VERSION__` and shown in the app header.

- **Tagged release (desktop):** push a `vX.Y.Z` tag (or run the `tag` workflow, which creates the tag and dispatches `release` on it). The tag is authoritative — the published apps, the GitHub Release, and the in-app version are all exactly `X.Y.Z`. This is the build users should install.
- **Auto build:** every push to `main` (web) and any manual `release` dispatch (desktop) is versioned `MAJOR.MINOR.<run-number + 1000>`, e.g. `0.1.1047`. The `+1000` keeps auto patch numbers in a band no hand-picked tag will use, so an auto version can never duplicate a tagged one. The web and desktop run-number counters are independent, so their patch numbers won't match.

To bump the displayed `MAJOR.MINOR`, edit `version` in `package.json`.

> **Caveat:** a *published* manual desktop dispatch build (`0.1.100x`) out-ranks a real `0.1.x` tagged release in the auto-updater (a minor bump like `0.2.0` still wins). Prefer tags for desktop releases.

## Design notes

The v1 product spec is in [SPEC.md](./SPEC.md). It was built interview-style and each round of decisions was committed as it was made — useful context for *why* a given feature works the way it does.

## Acknowledgments

- Chess piece SVGs by **Colin M.L. Burnett** (cburnett set, multi-licensed GFDL / BSD / CC-BY-SA).
- **Stockfish** (GPLv3) and its WebAssembly port by Nathan Rugg.
- **chess.js** by Jeff Hlywa.
- The eval-bar centipawn-to-win-probability sigmoid is borrowed from lichess.
