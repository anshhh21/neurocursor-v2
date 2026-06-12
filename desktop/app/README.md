# NeuroCursor Tauri App

This folder contains the desktop shell for NeuroCursor V2.

The app uses:

- React and TypeScript for the interface.
- Vite for frontend development.
- Tauri for the native desktop shell.
- Rust commands as the bridge to the Python engine.

## Run The Frontend Preview

```bash
npm run dev
```

This opens only the browser/Vite version of the UI. Native Tauri commands are not available there.

## Run The Native App

```bash
npm run tauri -- dev
```

The native app uses the Rust toolchain pinned in `src-tauri/rust-toolchain.toml`.

## Current Milestone

The Start Engine button calls a mock Tauri command and returns a ready status. It does not start the Python engine yet.
