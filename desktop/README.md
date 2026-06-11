# NeuroCursor Desktop

This folder contains the Python desktop application for NeuroCursor V2.

The package uses a `src/` layout:

```text
desktop/
  pyproject.toml
  src/
    neurocursor/
      __init__.py
      __main__.py
```

`neurocursor` is the Python package. The `__main__.py` file allows the package to be run with:

```bash
python -m neurocursor
```

During early development, run it directly from source with:

```bash
cd desktop
PYTHONPATH=src python3 -m neurocursor
```

After installing the package in editable mode, the `PYTHONPATH=src` prefix will no longer be needed.
