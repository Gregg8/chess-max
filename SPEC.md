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

## 7. Engine / difficulty

- **Skill slider 1–20** (maps to Stockfish UCI `Skill Level`)
- Named labels along the slider at intervals (e.g. _Beginner / Casual / Strong / Master_) so the number means something
- Optional internal move-time cap per tier (kept off the UI surface)

## 8. Move list & navigation

- **SAN move list** rendered as `1. e4 e5  2. Nf3 ...`
  - Current ply highlighted
  - Click any move to jump there (read-only view; making a new move from a jumped-back state forks / truncates — exact behavior TBD)
- **Undo / Redo buttons** for step-back/step-forward
- **Hint button** — asks Stockfish for the best move in the current position; UX (arrow on board? text in sidebar?) TBD round 3
- ~~Copy PGN to clipboard~~ — not in v1

## 9. Clocks

- **No clocks in v1.** All games untimed.

## 10. Pass-and-play orientation

- **User-toggleable** in settings: auto-flip-after-each-move _vs_ stay-fixed-white-on-bottom
- Default TBD round 3

## 11. Open questions (to resolve)

- Round 3: theme palette specifics, layout (sidebar vs stacked), animations, sound, promotion UI, game-end behavior (resign/draw/checkmate banner), hint-button visual UX, engine-vs-engine controls
- Round 4: tests, deploy, accessibility, PWA?

---

_Last updated: round 2 complete._
