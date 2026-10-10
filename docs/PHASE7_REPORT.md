# Phase 7: live webcam validation (preparation) and error analysis

2026-10-10. **Live webcam testing is still pending.** No webcam evaluation recordings exist yet
(`backend/data/eval_recordings` and `eval_sequences` are empty), and the development browser blocks the camera.
Every number below comes from **labelled dataset recordings of signers the evaluated model never saw**,
replayed frame by frame through the real live session code. None of it is webcam accuracy.

## 1. Confirmed root causes
| Problem | Evidence | Status |
|---|---|---|
| **Still hold at the end of a sign dominated the 16-step model input** | Hold-still endings: 136/268 → 184/268 correct on test signers with trimming; validation signer 89 → 151 / 296; lowered endings unchanged | Fixed (trimming on by default), regression-tested |
| Sentence mode silently **inherited** the trimming (not validated, breaking the isolated/sentence separation) | ISL-CSLTR validation round: held-still sentences 15 → 47 / 73 correct with trimming; test 14 → 42 / 154; lowered unchanged | Kept on the evidence, now an **explicit, separate** setting `trim_sentence_still_tail`, tested |
| `tools/evaluate_live.py` never loaded the model | Always exited "no model loaded" | Fixed, tested |
| Evaluation results not saved, or always overwriting one file | API returned results only; CLI overwrote `live_eval.json` | Fixed: unique `reports/live_eval_<UTC>.json`, never overwritten (empty runs are not saved), tested |
| Browser vs Python feature mismatch on one clip | Resolution-dependent face detection (Phase 6) | Fixed in Phase 6; re-verified: same top-1 on 4/4 held-out videos |
| **Remaining errors are model confusion** | ~80% of the remaining live errors (causes A/A2) | Needs data (section 6), not code |

## 2. Current model and configuration (verified on the running server)
- **Isolated model `v20261010-101617`:** ensemble (0.5 × logistic regression + 0.5 × GRU), 63 classes, 16 frames × 147 features + motion = 2,444 inputs, schema `hands-face-v2`.
  - Bit-for-bit identical to `v20261010-081537`; you created it with a Retrain run from the UI.
  - All earlier versions are in `models/registry/`.
