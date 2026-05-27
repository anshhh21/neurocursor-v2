# NeuroCursor V2 Learning Roadmap

This roadmap is ordered so each topic supports the next one.

## 1. Python Project Structure

Learn how modern Python projects are organized:

- `pyproject.toml`
- virtual environments
- the `src/` layout
- packages and imports
- why large scripts become difficult to maintain

## 2. Dataclasses, Type Hints, And Enums

These are the foundation for clean settings and engine state.

Focus on:

- `@dataclass`
- `Enum`
- simple type hints
- default values
- keeping configuration in one place

## 3. MediaPipe Hand Landmarks

Understand what MediaPipe gives you before tuning gestures.

Learn:

- landmark indexes
- normalized coordinates
- converting normalized coordinates to pixels
- hand scale
- confidence values
- why camera distance changes gesture thresholds

## 4. State Machines

Gesture apps need memory across frames. A click should not happen just because two fingers are close in one frame.

Learn states like:

- moving
- pinch candidate
- clicked
- waiting for release
- paused
- lost tracking

## 5. Cursor Smoothing

Start simple, then improve.

Learn:

- linear interpolation
- exponential smoothing
- dead zones
- velocity-aware smoothing
- One Euro Filter

## 6. PySide6 Desktop Basics

Learn enough Qt to build the control center.

Focus on:

- `QApplication`
- `QMainWindow`
- layouts and widgets
- signals and slots
- `QThread`
- updating UI safely from worker threads
- `QSettings`

## 7. Packaging With PyInstaller

Do this only after the app runs well locally.

Learn:

- one-folder builds
- app assets and model files
- macOS `.app`
- Windows `.exe`
- platform-specific builds
- camera and accessibility permissions

## Rule Of Thumb

Build the boring reliable core first. A stable cursor, safe click, and clear settings window matter more than extra gestures.
