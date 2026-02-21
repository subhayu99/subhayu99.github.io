#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

# Ensure venv exists
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating venv..."
  uv venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  uv pip install "rendercv[full]==2.3"
else
  source "$VENV_DIR/bin/activate"
fi

# Ensure npm deps
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install --prefix "$ROOT_DIR"
fi

npm run --prefix "$ROOT_DIR" generate-resume
open "$ROOT_DIR/client/public/resume.pdf"
