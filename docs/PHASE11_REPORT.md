# Phase 11 report: improving the continuous ISL sentence model

2026-10-10. Scope: decision 1 only (ISL-CSLTR cleanup + unused videos → candidate sentence model).
ISL data only. **No webcam results exist; nothing here is a live-webcam claim.**

## Outcome
**The candidate is worse than production and was NOT promoted.** Production `c20261010-051510` remains active, and its
registry entry (`models/continuous/active.json`) was never modified. The isolated model, avatar and translation are unchanged.

| (same 154 test videos, identical decoding) | Production `c20261010-051510` | Candidate `c20261010-154341-candidate` (seed 42) |
|---|---|---|
| Sentence accuracy, no rejection | **29.2%** (45/154) | 22.1% (34/154) |
| Shown as a sentence (posterior ≥ 0.5) | 122; **43 correct**, 79 wrong | 104; 30 correct, 74 wrong |
| Precision of shown sentences | **35.3%** | 28.8% |
| Gloss error rate (GER), chosen sentence | **0.685** | 0.776 |
| GER, greedy CTC decode | **0.733** | 0.792 |
| rec4 (85 videos): accuracy / correct of shown | 37.6% / 31 of 69 | 28.2% / 20 of 57 |
| rec5 (69 videos): accuracy / correct of shown | 18.8% / 12 of 53 | 14.5% / 10 of 47 |
| Latency per sentence (decode, CPU), mean / p95 | 37 / 62 ms | 30 / 49 ms |

- **Paired comparison:** 19 videos only production gets right, 8 only the candidate (exact McNemar p = 0.052): the drop is real, not noise.
- **Seed robustness:** candidate seeds 42 / 7 / 123 → 22.1% / 16.2% / 18.2% (mean 18.8%, −10.4 points vs production).

