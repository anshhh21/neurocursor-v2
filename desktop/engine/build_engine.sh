#!/usr/bin/env bash
set -e

# Change to the engine directory
cd "$(dirname "$0")"

echo "Building NeuroCursor Engine with PyInstaller..."

# Run PyInstaller
# --onefile: build a single executable
# --name: the output binary name (must match target triple for Tauri sidecar)
# --add-data: bundle the mediapipe model file into the root of MEIPASS
# --paths: include our src directory for imports
python3 -m PyInstaller --clean --noconfirm \
    --onefile \
    --name engine-aarch64-apple-darwin \
    --add-data "src/neurocursor/assets/hand_landmarker.task:." \
    --paths "src" \
    src/neurocursor/__main__.py

echo "Build complete. Moving binary to Tauri sidecar directory..."

# Create the binaries directory if it doesn't exist
mkdir -p ../app/src-tauri/binaries/

# Copy the executable from dist to the Tauri binaries folder
cp dist/engine-aarch64-apple-darwin ../app/src-tauri/binaries/

echo "Sidecar binary placed at desktop/app/src-tauri/binaries/engine-aarch64-apple-darwin"