- **Live session:** threshold 0.40 (validation-calibrated), still boundary 800 ms, hands-absent boundary 200 ms, `trim_still_tail` on.
- **Sentence model `c20261010-051510`:** fused decoder with rejection at posterior 0.5; `trim_sentence_still_tail` on.
- **Trimming state:** the still-hold index resets at segment start, end and split, and whenever motion resumes (code reviewed; tests cover trimming on/off).
- **Latest completed sign trace** (`tools/verify_sign_trace.py`, 4 signs via the running server's WebSocket): in every case
  - the combined top-1 equals the decision's top-1;
  - accept or reject matches the 0.40 threshold;
  - the input is 2,444 values and the class mapping is consistent.

  Example: for CAT, logistic regression alone says BLACK (63%), the GRU says CAT (99.9%), and the combined decision is CAT.

## 3. Live evaluation results
**Pending:** there are no webcam recordings yet. The evaluation is ready and reports:
- total labelled examples and completed signs;
- top-1 accuracy, macro-F1, per-class precision and recall;
- the confusion matrix and frequent confusions;
- correct / wrong / rejected / false detections and the rejection rate;
- the confidence distribution;
- **hands lowered vs held still vs cut while moving**;
- error causes A–E;
- classifier latency, recording FPS and dropped frames;
- the leave-one-session-out threshold check.

Every run is saved as `backend/reports/live_eval_<UTC>.json`.

### Proxy on held-out dataset recordings (not webcam)
Current model type through the live pipeline (`reports/trace_live_pipeline_20261010-112552.json`):

| | Validation signer (296) | Test signers (268) |
|---|---|---|
| Whole clip, top-1 before threshold | 60.1% | 71.6% |
| Whole clip, correct after threshold 0.40 | 57.8% | 67.9% |
| Live, hands lowered | 171 (57.8%) | 186 (69.4%) |
| Live, held still (with trimming) | 151 (51.0%) | 184 (68.7%) |

Classifier latency is ~5 ms per sign; backend ~3.5 ms per frame.

## 4. Per-class error analysis (causes, live, held-still endings, test signers)
| Cause | Count | |
|---|---|---|
| A2 right sign 2nd/3rd | 46 | model confusion |
| A right sign not in top 3 | 21 | model confusion |
| B right top-1 below threshold | 9 | thresholding (11% of errors) |
| E boundary (sign split) | 7 | segmentation, e.g. BOY → "FATHER, SIT" |
| D landmarks / face | 1 | |
| C suppressed | 0 | duplicate suppression never removed a correct sign |

- **Weakest signs** (validation / test recall):
  - EAT 0 / 0;
  - CAT, BIRD, DOG 0 / ≤ 0.33;
  - HELLO and GOOD-MORNING 0 on validation;
  - YOU-ARE-PERFECT 0.17 on test.
- **Frequent confusions:** NOSE↔EAT, AFTERNOON→EAT, DOG→SIT, CAT→UMBRELLA, RING→UMBRELLA, BIRD→MONSOON, HELLO→GOOD, FATHER→BROTHER, YOU-ARE-PERFECT→HOW-ARE-YOU.
- **Threshold:** not changed. Rejections (B) are 11% of errors, while near misses (A2) are 55%; lowering the threshold would mostly accept wrong words. Choose it on webcam calibration sessions (leave-one-session-out) once they exist.

## 5. Changes and regression tests (this phase)
| File | Change |
|---|---|
| `backend/app/evaluation/error_causes.py` (new) | Cause attribution A / A2 / B / C / D / E for each labelled recording |
| `backend/app/evaluation/live_eval.py` | Confusion matrix, confidence histogram, outcomes and rejection rate, latency, FPS and dropped frames, live-pipeline replay with causes and end style, `save_report` (unique files) |
| `backend/app/main.py` | Evaluation API saves a unique report when there is data; browser-vs-Python probabilities in the video test |
| `backend/app/config.py`, `backend/app/recognition/pipeline.py` | `trim_sentence_still_tail`: explicit, separately validated setting for sentence mode |
| `backend/tools/evaluate_live.py` | Loads the model; unique report names; prints the new metrics |
| `backend/tools/trace_live_pipeline.py`, `verify_sign_trace.py`, `eval_sentence_trim.py` (new) | Replay with causes; trace-vs-decision check against the running server; sentence-mode trimming evaluation |
| `frontend/src/components/LiveEvalCard.tsx`, `src/services/api.ts` | Outcomes, causes, end-style split, latency and the saved report path |
| `docs/LIVE_TEST_PROCEDURE.md`, `docs/DATA_COLLECTION_PLAN.md` | Current evidence, causes table, report files, training trigger |

Also carried over from the uncommitted Phase-6 fix: still-tail trimming (`segmenter.py`), the sign trace (`diagnostics.py`, `pipeline.py`), and the Latest completed sign panel.

**New tests:**
- cause attribution;
- all Phase-7 report fields, including hold-ending recordings and the never-overwrite check;
- evaluation recordings never being a training source;
- sentence-mode trimming as a separate setting.

Earlier: the still-hold trimming regression, the ensemble trace, and the evaluate_live command.

## 6. Data collection priorities
See [`DATA_COLLECTION_PLAN.md`](DATA_COLLECTION_PLAN.md), now based on the evidence above:
- **Priority 1:** EAT / NOSE / AFTERNOON; CAT / BIRD / DOG with their confusers; HELLO / GOOD / GOOD-MORNING; and `_none` (non-sign).
- **Amount:** at least 3 new signers × 2 sessions × 8–10 repetitions each.
- **Retraining:** not done and not justified yet. No new verified data exists and no training bug was found.

## 7. Commands (PowerShell, project root unless noted)
```powershell
# start
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1

# tests and build
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1
cd frontend; npx tsc --noEmit; npx vitest run; npm run build; cd ..

# webcam evaluation (after recording evaluation-only sessions) -> backend\reports\live_eval_<UTC>.json
backend\.venv\Scripts\python.exe backend\tools\evaluate_live.py

# checks against held-out dataset recordings (from backend\)
.\.venv\Scripts\python.exe tools\verify_sign_trace.py        # server must be running
.\.venv\Scripts\python.exe tools\trace_live_pipeline.py      # causes, lowered vs hold
.\.venv\Scripts\python.exe tools\eval_sentence_trim.py

# retrain (only after new verified recordings): registry, gates, old version kept
powershell -ExecutionPolicy Bypass -File .\train-model.ps1

# roll back the isolated model
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/model/rollback
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/model/activate/v20261010-081537
```
**Turn off a fix without code changes:** set `trim_still_tail` / `trim_sentence_still_tail` to false in `backend/app/config.py`, then restart the backend.
