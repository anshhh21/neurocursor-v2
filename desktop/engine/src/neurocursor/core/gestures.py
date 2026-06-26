"""Gesture classification module for NeuroCursor.

Takes raw MediaPipe HandResult data and turns it into semantic states:
- Moving (base state)
- Pinching (for clicking/dragging)
- Paused (tight fist — all fingers curled in)

Uses hysteresis (different enter/exit thresholds) to prevent flickering
when the hand is near a threshold boundary.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from neurocursor.core.settings import GestureSettings
from neurocursor.core.tracker import (
    HandResult,
    Point,
    INDEX_TIP,
    THUMB_TIP,
    MIDDLE_TIP,
    RING_TIP,
    PINKY_TIP,
    WRIST,
)


@dataclass
class GestureState:
    """The semantic state of the user's hand."""

    is_pinching: bool = False
    is_paused: bool = False
    # The normalized coordinate to use for the cursor (usually index tip)
    pointer_x: float = 0.0
    pointer_y: float = 0.0
    # Debug values for telemetry
    pinch_value: float = 0.0
    fist_value: float = 0.0


def _distance(a: Point, b: Point) -> float:
    """Calculate 2D distance between two normalized points."""
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


class GestureClassifier:
    """State machine for gesture classification with hysteresis memory."""

    def __init__(self, settings: GestureSettings):
        self._settings = settings
        self._is_pinching = False
        self._is_paused = False

    def update_settings(self, settings: GestureSettings) -> None:
        """Update thresholds if changed by the user."""
        self._settings = settings

    def process(self, hand: HandResult) -> GestureState:
        """Classify a hand into a semantic gesture state."""
        # Use index tip for cursor position
        pointer_x = hand.index_tip.x
        pointer_y = hand.index_tip.y

        # --- 1. Detect Pause (Tight Closed Fist) ---
        # A flat hand has fingertips far from the wrist.
        # A closed fist brings fingertips close to the wrist.
        # We average the distance of all four fingers from the wrist and
        # normalize it by the hand scale (wrist to index MCP).
        d_index = _distance(hand.wrist, hand.index_tip)
        d_middle = _distance(hand.wrist, hand.middle_tip)
        d_ring = _distance(hand.wrist, hand.landmarks[RING_TIP])
        d_pinky = _distance(hand.wrist, hand.landmarks[PINKY_TIP])

        avg_dist = (d_index + d_middle + d_ring + d_pinky) / 4.0
        normalized_avg_dist = avg_dist / hand.hand_scale if hand.hand_scale > 0 else 999.0

        # Hysteresis for pause using settings thresholds
        if not self._is_paused:
            if normalized_avg_dist < self._settings.pause_enter_threshold:
                self._is_paused = True
        else:
            if normalized_avg_dist > self._settings.pause_exit_threshold:
                self._is_paused = False

        # --- 2. Detect Pinch (Click) ---
        pinch_dist = _distance(hand.thumb_tip, hand.index_tip)
        normalized_pinch = pinch_dist / hand.hand_scale if hand.hand_scale > 0 else 999.0

        if not self._is_pinching:
            if normalized_pinch < self._settings.pinch_threshold:
                self._is_pinching = True
        else:
            if normalized_pinch > self._settings.pinch_release_threshold:
                self._is_pinching = False

        # Safety: if the hand is paused (fist), it can't be pinching.
        if self._is_paused:
            self._is_pinching = False

        return GestureState(
            is_pinching=self._is_pinching,
            is_paused=self._is_paused,
            pointer_x=pointer_x,
            pointer_y=pointer_y,
            pinch_value=round(normalized_pinch, 3),
            fist_value=round(normalized_avg_dist, 3),
        )
