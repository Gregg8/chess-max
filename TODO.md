# chess-max — Roadmap / Parked work

Living list of deferred ideas and follow-ups. Items here are intentionally out of the current scope; pull one out into a SPEC when it's ready to build.

## Parked — major efforts

### iOS / mobile native app
- Native iOS version of chess-max. **Parked** by request; revisit after the Electron desktop build lands.
- Open approach questions for later: Capacitor/Tauri-mobile wrapping the existing React app vs. a from-scratch SwiftUI client; how to ship Stockfish (wasm in a webview vs. native UCI binary); App Store account, signing, and review process.

## Desktop (Electron) follow-ups
_See `SPEC-ELECTRON.md` for the in-scope desktop work. These are explicitly deferred from that round:_
- **Code signing + notarization** — Apple Developer ID (macOS) and a Windows code-signing cert. Unblocks **macOS auto-update** and removes SmartScreen/Gatekeeper warnings. Add `CSC_*` / notarization secrets to the release workflow.
- **Multi-threaded or native Stockfish on desktop** — desktop controls its headers/process model, so a stronger engine is available (COOP/COEP + SharedArrayBuffer, or a bundled native UCI binary).
- **Extra Linux package formats** — rpm / snap / flatpak (AppImage + deb ship first).
- **Windows portable build**, beta/stable update channels, "Check for updates" menu item.

## Web app backlog
_(Carried over from the v1/post-v1 work; non-goals for v1 but candidates for later.)_
- **Second Stockfish worker** — decouple "play" from "analyze" so the eval bar updates reliably during Fast engine-vs-engine play (documented limitation in `SPEC.md` §22).
- **PGN export / FEN import** — share/resume games. Move history is already tracked, so export is mostly serialization. (Native desktop file dialogs would pair well — see Electron scope.)
- **Past-games history** — swap localStorage for `idb-keyval` as anticipated in `SPEC.md` §20.
- **Clocks / time controls.**
- **Analysis board / variation tree.**
- **Opening book / endgame tablebase.**

## Doc hygiene
- Tick off the v1 acceptance criteria in `SPEC.md` §18 (features are implemented but the checkboxes are still empty).
