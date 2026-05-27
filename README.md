# NeuroCursor V2

NeuroCursor V2 is the next version of the AI virtual mouse project. The goal is to turn the prototype into a polished local-first desktop application that users can install and run without cloning a repo or manually starting scripts.

This repository is intentionally separate from the V1 project. V1 stays untouched as a reference and fallback, while V2 gets a clean architecture for a real desktop product.

## Direction

- Python for the gesture engine.
- OpenCV and MediaPipe for camera input and hand tracking.
- PySide6 for the desktop control center.
- PyInstaller for alpha desktop builds.
- Next.js only for the marketing and download website.
- No authentication, database, or cloud dependency for the core app.

## First V2 Milestone

The first milestone is deliberately small:

1. Open a PySide6 desktop window.
2. Start and stop the camera safely.
3. Detect a hand with MediaPipe.
4. Move the cursor smoothly.
5. Add stable click and pause gestures.
6. Save user settings locally.

Extra gestures, public installers, signing, and advanced website work come later.

## Repository Layout

```text
desktop/  Python desktop application and gesture engine
docs/     Architecture notes and learning roadmap
web/      Future landing and download website
```
