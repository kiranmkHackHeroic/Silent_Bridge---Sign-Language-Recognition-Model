#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONIOENCODING="utf-8"
export PYTHONPATH="$ROOT/backend"
"$ROOT/backend/.venv/bin/python" "$ROOT/backend/tools/download_datasets.py" "$@"
