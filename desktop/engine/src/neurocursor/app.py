"""Application entry helpers for NeuroCursor."""

from __future__ import annotations

import json
import signal
import sys
import time
from dataclasses import asdict

from neurocursor import __version__
from neurocursor.core.settings import EngineSettings
from neurocursor.core.camera import Camera
from neurocursor.core.tracker import Tracker
from neurocursor.core.gestures import GestureClassifier
from neurocursor.core.smoothing import CursorSmoother
from neurocursor.core.cursor import CursorController


# Flag set by SIGTERM / SIGINT handlers so the main loop exits cleanly.
_shutdown = False


def _handle_signal(signum: int, _frame: object) -> None:
    global _shutdown
    _shutdown = True


def _emit(event_type: str, data: dict) -> None:
    """Write a JSON-lines message to stdout for the Rust process bridge."""
    msg = {"type": event_type, **data}
    try:
        print(json.dumps(msg))
        sys.stdout.flush()
    except BrokenPipeError:
        pass


def run() -> int:
    """Start the engine process.

    The engine is designed to run as a long-lived child process managed by the
    Tauri desktop shell.  Communication follows the JSON-lines protocol:

    1. On startup, emit a ``startup`` JSON line.
    2. Open the camera and hand tracker.
    3. Each frame: capture → track → classify gesture → smooth → move cursor.
    4. Periodically emit ``telemetry`` JSON lines with live stats.
    5. Exit cleanly when killed or when the pipe breaks.
    """

    # Install signal handlers so `kill` from the Rust side shuts us down.
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    settings = EngineSettings()

    # --- Startup handshake ---------------------------------------------------
    _emit("startup", {
        "engineStatus": "ready",
        "message": f"NeuroCursor V{__version__} engine started successfully.",
    })

    # --- Camera setup --------------------------------------------------------
    camera = Camera(settings.camera)
    camera_ok = camera.open()

    if camera_ok:
        _emit("camera", {"status": "opened", "message": "Camera opened successfully."})
    else:
        _emit("camera", {"status": "failed", "message": "Could not open camera. Check permissions or device."})

    # --- Tracker setup -------------------------------------------------------
    tracker = Tracker()
    tracker_ok = tracker.open()

    if tracker_ok:
        _emit("tracker", {"status": "loaded", "message": "Hand tracking model loaded."})
    else:
        _emit("tracker", {"status": "failed", "message": "Could not load hand tracking model."})

    # --- Pipeline Modules ----------------------------------------------------
    gestures = GestureClassifier(settings.gesture)
    smoother = CursorSmoother(settings.gesture)
    cursor = CursorController(settings.gesture)

    # --- Main loop -----------------------------------------------------------
    last_telemetry = time.monotonic()
    telemetry_interval = settings.telemetry_interval_ms / 1000.0
    start_mono = time.monotonic()

    try:
        while not _shutdown:
            hand = None

            if camera.is_open:
                frame = camera.read()
                if frame is None:
                    # Camera was disconnected mid-session.
                    _emit("camera", {"status": "lost", "message": "Camera feed lost."})
                    camera.close()
                elif tracker.is_open:
                    # Compute a monotonically increasing timestamp in ms for MediaPipe.
                    ts_ms = int((frame.timestamp - start_mono) * 1000)
                    if ts_ms < 0:
                        ts_ms = 0
                    hand = tracker.process(frame.image, ts_ms)

            # Process hand gestures and move cursor
            if hand is not None:
                # 1. Classify Gestures
                state = gestures.process(hand)
                
                if state.is_paused:
                    # Hand is a fist. Release click if active, reset smoothing memory.
                    cursor.release_all()
                    smoother.reset()
                else:
                    # 2. Smooth the movement
                    smoothed = smoother.process(state.pointer_x, state.pointer_y)
                    
                    # 3. Control the OS mouse
                    cursor.process(smoothed, state.is_pinching)
            else:
                # No hand detected. Release click and reset smoothing memory.
                cursor.release_all()
                smoother.reset()

            # Emit telemetry at the configured interval.
            now = time.monotonic()
            if now - last_telemetry >= telemetry_interval:
                cam_telem = asdict(camera.telemetry())
                trk_telem = asdict(tracker.telemetry())
                _emit("telemetry", {**cam_telem, **trk_telem})
                last_telemetry = now

            # If the camera is not open, throttle the loop to avoid spinning.
            if not camera.is_open:
                time.sleep(0.1)

    except (BrokenPipeError, EOFError):
        # Parent process closed our pipe — exit silently.
        pass
    finally:
        # Ensure we don't leave the mouse clicked down on exit
        cursor.release_all()
        tracker.close()
        camera.close()

    return 0
