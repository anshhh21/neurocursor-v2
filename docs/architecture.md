# NeuroCursor V2 Architecture

V2 should be built as a desktop application with a clean internal engine, not as one large script. Each module should have one job and should be testable without launching the full app.

## Runtime Flow

```text
Camera frame
  -> MediaPipe tracker
  -> Gesture classifier
  -> Cursor smoothing
  -> Cursor controller
  -> Desktop UI telemetry
```

## Desktop Layer

The PySide6 app owns the visible user experience:

- Main control window.
- Start and stop controls.
- Camera preview.
- Tracking status.
- Gesture status.
- Settings controls.
- Permission and troubleshooting messages.

Camera and gesture work must run away from the UI thread. Use Qt signals and slots to send status updates back to the interface.

## Core Modules

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
- Avoid WebSockets inside the desktop app unless an external API is needed later.
- Avoid fixed pixel gesture thresholds when possible; prefer normalized hand-scale measurements.
- Make settings simple for users, even if internal algorithms are more technical.
- Package only after the local desktop app is stable.
