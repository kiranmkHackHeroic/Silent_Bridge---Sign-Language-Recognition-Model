#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONIOENCODING="utf-8"
export GLOG_minloglevel="2"
export PYTHONPATH="$ROOT/backend"
cd "$ROOT/backend"
for d in "$@"; do
    "$ROOT/backend/.venv/bin/python" -m app.video.importer "$d" --workers 6
done
