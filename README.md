# NeuroCursor V2

NeuroCursor V2 is the next version of the AI virtual mouse project. The goal is to turn the prototype into a polished local-first desktop application that users can install and run without cloning a repo or manually starting scripts.

This repository is intentionally separate from the V1 project. V1 stays untouched as a reference and fallback, while V2 gets a clean architecture for a real desktop product.

## Direction

- Tauri for the downloadable desktop app shell.
- React, TypeScript, and Vite for the desktop frontend.
- Rust/Tauri commands for the bridge between UI and engine.
- Python for the gesture engine sidecar.
- OpenCV and MediaPipe for camera input and hand tracking.
- PyInstaller for packaging the Python engine sidecar.
- Next.js only for the marketing and download website.
- No authentication, database, or cloud dependency for the core app.

## First V2 Milestone ✅

All five items are complete:

1. ✅ Open a Tauri desktop window.
2. ✅ Show a React control center with NeuroCursor V2 branding.
3. ✅ Display a Start / Stop Engine button.
4. ✅ Keep the Python engine separate and runnable from the command line.
5. ✅ Rust-to-Python process control (start, stop, status polling).

Extra gestures, public installers, signing, and advanced website work come later.

## Repository Layout

```text
desktop/app/     Tauri desktop app: React, TypeScript, Vite, Rust
desktop/engine/  Python gesture engine package
docs/     Architecture notes and learning roadmap
web/      Future landing and download website
```

## Run The Engine Standalone

The Python engine runs as a long-lived process. On startup it prints a JSON status line, then stays alive until terminated.

```bash
cd desktop/engine
PYTHONPATH=src python3 -m neurocursor
```

Expected first line of output:

```json
{"engineStatus": "ready", "message": "NeuroCursor V0.1.0 engine started successfully."}
```

Press Ctrl-C to stop it. When launched from the Tauri app, the Rust process bridge manages the lifecycle automatically.
