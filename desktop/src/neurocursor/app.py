"""Application entry helpers for NeuroCursor."""

from neurocursor import __version__


def run() -> int:
    """Run the current command-line smoke test for the desktop package."""
    print(f"NeuroCursor V{__version__}")
    print("Desktop package entry point is working.")
    print("Next milestone: camera capture module.")
    return 0
