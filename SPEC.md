# chess-max — Spec

Living spec, built interview-style. Update as decisions are made; commit after every round so the state survives a context wipe.

## 1. Overview

Single-page browser chess game. No backend. Play vs Stockfish, vs another human on the same device, or watch engine-vs-engine. Themeable UI optimized for both desktop pointer and iPad touch.

## 2. Tech stack

- **Build**: Vite + React + TypeScript (TBC, but default unless changed)
- **Move legality, PGN, FEN**: [chess.js](https://github.com/jhlywa/chess.js)
- **Engine**: Stockfish.wasm (loaded as Web Worker)
- **State**: React state + localStorage for persistence
- **Styling**: TBD (CSS modules? Tailwind? plain CSS?) — Round 3
- **Tests**: TBD — Round 4
- **Deploy target**: TBD (likely static host: GitHub Pages / Netlify / Vercel) — Round 4

## 3. Game modes

- [x] **Human vs Stockfish** — adjustable difficulty
- [x] **Local human vs human** (pass-and-play, same device)
- [x] **Engine vs Engine** — watch Stockfish play itself
- [ ] ~~Position setup / PGN-FEN import~~ (deferred / not in v1)

## 4. Input

- **Both drag-and-drop AND tap-tap**, auto-detected per interaction
  - Drag a piece → move (with snapping)
  - OR tap piece (legal destinations highlight) → tap destination
- Must feel native on iPad and on desktop trackpad/mouse

## 5. Persistence (localStorage)

- [x] **Current in-progress game** — FEN + full move list, restored on reload
- [x] **Settings** — difficulty, chosen side, selected theme
- [ ] ~~Past games history~~ (not in v1)

## 6. Visual

- **Themeable**: ship 2–3 themes, user picks
- Specific themes TBD — Round 3

## 7. Open questions (to resolve)

- Round 2: engine difficulty UX, move list / PGN export, time controls, board orientation in pass-and-play, sound, promotion UI
- Round 3: theme palette specifics, layout (board + sidebar? stacked on mobile?), animations
- Round 4: tests, deploy, accessibility, PWA?

---

_Last updated: round 1 complete._
