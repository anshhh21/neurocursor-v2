# NeuroCursor V2 Architecture

V2 should be built as a Tauri desktop application with a clean Python engine sidecar, not as one large script. Each module should have one job and should be testable without launching the full app.

## Runtime Flow

```text
React UI
  -> Tauri command
  -> Rust process bridge
  -> Python engine sidecar
  -> OpenCV camera frame
  -> MediaPipe tracker
  -> Gesture classifier
  -> Cursor smoothing
  -> Cursor controller
```

## Desktop Layer

The Tauri app owns the visible user experience:

- React and TypeScript render the control center.
- Vite runs the frontend during development.
- Rust/Tauri commands connect UI actions to native behavior.
- The Python engine runs as a separate local process now and a sidecar later.

Camera and gesture work must stay inside Python. Tauri should start, stop, and monitor the engine; it should not contain gesture or MediaPipe logic.

## Python Engine Modules

- `camera`: opens the webcam, reads frames, handles camera errors.
- `tracker`: runs MediaPipe and converts frames into hand landmarks.
- `gestures`: classifies landmarks into movement, click, pause, or no hand.
- `smoothing`: turns noisy cursor positions into stable movement.
- `cursor`: performs OS mouse actions through a small interface.
- `settings`: stores typed local settings and defaults.
- `engine`: coordinates camera, tracker, gestures, smoothing, cursor, and telemetry.

## Design Rules

- Keep V1 untouched.
- Keep Next.js out of the desktop runtime.
- Start IPC simply: Tauri starts Python and reads JSON lines from stdout.
- Avoid WebSockets inside the desktop app unless stdout IPC becomes limiting.
- Avoid fixed pixel gesture thresholds when possible; prefer normalized hand-scale measurements.
- Make settings simple for users, even if internal algorithms are more technical.
- Package only after the local desktop app is stable.
