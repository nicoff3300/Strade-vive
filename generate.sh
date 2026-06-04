#!/bin/bash
# BP LAB 2026 — Menu PDF Generator
# Usage: ./generate.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --quiet weasyprint
else
    source "$VENV_DIR/bin/activate"
fi

HOMEBREW_LIB=""
if [ -d "/opt/homebrew/lib" ]; then
    HOMEBREW_LIB="/opt/homebrew/lib"
elif [ -d "/usr/local/lib" ]; then
    HOMEBREW_LIB="/usr/local/lib"
fi

if [ -n "$HOMEBREW_LIB" ]; then
    export DYLD_LIBRARY_PATH="$HOMEBREW_LIB:$DYLD_LIBRARY_PATH"
fi

python3 "$SCRIPT_DIR/app/generate_pdf.py"
if [ $? -eq 0 ]; then
    echo "Done: BP_LAB_2026_Menu_A5.pdf generated successfully."
else
    echo "ERROR: PDF generation failed. Check the output above."
    exit 1
fi
