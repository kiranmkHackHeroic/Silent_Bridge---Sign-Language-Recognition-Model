#!/usr/bin/env bash
# Phase: add INCLUDE signs. Extract landmarks while the subset download runs, then a final extraction pass,
# retrain with the active model's settings (promotion gate decides) and create avatar clips for signs without one.
# Usage (from backend/):  bash tools/run_include_pipeline.sh <download log>
set -u
cd "$(dirname "$0")/.."
LOG="${1:-reports/include_subset_download_2.log}"
PY=.venv/Scripts/python.exe
export PYTHONIOENCODING=utf-8 GLOG_minloglevel=2
stamp() { date +%H:%M:%S; }
until grep -q "done:\|Traceback\|not reachable" "$LOG"; do
  echo "[$(stamp)] extraction pass while downloading"
  $PY -u -m app.video.importer include --workers 3 > reports/include_import_loop.log 2>&1
  sleep 300
done
echo "[$(stamp)] download finished: $(grep -E 'done:' "$LOG" | tail -1)"
echo "[$(stamp)] final extraction pass"
$PY -u -m app.video.importer include --workers 3 > reports/include_import_final.log 2>&1 || { echo "IMPORT FAILED"; exit 1; }
grep -v "W0000\|I0000" reports/include_import_final.log | grep -E '"accepted"|"rejected"|"classes"'
echo "[$(stamp)] training"
$PY -u -m app.training.train_model --augment 5 --seed 42 > reports/train_include_80.log 2>&1 || { echo "TRAINING FAILED"; exit 1; }
grep -v "W0000\|I0000" reports/train_include_80.log | grep -E '"promoted"|"decision"|"num_classes"|"accuracy"|"macro_f1"' | head -6
echo "[$(stamp)] avatar clips for signs without one"
$PY -u tools/capture_dataset_clips.py --only-missing 2>&1 | grep -v "W0000\|I0000" | tail -3
echo "[$(stamp)] PIPELINE DONE"
