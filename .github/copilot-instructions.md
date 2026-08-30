# Network Process Manager

NetWatch — a real-time desktop application built with Rust and Tauri v2 for monitoring and managing system processes that have active network port listeners.

## Project Structure

- `src/` — Frontend (vanilla JS + CSS, glassmorphism design system)
  - `index.html` — App shell (header, stats strip, process table)
  - `styles.css` — Dark glass UI tokens, layout, table, badges, toast
  - `main.js` — Tauri command bindings, filtering, rendering, kill flow
- `src-tauri/` — Rust backend
  - `src/lib.rs` — `fetch_processes` (sysinfo + lsof/netstat), `kill_process`
  - `tauri.conf.json` — Tauri v2 config
  - `capabilities/default.json` — Permissions

## Commands

- `make run` — Start the app in development mode (`npm run tauri dev`)
- `make build` — Compile a release bundle (`npm run tauri build`)
- `make deploy` — Build, then commit and push to `main` (uses Copilot for the commit message)

## Tech Stack

- **Backend**: Rust, Tauri v2, `sysinfo` crate, `lsof` (Unix) / `netstat` (Windows)
- **Frontend**: Vanilla JavaScript, CSS (no framework), Inter + JetBrains Mono

## Conventions

- Output is code only; no inline explanations in commits unless explicitly requested.
- Every change deploys from `main` — `make deploy` checks out `main` first.
- Frontend uses CSS custom properties (tokens) defined in `:root` in `styles.css`.
- Process rows are rendered from `main.js` via Tauri `invoke`; keep DOM IDs in sync with `index.html`.
- Kill buttons use event delegation on `#process-list` — do not attach per-row listeners.

## Notes

- On macOS, `lsof` is used for port mapping; requires the process to have a TCP LISTEN socket.
- `fetch_processes` only returns processes that have at least one listening port.
- Auto-refresh runs every 5 seconds from the frontend.