#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/backend"
export PYTHONIOENCODING="utf-8"
exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
