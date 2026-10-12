#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONIOENCODING="utf-8"
export PYTHONPATH="$ROOT/backend"
cd "$ROOT/backend"
exec "$ROOT/backend/.venv/bin/python" -m app.training.evaluate_model "$@"
