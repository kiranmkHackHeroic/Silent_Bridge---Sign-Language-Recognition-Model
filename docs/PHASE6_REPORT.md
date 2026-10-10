# Phase 6: data-driven recognition accuracy

Measured on this laptop, 2026-10-10. **No webcam evaluation was possible** (the development browser blocks the
camera), so every number below comes from held-out **dataset** recordings, not from live signing. JSON evidence is in
`backend/reports/phase6_*.json`, `parity_resolution.json`, `robustness_eval*.json` and `continuous_rejection.json`.

## 1. Baseline and final metrics

### Isolated signs (63 classes, 268 held-out test videos: 2 unseen Amrita signers + the INCLUDE official test split)
| Model | Accuracy | Macro-F1 | Amrita (213) | INCLUDE (55) |
|---|---|---|---|---|
| Baseline `v20261009-225256` (logreg, old extraction), registry run | 59.7% | 0.591 | 54.5% | 80.0% |
| Baseline re-run with fixed seeds (`phase6_baseline.json`) | 64.2% | 0.627 | 58.7% | 85.5% |
| Baseline, 3 seeds (`phase6_seed_check.json`) | 62.2% ± 2.1 | 0.605 ± 0.021 | | |
| Ensemble (old extraction), 3 seeds | 70.5% ± 1.3 | 0.699 ± 0.011 | | |
| **Final `v20261010-081537` (ensemble, face-crop extraction), registry** | **72.4%** | **0.708** | **67.1%** | **92.7%** |

- **Seed noise:** the same data and model type vary by ~4 points on test between runs, purely through the random augmentation sequence. Single-run differences below ~4 points are not meaningful.
- **Ensemble vs logreg, paired (same videos and seeds, old extraction):** only the ensemble is right on 102 videos, only logreg on 35 (exact McNemar p ≈ 9×10⁻⁹).
- **Live-like condition** (face visible, as at a webcam; `phase6_face_parity.json`):

| Model | INCLUDE test, face visible |
|---|---|
| Old-extraction logreg | 56.4% |
| Old-extraction ensemble | 65.5% |
| **Final model (new extraction)** | **87.3%** (harness), 92.7% (registry run) |

- **Stream replay of the test videos through the live pipeline** (short pauses, threshold 0.6): sign error rate 0.485 → **0.396**, with 0 extra words.
- **Classifier latency:** ~3 ms → 4.9 ms per sign; backend 3.5 ms per frame during replay. The ensemble runs the logreg and GRU on CPU.

### Continuous sentences (ISL-CSLTR, 154 test videos from unseen recording rounds)
| Decoder | Shown as a sentence | Correct | Wrong but shown | Precision |
|---|---|---|---|---|
| `c20261010-005738` fused, no rejection | 154 | 45 (29.2%) | 109 | 29.2% |
| **`c20261010-051510` fused + rejection (posterior ≥ 0.5)** | 122 | 43 | **79** | **35.3%** |

- **Per sentence:** of 85 distinct test sentences, 11 are always right and 49 never.
- **Rejection:** the threshold was chosen on the validation round. Below it the app shows "uncertain sentence" plus the top 3 candidates, and nothing enters the transcript.

## 2. Per-class confusion analysis (final model, test)
- **Persistent zero recall:**
  - **EAT** (0/6, mostly predicted as NOSE): both are hand-near-face signs.
  - **STOP and RING** (0/3 each).
  - Each of these classes has only 3–6 test videos from 2 signers.
- **Frequent confusions:** EAT→NOSE (4), BOY→GIRL (3), HELLO→GOOD (3), YOU-ARE-PERFECT→HOW-ARE-YOU (3), BIRD→GOOD-EVENING, CAT→WE, DOG→GOOD-MORNING, FATHER→BAD (2 each).
- **Low recall:** BOY 0.17, FRIEND 0.17, YOU-ARE-PERFECT 0.17; BIRD, GREY, SIT, TOMORROW, WRITE 0.33.
- **What the data shows:**
  - These classes have 15–21 videos from ≤ 6 signer groups, with ~9–13 in training.
  - The confused pairs share location and handshape and differ in small finger configurations or contact points.
  - A longer temporal window did not help: on validation, 12/16/24/32 frames gave 0.377/0.388/0.385/0.391 macro-F1, all within noise. The representation was therefore **not** changed.
  - The remedy is data (section 3).
