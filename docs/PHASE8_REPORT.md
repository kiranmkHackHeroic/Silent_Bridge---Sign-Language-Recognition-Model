# Phase 8: real-webcam evaluation readiness and targeted data plan

2026-10-10. **No real webcam evaluation has happened yet.** `backend/data/eval_recordings` and `eval_sequences` are
empty, and there are no new training recordings, so **nothing was retrained**. All accuracy figures below are
**recorded-video results** (held-out dataset videos replayed through the live pipeline), not webcam results.

## 1. Current baseline (verified on the running server)
| Item | Value |
|---|---|
| Isolated model | `v20261010-101617`: logreg + GRU ensemble, 63 classes, 16 frames × 147 features (2,444 inputs). Identical to `v20261010-081537`; all earlier versions kept |
| Live threshold | 0.40 (validation-calibrated) |
| Still-tail trimming | on: isolated (`trim_still_tail`) and sentence (`trim_sentence_still_tail`), each validated separately |
| Sentence model | `c20261010-051510`: fused decoder with rejection |

**Recorded-video results** (`backend/reports/trace_live_pipeline_20261010-112552.json`; not webcam):

| | Validation signer (296) | Test signers (268) |
|---|---|---|
| Live pipeline, hands lowered | 171 correct (57.8%) | 186 (69.4%) |
| Live pipeline, held still | 151 (51.0%) | 184 (68.7%) |

- **Error causes (test, held still):** about 80% of errors are model confusion (A2 46, A 21), then rejected by the threshold (B 9), sign split (E 7), face or landmarks (D 1), suppressed (C 0).

## 2. Webcam results
**Not available yet.** The evaluation is ready (section 3); once two evaluation-only sessions exist, it will report everything Task 2 needs:
- **A (wrong top-1):** causes A / A2;
- **B (rejected):** cause B and the rejection rate;
- **C (false detections):** `_none` recordings that produced a word;
- **D (merged or split):** cause E, plus the sequence sign error rate;
- **E (webcam preprocessing):** cause D, the out-of-distribution flags and the face share.

Results are split by hands lowered vs held still, and the leave-one-session-out threshold check is included.

## 3. Audit and fixes (Task 1)
| Check | Result |
|---|---|
| Evaluation recordings excluded from training | ✓ separate folders; training sources never include them (regression-tested). **Uploads always go to training**: evaluation data must be recorded in-app (now documented) |
| Label, signer ID, session ID per recording | Labels are checked against the vocabulary on save. **New:** the report lists signers and sessions and warns about the default `signer1`, missing IDs, non-eval purpose, unknown labels and a single session |
| Report contents | ✓ confusion matrix, macro-F1, per-class precision and recall, rejected, false detections, latency, dropped frames, segmentation causes (from Phase 7) |
| Unique filenames | ✓ `reports/live_eval_<UTC>.json`, never overwritten. **Fixed:** the command line no longer writes empty reports (the in-app button already didn't) |
| In-app button and command line use the active model | **Fixed:** the server loaded the model only at startup, so a model promoted with `train-model.ps1` while the app was running was **ignored** by the in-app evaluation and new live sessions. They now reload when the registry's active model changes (`SignPredictor.ensure_active`). Verified: in-app evaluation, command line and live session all report `v20261010-101617` at 0.40 |

**New regression tests:**
- `test_predictor_follows_registry_changes_made_while_the_server_runs`
- `test_cli_does_not_leave_empty_reports`
- `test_evaluation_metadata_warnings`

## 4. Weak classes (recorded-video evidence; re-rank after webcam results)
- **EAT / NOSE / AFTERNOON:** EAT recall 0 on validation and test; NOSE→EAT 7, EAT→NOSE 5, AFTERNOON→EAT 4.
- **CAT / BIRD / DOG:** recall 0 on validation, ≤ 0.33 on test; confused with UMBRELLA, MONSOON, SIT.
- **HELLO / GOOD / GOOD-MORNING:** 0 on validation; HELLO→GOOD 3 on test.
- **Pairs:** FATHER→BROTHER, YOU-ARE-PERFECT→HOW-ARE-YOU, BOY→GIRL, ANGRY→GIRL.

## 5. Data collection progress (Task 3)
- **Progress:** 0 new training recordings, 0 evaluation recordings.
- **Plan:** `DATA_COLLECTION_PLAN.md` now has **collection targets per confused group** (e.g. 50 recordings per sign, ≥ 3 signers × 2 sessions for EAT/NOSE/AFTERNOON), the variations, label and quality checks, the `_none` procedure, and the evaluation/training separation.

## 6. Retraining (Task 4)
Not done: no new verified data exists, and no training bug was found. When the targets are met:
1. Import the recordings.
2. Run **Retrain model** (or `train-model.ps1`).
3. The registry compares the candidate on the identical held-out signer groups, and promotes only if the gates pass; the old version stays.
4. Then repeat the same webcam evaluation sessions for a like-for-like comparison.

## 7. Tests
- Backend pytest: all passed (147).
- Frontend vitest: 25 passed.
- TypeScript clean; production build OK.

## 8. Next steps
1. Record two evaluation-only webcam sessions (checklist in the final message and in `LIVE_TEST_PROCEDURE.md`).
2. Ask for the analysis of the two `live_eval_*.json` reports: largest problem (A–E), weak classes, lowered vs held still, and the threshold check.
3. Record the priority training data (`DATA_COLLECTION_PLAN.md`), then retrain and compare.