### Pre-registered promotion gate (fixed before any result was seen)
| Gate | Result |
|---|---|
| Sentence accuracy +3 points or more | ✗ −7.1 points |
| Paired McNemar p < 0.10 | (✓ p = 0.052, but in production's favour) |
| Precision of shown sentences not lower | ✗ 35.3% → 28.8% |
| No leakage | ✓ |
| Mean gain over 3 seeds +3 points or more | ✗ −10.4 points |
| All regression tests pass | ✓ (see Tests) |

→ **Retain production.** The candidate bundle is kept for reference only: `backend/models/continuous/c20261010-154341-candidate/`
(`continuous_model.joblib`, `metrics.json` with all numbers, seeds and failure examples).

## Data: what changed (ISL-CSLTR only)
| | Production | Candidate |
|---|---|---|
| Training videos (rounds rec1, rec3, rec6, rec7, rec8) | 265 | 372 |
| Validation videos (rec2) | 73 | 144 |
| Test videos (rec4 + rec5) | 154 | **the same 154** (asserted by sample ID) |
| Videos per sentence in training: min / median / max | 1 / 2 / 6 | 1 / 4 / 7 |

1. **Integrity exclusions (9 videos):** MD5 duplicates found by `tools/csltr_integrity.py`:
   - 4 groups where the same video file carries different sentence labels (8 files);
   - 1 exact duplicate under the same label.

   None are in the test rounds. Side effect: the only video of *"No need to worry, don't worry"* was a conflicting
   duplicate, so that sentence and the gloss **NO** have no clean training example. It is not in the test set.
2. **Unlisted videos:** 195 videos on disk but missing from the corpus spreadsheet.
   - **Labels:** taken from their folder name (convention verified on all 492 listed files: 492/492). The gloss sequence comes from the dataset's own gloss file.
   - **Rounds:** rec1 90, rec2 77, rec3 1, rec6 6, rec7 13, rec8 8. None are in rec4/rec5.
   - **Import:** `tools/import_csltr_unlisted.py`, with the same extractor settings as the original import (v1, no face-crop fallback). 194 accepted; 1 rejected (180 s, over the 120 s limit).
   - **Label check (pre-registered):** 7 videos removed because their landmark sequence was below 1/3× the median length of the listed videos of the same sentence (ratios 0.16–0.32: likely truncated or mislabelled). 187 used.
   - **Caveat:** hand landmarks match the original v1 extraction exactly. Face tracking in v1 is order-dependent, so re-extracted face landmarks agree with the stored ones only ≈ 81% (hands 100%). This is a small preprocessing difference between old and new videos.

### Leakage checks
| Check | Result |
|---|---|
| Test sample IDs in training/validation | 0 |
| Test videos whose source file (MD5) is also in training/validation | 0 |
| Test videos with a near-identical landmark sequence in training/validation (cosine > 0.995) | 0 (max 0.919) |
| Normalisation statistics, early stopping, decoder λ, acceptance threshold | fitted on training/validation only; λ = 1.0 and threshold 0.5 copied from production for both models |

## Why the candidate is worse: diagnostic retraining (for explanation only)
Run after the decision. These numbers are on the test set, so **none of these variants may be selected from
them**. Any future candidate needs a new pre-registered plan. File: `backend/reports/phase11_ablation_*.json`.

| Variant (production recipe; identical decoding) | Train / val | CTC epochs | Test accuracy | Correct of shown |
|---|---|---|---|---|
| Original data, seed 42 (= production rebuilt) | 265 / 73 | 87 | 29.2% | 43 of 122 (identical to production: training is deterministic) |
| Original data, seed 7 | 265 / 73 | 86 | 20.1% | 28 of 118 |
| Original data, seed 123 | 265 / 73 | 81 | 24.7% | 37 of 112 |
| Cleaned only (9 exclusions, no unlisted), seed 42 | 257 / 72 | 46 | 24.7% | 33 of 100 |
| Cleaned + unlisted in **training only** (validation = listed rec2), seed 42 | 372 / 72 | 63 | 25.3% | 36 of 118 |
| Candidate: cleaned + unlisted in training **and** validation, seed 42 | 372 / 144 | 51 | 22.1% | 30 of 104 |

**What this shows:**
1. **The production recipe varies a lot by seed.**
   - On identical data, seeds 42 / 7 / 123 give 29.2% / 20.1% / 24.7% (mean **24.7%**).
   - Production is the best of these three draws, so **its 29.2% is optimistic**. The recipe's expected accuracy on these rounds is nearer 25%. Earlier reports (Phase 9/10) quote the 29.2% of this one trained model, which is still its true measured accuracy.
2. **The candidate is worse even seed for seed:** 22.1 vs 29.2, 16.2 vs 20.1, 18.2 vs 24.7 (mean **−5.8 points**). The decision does not depend on production's lucky seed.
3. **Likely cause: the unlisted rec2 videos in validation.**
   - With them, CTC early stopping fires after 27–51 epochs, compared with 81–87 for the production recipe.
   - Moving them out of validation (unlisted in training only) gives 25.3%.
4. **No firm conclusion for the single-seed variants.** Both "cleaned only" (24.7%) and "unlisted in training only" (25.3%) fall inside the production recipe's seed range (20.1–29.2%). With one seed each, I cannot say whether the cleanup or the extra training videos help or hurt.
5. **Takeaway for any future attempt:** compare *recipes* by their mean over several seeds rather than one trained model, and keep the validation set fixed (listed rec2 only).

## Failure examples (candidate, seed 42; test set)
| Truth | Candidate output | Posterior | Greedy CTC glosses | Round |
|---|---|---|---|---|
| go and sleep | hi how are you | 0.35 (uncertain) | HI SLEEP | rec4 |
| i do not agree | you do anything, i do not care | 0.78 | I DO YOU | rec4 |
| can you repeat that please | bring water for me | 0.78 | HE WATER | rec4 |
| i am very happy | i am really grateful | 0.99 | I REALLY GRATEFUL | rec4 |
| congratulations | can i help you | 0.34 (uncertain) | YOU | rec4 |
| i am sitting in the class | i was stopped by some one | 0.33 (uncertain) | I SITTING HELP | rec5 |

Typical patterns:
- The first gloss is recognised but the rest of the sentence is not.
- Confident confusions between sentences that share a gloss ("I AM ...").

## Limitations
- **No signer IDs:** ISL-CSLTR does not annotate signer identity. Rounds (rec1–rec8, from the file-name suffix) are recording indices, so the test set is "unseen recording rounds", **not** guaranteed unseen signers.
- **Small data:** 154 test videos and 101 sentences with 1–7 training videos each. Differences of a few videos are within noise; that is why a 3-point minimum and seed checks were pre-registered.
- **Reused test set:** the same 154 videos have now been used for several model comparisons, so they are no longer fully untouched. Rounds rec4/rec5 should be kept untouched for any final claim.
- **Closed set:** still only the corpus' 101 sentences, not open translation.
- **No webcam evaluation:** no recorded webcam sessions exist yet.

## Code changes this phase
- **`backend/app/video/extract.py`:** `LandmarkExtractor(face_crop=False)` selects the v1 settings and records `EXTRACTOR_VERSION_V1`. The default (face-crop v2) is unchanged.
- **`backend/app/video/importer.py`:** `run_import(..., face_crop=...)`. The manifest and sample files now record the extractor version that was actually used; the manifest previously always said v2. The `isl_csltr_unlisted.csv` manifest was corrected accordingly.
- **New tools:**
  - `backend/tools/import_csltr_unlisted.py`;
  - `backend/tools/train_continuous_candidate.py` (candidate training + gated comparison; never activates);
  - `backend/tools/phase11_ablation.py` (diagnostics; saves no model).
- **`backend/app/continuous/dataset.py`:** `load_samples(include_unlisted=False)`. The unlisted videos are **opt-in**, so the in-app retrain (`app/continuous/train.py`) and the existing tools see exactly the same data as before this phase. Only the Phase 11 tools pass `include_unlisted=True`.
- **New tests:** `backend/tests/test_phase11_candidate.py`:
  - extractor version selection;
  - recording round parsing;
  - McNemar;
  - unlisted videos excluded by default.
- **New data:** 194 landmark files under `backend/data/processed/continuous/isl_csltr/sentence/` (`meta.provenance` marks them as unlisted) and the manifest `isl_csltr_unlisted.csv`.

## Tests
- **Backend:** **154 passed**, final run after all code changes (150 before this phase + 4 new).
- **Frontend:** 25 passed; TypeScript clean; build OK.

## Model paths
- **Production (active, unchanged):** `backend/models/continuous/c20261010-051510/`
- **Candidate (not activated):** `backend/models/continuous/c20261010-154341-candidate/`
- **Logs:**
  - `backend/reports/phase11_candidate_run.log`
  - `backend/reports/phase11_ablation_a.log`, `phase11_ablation_b.log`
  - `backend/reports/phase11_ablation_a.json`, `phase11_ablation_b.json`

Nothing has been committed.
