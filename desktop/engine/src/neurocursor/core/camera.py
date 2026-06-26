"""Camera capture module for NeuroCursor.

Opens the webcam via OpenCV, reads frames, and exposes a simple interface
that the main engine loop calls once per iteration.  The module handles
camera errors gracefully so a missing or unplugged camera does not crash
the engine.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

from neurocursor.core.settings import CameraSettings


@dataclass
class CameraFrame:
    """A single captured frame with metadata."""

    image: np.ndarray
    width: int
    height: int
    timestamp: float  # time.monotonic() when the frame was grabbed


@dataclass
class CameraTelemetry:
    """Lightweight telemetry snapshot emitted every N frames."""

    fps: float = 0.0
    frame_count: int = 0
    is_open: bool = False
    resolution: str = "0x0"


class Camera:
    """Manages an OpenCV VideoCapture with start / read / stop semantics."""

    def __init__(self, settings: CameraSettings) -> None:
        self._settings = settings
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_count: int = 0
        self._fps: float = 0.0
        self._last_fps_time: float = 0.0
        self._fps_frame_count: int = 0

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def open(self) -> bool:
        """Open the camera device.  Returns True on success."""
        self._cap = cv2.VideoCapture(self._settings.device_index)
        if not self._cap.isOpened():
            self._cap = None
            return False

        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._settings.width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._settings.height)
        self._cap.set(cv2.CAP_PROP_FPS, self._settings.fps)

        self._frame_count = 0
        self._fps = 0.0
        self._last_fps_time = time.monotonic()
        self._fps_frame_count = 0
        return True

    def close(self) -> None:
        """Release the camera device."""
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    @property
    def is_open(self) -> bool:
        return self._cap is not None and self._cap.isOpened()

    # ------------------------------------------------------------------
    # Frame reading
    # ------------------------------------------------------------------

    def read(self) -> Optional[CameraFrame]:
        """Read the next frame.  Returns None if the camera is closed or
        the read fails (e.g. the camera was unplugged)."""
        if self._cap is None:
            return None

        ok, frame = self._cap.read()
        if not ok or frame is None:
            return None

        self._frame_count += 1
        self._fps_frame_count += 1

        # Recalculate FPS every second.
        now = time.monotonic()
        elapsed = now - self._last_fps_time
        if elapsed >= 1.0:
            self._fps = self._fps_frame_count / elapsed
            self._fps_frame_count = 0
            self._last_fps_time = now

        h, w = frame.shape[:2]
        return CameraFrame(image=frame, width=w, height=h, timestamp=now)

    # ------------------------------------------------------------------
    # Telemetry
    # ------------------------------------------------------------------

    def telemetry(self) -> CameraTelemetry:
        """Return a snapshot of camera stats for the UI."""
        if self._cap is not None and self._cap.isOpened():
            w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            res = f"{w}x{h}"
        else:
            res = "0x0"

        return CameraTelemetry(
            fps=round(self._fps, 1),
            frame_count=self._frame_count,
            is_open=self.is_open,
            resolution=res,
        )
