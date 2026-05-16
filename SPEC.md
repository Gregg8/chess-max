# chess-max — Spec

Single-page browser chess game. No backend. Play Stockfish, play a friend on the same device, or watch two engines fight. Themeable, installable as a PWA, accessible via keyboard.

This spec was built interview-style; it's committed so a context-wipe is recoverable. Anything marked _TBD_ or "default unless changed" is a working assumption — flag and override at any time.

---

## 1. Tech stack

- **Build / framework**: Vite + React + TypeScript
- **Move legality, PGN, FEN**: [chess.js](https://github.com/jhlywa/chess.js)
- **Engine**: Stockfish.wasm, loaded in a dedicated Web Worker, served as a static asset (no CDN dependency at runtime — PWA must work offline)
- **State**: React state + localStorage for persistence
- **Pieces**: Cburnett SVG set (public domain, the lichess/Wikipedia standard) — default unless changed
- **Styling**: CSS modules + CSS variables for theming — default unless changed
- **Tests**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions → GitHub Pages on push to `main`

## 2. Game modes

1. **Human vs Stockfish** — pick side (White / Black / random), pick difficulty.
2. **Local human vs human** (pass-and-play, same device).
3. **Engine vs Engine** — watch Stockfish play itself; controls in §10.

New-game flow opens a modal that lets the user pick mode, side, and (when relevant) difficulty before starting.

## 3. Input — drag AND tap, auto-detected

- **Drag-and-drop**: pick up piece, drop on legal square (snap on illegal).
- **Tap-tap**: tap a piece → legal destinations highlight → tap a destination.
- Both modes are always live; user just does whichever feels right. Must feel native on iPad touch _and_ desktop pointer.
- Legal-move dots/highlights appear on hover or first-tap.

## 4. Persistence (localStorage)

- **Current in-progress game**: FEN + full SAN move history + mode + chosen side. Restored on reload.
- **Settings**: difficulty, default side, selected theme, sound on/off, animation on/off, pass-and-play orientation preference.
- _Not in v1_: past-games history, cloud sync.

## 5. Themes (ship all four; user picks in settings)

| Theme | Light squares | Dark squares | UI chrome | Pieces |
|---|---|---|---|---|
| **Classic wood** | warm ivory | warm walnut | light cream | Cburnett |
| **Tournament green** | beige `#EBECD0` | green `#779556` | light gray | Cburnett |
| **Midnight (dark mode)** | muted slate-light | muted slate-dark | dark UI | Cburnett (light tint) |
| **High contrast** | pure white | near-black | high-contrast UI | bold-outline variant |

Themes implemented as CSS custom properties; switching is instant, no reload.

## 6. Engine & difficulty

- Single **skill slider 1–20**, mapped to Stockfish UCI `Skill Level`.
- Labels along the slider: **1 Beginner · 5 Casual · 10 Club · 15 Strong · 20 Master**.
- Internal per-tier `movetime` cap (kept off the UI):
  - 1–5 → 200ms · 6–10 → 500ms · 11–15 → 1000ms · 16–20 → 2000ms (tuneable).
- Engine runs in a Web Worker; UI never blocks.

## 7. Move list & navigation

- **SAN move list** in the sidebar: `1. e4 e5  2. Nf3 Nc6 ...`
- Current ply highlighted; click any move to jump the board to that position (read-only navigation).
- **Undo / Redo** buttons step one ply back/forward.
- If the user is on a past position and makes a new move, **history truncates from that point** (no variation tree in v1).
- **Hint button**: asks Stockfish (at full strength, ignoring user's difficulty) for the best move in the current position. Renders as a **translucent arrow from-square → to-square** on the board, plus a subtle source/destination tint. Clears on next move.

## 8. Pawn promotion

- **On-board popup** at the promotion square: four piece choices (Q/R/B/N) appear inline, oriented toward the promoting side. Tap/click to choose. Esc / tap-away cancels the move.

## 9. Game flow & controls (always-visible toolbar)

- **New game** — opens new-game modal; confirms if a game is in progress.
- **Resign** — side-to-move resigns (in pass-and-play, the active side resigns; vs engine, the human resigns).
- **Undo / Redo / Hint** as above.
- **End-of-game banner** when chess.js reports terminal state: Checkmate (with winner), Stalemate, Draw by 50-move / 3-fold repetition / insufficient material. Banner offers "New game" and "Review" (stays on the final position).
- _Not in v1_: draw offers, takeback offers (UX-cheap with undo button anyway), PGN export.

## 10. Pass-and-play

- After Black moves, board orientation depends on user setting:
  - **Auto-flip**: rotates 180° so the side to move always sees their pieces at the bottom.
  - **Stay fixed**: White always at bottom, Black plays from "behind."
- Toggle in settings. Default: **auto-flip** (more natural for pass-and-play).

## 11. Engine vs engine

- **Start / Pause / Resume** controls.
- **Per-side difficulty**: two independent skill sliders (White Stockfish vs Black Stockfish).
- **Speed control**: delay between moves — Fast (instant) / Normal (~700ms) / Slow (~2s).
- Same move list, banner, and persistence as the other modes.

## 12. Layout (responsive)

- **Wide (≥900px)**: board on the left, sidebar (move list + controls + status) on the right.
- **Narrow (<900px)**: stacked — board on top, scrollable controls/move list below.
- Board always square, sized to fit viewport (max ~min(80vh, available width)).
- Coordinate labels (a–h, 1–8) on board edges; flip with board orientation.

## 13. Sound & animation

- **Both on by default**, both toggleable in settings.
- Piece move animation: ~150ms ease-out slide. Disable respects `prefers-reduced-motion`.
- Sound effects: move, capture, check, castle, promotion, game-end. Public-domain WAVs.

## 14. Accessibility (v1)

- Full keyboard play: Tab/arrows navigate squares, Enter/Space picks up / drops piece. Move-list items focusable.
- `prefers-reduced-motion` disables animation.
- ARIA labels on squares (`"e4, empty"`, `"e4, white pawn"`) and live region announcing each move in SAN.
- High-contrast theme exists explicitly for low-vision.
- Color is never the only signal (legal-move dots + last-move highlight have shape + position cues).

## 15. PWA / offline

- Web app manifest with name, icons, theme color matched to selected theme.
- Service worker pre-caches the app shell + Stockfish.wasm so the game works fully offline once installed.
- Installable on iOS (add-to-home-screen) and Android/desktop Chrome.

## 16. Tests (v1 scope)

Vitest + RTL:

- chess.js wrapper: move validation, undo/redo, SAN history correctness, terminal-state detection.
- Persistence: save/load round-trip of a mid-game state; settings round-trip.
- Stockfish worker adapter: mock the worker, verify UCI command sequencing.
- Reducer/state-machine tests for promotion flow and pass-and-play turn switching.

UI smoke tests (RTL):

- Tap-tap move completes a legal move.
- Drag-and-drop move completes a legal move.
- Illegal move is rejected.
- Hint shows an arrow.
- End-of-game banner renders on checkmate.

## 17. Deploy

- GitHub Actions workflow (`.github/workflows/deploy.yml`): on push to `main`, install → typecheck → test → `vite build` → publish `dist/` to `gh-pages` branch.
- Site served from `https://<user>.github.io/chess-max/`. Vite `base` configured accordingly.

## 18. v1 acceptance criteria (done = shippable)

- [ ] All three game modes playable end-to-end.
- [ ] Both drag and tap input work on iPad Safari and desktop Chrome.
- [ ] All four themes ship and switch live.
- [ ] Difficulty slider effective (Beginner is beatable by a beginner; Master crushes a club player).
- [ ] Current game survives a hard refresh.
- [ ] PWA installs and runs offline.
- [ ] Keyboard-only play possible.
- [ ] CI is green; GitHub Pages site is live.

## 19. Explicit non-goals (v1)

- No backend, no accounts, no multiplayer-over-network.
- No PGN/FEN import or export.
- No clocks / time controls.
- No analysis board, variation trees, or engine evaluation bar.
- No past-games history.
- No opening book / endgame tablebase.

---

_Interview complete (4 rounds). Implementation: shipped in this branch._

---

## 20. v1 implementation notes

- **Stockfish variant**: ships the single-threaded `stockfish-nnue-16-single.wasm` to avoid the SharedArrayBuffer / COOP+COEP requirement (GitHub Pages doesn't set those headers). Plenty fast for human play.
- **Piece set**: ships simple inline SVG pieces (recognizable silhouettes, themeable via `--piece-light` / `--piece-dark` / `--piece-outline` CSS variables). Cburnett SVGs can be swapped in later without touching consumers.
- **Persistence**: localStorage with versioned schema (`{ v: 1, ... }`), try/catch on every read/write, trailing-edge debounce on writes (200ms). If past-games history is ever added, swap to idb-keyval.
- **Input**: drag candidate is started on `pointerdown` and only upgraded to an active drag after 5px of movement. Smaller movements fall through to the `click` handler for tap-tap. Both flows are always live.
- **Hint**: asks Stockfish at full strength (skill 20) regardless of game difficulty, so the hint is meaningful.
- **Undo in human-vs-engine**: undoes the engine's reply AND the human's move, so the human is back on move (otherwise undo would only flip the side to the engine, which would immediately replay).
