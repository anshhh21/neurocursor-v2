# NeuroCursor V2 Learning Roadmap

This roadmap is ordered so each topic supports the next one.

## 1. Python Project Structure

Learn how modern Python projects are organized:

- `pyproject.toml`
- virtual environments
- the `src/` layout
- packages and imports
- why large scripts become difficult to maintain

## 2. Tauri Fundamentals

Learn what Tauri adds to your web development skills:

- WebView desktop app shell
- `src-tauri/`
- `tauri.conf.json`
- Rust commands
- native packaging

## 3. React + Vite Desktop UI

You already know web development, so focus on what changes in desktop:

- no server routes inside the desktop app
- app-like layouts instead of landing pages
- local state for status
- commands from frontend to Tauri
- desktop permissions and packaging constraints

## 4. Rust Basics For Tauri

You do not need deep Rust first. Learn only the bridge layer:

- functions
- structs
- `Result`
- strings
- process spawning
- basic error handling

## 5. Python Engine CLI

The Python engine should stay runnable on its own:

```bash
python -m neurocursor
```

Later, Tauri will launch this engine as a packaged sidecar.

## 6. Dataclasses, Type Hints, And Enums

These are the foundation for clean settings and engine state.

Focus on:

- `@dataclass`
- `Enum`
- simple type hints
- default values
- keeping configuration in one place

## 7. MediaPipe Hand Landmarks

Understand what MediaPipe gives you before tuning gestures.

Learn:

- landmark indexes
- normalized coordinates
- converting normalized coordinates to pixels
- hand scale
- confidence values
- why camera distance changes gesture thresholds

## 8. State Machines

Gesture apps need memory across frames. A click should not happen just because two fingers are close in one frame.

Learn states like:

- moving
- pinch candidate
- clicked
- waiting for release
- paused
- lost tracking

## 9. Cursor Smoothing

Start simple, then improve.

Learn:

- linear interpolation
- exponential smoothing
- dead zones
- velocity-aware smoothing
- One Euro Filter

## 10. Packaging With PyInstaller And Tauri

Do this only after the app runs well locally.

Learn:

- PyInstaller for the Python engine sidecar
- Tauri sidecars
- app assets and model files
- macOS `.app`
- Windows `.exe`
- platform-specific builds
- camera and accessibility permissions

## Rule Of Thumb

Build the boring reliable core first. A stable cursor, safe click, and clear settings window matter more than extra gestures.
