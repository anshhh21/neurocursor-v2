"""Cursor controller module for NeuroCursor.

Performs OS-level mouse actions (movement and clicking) using pynput.
Maps normalized camera coordinates (0..1) to physical screen coordinates.
"""

from __future__ import annotations

from pynput.mouse import Controller, Button

from neurocursor.core.settings import GestureSettings
from neurocursor.core.smoothing import SmoothedPoint


class CursorController:
    """Interface to the OS mouse pointer."""

    def __init__(self, settings: GestureSettings):
        self._settings = settings
        self._mouse = Controller()
        self._is_clicked = False
        
        self._screen_width = 1920
        self._screen_height = 1080
        
        # Try to dynamically get primary screen resolution on macOS
        try:
            import AppKit
            screen = AppKit.NSScreen.mainScreen()
            if screen is not None:
                frame = screen.frame()
                self._screen_width = int(frame.size.width)
                self._screen_height = int(frame.size.height)
        except ImportError:
            pass

    def update_settings(self, settings: GestureSettings) -> None:
        """Update sensitivity if changed by the user."""
        self._settings = settings

    def process(self, point: SmoothedPoint, is_pinching: bool) -> None:
        """Map the normalized point to screen coordinates and update mouse state.
        
        Args:
            point: The smoothed normalized XY point (0..1)
            is_pinching: Whether the user is performing a click gesture
        """
        # In MediaPipe, x=0 is left, y=0 is top.
        # We need to mirror the x coordinate because the camera image is mirrored.
        screen_x = (1.0 - point.x) * self._screen_width
        screen_y = point.y * self._screen_height

        # Apply cursor sensitivity (a multiplier around the center of the screen).
        # We'll map around the center so sensitivity > 1.0 means reaching edges faster
        # without requiring extreme hand movements.
        center_x = self._screen_width / 2.0
        center_y = self._screen_height / 2.0

        target_x = center_x + (screen_x - center_x) * self._settings.cursor_sensitivity
        target_y = center_y + (screen_y - center_y) * self._settings.cursor_sensitivity

        # Clamp to screen bounds to be safe
        target_x = max(0, min(self._screen_width, target_x))
        target_y = max(0, min(self._screen_height, target_y))

        # Move the physical mouse
        self._mouse.position = (target_x, target_y)

        # Handle clicking state
        if is_pinching and not self._is_clicked:
            self._mouse.press(Button.left)
            self._is_clicked = True
        elif not is_pinching and self._is_clicked:
            self._mouse.release(Button.left)
            self._is_clicked = False

    def release_all(self) -> None:
        """Ensure mouse buttons are released. Useful on shutdown or pause."""
        if self._is_clicked:
            self._mouse.release(Button.left)
            self._is_clicked = False
