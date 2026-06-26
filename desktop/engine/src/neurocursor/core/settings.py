"""Typed settings and defaults for the NeuroCursor engine.

All engine configuration lives here in one place so it is easy to find,
change, and eventually save/load from disk.  Every field has a sensible
default so the engine can start without any user configuration.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class EngineMode(Enum):
    """Top-level operating mode of the engine."""

    IDLE = "idle"
    TRACKING = "tracking"
    PAUSED = "paused"


@dataclass
class CameraSettings:
    """Settings for the OpenCV video capture."""

    device_index: int = 0
    width: int = 640
    height: int = 480
    fps: int = 30


@dataclass
class GestureSettings:
    """Thresholds and tuning knobs for gesture classification."""

    cursor_sensitivity: float = 2.4
    smoothing_factor: float = 0.6
    pinch_threshold: float = 0.28  # normalized hand-scale distance (thumb-index close)
    pinch_release_threshold: float = 0.38  # release when fingers separate
    pause_enter_threshold: float = 0.85  # tight fist only
    pause_exit_threshold: float = 1.15  # open hand to resume


@dataclass
class EngineSettings:
    """Root settings object — passed to the engine on startup."""

    camera: CameraSettings = field(default_factory=CameraSettings)
    gesture: GestureSettings = field(default_factory=GestureSettings)
    telemetry_interval_ms: int = 500  # how often to emit telemetry JSON
    mode: EngineMode = EngineMode.IDLE