- **INCLUDE classes, validation vs test:** these 17 classes (pronouns, some greetings) show 0 *validation* recall because they exist in a single development group, so cross-validation never trains on them. That makes validation pessimistic, not a model failure; on test they reach 92.7%.

## 3. Data quality and collection
- **Class counts:** 15–42 videos per class (imbalance 2.8×). 24 of 1,314 videos were rejected (too few hand frames; no landmarks invented). I/ME has **no test video**. There is no `_none` (non-sign) class.
- **Extraction artefact found and fixed:**
  - With the old extractor, INCLUDE signers (filmed full-body) **never** had a detected face (0% of frames). The face is ~25 px at 640 px and too small for the close-range detector, even at full resolution.
  - This made "no face" a shortcut for 17 classes. With the face visible, as live, the old model's INCLUDE accuracy fell from 83.6% to 56.4%.
  - The new extractor (`mp0.10.21-tasks-640-facecrop-v2`) searches an upper-centre crop of the original frame when the full frame fails. On sampled frames it found plausible, stable boxes in 8/8.
  - Face coverage rose: INCLUDE 0% → 100%, Amrita 83% → 98%. Hands are unchanged.
- **Resolution parity:** face detection depends on resolution (20 videos, 640 px vs full: 92.6% frame agreement; predictions unchanged for 19/20). The browser's video-file test had fed full-resolution video, which caused the 1/8 mismatch seen earlier. Both the file test and the live webcam path now downscale to 640 px, like training.
- **Collection plan:** see [`DATA_COLLECTION_PLAN.md`](DATA_COLLECTION_PLAN.md): priority classes, ≥ 3 signers × 2 sessions, `_none` clips, sequences and evaluation-only sessions.
- **Import check:** the upload preview now shows a per-label summary before import: unsupported labels, examples now → after, below-minimum classes, new and priority classes.

## 4. Changes made and why
| Change | Evidence |
|---|---|
| **Ensemble model type** (logreg + GRU probability average) | Validation macro-F1 0.420 vs 0.388; 3-seed test 70.5% vs 62.2%; paired p ≈ 9e-9 |
| **Training candidates** = logreg, GRU, ensemble (SVM and MLP dropped) | SVM 0.342 and MLP 0.359 never won on identical folds |
| **Face-crop extraction** (`EXTRACTOR_VERSION` v2); importer re-extracts older versions | INCLUDE faces 0% → 100%; live-like INCLUDE 56% → 87%; validation not worse (logreg 0.394 vs 0.386; ensemble 0.429 vs 0.419) |
| **Browser file test and live webcam downscaled to 640 px** | Resolution changes face detection (`parity_resolution.json`) |
| **Sentence rejection threshold** (new continuous version) | 30 fewer confidently wrong sentences, 2 fewer correct (validation-chosen) |
| **Upload label summary** before import | Required by the import workflow |
| **Not adopted: face-dropout augmentation** | Costs 0.017 validation macro-F1 (> 0.01 rule) although face-hidden macro-F1 rises 0.274 → 0.368. Still configurable (`TrainingConfig.face_dropout`) |
| **Not adopted: 24/32-frame representation** | Within noise on validation |

**Old models kept:**
- Isolated: `v20261009-225256` (and older) in `models/registry/`.
- Continuous: `c20261010-005738` and `c20261009-194444`.
- Old landmarks: `backend/data/processed_backup/*_mp0.10.21-tasks-640-v1` (outside the training stores).

