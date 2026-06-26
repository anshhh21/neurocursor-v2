"""Cursor smoothing module for NeuroCursor.

Raw coordinates from MediaPipe have high-frequency jitter.
This module applies exponential smoothing (a simple low-pass filter)
to stabilize the cursor while maintaining low latency.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from neurocursor.core.settings import GestureSettings


@dataclass
class SmoothedPoint:
    x: float
    y: float


class CursorSmoother:
    """Applies an exponential moving average (EMA) to XY coordinates."""

    def __init__(self, settings: GestureSettings):
        self._settings = settings
        self._x: Optional[float] = None
        self._y: Optional[float] = None

    def update_settings(self, settings: GestureSettings) -> None:
        """Update smoothing factor if changed by the user."""
        self._settings = settings

    def reset(self) -> None:
        """Clear memory. Useful when tracking is lost or unpaused."""
        self._x = None
        self._y = None

    def process(self, raw_x: float, raw_y: float) -> SmoothedPoint:
        """Smooth the raw coordinate.
        
        Args:
            raw_x: The noisy x coordinate from the tracker
            raw_y: The noisy y coordinate from the tracker
            
        Returns:
            The smoothed point.
        """
        # If we have no history, just use the raw coordinate.
        if self._x is None or self._y is None:
            self._x = raw_x
            self._y = raw_y
            return SmoothedPoint(x=self._x, y=self._y)

        # Apply exponential smoothing.
        # factor = 1.0 means no smoothing (instant jump to new target)
        # factor = 0.1 means heavy smoothing (moves slowly towards target)
        alpha = self._settings.smoothing_factor

        self._x = self._x + alpha * (raw_x - self._x)
        self._y = self._y + alpha * (raw_y - self._y)

        return SmoothedPoint(x=self._x, y=self._y)
