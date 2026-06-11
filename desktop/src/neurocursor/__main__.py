"""Command-line entry point for running NeuroCursor as a package."""

from neurocursor.app import run


def main() -> int:
    return run()


if __name__ == "__main__":
    raise SystemExit(main())