## 5. Validation / test methodology
- **Test:** INCLUDE's official test split plus held-out Amrita signer groups (`nachiketh`, `signer_0403`), chosen deterministically by `choose_test_groups`. Never used for fitting, selection or thresholds.
- **Selection:** out-of-fold predictions on development data with `StratifiedGroupKFold(3, seed 42)` over signer/session groups. Identical folds for every variant.
- **Pre-registered rules:** a new variant needs ≥ +0.01 validation macro-F1; face-dropout needed ≤ 0.01 loss. The test set was scored only for the baseline and the validation-selected variant, and then over 3 seeds for reporting.
- **Thresholds:** isolated 0.40, from F1 on out-of-fold development predictions. Sentence rejection 0.5, from the validation round with a classifier fitted on training rounds only.
- **Promotion:** the registry gates the candidate (macro-F1 ≥ 0.40, not worse than the active model on the identical held-out test set by > 0.02, reload + live-pipeline smoke test). Result: 0.708 vs 0.591 → promoted.

## 6. Latency and false-detection trade-offs
- **Threshold:**
  - 0.40 accepts 85% of validation predictions at 49.6% precision.
  - Raising it lowers wrong words but rejects more correct ones (curve in `model_meta.json`).
  - On webcam data, the Live evaluation's leave-one-session-out table chooses it fairly. **Not yet run: no webcam recordings exist.**
- **Segment timing:**
  - A word appears ~0.2 s after the hands drop, or after an 800 ms pause.
  - Shorter pauses or longer hand-absence tolerance did not help on test signers (`segmentation_eval.json`, old extraction + logreg).
  - Dip splitting and the sliding window add many extra words; the verified split helps only when the hands are never lowered.
- **False detections:** no `_none` data exists, so the false-detection rate for non-sign movement is **unmeasured**. Record `_none` and use the live evaluation.
- **Face hidden:** the final extraction makes the model rely more on the face. Logreg proxy on test: 63.1% normal vs 44.8% with the face removed; the old extraction gave 56.3% vs 49.3%. **Keep the face in view.** If it is often lost in your webcam tests, enable face dropout and retrain.

## 7. Remaining limitations
- Webcam accuracy, false detections and the 0.40 threshold are **unvalidated on real webcam signing**.
- EAT, STOP and RING are never recognised on test; several signs are below 35% recall. These need new recordings (section 3).
- Only ~2–9 signers per sign; I/ME has no test data; there is no non-sign class.
- Consecutive signs without lowering the hands merge (sign error rate ~0.86 in the stress test).
- Sentence mode is closed-set (~100 corpus sentences, 29% correct). The CSLTR landmarks were not re-extracted, so the sentence model still uses the old extractor.
- The ensemble is slightly slower and its GRU part needs PyTorch at inference.
- Translation and avatar mappings are unverified (unchanged this phase); see `PHASE5_REPORT.md`.

## 8. Commands
From the project root in PowerShell:
```powershell
# start
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1

# re-extract landmarks after an extractor change (re-extracts only older versions)
powershell -ExecutionPolicy Bypass -File .\import-datasets.ps1 amrita_slr include

# retrain through the registry (candidates logreg, gru, ensemble; promotion gates apply)
powershell -ExecutionPolicy Bypass -File .\train-model.ps1

# evaluations (from backend\, using .\.venv\Scripts\python.exe)
tools\phase6_experiments.py          # baseline + representation/model comparison on identical folds
tools\phase6_seed_check.py           # multi-seed test report for baseline vs ensemble
tools\phase6_face_parity_eval.py     # old vs face-crop extraction, live-like test
tools\phase6_face_dropout_v2.py      # face-dropout decision on validation
tools\parity_resolution.py           # extraction resolution parity
tools\robustness_eval.py             # camera-like perturbations
tools\continuous_rejection.py        # sentence rejection threshold (validation)
tools\evaluate_live.py               # YOUR webcam evaluation recordings

# roll back the isolated model (previous version becomes active)
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/model/rollback
# or activate a specific version
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/model/activate/v20261009-225256
```
**Continuous model rollback:** edit `backend/models/continuous/active.json` to the `previous` version, then restart the backend.
**Landmark rollback:** copy the `processed_backup` folders back to `data/processed/landmarks/` (same names, without the suffix).
