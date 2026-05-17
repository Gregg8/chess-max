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
- **Toggleable Stockfish evaluation bar** alongside the board (off by default in human-vs-engine to avoid spoilers).
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

## Design notes

The v1 product spec is in [SPEC.md](./SPEC.md). It was built interview-style and each round of decisions was committed as it was made — useful context for *why* a given feature works the way it does.

## Acknowledgments

- Chess piece SVGs by **Colin M.L. Burnett** (cburnett set, multi-licensed GFDL / BSD / CC-BY-SA).
- **Stockfish** (GPLv3) and its WebAssembly port by Nathan Rugg.
- **chess.js** by Jeff Hlywa.
- The eval-bar centipawn-to-win-probability sigmoid is borrowed from lichess.
