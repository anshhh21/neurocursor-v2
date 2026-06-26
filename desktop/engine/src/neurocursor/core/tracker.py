"""Hand tracking module for NeuroCursor.

Wraps MediaPipe's HandLandmarker (Tasks API) to detect hand landmarks in
camera frames.  The module converts raw MediaPipe results into simple
dataclasses that the rest of the engine can use without importing MediaPipe
directly.

Landmark index reference (21 per hand):
    0  WRIST
    1  THUMB_CMC          5  INDEX_FINGER_MCP     9  MIDDLE_FINGER_MCP
    2  THUMB_MCP          6  INDEX_FINGER_PIP    10  MIDDLE_FINGER_PIP
    3  THUMB_IP           7  INDEX_FINGER_DIP    11  MIDDLE_FINGER_DIP
    4  THUMB_TIP          8  INDEX_FINGER_TIP    12  MIDDLE_FINGER_TIP
   13  RING_FINGER_MCP   17  PINKY_MCP
   14  RING_FINGER_PIP   18  PINKY_PIP
   15  RING_FINGER_DIP   19  PINKY_DIP
   16  RING_FINGER_TIP   20  PINKY_TIP
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import numpy as np

from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    RunningMode,
)
import mediapipe as mp


# ---------------------------------------------------------------------------
# Landmark index constants (for readability in gesture code later)
# ---------------------------------------------------------------------------
WRIST = 0
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_TIP = 20
INDEX_MCP = 5
PINKY_MCP = 17


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class Point:
    """A 2-D normalized coordinate (0..1) with optional z depth."""

    x: float
    y: float
    z: float = 0.0


@dataclass
class HandResult:
    """Processed result for a single detected hand."""

    landmarks: List[Point]
    handedness: str  # "Left" or "Right"
    confidence: float  # hand presence confidence 0..1
    hand_scale: float  # normalized distance wrist→middle_mcp (for thresholds)

    # Convenience accessors for the most-used landmarks.
    @property
    def wrist(self) -> Point:
        return self.landmarks[WRIST]

    @property
    def index_tip(self) -> Point:
        return self.landmarks[INDEX_TIP]

    @property
    def thumb_tip(self) -> Point:
        return self.landmarks[THUMB_TIP]

    @property
    def middle_tip(self) -> Point:
        return self.landmarks[MIDDLE_TIP]


@dataclass
class TrackerTelemetry:
    """Telemetry snapshot for the UI."""

    hands_detected: int = 0
    confidence: float = 0.0
    handedness: str = ""
    hand_scale: float = 0.0


# ---------------------------------------------------------------------------
# Tracker
# ---------------------------------------------------------------------------

def _default_model_path() -> str:
    """Resolve the bundled hand_landmarker.task model."""
    import sys
    if hasattr(sys, "_MEIPASS"):
        # PyInstaller places the data files at the root of MEIPASS 
        # when we use `--add-data "src/neurocursor/assets/hand_landmarker.task:."`
        return os.path.join(sys._MEIPASS, "hand_landmarker.task")

    return os.path.join(
        os.path.dirname(os.path.dirname(__file__)),  # neurocursor/
        "assets",
        "hand_landmarker.task",
    )


def _distance(a: Point, b: Point) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


class Tracker:
    """Runs MediaPipe HandLandmarker on camera frames.

    Usage::

        tracker = Tracker()
        tracker.open()

        for frame in camera:
            result = tracker.process(frame)
            if result is not None:
                print(result.index_tip)

        tracker.close()
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        num_hands: int = 1,
        min_detection_confidence: float = 0.5,
        min_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        self._model_path = model_path or _default_model_path()
        self._num_hands = num_hands
        self._min_detection = min_detection_confidence
        self._min_presence = min_presence_confidence
        self._min_tracking = min_tracking_confidence
        self._landmarker: Optional[HandLandmarker] = None
        self._frame_index: int = 0
        self._last_result: Optional[HandResult] = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def open(self) -> bool:
        """Initialise the MediaPipe HandLandmarker.  Returns True on success."""
        try:
            options = HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=self._model_path),
                running_mode=RunningMode.VIDEO,
                num_hands=self._num_hands,
                min_hand_detection_confidence=self._min_detection,
                min_hand_presence_confidence=self._min_presence,
                min_tracking_confidence=self._min_tracking,
            )
            self._landmarker = HandLandmarker.create_from_options(options)
            self._frame_index = 0
            return True
        except Exception:
            self._landmarker = None
            return False

    def close(self) -> None:
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None

    @property
    def is_open(self) -> bool:
        return self._landmarker is not None

    # ------------------------------------------------------------------
    # Per-frame processing
    # ------------------------------------------------------------------

    def process(self, bgr_frame: np.ndarray, timestamp_ms: int) -> Optional[HandResult]:
        """Run hand detection on a BGR camera frame.

        Args:
            bgr_frame: The raw OpenCV BGR image (numpy array).
            timestamp_ms: Monotonically increasing timestamp in milliseconds.
                          Must be strictly greater than the previous call.

        Returns:
            A ``HandResult`` for the first detected hand, or ``None`` if no
            hand is found.
        """
        if self._landmarker is None:
            return None

        # Convert BGR → RGB for MediaPipe.
        rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        result = self._landmarker.detect_for_video(mp_image, timestamp_ms)

        if not result.hand_landmarks:
            self._last_result = None
            return None

        # Take the first hand.
        raw_landmarks = result.hand_landmarks[0]
        handedness_label = (
            result.handedness[0][0].category_name if result.handedness else "Unknown"
        )
        hand_confidence = (
            result.handedness[0][0].score if result.handedness else 0.0
        )

        # Convert MediaPipe landmarks → our Point dataclass list.
        landmarks = [
            Point(x=lm.x, y=lm.y, z=lm.z) for lm in raw_landmarks
        ]

        # Compute hand scale: wrist → middle_finger_mcp distance.
        # This gives a size-invariant reference for gesture thresholds.
        hand_scale = _distance(landmarks[WRIST], landmarks[INDEX_MCP])

        hand_result = HandResult(
            landmarks=landmarks,
            handedness=handedness_label,
            confidence=round(hand_confidence, 3),
            hand_scale=round(hand_scale, 5),
        )
        self._last_result = hand_result
        return hand_result

    # ------------------------------------------------------------------
    # Telemetry
    # ------------------------------------------------------------------

    def telemetry(self) -> TrackerTelemetry:
        if self._last_result is not None:
            return TrackerTelemetry(
                hands_detected=1,
                confidence=self._last_result.confidence,
                handedness=self._last_result.handedness,
                hand_scale=self._last_result.hand_scale,
            )
        return TrackerTelemetry()
