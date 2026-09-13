#!/usr/bin/env bash
set -euo pipefail

TOOLKIT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MODEL_PATH="${1:-$TOOLKIT_DIR/input/porsche-911-992.blend}"

if ! command -v blender >/dev/null 2>&1; then
  echo "Blender was not found. Install it in the temporary cloud environment, then retry." >&2
  exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
  echo "Model not found: $MODEL_PATH" >&2
  echo "Place the licensed source model in $TOOLKIT_DIR/input/ or pass its path as the first argument." >&2
  exit 1
fi

mkdir -p "$TOOLKIT_DIR/output/png" "$TOOLKIT_DIR/output/webp"

blender --background --python-exit-code 1 --python "$TOOLKIT_DIR/turntable.py" -- \
  --input "$MODEL_PATH" \
  --output "$TOOLKIT_DIR/output/png"
