#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONIOENCODING="utf-8"
export PYTHONPATH="$ROOT/backend"
cd "$ROOT"

echo "[pipeline] Waiting for downloads to complete..."
while true; do
    # check if any .part files remain
    PARTS=$(ls backend/data/raw/include/*.part 2>/dev/null | wc -l || true)
    if [ "$PARTS" -eq 0 ] && [ -d "backend/data/raw/include/extracted" ]; then
        echo "[pipeline] All files downloaded and extracted!"
        break
    fi
    sleep 10
done

echo "[pipeline] Starting 6-worker MediaPipe feature extraction..."
./import-datasets.sh include

echo "[pipeline] Training and promoting combined ensemble model..."
./train-model.sh --models ensemble
